const pool = require('../config/db');
const crypto = require('crypto');

async function appSetting(key, defaultValue = null) {
    try {
        const [rows] = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = ?", [key]);
        if (rows && rows.length > 0) {
            return rows[0].setting_value;
        }
    } catch (e) {}
    return defaultValue;
}

async function appSettingInt(key, defaultValue) {
    const val = await appSetting(key, defaultValue);
    const num = parseInt(val, 10);
    return isNaN(num) ? defaultValue : num;
}

async function checkAndPromoteWaitlist(queryFn, courtId, bookingDate, startTime, endTime) {
    try {
        const [waitlistRows] = await queryFn(`
            SELECT * FROM booking_waitlists 
            WHERE court_id = ? AND booking_date = ? AND start_time = ? AND status = 'WAITING'
            ORDER BY created_at ASC, id ASC
            LIMIT 1
            FOR UPDATE
        `, [courtId, bookingDate, startTime]);

        if (!waitlistRows || waitlistRows.length === 0) {
            return null;
        }

        const candidate = waitlistRows[0];

        const [courtRows] = await queryFn("SELECT capacity FROM courts WHERE id = ?", [courtId]);
        const capacity = (courtRows && courtRows[0]?.capacity) || 1;

        const [activeRows] = await queryFn(`
            SELECT COUNT(*) as cnt FROM bookings
            WHERE court_id = ? AND booking_date = ? AND start_time = ?
              AND status IN ('PENDING', 'PRE_CONFIRMED', 'CHECKED_IN')
        `, [courtId, bookingDate, startTime]);

        const activeCount = parseInt(activeRows[0]?.cnt || 0, 10);
        if (activeCount >= capacity) {
            return null;
        }

        const bookingCode = 'KKU-SP-' + crypto.randomBytes(3).toString('hex').toUpperCase();

        const [insertRes] = await queryFn(`
            INSERT INTO bookings (user_id, court_id, booking_date, start_time, end_time, status, booking_code)
            VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
            RETURNING id
        `, [candidate.user_id, courtId, bookingDate, startTime, endTime || candidate.end_time, bookingCode]);

        const newBookingId = insertRes[0]?.id || insertRes.insertId;

        await queryFn(`
            UPDATE booking_waitlists
            SET status = 'PROMOTED', promoted_booking_id = ?, promoted_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [newBookingId, candidate.id]);

        return {
            promoted: true,
            waitlist_id: candidate.id,
            user_id: candidate.user_id,
            booking_id: newBookingId,
            booking_code: bookingCode
        };
    } catch (err) {
        console.error('checkAndPromoteWaitlist error:', err);
        return null;
    }
}

async function applyBookingTimeouts() {
    try {
        const preCloseMinutes = await appSettingInt('pre_confirm_close_minutes', 5);
        const checkinGraceMinutes = await appSettingInt('checkin_grace_minutes', 10);

        // Find pending bookings that are timing out so we can promote waitlist
        const [timingOut] = await pool.query(`
            SELECT id, court_id, booking_date, start_time, end_time
            FROM bookings
            WHERE status = 'PENDING'
              AND CAST(booking_date || ' ' || start_time AS TIMESTAMP) <= CURRENT_TIMESTAMP + (? || ' minutes')::interval
        `, [preCloseMinutes]);

        let cancelledCount = 0;
        let promotedCount = 0;

        if (timingOut && timingOut.length > 0) {
            for (const b of timingOut) {
                await pool.withTransaction(async (txQuery) => {
                    await txQuery("UPDATE bookings SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?", [b.id]);
                    cancelledCount++;
                    const res = await checkAndPromoteWaitlist(txQuery, b.court_id, b.booking_date, b.start_time, b.end_time);
                    if (res) promotedCount++;
                });
            }
        }

        const [missedResult] = await pool.query(`
            UPDATE bookings
            SET status = 'MISSED', missed_at = CURRENT_TIMESTAMP
            WHERE status = 'PRE_CONFIRMED'
              AND CURRENT_TIMESTAMP > CAST(booking_date || ' ' || start_time AS TIMESTAMP) + (? || ' minutes')::interval
        `, [checkinGraceMinutes]);

        return {
            cancelled: cancelledCount,
            promoted: promotedCount,
            missed: missedResult.affectedRows || 0
        };
    } catch (err) {
        console.error('Error applying booking timeouts:', err);
        return { cancelled: 0, promoted: 0, missed: 0 };
    }
}

function getDynamicQrSecret() {
    if (process.env.NODE_ENV === 'production' && !process.env.QR_DYNAMIC_SECRET) {
        throw new Error('FATAL: QR_DYNAMIC_SECRET must be configured in production environment.');
    }
    return process.env.QR_DYNAMIC_SECRET || 'kku-sportpass-dynamic-qr-v1';
}

function getStaticQrSecret() {
    if (process.env.NODE_ENV === 'production' && !process.env.QR_STATIC_SECRET) {
        throw new Error('FATAL: QR_STATIC_SECRET must be configured in production environment.');
    }
    return process.env.QR_STATIC_SECRET || 'kku-sportpass-static-court-qr-v1';
}

function makeQrPayload(courtId, minute = null) {
    minute = minute !== null ? minute : Math.floor(Date.now() / 60000);
    const secret = getDynamicQrSecret();
    const sig = crypto.createHmac('sha256', secret).update(`${courtId}|${minute}`).digest('hex');
    return `kku-sportpass:${courtId}:${minute}:${sig.substring(0, 16)}`;
}

function makeStaticQrPayload(courtId) {
    const secret = getStaticQrSecret();
    const sig = crypto.createHmac('sha256', secret).update(courtId).digest('hex');
    return `kku-sportpass-court:${courtId}:${sig.substring(0, 20)}`;
}

function parseQrCourtId(payload) {
    if (!payload) return null;
    const staticMatch = payload.match(/^kku-sportpass-court:([a-zA-Z0-9_-]+):([a-f0-9]{20})$/);
    if (staticMatch) {
        const courtId = staticMatch[1];
        return makeStaticQrPayload(courtId) === payload ? courtId : null;
    }

    const dynamicMatch = payload.match(/^kku-sportpass:([a-zA-Z0-9_-]+):(\d+):([a-f0-9]{16})$/);
    if (dynamicMatch) {
        const courtId = dynamicMatch[1];
        const minute = parseInt(dynamicMatch[2], 10);
        const currentMinute = Math.floor(Date.now() / 60000);
        
        if (Math.abs(currentMinute - minute) > 1) {
            return null;
        }
        if (makeQrPayload(courtId, minute) !== payload) {
            return null;
        }
        return courtId;
    }

    // Allow raw ID fallback ONLY in development/testing mode
    if (process.env.NODE_ENV !== 'production' && /^[a-zA-Z0-9_-]+$/.test(payload)) {
        return payload;
    }

    return null;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

module.exports = {
    appSetting,
    appSettingInt,
    applyBookingTimeouts,
    checkAndPromoteWaitlist,
    makeQrPayload,
    makeStaticQrPayload,
    parseQrCourtId,
    distanceMeters
};
