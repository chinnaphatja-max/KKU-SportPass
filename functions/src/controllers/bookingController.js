const crypto = require('crypto');
const pool = require('../config/db');
const { applyBookingTimeouts, parseQrCourtId, distanceMeters, appSettingInt, makeQrPayload, checkAndPromoteWaitlist } = require('../utils/helpers');
const { logAudit } = require('../utils/auditLogger');

function generateBookingCode() {
    return 'KKU-SP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

exports.bookCourt = async (req, res) => {
    try {
        await applyBookingTimeouts();
        
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const { court_id, date, time } = req.body;

        if (!court_id || !date || !time) {
            return res.status(400).json({ error: "ข้อมูลการจองไม่ครบถ้วน" });
        }

        // Validate date format (YYYY-MM-DD) and time format (HH:MM)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) {
            return res.status(400).json({ error: "รูปแบบวันที่หรือเวลาไม่ถูกต้อง" });
        }

        // Calculate current Thailand time (UTC+7)
        const now = new Date();
        const bangkokTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
        const todayStr = bangkokTime.toISOString().split('T')[0];
        const currentHours = String(bangkokTime.getHours()).padStart(2, '0');
        const currentMinutes = String(bangkokTime.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}:00`;

        // Calculate end_time (+1 hour)
        const [hours, minutes] = time.split(':').map(Number);
        const endHours = String((hours + 1) % 24).padStart(2, '0');
        const endTime = `${endHours}:${String(minutes).padStart(2, '0')}:00`;
        const startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        // Policy 1: Prevent past date or past time bookings
        if (date < todayStr) {
            return res.status(400).json({ error: "ไม่สามารถจองวันที่ผ่านมาแล้วได้" });
        }
        if (date === todayStr && startTime <= currentTimeStr) {
            return res.status(400).json({ error: "ไม่สามารถจองช่วงเวลาที่ผ่านมาแล้วได้" });
        }

        // Policy 2: Max advance booking window
        const maxAdvanceDays = await appSettingInt('max_advance_booking_days', 7);
        const maxDateObj = new Date(bangkokTime.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
        const maxDateStr = maxDateObj.toISOString().split('T')[0];
        if (date > maxDateStr) {
            return res.status(400).json({ 
                error: `ระบบเปิดให้จองล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน (ถึงวันที่ ${maxDateStr})` 
            });
        }

        const maxActiveBookings = await appSettingInt('max_active_bookings_per_user', 2);

        // Run booking creation inside atomic transaction with row locking
        const bookingResult = await pool.withTransaction(async (txQuery) => {
            // Policy 3: Active booking quota per user (inside transaction)
            const [activeRows] = await txQuery(
                "SELECT COUNT(*) as cnt FROM bookings WHERE user_id = ? AND status IN ('PENDING', 'PRE_CONFIRMED')",
                [userId]
            );
            const activeCount = parseInt(activeRows[0]?.cnt || 0, 10);
            if (activeCount >= maxActiveBookings) {
                const err = new Error(`คุณมีรายการจองที่รอใช้งานอยู่แล้ว ${activeCount} รายการ (จำกัดสูงสุด ${maxActiveBookings} รายการพร้อมกัน)`);
                err.status = 400;
                throw err;
            }

            // Check court closures (supports full-day and partial-day closures)
            const [closures] = await txQuery(
                `SELECT id, reason, start_time, end_time FROM court_closures 
                 WHERE close_date = ? AND (court_id = ? OR court_id IS NULL)
                   AND (
                     (start_time IS NULL AND end_time IS NULL)
                     OR (start_time < ? AND end_time > ?)
                   )`,
                [date, court_id, endTime, startTime]
            );
            if (closures.length > 0) {
                const reason = closures[0].reason ? ` (${closures[0].reason})` : '';
                const err = new Error(`สนามปิดให้บริการในช่วงเวลาที่เลือก${reason}`);
                err.status = 400;
                throw err;
            }

            // Lock court row to serialize concurrent bookings for this court
            const [courts] = await txQuery("SELECT capacity FROM courts WHERE id = ? FOR UPDATE", [court_id]);
            if (courts.length === 0) {
                const err = new Error("ไม่พบข้อมูลสนาม");
                err.status = 404;
                throw err;
            }
            const capacity = courts[0].capacity || 1;

            // Check duplicate booking by status for the current slot
            const [existing] = await txQuery(
                "SELECT id, user_id FROM bookings WHERE court_id = ? AND booking_date = ? AND start_time = ? AND status IN ('PENDING', 'PRE_CONFIRMED', 'CHECKED_IN')",
                [court_id, date, startTime]
            );

            if (existing.length >= capacity) {
                const err = new Error("รอบเวลานี้มีผู้จองเต็มแล้ว");
                err.status = 409;
                throw err;
            }

            const hasBooked = existing.some(b => b.user_id === userId);
            if (hasBooked) {
                const err = new Error("คุณจองสนามนี้ในรอบเวลานี้ไปแล้ว");
                err.status = 409;
                throw err;
            }

            const bookingCode = generateBookingCode();
            const [result] = await txQuery(
                "INSERT INTO bookings (user_id, court_id, booking_date, start_time, end_time, status, booking_code) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)",
                [userId, court_id, date, startTime, endTime, bookingCode]
            );

            return { insertId: result.insertId, bookingCode };
        });

        res.json({ success: true, booking_id: bookingResult.insertId, booking_code: bookingResult.bookingCode });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error('Booking Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const userId = req.session?.user?.id || req.user?.id;

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
        console.error('Get My Bookings Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.preConfirm = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const userId = req.session?.user?.id || req.user?.id;
        const { booking_id } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        if (!booking_id) {
            return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
        }

        const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ? AND user_id = ?", [booking_id, userId]);
        if (bookings.length === 0) {
            return res.status(404).json({ error: "ไม่พบรายการจอง" });
        }

        const booking = bookings[0];
        if (booking.status !== 'PENDING') {
            return res.status(400).json({ error: "รายการจองไม่ได้อยู่ในสถานะรอยืนยัน" });
        }

        // Enforce pre-confirm window (open_minutes down to close_minutes before start_time)
        const openMinutes = await appSettingInt('pre_confirm_open_minutes', 10);
        const closeMinutes = await appSettingInt('pre_confirm_close_minutes', 5);

        const [windowCheck] = await pool.query(`
            SELECT 
                EXTRACT(EPOCH FROM (CAST(? || ' ' || ? AS TIMESTAMP) - CURRENT_TIMESTAMP))/60 as minutes_until_start
        `, [booking.booking_date, booking.start_time]);

        const minutesUntilStart = parseFloat(windowCheck[0]?.minutes_until_start);

        if (isNaN(minutesUntilStart) || minutesUntilStart > openMinutes) {
            return res.status(400).json({ 
                error: `ยังไม่ถึงช่วงเวลายืนยันสิทธิ์ (เปิดให้ยืนยันก่อนเริ่มรอบการใช้งาน ${openMinutes} นาที)` 
            });
        }

        if (minutesUntilStart < closeMinutes) {
            return res.status(400).json({ 
                error: `หมดเวลายืนยันสิทธิ์ล่วงหน้าแล้ว (ต้องยืนยันก่อนถึงเวลาอย่างน้อย ${closeMinutes} นาที)` 
            });
        }

        await pool.query("UPDATE bookings SET status = 'PRE_CONFIRMED', pre_confirmed_at = CURRENT_TIMESTAMP WHERE id = ?", [booking_id]);
        res.json({ success: true, message: "ยืนยันสิทธิ์การเข้าใช้งานเรียบร้อยแล้ว" });
    } catch (err) {
        console.error('Pre-confirm Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.checkIn = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const userId = req.session?.user?.id || req.user?.id;
        const { qr_payload, lat, lng } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        if (!qr_payload) {
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

        const checkinGraceMinutes = await appSettingInt('checkin_grace_minutes', 10);
        // Allow check-in from 10 minutes before start_time up to checkin_grace_minutes after start_time
        const earlyCheckinMinutes = 10;

        // Query eligible booking for user today
        const today = new Date().toISOString().split('T')[0];
        const [bookings] = await pool.query(`
            SELECT *,
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - CAST(booking_date || ' ' || start_time AS TIMESTAMP)))/60 as minutes_since_start
            FROM bookings
            WHERE user_id = ? AND court_id = ? AND booking_date = ? AND status = 'PRE_CONFIRMED'
            ORDER BY start_time ASC
        `, [userId, courtId, today]);

        if (bookings.length === 0) {
            return res.status(404).json({ error: "ไม่พบรายการจองที่ได้รับการยืนยันสิทธิ์สำหรับสนามนี้ในวันนี้" });
        }

        // Find the booking that matches the valid check-in time window
        const validBooking = bookings.find(b => {
            const m = parseFloat(b.minutes_since_start);
            return m >= -earlyCheckinMinutes && m <= checkinGraceMinutes;
        });

        if (!validBooking) {
            const firstBooking = bookings[0];
            const m = parseFloat(firstBooking.minutes_since_start);
            if (m < -earlyCheckinMinutes) {
                return res.status(400).json({
                    error: `ยังไม่ถึงเวลาเช็คอินของรอบนี้ (สามารถเช็คอินได้ล่วงหน้าไม่เกิน ${earlyCheckinMinutes} นาทีก่อนเริ่มรอบ)`
                });
            } else {
                return res.status(400).json({
                    error: `เลยกำหนดเวลาเช็คอินของรอบนี้แล้ว (อนุญาตสายได้ไม่เกิน ${checkinGraceMinutes} นาที)`
                });
            }
        }

        await pool.query(`
            UPDATE bookings
            SET status = 'CHECKED_IN', checked_in_at = CURRENT_TIMESTAMP, checkin_lat = ?, checkin_lng = ?, checkin_distance_m = ?
            WHERE id = ?
        `, [lat || null, lng || null, distMeters, validBooking.id]);

        res.json({ success: true, booking_id: validBooking.id, distance_m: distMeters });
    } catch (err) {
        console.error('CheckIn Error:', err);
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
        console.error('Get QR Token Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// --- User Booking Cancellation ---
exports.cancelBooking = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const userId = req.session?.user?.id || req.user?.id;
        const { booking_id, reason } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }
        if (!booking_id) {
            return res.status(400).json({ error: "ระบุรหัสการจองที่ต้องการยกเลิก" });
        }

        const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ? AND user_id = ?", [booking_id, userId]);
        if (bookings.length === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลการจองหรือคุณไม่มีสิทธิ์ยกเลิกรายการนี้" });
        }

        const booking = bookings[0];
        if (booking.status === 'CANCELLED') {
            return res.status(400).json({ error: "รายการจองนี้ถูกยกเลิกไปแล้ว" });
        }
        if (booking.status === 'CHECKED_IN') {
            return res.status(400).json({ error: "ไม่สามารถยกเลิกรายการที่เช็คอินแล้วได้" });
        }
        if (booking.status === 'MISSED') {
            return res.status(400).json({ error: "ไม่สามารถยกเลิกรายการที่พ้นกำหนดเวลาแล้วได้" });
        }

        // Check cancellation lead time
        const leadMinutes = await appSettingInt('cancellation_lead_minutes', 30);
        const [timeCheck] = await pool.query(`
            SELECT CASE 
                WHEN CURRENT_TIMESTAMP > (CAST(? || ' ' || ? AS TIMESTAMP) - (? || ' minutes')::interval)
                THEN 1 ELSE 0 
            END as is_too_late
        `, [booking.booking_date, booking.start_time, leadMinutes]);

        if (timeCheck && timeCheck[0]?.is_too_late === 1) {
            return res.status(400).json({ 
                error: `ไม่สามารถยกเลิกได้ เนื่องจากต้องยกเลิกล่วงหน้าอย่างน้อย ${leadMinutes} นาที ก่อนเริ่มการใช้งาน` 
            });
        }

        const cancelReason = reason ? reason.trim() : 'ยกเลิกโดยผู้ใช้งาน';
        let promotedResult = null;

        await pool.withTransaction(async (txQuery) => {
            await txQuery(
                "UPDATE bookings SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ? WHERE id = ?",
                [cancelReason, booking_id]
            );
            promotedResult = await checkAndPromoteWaitlist(txQuery, booking.court_id, booking.booking_date, booking.start_time, booking.end_time);
        });

        await logAudit(req, {
            action: 'USER_CANCEL_BOOKING',
            target_type: 'booking',
            target_id: booking_id,
            reason: cancelReason,
            details: { 
                court_id: booking.court_id, 
                booking_date: booking.booking_date, 
                start_time: booking.start_time,
                auto_promoted: promotedResult ? promotedResult.user_id : null
            }
        });

        if (promotedResult) {
            await logAudit(req, {
                action: 'WAITLIST_AUTO_PROMOTED',
                target_type: 'booking_waitlists',
                target_id: promotedResult.waitlist_id,
                reason: 'สล็อตว่างจากการยกเลิกการจอง ระบบเลื่อนคิวรอขึ้นเป็นผู้จองอัตโนมัติ',
                details: { 
                    new_booking_id: promotedResult.booking_id, 
                    user_id: promotedResult.user_id,
                    court_id: booking.court_id, 
                    booking_date: booking.booking_date, 
                    start_time: booking.start_time 
                }
            });
        }

        res.json({ 
            success: true, 
            message: "ยกเลิกการจองเรียบร้อยแล้ว",
            waitlist_promoted: !!promotedResult 
        });
    } catch (err) {
        console.error('Cancel Booking Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// --- Staff / Admin Operational Endpoints ---
exports.getAdminBookings = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const { date, court_id, status, search } = req.query;

        let sql = `
            SELECT b.*, 
                   u.name as user_name, u.email as user_email, u.phone as user_phone,
                   c.name as court_name, c.type as court_type,
                   staff.name as manual_override_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN courts c ON b.court_id = c.id
            LEFT JOIN users staff ON b.manual_override_by = staff.id
            WHERE 1=1
        `;
        const params = [];

        if (date) {
            sql += ` AND b.booking_date = ?`;
            params.push(date);
        }
        if (court_id) {
            sql += ` AND b.court_id = ?`;
            params.push(court_id);
        }
        if (status) {
            sql += ` AND b.status = ?`;
            params.push(status);
        }
        if (search) {
            sql += ` AND (u.name ILIKE ? OR u.email ILIKE ? OR b.booking_code ILIKE ?)`;
            const q = `%${search.trim()}%`;
            params.push(q, q, q);
        }

        sql += ` ORDER BY b.booking_date DESC, b.start_time ASC, b.id DESC LIMIT 150`;

        const [bookings] = await pool.query(sql, params);
        res.json({ bookings });
    } catch (err) {
        console.error('Get Admin Bookings Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.adminManualCheckin = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        const adminUser = req.session?.user || req.user || {};

        const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [id]);
        if (bookings.length === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลการจอง" });
        }
        const b = bookings[0];
        if (b.status === 'CHECKED_IN') {
            return res.status(400).json({ error: "รายการนี้เช็คอินไปแล้ว" });
        }
        if (b.status === 'CANCELLED') {
            return res.status(400).json({ error: "รายการนี้ถูกยกเลิกแล้ว ไม่สามารถเช็คอินได้" });
        }

        const overrideReason = reason ? reason.trim() : 'เช็คอินด้วยตนเองโดยเจ้าหน้าที่ (Manual Override)';

        await pool.query(
            "UPDATE bookings SET status = 'CHECKED_IN', checked_in_at = CURRENT_TIMESTAMP, manual_override_by = ? WHERE id = ?",
            [adminUser.id || null, id]
        );

        await logAudit(req, {
            action: 'MANUAL_CHECKIN',
            target_type: 'booking',
            target_id: id,
            reason: overrideReason,
            details: { previous_status: b.status, court_id: b.court_id, booking_date: b.booking_date, start_time: b.start_time }
        });

        res.json({ success: true, message: "บันทึกการเช็คอินโดยเจ้าหน้าที่สำเร็จ" });
    } catch (err) {
        console.error('Admin Manual Checkin Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.adminCancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        const adminUser = req.session?.user || req.user || {};

        const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [id]);
        if (bookings.length === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลการจอง" });
        }
        const b = bookings[0];
        if (b.status === 'CANCELLED') {
            return res.status(400).json({ error: "รายการนี้ถูกยกเลิกไปแล้ว" });
        }

        const cancelReason = reason ? reason.trim() : 'ยกเลิกโดยเจ้าหน้าที่/ผู้ดูแลระบบ';
        let promotedResult = null;

        await pool.withTransaction(async (txQuery) => {
            await txQuery(
                "UPDATE bookings SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?, manual_override_by = ? WHERE id = ?",
                [cancelReason, adminUser.id || null, id]
            );
            promotedResult = await checkAndPromoteWaitlist(txQuery, b.court_id, b.booking_date, b.start_time, b.end_time);
        });

        await logAudit(req, {
            action: 'ADMIN_CANCEL_BOOKING',
            target_type: 'booking',
            target_id: id,
            reason: cancelReason,
            details: { 
                previous_status: b.status, 
                court_id: b.court_id, 
                booking_date: b.booking_date, 
                start_time: b.start_time,
                auto_promoted: promotedResult ? promotedResult.user_id : null 
            }
        });

        if (promotedResult) {
            await logAudit(req, {
                action: 'WAITLIST_AUTO_PROMOTED',
                target_type: 'booking_waitlists',
                target_id: promotedResult.waitlist_id,
                reason: 'สล็อตว่างจากการยกเลิกโดยเจ้าหน้าที่ ระบบเลื่อนคิวรอขึ้นเป็นผู้จองอัตโนมัติ',
                details: { 
                    new_booking_id: promotedResult.booking_id, 
                    user_id: promotedResult.user_id,
                    court_id: b.court_id, 
                    booking_date: b.booking_date, 
                    start_time: b.start_time 
                }
            });
        }

        res.json({ 
            success: true, 
            message: "ยกเลิกการจองสำเร็จ",
            waitlist_promoted: !!promotedResult 
        });
    } catch (err) {
        console.error('Admin Cancel Booking Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// --- Waitlist System Endpoints ---
exports.joinWaitlist = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const { court_id, date, time } = req.body;
        if (!court_id || !date || !time) {
            return res.status(400).json({ error: "ข้อมูลสำหรับเข้าคิวไม่ครบถ้วน" });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) {
            return res.status(400).json({ error: "รูปแบบวันที่หรือเวลาไม่ถูกต้อง" });
        }

        // Calculate time strings
        const now = new Date();
        const bangkokTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
        const todayStr = bangkokTime.toISOString().split('T')[0];
        const currentHours = String(bangkokTime.getHours()).padStart(2, '0');
        const currentMinutes = String(bangkokTime.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}:00`;

        const [hours, minutes] = time.split(':').map(Number);
        const endHours = String((hours + 1) % 24).padStart(2, '0');
        const endTime = `${endHours}:${String(minutes).padStart(2, '0')}:00`;
        const startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        if (date < todayStr || (date === todayStr && startTime <= currentTimeStr)) {
            return res.status(400).json({ error: "ไม่สามารถเข้าคิวรอบเวลาที่ผ่านมาแล้วได้" });
        }

        const maxAdvanceDays = await appSettingInt('max_advance_booking_days', 7);
        const maxDateObj = new Date(bangkokTime.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
        const maxDateStr = maxDateObj.toISOString().split('T')[0];
        if (date > maxDateStr) {
            return res.status(400).json({ 
                error: `ระบบเปิดให้เข้าคิวล่วงหน้าได้ไม่เกิน ${maxAdvanceDays} วัน` 
            });
        }

        // Verify that the slot is actually full
        const [courtRows] = await pool.query("SELECT capacity, name FROM courts WHERE id = ?", [court_id]);
        if (!courtRows || courtRows.length === 0) {
            return res.status(404).json({ error: "ไม่พบสนามที่ระบุ" });
        }
        const capacity = courtRows[0].capacity || 1;

        const [activeBookings] = await pool.query(`
            SELECT COUNT(*) as cnt FROM bookings
            WHERE court_id = ? AND booking_date = ? AND start_time = ?
              AND status IN ('PENDING', 'PRE_CONFIRMED', 'CHECKED_IN')
        `, [court_id, date, startTime]);

        const currentBooked = parseInt(activeBookings[0]?.cnt || 0, 10);
        if (currentBooked < capacity) {
            return res.status(400).json({ 
                error: "รอบเวลานี้ยังมีที่ว่าง สามารถกดจองได้ทันทีโดยไม่ต้องเข้าคิวรอ" 
            });
        }

        // Check if user is already booked for this slot
        const [userActiveBooking] = await pool.query(`
            SELECT id FROM bookings
            WHERE user_id = ? AND court_id = ? AND booking_date = ? AND start_time = ?
              AND status IN ('PENDING', 'PRE_CONFIRMED', 'CHECKED_IN')
        `, [userId, court_id, date, startTime]);

        if (userActiveBooking && userActiveBooking.length > 0) {
            return res.status(400).json({ error: "คุณมีการจองรอบเวลานี้อยู่แล้ว" });
        }

        // Check if user is already in waiting list for this slot
        const [existingWaitlist] = await pool.query(`
            SELECT id FROM booking_waitlists
            WHERE user_id = ? AND court_id = ? AND booking_date = ? AND start_time = ? AND status = 'WAITING'
        `, [userId, court_id, date, startTime]);

        if (existingWaitlist && existingWaitlist.length > 0) {
            return res.status(400).json({ error: "คุณอยู่ในคิวรอของรอบเวลานี้แล้ว" });
        }

        // Insert into booking_waitlists
        const [result] = await pool.query(`
            INSERT INTO booking_waitlists (user_id, court_id, booking_date, start_time, end_time, status)
            VALUES (?, ?, ?, ?, ?, 'WAITING')
            RETURNING id
        `, [userId, court_id, date, startTime, endTime]);

        const waitlistId = result[0]?.id || result.insertId;

        // Calculate queue position
        const [posRows] = await pool.query(`
            SELECT COUNT(*) as pos FROM booking_waitlists
            WHERE court_id = ? AND booking_date = ? AND start_time = ? AND status = 'WAITING' AND id <= ?
        `, [court_id, date, startTime, waitlistId]);

        const queuePos = parseInt(posRows[0]?.pos || 1, 10);

        await logAudit(req, {
            action: 'WAITLIST_JOINED',
            target_type: 'booking_waitlists',
            target_id: waitlistId,
            reason: 'ผู้ใช้เข้าคิวรอรับสิทธิ์',
            details: { court_id, booking_date: date, start_time: startTime, queue_position: queuePos }
        });

        res.json({
            success: true,
            message: `เข้าคิวรอสำเร็จ คุณอยู่ในลำดับคิวที่ ${queuePos}`,
            waitlist_id: waitlistId,
            queue_position: queuePos
        });
    } catch (err) {
        console.error('Join Waitlist Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getMyWaitlists = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const [waitlists] = await pool.query(`
            SELECT w.*, 
                   c.name as court_name, c.type as court_type, c.price as court_price,
                   c.fee_amount, c.is_fee_required,
                   b.booking_code as promoted_booking_code,
                   b.status as promoted_booking_status,
                   (SELECT COUNT(*) FROM booking_waitlists sub 
                    WHERE sub.court_id = w.court_id AND sub.booking_date = w.booking_date 
                      AND sub.start_time = w.start_time AND sub.status = 'WAITING' 
                      AND sub.id <= w.id) as queue_position,
                   (SELECT COUNT(*) FROM booking_waitlists sub 
                    WHERE sub.court_id = w.court_id AND sub.booking_date = w.booking_date 
                      AND sub.start_time = w.start_time AND sub.status = 'WAITING') as total_waiting
            FROM booking_waitlists w
            JOIN courts c ON w.court_id = c.id
            LEFT JOIN bookings b ON w.promoted_booking_id = b.id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `, [userId]);

        res.json({ waitlists });
    } catch (err) {
        console.error('Get My Waitlists Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.cancelWaitlist = async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const { waitlist_id } = req.body;
        if (!waitlist_id) {
            return res.status(400).json({ error: "ระบุรหัสคิวที่ต้องการยกเลิก" });
        }

        const [rows] = await pool.query(
            "SELECT * FROM booking_waitlists WHERE id = ? AND user_id = ?",
            [waitlist_id, userId]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "ไม่พบคิวนี้หรือคุณไม่มีสิทธิ์ยกเลิก" });
        }

        const item = rows[0];
        if (item.status !== 'WAITING') {
            return res.status(400).json({ error: `ไม่สามารถยกเลิกคิวที่มีสถานะเป็น ${item.status} ได้` });
        }

        await pool.query(
            "UPDATE booking_waitlists SET status = 'CANCELLED' WHERE id = ?",
            [waitlist_id]
        );

        await logAudit(req, {
            action: 'WAITLIST_CANCELLED',
            target_type: 'booking_waitlists',
            target_id: waitlist_id,
            reason: 'ผู้ใช้ยกเลิกการรอคิว',
            details: { court_id: item.court_id, booking_date: item.booking_date, start_time: item.start_time }
        });

        res.json({ success: true, message: "ยกเลิกการรอคิวเรียบร้อยแล้ว" });
    } catch (err) {
        console.error('Cancel Waitlist Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getAdminWaitlists = async (req, res) => {
    try {
        await applyBookingTimeouts();
        const { date, court_id, status } = req.query;

        let sql = `
            SELECT w.*, 
                   u.name as user_name, u.email as user_email, u.phone as user_phone,
                   c.name as court_name, c.type as court_type,
                   b.booking_code as promoted_booking_code,
                   b.status as promoted_booking_status
            FROM booking_waitlists w
            JOIN users u ON w.user_id = u.id
            JOIN courts c ON w.court_id = c.id
            LEFT JOIN bookings b ON w.promoted_booking_id = b.id
            WHERE 1=1
        `;
        const params = [];

        if (date) {
            sql += ` AND w.booking_date = ?`;
            params.push(date);
        }
        if (court_id) {
            sql += ` AND w.court_id = ?`;
            params.push(court_id);
        }
        if (status) {
            sql += ` AND w.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY w.booking_date DESC, w.start_time ASC, w.created_at ASC LIMIT 150`;

        const [waitlists] = await pool.query(sql, params);
        res.json({ waitlists });
    } catch (err) {
        console.error('Get Admin Waitlists Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};
