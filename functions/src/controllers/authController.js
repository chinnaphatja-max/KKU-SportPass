const pool = require('../config/db');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
        }

        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email.trim()]);
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

        if (!/@(kkumail\.com|kku\.ac\.th)$/i.test(email)) {
            return res.status(400).json({ error: "กรุณาใช้อีเมล @kkumail.com หรือ @kku.ac.th เท่านั้น" });
        }

        const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email.trim()]);
        if (existing.length > 0) {
            return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
        }

        const hashed = await bcrypt.hash(password, 10);
        const role = email.toLowerCase().startsWith('admin') ? 'admin' : 'user';
        
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)",
            [name.trim(), email.trim(), hashed, phone ? phone.trim() : '', role]
        );

        req.session.user = {
            id: result.insertId,
            name: name.trim(),
            email: email.trim(),
            role: role
        };

        res.json({ success: true, user: req.session.user });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: "ไม่สามารถบันทึกข้อมูลผู้ใช้ลงฐานข้อมูลได้" });
    }
};



exports.status = (req, res) => {
    if (req.session && req.session.user) {
        res.json({ logged_in: true, user: req.session.user });
    } else {
        res.json({ logged_in: false });
    }
};

exports.logout = (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            res.clearCookie('connect.sid');
            return res.json({ success: true });
        });
    } else {
        res.json({ success: true });
    }
};
