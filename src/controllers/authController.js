const pool = require('../config/db');
const bcrypt = require('bcrypt');

function resolveRole(email) {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
    return adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user';
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
        }

        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        if (user.password && !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        req.session.user = {
            id: user.id,
            name: user.name,
            role: user.role,
            email: user.email
        };

        res.json({
            success: true,
            user: req.session.user
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" });
    }
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
        }

        const cleanEmail = email.trim().toLowerCase();

        if (!/@(kkumail\.com|kku\.ac\.th)$/i.test(cleanEmail)) {
            return res.status(400).json({ error: "กรุณาใช้อีเมล @kkumail.com หรือ @kku.ac.th เท่านั้น" });
        }

        const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
        }

        const hashed = await bcrypt.hash(password, 10);
        // Strictly prevent automatic admin escalation via email prefix
        const role = resolveRole(cleanEmail);
        
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)",
            [name.trim(), cleanEmail, hashed, phone ? phone.trim() : '', role]
        );

        req.session.user = {
            id: result.insertId,
            name: name.trim(),
            email: cleanEmail,
            role: role
        };

        res.json({ success: true, user: req.session.user });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: "ไม่สามารถบันทึกข้อมูลผู้ใช้ลงฐานข้อมูลได้" });
    }
};

exports.status = (req, res) => {
    const currentUser = req.session?.user || req.user;
    if (currentUser) {
        res.json({ logged_in: true, user: currentUser });
    } else {
        res.json({ logged_in: false });
    }
};

exports.logout = (req, res) => {
    if (req.session) {
        req.session.destroy((_err) => {
            res.clearCookie('connect.sid');
            return res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
};

exports.resolveRole = resolveRole;

