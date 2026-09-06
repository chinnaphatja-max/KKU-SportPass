/**
 * Production Environment Validator
 * Prevents application startup if essential security secrets are missing in production.
 */
function validateProductionEnv() {
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    const missing = [];
    if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
    if (!process.env.ALLOWED_ORIGINS) missing.push('ALLOWED_ORIGINS');
    if (!process.env.QR_DYNAMIC_SECRET) missing.push('QR_DYNAMIC_SECRET');
    if (!process.env.QR_STATIC_SECRET) missing.push('QR_STATIC_SECRET');

    if (missing.length > 0) {
        throw new Error(`FATAL: Missing required production environment variables: ${missing.join(', ')}`);
    }
}

module.exports = { validateProductionEnv };
