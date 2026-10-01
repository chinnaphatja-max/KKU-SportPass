const pool = require('../config/db');
const { applyBookingTimeouts } = require('../utils/helpers');

// Throttled Timeout Execution to prevent DB locking on high concurrency reads
let lastTimeoutRun = 0;
const TIMEOUT_THROTTLE_MS = 60 * 1000; // 60 seconds

async function checkThrottledTimeouts() {
    const now = Date.now();
    if (now - lastTimeoutRun > TIMEOUT_THROTTLE_MS) {
        lastTimeoutRun = now;
        try {
            await applyBookingTimeouts();
        } catch (e) {
            console.error('Throttled timeout error:', e.message);
        }
    }
}

function isSlotClosedByClosure(closure, slotStartTime, slotEndTime) {
    if (!closure.start_time && !closure.end_time) {
        return true; // All-day closure
    }
    const cStart = closure.start_time.length === 5 ? `${closure.start_time}:00` : closure.start_time;
    const cEnd = closure.end_time.length === 5 ? `${closure.end_time}:00` : closure.end_time;
    const sStart = slotStartTime.length === 5 ? `${slotStartTime}:00` : slotStartTime;
    const sEnd = slotEndTime.length === 5 ? `${slotEndTime}:00` : slotEndTime;

    return cStart < sEnd && cEnd > sStart;
}

exports.getCourts = async (req, res) => {
    // Current Thailand Time (UTC+7)
    const now = new Date();
    const bangkokTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const todayStr = bangkokTime.toISOString().split('T')[0];
    const currentHours = String(bangkokTime.getHours()).padStart(2, '0');
    const currentMinutes = String(bangkokTime.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}:00`;

    let date = req.query.date;
    if (!date) {
        date = todayStr;
    }

    try {
        // Execute background timeouts with throttle so public queries stay lightning fast
        await checkThrottledTimeouts();

        const [courts] = await pool.query("SELECT * FROM courts ORDER BY id ASC");
        const [closures] = await pool.query("SELECT court_id, reason, start_time, end_time FROM court_closures WHERE close_date = ?", [date]);
        
        let isAllClosed = false;
        const allDayClosedCourts = {};
        const partialClosures = [];
        
        for (const cl of closures) {
            if (cl.court_id === null) {
                if (!cl.start_time && !cl.end_time) {
                    isAllClosed = true;
                } else {
                    partialClosures.push(cl);
                }
            } else if (!cl.start_time && !cl.end_time) {
                allDayClosedCourts[cl.court_id] = cl.reason;
            } else {
                partialClosures.push(cl);
            }
        }

        const [allSlots] = await pool.query("SELECT court_id, start_time, end_time FROM court_timeslots ORDER BY start_time ASC");
        
        const operatingSlots = {};
        const availableSlots = {};
        const pastSlots = {};
        const walkInSlots = {};
        const slotEndTimes = {};

        for (const s of allSlots) {
            let timeStr = s.start_time;
            if (timeStr instanceof Date) {
                 timeStr = timeStr.toTimeString().substring(0, 5);
            } else if (typeof timeStr === 'string') {
                 timeStr = timeStr.substring(0, 5);
            }

            let endTimeStr = s.end_time;
            if (!endTimeStr) {
                const [h, m] = timeStr.split(':').map(Number);
                endTimeStr = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            } else if (endTimeStr instanceof Date) {
                endTimeStr = endTimeStr.toTimeString().substring(0, 5);
            } else if (typeof endTimeStr === 'string') {
                endTimeStr = endTimeStr.substring(0, 5);
            }

            const cid = s.court_id;
            if (!operatingSlots[cid]) {
                operatingSlots[cid] = [];
            }
            operatingSlots[cid].push(timeStr);

            if (!slotEndTimes[cid]) slotEndTimes[cid] = {};
            slotEndTimes[cid][timeStr] = endTimeStr;
        }

        // Active bookings query
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

        // Waitlist counts query
        const waitlistCounts = {};
        try {
            const [wlList] = await pool.query(`
                SELECT court_id, start_time, COUNT(*) as cnt 
                FROM booking_waitlists 
                WHERE booking_date = ? AND status = 'WAITING'
                GROUP BY court_id, start_time
            `, [date]);
            for (const wl of wlList) {
                let timeStr = wl.start_time;
                if (timeStr instanceof Date) timeStr = timeStr.toTimeString().substring(0, 5);
                else if (typeof timeStr === 'string') timeStr = timeStr.substring(0, 5);

                if (!waitlistCounts[wl.court_id]) waitlistCounts[wl.court_id] = {};
                waitlistCounts[wl.court_id][timeStr] = parseInt(wl.cnt, 10) || 0;
            }
        } catch (wlErr) {
            console.warn('Could not query waitlist counts:', wlErr.message);
        }

        // Categorize slot availability including Walk-in for dropped slots during active hour
        for (const s of allSlots) {
            let timeStr = s.start_time;
            if (timeStr instanceof Date) timeStr = timeStr.toTimeString().substring(0, 5);
            else if (typeof timeStr === 'string') timeStr = timeStr.substring(0, 5);

            const cid = s.court_id;
            const endTimeStr = slotEndTimes[cid]?.[timeStr] || '23:59';
            const courtObj = courts.find(c => String(c.id) === String(cid));
            const capacity = parseInt(courtObj?.capacity, 10) || 1;
            const bookedCount = bookedSlots[cid]?.[timeStr] || 0;
            const waitlistCount = waitlistCounts[cid]?.[timeStr] || 0;

            const isPastSession = (date < todayStr) || (date === todayStr && `${endTimeStr}:00` <= currentTimeStr);
            const isOngoingSession = (date === todayStr && `${timeStr}:00` <= currentTimeStr && currentTimeStr < `${endTimeStr}:00`);

            if (isAllClosed || allDayClosedCourts[cid]) {
                continue;
            }

            // Check partial closures
            const isBlockedByPartial = partialClosures.some(cl => 
                (cl.court_id === null || cl.court_id === cid) &&
                isSlotClosedByClosure(cl, timeStr, endTimeStr)
            );
            if (isBlockedByPartial) {
                continue;
            }

            if (!availableSlots[cid]) availableSlots[cid] = [];
            if (!pastSlots[cid]) pastSlots[cid] = [];
            if (!walkInSlots[cid]) walkInSlots[cid] = [];

            if (isPastSession) {
                pastSlots[cid].push(timeStr);
            } else if (isOngoingSession) {
                // Ongoing hour: If booked user dropped (or slot not full) and NO waitlist queue -> Open for Walk-in!
                if (bookedCount < capacity && waitlistCount === 0) {
                    walkInSlots[cid].push(timeStr);
                    availableSlots[cid].push(timeStr);
                } else {
                    pastSlots[cid].push(timeStr);
                }
            } else {
                // Future slot on selected date
                availableSlots[cid].push(timeStr);
            }
        }


        // Active user's bookings & waitlists if logged in
        const userId = req.session?.user?.id || req.user?.id;
        const userBookings = {};
        const userWaitlists = {};

        if (userId) {
            try {
                const [uBookings] = await pool.query(`
                    SELECT id, court_id, start_time, status, booking_code
                    FROM bookings
                    WHERE user_id = ? AND booking_date = ? AND status IN ('PENDING', 'PRE_CONFIRMED', 'CHECKED_IN')
                `, [userId, date]);
                for (const ub of uBookings) {
                    let timeStr = ub.start_time;
                    if (timeStr instanceof Date) timeStr = timeStr.toTimeString().substring(0, 5);
                    else if (typeof timeStr === 'string') timeStr = timeStr.substring(0, 5);

                    if (!userBookings[ub.court_id]) userBookings[ub.court_id] = {};
                    userBookings[ub.court_id][timeStr] = {
                        id: ub.id,
                        status: ub.status,
                        booking_code: ub.booking_code
                    };
                }

                const [uWaitlists] = await pool.query(`
                    SELECT id, court_id, start_time, status
                    FROM booking_waitlists
                    WHERE user_id = ? AND booking_date = ? AND status = 'WAITING'
                `, [userId, date]);
                for (const uw of uWaitlists) {
                    let timeStr = uw.start_time;
                    if (timeStr instanceof Date) timeStr = timeStr.toTimeString().substring(0, 5);
                    else if (typeof timeStr === 'string') timeStr = timeStr.substring(0, 5);

                    if (!userWaitlists[uw.court_id]) userWaitlists[uw.court_id] = {};
                    userWaitlists[uw.court_id][timeStr] = {
                        id: uw.id,
                        status: uw.status
                    };
                }
            } catch (uErr) {
                console.warn('Could not query user-specific slot status:', uErr.message);
            }
        }

        // Enrich court metadata with capacity-aware status calculation
        const enrichedCourts = courts.map(court => {
            const capacity = parseInt(court.capacity, 10) || 1;
            const courtSlots = availableSlots[court.id] || [];
            const courtBooked = bookedSlots[court.id] || {};

            let fullSlotsCount = 0;
            let totalAvailableCapacity = 0;

            for (const slotTime of courtSlots) {
                const bookedCount = courtBooked[slotTime] || 0;
                const remaining = Math.max(0, capacity - bookedCount);
                totalAvailableCapacity += remaining;
                if (bookedCount >= capacity) {
                    fullSlotsCount++;
                }
            }

            const isFullyBooked = courtSlots.length > 0 && fullSlotsCount >= courtSlots.length;
            const isClosed = Boolean(isAllClosed || allDayClosedCourts[court.id]);

            return {
                ...court,
                capacity,
                total_slots_count: courtSlots.length,
                full_slots_count: fullSlotsCount,
                available_capacity_count: totalAvailableCapacity,
                is_fully_booked: isFullyBooked,
                is_closed: isClosed,
                closed_reason: allDayClosedCourts[court.id] || null
            };
        });

        res.json({
            courts: enrichedCourts,
            operatingSlots,
            availableSlots,
            pastSlots,
            walkInSlots,
            bookedSlots,
            waitlistCounts,
            userBookings,
            userWaitlists,
            date,
            today: todayStr,
            serverTime: currentTimeStr,
            isAllClosed,
            closedCourts: allDayClosedCourts
        });


    } catch (err) {
        console.error('Error fetching courts:', err);
        res.status(500).json({ error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" });
    }
};

exports.isSlotClosedByClosure = isSlotClosedByClosure;
