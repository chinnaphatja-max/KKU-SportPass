/**
 * Origin & Referer Verification Middleware (Anti-Cross-Site Financial Tampering)
 * 
 * Protects critical financial and mutation endpoints from being triggered or loaded
 * via external windows, rogue third-party websites, or unauthorized cross-site origins.
 */

function getDomainFromUrl(urlStr) {
    if (!urlStr) return null;
    try {
        const parsed = new URL(urlStr);
        return parsed.origin;
    } catch {
        return null;
    }
}

/**
 * Returns true if the origin or referer matches an allowed origin
 */
function isOriginAllowed(originOrReferer, allowedList) {
    if (!originOrReferer) return false;
    
    // If allowedList is true (typically development mode without explicit ALLOWED_ORIGINS)
    if (allowedList === true) return true;
    if (!Array.isArray(allowedList)) return false;

    // Normalizing origin
    const normalizedTarget = originOrReferer.toLowerCase().replace(/\/+$/, '');

    return allowedList.some(allowed => {
        const normalizedAllowed = allowed.toLowerCase().replace(/\/+$/, '');
        return normalizedTarget === normalizedAllowed;
    });
}

/**
 * Origin Shield for Financial & Sensitive Mutation Transactions
 */
function financialOriginShield(req, res, next) {
    // Webhook callbacks (e.g. Omise / Bank switches) are excluded because they come server-to-server
    // Webhook has its own cryptographic HMAC-SHA256 signature verification in paymentController.
    if (req.path.includes('/webhook')) {
        return next();
    }

    // Determine configured allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : (process.env.NODE_ENV === 'production' ? [] : true);

    const origin = req.headers['origin'];
    const referer = req.headers['referer'];
    const secFetchSite = req.headers['sec-fetch-site'];

    // 1. Sec-Fetch-Site check (Modern browser anti-cross-site defense)
    // If request is initiated cross-site (from an external window, iframe, or external site)
    if (secFetchSite === 'cross-site') {
        console.warn(`🚨 Financial Access Denied: Blocked cross-site request to ${req.originalUrl} from origin: ${origin || referer}`);
        return res.status(403).json({
            success: false,
            error: 'ไม่อนุญาตให้เข้าถึงระบบการเงินจากหน้าต่างภายนอกหรือเว็บไซต์ภายนอก (Cross-Site Request Blocked)'
        });
    }

    // 2. Origin Header Verification (Sent on POST/PUT/DELETE requests)
    if (origin) {
        if (!isOriginAllowed(origin, allowedOrigins)) {
            console.warn(`🚨 Financial Access Denied: Untrusted Origin ${origin} on ${req.originalUrl}`);
            return res.status(403).json({
                success: false,
                error: 'ไม่อนุญาตให้เข้าถึงรายการธุรกรรมจากแหล่งที่มานี้ (Forbidden Origin)'
            });
        }
    }

    // 3. Referer Header Verification (Fallback if origin is missing or for GET inspection)
    if (referer) {
        const refererOrigin = getDomainFromUrl(referer);
        if (refererOrigin && !isOriginAllowed(refererOrigin, allowedOrigins)) {
            console.warn(`🚨 Financial Access Denied: Untrusted Referer ${referer} on ${req.originalUrl}`);
            return res.status(403).json({
                success: false,
                error: 'ไม่อนุญาตให้เรียกใช้งานระบบการเงินผ่านหน้าต่างภายนอก (Forbidden Referer)'
            });
        }
    }

    // In production, require at least Origin or Referer for financial mutations to prevent headless blind calls
    if (process.env.NODE_ENV === 'production' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        if (!origin && !referer) {
            console.warn(`🚨 Financial Access Denied: Mutation request missing both Origin and Referer on ${req.originalUrl}`);
            return res.status(403).json({
                success: false,
                error: 'ข้อมูลความปลอดภัยของเบราว์เซอร์ไม่สมบูรณ์ กรุณาทำรายการผ่านระบบ KKU SportPass โดยตรง'
            });
        }
    }

    next();
}

module.exports = {
    financialOriginShield,
    isOriginAllowed
};
