const pool = require('../config/db');
const bcrypt = require('bcrypt');

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
            GROUP BY c.id
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

        const courtCapacity = parseInt(capacity) || 1;

        await pool.query(
            "INSERT INTO courts (id, name, type, icon, capacity, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [newId, name.trim(), type || 'other', icon, courtCapacity, lat, lng]
        );

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
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting court:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบสนาม" });
    }
};

// Manage Closures
exports.getClosures = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT cl.*, c.name as court_name
            FROM court_closures cl
            LEFT JOIN courts c ON cl.court_id = c.id
            ORDER BY cl.close_date DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching closures:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลปฏิทินปิดสนาม" });
    }
};

exports.createClosure = async (req, res) => {
    try {
        const { court_id, close_date, reason } = req.body;
        if (!close_date) return res.status(400).json({ error: "กรุณาระบุวันที่ปิดสนาม" });

        await pool.query(
            "INSERT INTO court_closures (court_id, close_date, reason) VALUES (?, ?, ?)",
            [court_id || null, close_date, reason || 'ปิดปรับปรุง']
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error creating closure:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกรายการปิดสนาม" });
    }
};

exports.deleteClosure = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "Missing ID" });

        await pool.query("DELETE FROM court_closures WHERE id = ?", [id]);
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
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting timeslot:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบช่วงเวลา" });
    }
};

// Manage Admins (manage_admins.php)
exports.getAdmins = async (req, res) => {
    try {
        const currentUserId = req.session.user?.id || 0;
        const [admins] = await pool.query("SELECT id, name, email, phone, role FROM users WHERE role = 'admin' ORDER BY id ASC");
        const formatted = admins.map(u => ({ ...u, is_me: u.id === currentUserId }));
        res.json({ admins: formatted, current_user_id: currentUserId });
    } catch (err) {
        console.error('Error fetching admins:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงผู้ดูแลระบบ" });
    }
};

exports.createAdmin = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: "กรุณากรอกชื่อ อีเมล และรหัสผ่าน" });
        if (password.length < 6) return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });

        const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email.trim()]);
        if (existing.length > 0) return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });

        const hashed = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, 'admin')",
            [name.trim(), email.trim(), hashed, phone ? phone.trim() : '']
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating admin:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มผู้ดูแลระบบ" });
    }
};

exports.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.body;
        const currentUserId = req.session.user?.id;
        if (parseInt(id, 10) === currentUserId) return res.status(403).json({ error: "ไม่สามารถลบตัวเองได้" });

        const [count] = await pool.query("SELECT COUNT(*) as c FROM users WHERE role = 'admin'");
        if (count[0].c <= 1) return res.status(409).json({ error: "ไม่สามารถลบแอดมินคนสุดท้ายของระบบได้" });

        await pool.query("DELETE FROM users WHERE id = ? AND role = 'admin'", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting admin:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบแอดมิน" });
    }
};

// Manage Settings (settings.php)
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
                "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = datetime('now')",
                [key, String(value)]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า" });
    }
};
