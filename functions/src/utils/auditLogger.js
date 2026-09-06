const pool = require('../config/db');

/**
 * Record an administrative or security-critical action into the audit trail
 */
async function logAudit(req, { action, target_type, target_id = null, reason = null, details = null }) {
    try {
        const user = req?.session?.user || req?.user || {};
        const actorId = user.id || null;
        const actorName = user.name || 'System / Anonymous';
        const actorRole = user.role || 'unknown';
        const ipAddress = req?.ip || req?.socket?.remoteAddress || null;

        await pool.query(`
            INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target_type, target_id, reason, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            actorId,
            actorName,
            actorRole,
            action,
            target_type,
            target_id ? String(target_id) : null,
            reason || null,
            typeof details === 'object' ? JSON.stringify(details) : details,
            ipAddress
        ]);
    } catch (err) {
        console.error('Audit Log Write Error:', err);
    }
}

module.exports = { logAudit };
