const {
    getUserNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
} = require('../utils/notifications');

/**
 * Notification Controller
 * Manages user in-app notifications (Waitlist promotions, Pre-confirm alerts, Booking status updates)
 */

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const unreadOnly = req.query.unread === 'true';
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
        const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

        const notifications = await getUserNotifications(userId, { unreadOnly, limit, offset });
        const unreadCount = await getUnreadCount(userId);

        res.json({
            notifications,
            unread_count: unreadCount
        });
    } catch (err) {
        console.error('Get Notifications Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const unreadCount = await getUnreadCount(userId);
        res.json({ unread_count: unreadCount });
    } catch (err) {
        console.error('Get Unread Count Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "ระบุรหัสแจ้งเตือน" });
        }

        const success = await markNotificationAsRead(userId, parseInt(id, 10));
        res.json({ success });
    } catch (err) {
        console.error('Mark As Read Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const success = await markAllNotificationsAsRead(userId);
        res.json({ success });
    } catch (err) {
        console.error('Mark All As Read Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};
