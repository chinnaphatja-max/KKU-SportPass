// Authentication & Authorization Middleware for KKU SportPass

/**
 * Ensures that the request has an active session user.
 * Supports both standard express-session (req.session.user) and passport (req.user).
 */
function requireAuth(req, res, next) {
    const user = req.session?.user || req.user;
    if (!user || !user.id) {
        return res.status(401).json({ 
            success: false, 
            error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)' 
        });
    }
    // Attach normalized user object to req
    req.currentUser = user;
    if (!req.user) {
        req.user = user;
    }
    next();
}

/**
 * Ensures that the authenticated user has one of the allowed roles.
 * 'super_admin' is always granted access.
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const user = req.session?.user || req.user;
        if (!user || !user.id) {
            return res.status(401).json({ 
                success: false, 
                error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)' 
            });
        }
        const userRole = user.role || 'user';
        if (userRole === 'super_admin' || allowedRoles.includes(userRole)) {
            req.currentUser = user;
            if (!req.user) {
                req.user = user;
            }
            return next();
        }
        return res.status(403).json({ 
            success: false, 
            error: `คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (ต้องการสิทธิ์: ${allowedRoles.join(' หรือ ')})` 
        });
    };
}

/**
 * Ensures that the authenticated user has 'admin' or 'super_admin' role.
 */
function requireAdmin(req, res, next) {
    const user = req.session?.user || req.user;
    if (!user || !user.id) {
        return res.status(401).json({ 
            success: false, 
            error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)' 
        });
    }
    if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ 
            success: false, 
            error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (Forbidden: Admin Only)' 
        });
    }
    req.currentUser = user;
    if (!req.user) {
        req.user = user;
    }
    next();
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireRole
};
