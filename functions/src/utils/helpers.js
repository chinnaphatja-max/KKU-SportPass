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

async function applyBookingTimeouts() {
    try {
        const preCloseMinutes = await appSettingInt('pre_confirm_close_minutes', 5);
        const checkinGraceMinutes = await appSettingInt('checkin_grace_minutes', 10);

        const [cancelResult] = await pool.query(`
            UPDATE bookings
            SET status = 'CANCELLED', cancelled_at = datetime('now')
            WHERE status = 'PENDING'
              AND datetime(booking_date || ' ' || start_time) <= datetime('now', '+' || ? || ' minutes')
        `, [preCloseMinutes]);

        const [missedResult] = await pool.query(`
            UPDATE bookings
            SET status = 'MISSED', missed_at = datetime('now')
            WHERE status = 'PRE_CONFIRMED'
              AND datetime('now') > datetime(booking_date || ' ' || start_time, '+' || ? || ' minutes')
        `, [checkinGraceMinutes]);

        return {
            cancelled: cancelResult.affectedRows || 0,
            missed: missedResult.affectedRows || 0
        };
    } catch (err) {
        console.error('Error applying booking timeouts:', err);
        return { cancelled: 0, missed: 0 };
    }
}

function makeQrPayload(courtId, minute = null) {
    minute = minute !== null ? minute : Math.floor(Date.now() / 60000);
    const secret = 'kku-sportpass-dynamic-qr-v1';
    const sig = crypto.createHmac('sha256', secret).update(`${courtId}|${minute}`).digest('hex');
    return `kku-sportpass:${courtId}:${minute}:${sig.substring(0, 16)}`;
}

function makeStaticQrPayload(courtId) {
    const secret = 'kku-sportpass-static-court-qr-v1';
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

    return /^[a-zA-Z0-9_-]+$/.test(payload) ? payload : null;
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
    makeQrPayload,
    makeStaticQrPayload,
    parseQrCourtId,
    distanceMeters
};
