const pool = require('../config/db');

let tableInitialized = false;

/**
 * Ensures the notifications table exists with proper indexes
 */
async function ensureNotificationsTable(db = pool) {
    if (tableInitialized) return;
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                link TEXT NULL,
                is_read BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
                ON notifications(user_id, is_read, created_at DESC);
        `);
        tableInitialized = true;
    } catch (err) {
        // Suppress if already exists
        if (!err.message.includes('already exists')) {
            console.error('ensureNotificationsTable error:', err.message);
        }
        tableInitialized = true;
    }
}

/**
 * Creates a new notification for a specific user
 */
async function createNotification(dbOrTx, { userId, type, title, message, link = '/bookings' }) {
    if (!userId) return null;
    try {
        await ensureNotificationsTable(typeof dbOrTx === 'function' ? pool : (dbOrTx || pool));
        const executor = (typeof dbOrTx === 'function') ? dbOrTx : pool.query.bind(pool);

        const [res] = await executor(`
            INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, false, CURRENT_TIMESTAMP)
            RETURNING id, user_id, type, title, message, link, is_read, created_at
        `, [userId, type, title, message, link]);

        return res && res[0] ? res[0] : null;
    } catch (err) {
        console.error('Error creating notification:', err.message);
        return null;
    }
}

/**
 * Retrieves notifications for a given user
 */
async function getUserNotifications(userId, { unreadOnly = false, limit = 30, offset = 0 } = {}) {
    try {
        await ensureNotificationsTable();
        let query = `
            SELECT id, user_id, type, title, message, link, is_read, created_at
            FROM notifications
            WHERE user_id = ?
        `;
        const params = [userId];

        if (unreadOnly) {
            query += ` AND is_read = false`;
        }

        query += ` ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.query(query, params);
        return rows || [];
    } catch (err) {
        console.error('Error fetching notifications:', err.message);
        return [];
    }
}

/**
 * Counts unread notifications for a user
 */
async function getUnreadCount(userId) {
    try {
        await ensureNotificationsTable();
        const [rows] = await pool.query(`
            SELECT COUNT(*) as unread_count
            FROM notifications
            WHERE user_id = ? AND is_read = false
        `, [userId]);
        return parseInt(rows[0]?.unread_count || 0, 10);
    } catch (err) {
        console.error('Error counting unread notifications:', err.message);
        return 0;
    }
}

/**
 * Marks a single notification as read
 */
async function markNotificationAsRead(userId, notificationId) {
    try {
        await ensureNotificationsTable();
        await pool.query(`
            UPDATE notifications
            SET is_read = true
            WHERE id = ? AND user_id = ?
        `, [notificationId, userId]);
        return true;
    } catch (err) {
        console.error('Error marking notification read:', err.message);
        return false;
    }
}

/**
 * Marks all notifications for a user as read
 */
async function markAllNotificationsAsRead(userId) {
    try {
        await ensureNotificationsTable();
        await pool.query(`
            UPDATE notifications
            SET is_read = true
            WHERE user_id = ? AND is_read = false
        `, [userId]);
        return true;
    } catch (err) {
        console.error('Error marking all notifications read:', err.message);
        return false;
    }
}

module.exports = {
    ensureNotificationsTable,
    createNotification,
    getUserNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
};
