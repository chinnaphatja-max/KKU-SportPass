const pool = require('../config/db');
const { applyBookingTimeouts, parseQrCourtId, distanceMeters, appSettingInt, makeQrPayload } = require('../utils/helpers');

exports.bookCourt = async (req, res) => {
    try {
        await applyBookingTimeouts();
        
        const userId = req.session.user?.id || req.body.user_id;
        const { court_id, date, time } = req.body;

        if (!userId || !court_id || !date || !time) {
            return res.status(400).json({ error: "ข้อมูลการจองไม่ครบถ้วน" });
        }

        // Check court closures
        const [closures] = await pool.query(
            "SELECT id FROM court_closures WHERE close_date = ? AND (court_id = ? OR court_id IS NULL)",
            [date, court_id]
        );
        if (closures.length > 0) {
            return res.status(400).json({ error: "สนามปิดให้บริการในวันที่เลือก" });
        }
        
        // Get court capacity
        const [courts] = await pool.query("SELECT capacity FROM courts WHERE id = ?", [court_id]);
        if (courts.length === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลสนาม" });
        }
        const capacity = courts[0].capacity || 1;

        // Calculate end_time (+1 hour)
        const [hours, minutes] = time.split(':').map(Number);
        const endHours = String((hours + 1) % 24).padStart(2, '0');
        const endTime = `${endHours}:${String(minutes).padStart(2, '0')}:00`;
        const startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        // Check duplicate booking by status for the current slot
        const [existing] = await pool.query(
            "SELECT id, user_id FROM bookings WHERE court_id = ? AND booking_date = ? AND start_time = ? AND status IN ('PENDING', 'PRE_CONFIRMED', 'CHECKED_IN')",
            [court_id, date, startTime]
        );
        
        if (existing.length >= capacity) {
            return res.status(409).json({ error: "รอบเวลานี้มีผู้จองเต็มแล้ว" });
        }
        
        const hasBooked = existing.some(b => b.user_id === userId);
        if (hasBooked) {
             return res.status(409).json({ error: "คุณจองสนามนี้ในรอบเวลานี้ไปแล้ว" });
        }

        const [result] = await pool.query(
            "INSERT INTO bookings (user_id, court_id, booking_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, 'PENDING')",
            [userId, court_id, date, startTime, endTime]
        );

        res.json({ success: true, booking_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const userId = req.session.user?.id || req.query.user_id;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const [bookings] = await pool.query(`
            SELECT b.*, c.name as court_name, c.type as court_type, c.icon as court_icon
            FROM bookings b
            JOIN courts c ON b.court_id = c.id
            WHERE b.user_id = ?
            ORDER BY b.booking_date DESC, b.start_time DESC
        `, [userId]);

        res.json({ bookings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.preConfirm = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const userId = req.session.user?.id || req.body.user_id;
        const { booking_id } = req.body;

        if (!userId || !booking_id) {
            return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
        }

        const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ? AND user_id = ?", [booking_id, userId]);
        if (bookings.length === 0) {
            return res.status(444).json({ error: "ไม่พบรายการจอง" });
        }

        const booking = bookings[0];
        if (booking.status !== 'PENDING') {
            return res.status(400).json({ error: "รายการจองไม่ได้อยู่ในสถานะรอยืนยัน" });
        }

        await pool.query("UPDATE bookings SET status = 'PRE_CONFIRMED', pre_confirmed_at = datetime('now') WHERE id = ?", [booking_id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.checkIn = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const userId = req.session.user?.id || req.body.user_id;
        const { qr_payload, lat, lng } = req.body;

        if (!userId || !qr_payload) {
            return res.status(400).json({ error: "กรุณาระบุข้อมูล QR Code" });
        }

        const courtId = parseQrCourtId(qr_payload);
        if (!courtId) {
            return res.status(400).json({ error: "QR Code ไม่ถูกต้อง หรือหมดอายุ" });
        }

        const [courts] = await pool.query("SELECT * FROM courts WHERE id = ?", [courtId]);
        if (courts.length === 0) {
            return res.status(404).json({ error: "ไม่พบสนาม" });
        }

        const court = courts[0];

        // GPS Check if coordinates provided
        let distMeters = null;
        if (lat && lng) {
            distMeters = Math.round(distanceMeters(parseFloat(lat), parseFloat(lng), parseFloat(court.latitude), parseFloat(court.longitude)));
            const maxRadius = await appSettingInt('gps_radius_meters', 30);

            if (distMeters > maxRadius) {
                return res.status(400).json({
                    error: `คุณไม่ได้อยู่ที่สนามจริง (ระยะห่าง ${distMeters} เมตร, อนุญาตไม่เกิน ${maxRadius} เมตร)`
                });
            }
        }

        // Find eligible booking for user
        const today = new Date().toISOString().split('T')[0];
        const [bookings] = await pool.query(`
            SELECT * FROM bookings
            WHERE user_id = ? AND court_id = ? AND booking_date = ? AND status = 'PRE_CONFIRMED'
            ORDER BY start_time ASC
            LIMIT 1
        `, [userId, courtId, today]);

        if (bookings.length === 0) {
            return res.status(404).json({ error: "ไม่พบรายการจองที่ได้รับการยืนยันสิทธิ์สำหรับสนามนี้" });
        }

        const booking = bookings[0];
        await pool.query(`
            UPDATE bookings
            SET status = 'CHECKED_IN', checked_in_at = datetime('now'), checkin_lat = ?, checkin_lng = ?, checkin_distance_m = ?
            WHERE id = ?
        `, [lat || null, lng || null, distMeters, booking.id]);

        res.json({ success: true, booking_id: booking.id, distance_m: distMeters });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getQrToken = async (req, res) => {
    try {
        const { court_id } = req.query;
        if (!court_id) {
            return res.status(400).json({ error: "กรุณาระบุ court_id" });
        }
        const qrPayload = makeQrPayload(court_id);
        res.json({ court_id, qr_payload: qrPayload, generated_at: new Date().toISOString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
};
