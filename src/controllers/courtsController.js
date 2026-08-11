const pool = require('../config/db');
const { applyBookingTimeouts } = require('../utils/helpers');

exports.getCourts = async (req, res) => {
    let date = req.query.date;
    if (!date) {
        const d = new Date();
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, -1);
        date = localISOTime.split('T')[0];
    }

    try {
        await applyBookingTimeouts();

        const [courts] = await pool.query("SELECT * FROM courts");
        const [closures] = await pool.query("SELECT court_id, reason FROM court_closures WHERE close_date = ?", [date]);
        
        let isAllClosed = false;
        const closedCourts = {};
        
        for (const cl of closures) {
            if (cl.court_id === null) {
                isAllClosed = true;
                break;
            } else {
                closedCourts[cl.court_id] = cl.reason;
            }
        }

        const [allSlots] = await pool.query("SELECT court_id, start_time FROM court_timeslots ORDER BY start_time");
        
        const availableSlots = {};
        const now = new Date();
        
        for (const s of allSlots) {
            let timeStr = s.start_time;
            if (timeStr instanceof Date) {
                 timeStr = timeStr.toTimeString().substring(0, 5);
            } else if (typeof timeStr === 'string') {
                 timeStr = timeStr.substring(0, 5);
            }

            const cid = s.court_id;
            const slotStart = new Date(`${date}T${timeStr}:00`);

            if (slotStart <= now) {
                continue;
            }

            if (isAllClosed || closedCourts[cid]) {
                continue;
            }

            if (!availableSlots[cid]) {
                availableSlots[cid] = [];
            }
            availableSlots[cid].push(timeStr);
        }

        const [bookings] = await pool.query(`
            SELECT court_id, start_time FROM bookings 
            WHERE booking_date = ? AND status IN ('PENDING', 'PRE_CONFIRMED', 'CHECKED_IN')
        `, [date]);

        const bookedSlots = {};
        for (const b of bookings) {
            let timeStr = b.start_time;
            if (timeStr instanceof Date) {
                 timeStr = timeStr.toTimeString().substring(0, 5);
            } else if (typeof timeStr === 'string') {
                 timeStr = timeStr.substring(0, 5);
            }
            
            if (!bookedSlots[b.court_id]) {
                bookedSlots[b.court_id] = {};
            }
            if (!bookedSlots[b.court_id][timeStr]) {
                bookedSlots[b.court_id][timeStr] = 0;
            }
            bookedSlots[b.court_id][timeStr] += 1;
        }

        res.json({
            courts,
            availableSlots,
            bookedSlots,
            date,
            isAllClosed,
            closedCourts
        });

    } catch (err) {
        console.error('Error fetching courts:', err);
        res.status(500).json({ error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" });
    }
};
