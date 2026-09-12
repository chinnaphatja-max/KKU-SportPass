const crypto = require('crypto');

/**
 * CSRF Protection Middleware using Double-Submit Cookie Pattern
 * 
 * How it works:
 * 1. On any request, if no CSRF token cookie exists, generate one and set it
 * 2. On mutation requests (POST/PUT/DELETE), validate that the X-CSRF-Token header
 *    matches the csrf_token cookie value
 * 3. Certain paths are exempt (public submissions, cron, auth login/register)
 * 
 * Frontend must read the csrf_token cookie and include it as X-CSRF-Token header.
 */

// Paths exempt from CSRF validation (public endpoints that don't use session for auth)
const EXEMPT_PATHS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/ssonext',
    '/api/auth/ssonext/callback',
    '/api/cookies/consent',
    '/api/cron/cleanup',
];

// Path prefixes exempt from CSRF (public form/survey submissions)
const EXEMPT_PREFIXES = [
    '/api/surveys',         // public survey submission
    '/api/forms/',          // public form submission (POST /api/forms/:id/responses)
];

function isExempt(method, path) {
    // Only check mutations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        return true;
    }

    // Exact path matches
    if (EXEMPT_PATHS.includes(path)) {
        return true;
    }

    // Prefix matches
    for (const prefix of EXEMPT_PREFIXES) {
        if (path.startsWith(prefix)) {
            return true;
        }
    }

    return false;
}

function csrfProtection(req, res, next) {
    // Always ensure a CSRF token cookie exists
    if (!req.cookies?.csrf_token) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie('csrf_token', token, {
            httpOnly: false,       // Frontend JS must read this
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days (match session)
        });
        // Also set on req so first-request validation can work
        if (!req.cookies) req.cookies = {};
        req.cookies.csrf_token = token;
    }

    // Skip validation for exempt paths
    if (isExempt(req.method, req.path)) {
        return next();
    }

    // Validate CSRF token on mutation requests
    const cookieToken = req.cookies?.csrf_token;
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({
            success: false,
            error: 'CSRF token missing or invalid. กรุณาลองใหม่อีกครั้ง'
        });
    }

    next();
}

module.exports = csrfProtection;
