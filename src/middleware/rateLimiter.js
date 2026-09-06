const rateLimit = require('express-rate-limit');

// Strict rate limit for authentication (login & register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 auth requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'ทำรายการเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่ (Too Many Requests)' }
});

// Rate limit for booking, check-in, and pre-confirmation
const bookingLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 60, // Limit each IP to 60 booking actions per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'ทำรายการจอง/เช็คอินบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' }
});

// Rate limit for public form & survey submissions
const submissionLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // Limit each IP to 20 submissions per 10 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'ส่งแบบฟอร์มบ่อยเกินไป กรุณารอสักครู่' }
});

module.exports = {
    authLimiter,
    bookingLimiter,
    submissionLimiter
};
