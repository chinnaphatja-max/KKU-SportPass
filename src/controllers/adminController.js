const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { logAudit } = require('../utils/auditLogger');

function validateCoordinate(lat, lng) {
    const nLat = parseFloat(lat);
    const nLng = parseFloat(lng);
    return !isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
}

// Manage Courts
exports.getAdminCourts = async (req, res) => {
    try {
        if (req.query.next_id) {
            const prefix = req.query.next_id.toUpperCase();
            const [rows] = await pool.query("SELECT id FROM courts WHERE id LIKE ? ORDER BY id DESC LIMIT 1", [`${prefix}%`]);
            const last = rows[0]?.id;
            const num = last ? parseInt(last.substring(3), 10) + 1 : 1;
            return res.json({ next_id: prefix + String(num).padStart(3, '0') });
        }

        if (req.query.sport_types) {
            const [rows] = await pool.query(`
                SELECT st.*, COUNT(c.id) AS court_count
                FROM sport_types st
                LEFT JOIN courts c ON c.type = st.name_en
                GROUP BY st.id
                ORDER BY st.name_th
            `);
            return res.json(rows);
        }

        if (req.query.summary) {
            const [rows] = await pool.query(`
                SELECT COALESCE(st.name_th, c.type) AS sport_name, c.type, COUNT(*) AS court_count
                FROM courts c
                LEFT JOIN sport_types st ON c.type = st.name_en
                GROUP BY c.type, st.name_th
                ORDER BY sport_name
            `);
            return res.json(rows);
        }

        const [courts] = await pool.query(`
            SELECT c.*,
                   COALESCE(st.name_th, c.type) AS sport_name,
                   st.prefix,
                   COUNT(DISTINCT ts.id) AS timeslot_count,
                   COUNT(DISTINCT CASE WHEN b.status IN ('PENDING','PRE_CONFIRMED','CHECKED_IN') THEN b.id END) AS active_booking_count
            FROM courts c
            LEFT JOIN sport_types st ON c.type = st.name_en
            LEFT JOIN court_timeslots ts ON ts.court_id = c.id
            LEFT JOIN bookings b ON b.court_id = c.id
            GROUP BY c.id, st.name_th, st.prefix
            ORDER BY c.type, c.id
        `);
        res.json(courts);
    } catch (err) {
        console.error('Error fetching admin courts:', err);
        res.status(500).json({ error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" });
    }
};

exports.createCourt = async (req, res) => {
    try {
        const { name, type, lat, lng, capacity } = req.body;
        if (!name) return res.status(400).json({ error: "กรุณาระบุชื่อสนาม" });
        if (!validateCoordinate(lat, lng)) return res.status(400).json({ error: "พิกัดไม่ถูกต้อง" });

        const [sportTypes] = await pool.query("SELECT prefix, icon FROM sport_types WHERE name_en = ?", [type || 'other']);
        const prefix = sportTypes[0]?.prefix || 'OTH';
        const icon = sportTypes[0]?.icon || 'fa-location-dot';

        const [lastRow] = await pool.query("SELECT id FROM courts WHERE id LIKE ? ORDER BY id DESC LIMIT 1", [`${prefix}%`]);
        const last = lastRow[0]?.id;
        const num = last ? parseInt(last.substring(3), 10) + 1 : 1;
        const newId = prefix + String(num).padStart(3, '0');

        const courtCapacity = parseInt(capacity, 10) || 1;

        await pool.query(
            "INSERT INTO courts (id, name, type, icon, capacity, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [newId, name.trim(), type || 'other', icon, courtCapacity, lat, lng]
        );

        await logAudit(req, {
            action: 'CREATE_COURT',
            target_type: 'court',
            target_id: newId,
            details: { name: name.trim(), type: type || 'other', capacity: courtCapacity, lat, lng }
        });

        res.json({ success: true, id: newId });
    } catch (err) {
        console.error('Error creating court:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกสนามลงฐานข้อมูล" });
    }
};

exports.updateCourt = async (req, res) => {
    try {
        const { id, name, lat, lng } = req.body;
        if (!id || !name) return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
        if (!validateCoordinate(lat, lng)) return res.status(400).json({ error: "พิกัดสนามไม่ถูกต้อง" });

        await pool.query("UPDATE courts SET name = ?, latitude = ?, longitude = ? WHERE id = ?", [name.trim(), lat, lng, id]);

        await logAudit(req, {
            action: 'UPDATE_COURT',
            target_type: 'court',
            target_id: id,
            details: { name: name.trim(), lat, lng }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating court:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
    }
};

exports.deleteCourt = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "Missing ID" });

        const [bookings] = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE court_id = ? AND status IN ('PENDING','PRE_CONFIRMED','CHECKED_IN')", [id]);
        if (bookings[0].count > 0) {
            return res.status(409).json({ error: "ไม่สามารถลบสนามที่มีการจองที่ยังใช้งานอยู่" });
        }

        await pool.query("DELETE FROM courts WHERE id = ?", [id]);

        await logAudit(req, {
            action: 'DELETE_COURT',
            target_type: 'court',
            target_id: id
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting court:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบสนาม" });
    }
};

// Manage Closures (Supports full-day and partial-day closures)
exports.getClosures = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT cl.*, c.name as court_name
            FROM court_closures cl
            LEFT JOIN courts c ON cl.court_id = c.id
            ORDER BY cl.close_date DESC, cl.start_time ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching closures:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลปฏิทินปิดสนาม" });
    }
};

exports.createClosure = async (req, res) => {
    try {
        const { court_id, close_date, start_time, end_time, reason } = req.body;
        if (!close_date) return res.status(400).json({ error: "กรุณาระบุวันที่ปิดสนาม" });

        if (start_time && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(start_time)) {
            return res.status(400).json({ error: "รูปแบบเวลาเริ่มต้นไม่ถูกต้อง (HH:MM)" });
        }
        if (end_time && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(end_time)) {
            return res.status(400).json({ error: "รูปแบบเวลาสิ้นสุดไม่ถูกต้อง (HH:MM)" });
        }

        const formattedStart = start_time ? (start_time.length === 5 ? `${start_time}:00` : start_time) : null;
        const formattedEnd = end_time ? (end_time.length === 5 ? `${end_time}:00` : end_time) : null;

        const [result] = await pool.query(
            "INSERT INTO court_closures (court_id, close_date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)",
            [court_id || null, close_date, formattedStart, formattedEnd, reason || 'ปิดปรับปรุง']
        );

        await logAudit(req, {
            action: 'CREATE_CLOSURE',
            target_type: 'closure',
            target_id: result.insertId,
            reason: reason || 'ปิดปรับปรุง',
            details: { court_id, close_date, start_time: formattedStart, end_time: formattedEnd }
        });

        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating closure:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกรายการปิดสนาม" });
    }
};

exports.deleteClosure = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "Missing ID" });

        const [closures] = await pool.query("SELECT * FROM court_closures WHERE id = ?", [id]);
        await pool.query("DELETE FROM court_closures WHERE id = ?", [id]);

        await logAudit(req, {
            action: 'DELETE_CLOSURE',
            target_type: 'closure',
            target_id: id,
            details: closures[0] || null
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting closure:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบรายการ" });
    }
};

// Manage Timeslots
exports.getTimeslots = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ts.*, c.name as court_name
            FROM court_timeslots ts
            JOIN courts c ON ts.court_id = c.id
            ORDER BY ts.court_id, ts.start_time
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching timeslots:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลช่วงเวลา" });
    }
};

exports.createTimeslot = async (req, res) => {
    try {
        const { court_id, start_time, end_time } = req.body;
        if (!court_id || !start_time || !end_time) return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });

        await pool.query(
            "INSERT INTO court_timeslots (court_id, start_time, end_time) VALUES (?, ?, ?)",
            [court_id, start_time, end_time]
        );

        await logAudit(req, {
            action: 'CREATE_TIMESLOT',
            target_type: 'timeslot',
            details: { court_id, start_time, end_time }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error creating timeslot:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มช่วงเวลา" });
    }
};

exports.deleteTimeslot = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "Missing ID" });

        await pool.query("DELETE FROM court_timeslots WHERE id = ?", [id]);

        await logAudit(req, {
            action: 'DELETE_TIMESLOT',
            target_type: 'timeslot',
            target_id: id
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting timeslot:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบช่วงเวลา" });
    }
};

// Manage Admins & Roles
exports.getAdmins = async (req, res) => {
    try {
        const currentUserId = req.session?.user?.id || 0;
        const [admins] = await pool.query(
            "SELECT id, name, email, phone, role FROM users WHERE role IN ('admin', 'super_admin', 'staff', 'viewer') ORDER BY id ASC"
        );
        const formatted = admins.map(u => ({ ...u, is_me: u.id === currentUserId }));
        res.json({ admins: formatted, current_user_id: currentUserId });
    } catch (err) {
        console.error('Error fetching admins:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงผู้ดูแลระบบ" });
    }
};

exports.createAdmin = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: "กรุณากรอกชื่อ อีเมล และรหัสผ่าน" });
        if (password.length < 6) return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });

        const allowedRoles = ['super_admin', 'admin', 'staff', 'viewer'];
        const targetRole = allowedRoles.includes(role) ? role : 'admin';

        const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email.trim()]);
        if (existing.length > 0) return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });

        const hashed = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)",
            [name.trim(), email.trim(), hashed, phone ? phone.trim() : '', targetRole]
        );

        await logAudit(req, {
            action: 'CREATE_ADMIN_USER',
            target_type: 'user',
            target_id: result.insertId,
            details: { name: name.trim(), email: email.trim(), role: targetRole }
        });

        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating admin:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มผู้ดูแลระบบ" });
    }
};

exports.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.body;
        const currentUserId = req.session?.user?.id;
        if (parseInt(id, 10) === currentUserId) return res.status(403).json({ error: "ไม่สามารถลบตัวเองได้" });

        const [count] = await pool.query("SELECT COUNT(*) as c FROM users WHERE role IN ('admin', 'super_admin')");
        if (count[0].c <= 1) return res.status(409).json({ error: "ไม่สามารถลบแอดมินคนสุดท้ายของระบบได้" });

        const [userToDelete] = await pool.query("SELECT id, name, email, role FROM users WHERE id = ?", [id]);
        await pool.query("DELETE FROM users WHERE id = ? AND role IN ('admin', 'super_admin', 'staff', 'viewer')", [id]);

        await logAudit(req, {
            action: 'DELETE_ADMIN_USER',
            target_type: 'user',
            target_id: id,
            details: userToDelete[0] || null
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting admin:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบแอดมิน" });
    }
};

// Manage Settings
exports.getSettings = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT setting_key, setting_value, label_th, updated_at FROM app_settings ORDER BY setting_key");
        res.json({ settings: rows });
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า" });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') return res.status(400).json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" });

        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP",
                [key, String(value)]
            );
        }

        await logAudit(req, {
            action: 'UPDATE_SETTINGS',
            target_type: 'settings',
            details: settings
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า" });
    }
};

// Manage Audit Logs
exports.getAuditLogs = async (req, res) => {
    try {
        const { limit = 100, action, target_type, search } = req.query;
        let sql = `SELECT * FROM audit_logs WHERE 1=1`;
        const params = [];

        if (action) {
            sql += ` AND action = ?`;
            params.push(action);
        }
        if (target_type) {
            sql += ` AND target_type = ?`;
            params.push(target_type);
        }
        if (search) {
            sql += ` AND (actor_name ILIKE ? OR reason ILIKE ? OR target_id ILIKE ? OR action ILIKE ?)`;
            const q = `%${search.trim()}%`;
            params.push(q, q, q, q);
        }

        sql += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(Math.min(parseInt(limit, 10) || 100, 300));

        const [logs] = await pool.query(sql, params);
        res.json({ logs });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูล Audit Logs ได้" });
    }
};
