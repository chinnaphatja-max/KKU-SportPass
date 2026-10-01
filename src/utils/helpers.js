const pool = require('../config/db');
const crypto = require('crypto');

// In-Memory Settings Cache with TTL to reduce database query load
const settingsCache = new Map();
const SETTING_CACHE_TTL_MS = 60 * 1000; // 60 seconds

function invalidateSettingCache(key = null) {
    if (key) {
        settingsCache.delete(key);
    } else {
        settingsCache.clear();
    }
}

async function appSetting(key, defaultValue = null) {
    const cached = settingsCache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
        return cached.value;
    }

    try {
        const [rows] = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = ?", [key]);
        if (rows && rows.length > 0) {
            const val = rows[0].setting_value;
            settingsCache.set(key, { value: val, expiresAt: now + SETTING_CACHE_TTL_MS });
            return val;
        }
    } catch (e) {}

    // Cache fallback to prevent DB hammering on missing keys
    settingsCache.set(key, { value: defaultValue, expiresAt: now + (SETTING_CACHE_TTL_MS / 2) });
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

        // Send in-app notification to the promoted candidate
        try {
            const { createNotification } = require('./notifications');
            await createNotification(queryFn, {
                userId: candidate.user_id,
                type: 'WAITLIST_PROMOTED',
                title: 'คุณได้รับสิทธิ์จองคอร์ทแล้ว',
                message: `คุณได้รับการเลื่อนสิทธิ์สำหรับการจองสนาม (${bookingCode}) วันที่ ${bookingDate} เวลา ${startTime} น. สามารถเข้าระบบเพื่อตรวจสอบการจองและเดินทางมาเช็คอินหน้าสนาม`,
                link: '/bookings'
            });
        } catch (notifErr) {
            console.error('Waitlist promotion notification error:', notifErr.message);
        }

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
        const checkinGraceMinutes = await appSettingInt('checkin_grace_minutes', 10);
        const checkinBaselineGraceMinutes = await appSettingInt('checkin_baseline_grace_minutes', 5);

        // 1. Pending bookings: Non-preconfirmed bookings get baseline start time + baseline grace window (T = 0 to T + checkin_baseline_grace_minutes).
        // If current time exceeds start_time + checkinBaselineGraceMinutes and user has not checked in, reservation expires.
        const [timingOut] = await pool.query(`
            SELECT id, user_id, court_id, booking_date, start_time, end_time, booking_code
            FROM bookings
            WHERE status = 'PENDING'
              AND CURRENT_TIMESTAMP > (((booking_date || ' ' || start_time)::timestamp AT TIME ZONE 'Asia/Bangkok')) + (? || ' minutes')::interval
        `, [checkinBaselineGraceMinutes]);

        let cancelledCount = 0;
        let promotedCount = 0;
        let walkInReleasedCount = 0;

        if (timingOut && timingOut.length > 0) {
            for (const b of timingOut) {
                await pool.withTransaction(async (txQuery) => {
                    await txQuery("UPDATE bookings SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?", [b.id]);
                    cancelledCount++;

                    try {
                        const { createNotification } = require('./notifications');
                        await createNotification(txQuery, {
                            userId: b.user_id,
                            type: 'BOOKING_TIMEOUT_CANCELLED',
                            title: 'การจองสิ้นสุดสิทธิ์เนื่องจากเลยเวลาเช็คอินพื้นฐาน',
                            message: `การจอง (${b.booking_code}) วันที่ ${b.booking_date} เวลา ${b.start_time} น. ถูกยกเลิกอัตโนมัติเนื่องจากไม่ได้รายงานตัวเช็คอินภายในเวลาผ่อนผันพื้นฐาน (${checkinBaselineGraceMinutes} นาทีหลังเริ่มรอบ)`,
                            link: '/bookings'
                        });
                    } catch (e) {}

                    // 2 Options when booking drops:
                    // Option 1: If waitlist exists, promote next in queue
                    // Option 2: If no waitlist exists, slot opens as Walk-in for players on-site
                    const res = await checkAndPromoteWaitlist(txQuery, b.court_id, b.booking_date, b.start_time, b.end_time);
                    if (res) {
                        promotedCount++;
                    } else {
                        walkInReleasedCount++;
                        try {
                            const { logAudit } = require('./auditLogger');
                            await logAudit(null, {
                                action: 'SLOT_RELEASED_FOR_WALKIN',
                                target_type: 'court_timeslots',
                                target_id: b.court_id,
                                reason: 'ผู้จองไม่มารายงานตัวตามเวลาพื้นฐาน และไม่มีคิวรอ ระบบเปิดสล็อตเป็น Walk-in สำหรับผู้เล่นหน้าสนาม',
                                details: { court_id: b.court_id, booking_date: b.booking_date, start_time: b.start_time, booking_id: b.id }
                            });
                        } catch (auditErr) {}
                    }
                });
            }
        }

        // 2. Pre-confirmed bookings: User confirmed attendance and earned extended grace period (up to T + checkinGraceMinutes).
        // If current time exceeds start_time + checkinGraceMinutes, mark as MISSED (No-Show).
        const [missedCandidates] = await pool.query(`
            SELECT id, user_id, court_id, booking_date, start_time, end_time, booking_code
            FROM bookings
            WHERE status = 'PRE_CONFIRMED'
              AND CURRENT_TIMESTAMP > (((booking_date || ' ' || start_time)::timestamp AT TIME ZONE 'Asia/Bangkok')) + (? || ' minutes')::interval
        `, [checkinGraceMinutes]);

        let missedCount = 0;
        if (missedCandidates && missedCandidates.length > 0) {
            for (const b of missedCandidates) {
                await pool.withTransaction(async (txQuery) => {
                    await txQuery("UPDATE bookings SET status = 'MISSED', missed_at = CURRENT_TIMESTAMP WHERE id = ?", [b.id]);
                    missedCount++;

                    try {
                        const { createNotification } = require('./notifications');
                        await createNotification(txQuery, {
                            userId: b.user_id,
                            type: 'BOOKING_MISSED',
                            title: 'ไม่ได้เช็คอินตามเวลาที่กำหนด (No-Show)',
                            message: `การจอง (${b.booking_code}) วันที่ ${b.booking_date} เวลา ${b.start_time} น. ถูกปรับเป็นไม่ได้มาใช้งานเนื่องจากเลยกำหนดเวลาเช็คอิน ${checkinGraceMinutes} นาที`,
                            link: '/bookings'
                        });
                    } catch (e) {}

                    // 2 Options when booking drops:
                    // Option 1: Promote waitlist if exists
                    // Option 2: Open for Walk-in if no waitlist
                    const res = await checkAndPromoteWaitlist(txQuery, b.court_id, b.booking_date, b.start_time, b.end_time);
                    if (res) {
                        promotedCount++;
                    } else {
                        walkInReleasedCount++;
                        try {
                            const { logAudit } = require('./auditLogger');
                            await logAudit(null, {
                                action: 'SLOT_RELEASED_FOR_WALKIN',
                                target_type: 'court_timeslots',
                                target_id: b.court_id,
                                reason: 'ผู้จองที่ยืนยันสิทธิ์ไม่มาเช็คอินตามระยะผ่อนผัน และไม่มีคิวรอ ระบบเปิดสล็อตเป็น Walk-in สำหรับผู้เล่นหน้าสนาม',
                                details: { court_id: b.court_id, booking_date: b.booking_date, start_time: b.start_time, booking_id: b.id }
                            });
                        } catch (auditErr) {}
                    }
                });
            }
        }

        return {
            cancelled: cancelledCount,
            promoted: promotedCount,
            missed: missedCount,
            walkInReleased: walkInReleasedCount
        };
    } catch (err) {
        console.error('Error applying booking timeouts:', err);
        return { cancelled: 0, promoted: 0, missed: 0, walkInReleased: 0 };

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
    invalidateSettingCache,
    applyBookingTimeouts,
    checkAndPromoteWaitlist,
    makeQrPayload,
    makeStaticQrPayload,
    parseQrCourtId,
    distanceMeters
};
