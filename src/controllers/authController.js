const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { appSetting } = require('../utils/helpers');

function parseAllowedDomains(domainsString = 'kkumail.com,kku.ac.th') {
    return (domainsString || '')
        .split(',')
        .map(d => d.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean);
}

function isAllowedEmailDomain(email, domainsString = 'kkumail.com,kku.ac.th') {
    if (!email || typeof email !== 'string') return false;
    const cleanEmail = email.trim().toLowerCase();
    const parts = cleanEmail.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
    const allowed = parseAllowedDomains(domainsString);
    if (allowed.includes('*') || allowed.length === 0) return true;
    return allowed.includes(parts[1]);
}

function resolveRole(email) {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
    return adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user';
}

/**
 * Resolves user status (กลุ่มสถานะผู้ใช้งาน) based on email domain:
 * - student (นักศึกษา): e.g. @kkumail.com
 * - staff (บุคลากร): e.g. @kku.ac.th
 * - external (บุคคลภายนอก): Any other email domain (gmail, hotmail, etc.)
 */
function resolveUserGroup(email, requestedType = null, domainSettings = {}) {
    if (!email || typeof email !== 'string') return 'external';
    const cleanEmail = email.trim().toLowerCase();
    const parts = cleanEmail.split('@');
    if (parts.length !== 2 || !parts[1]) return 'external';
    const domain = parts[1];

    const studentDomains = parseAllowedDomains(domainSettings.student_email_domains || 'kkumail.com');
    const staffDomains = parseAllowedDomains(domainSettings.staff_email_domains || 'kku.ac.th');

    if (studentDomains.includes(domain)) {
        return 'student';
    }
    if (staffDomains.includes(domain)) {
        return 'staff';
    }

    // General domains (gmail, yahoo, etc.) are categorized as external
    return 'external';
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
            user_type: user.user_type || 'external',
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
        const { name, email, password, phone, user_type } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
        }

        const cleanEmail = email.trim().toLowerCase();
        const emailParts = cleanEmail.split('@');
        if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1] || !emailParts[1].includes('.')) {
            return res.status(400).json({ error: "รูปแบบอีเมลไม่ถูกต้อง" });
        }

        const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
        }

        // Support 3 user groups: นักศึกษา, บุคลากร, บุคคลภายนอก
        // All email domains are permitted to register; domain determines user status
        const studentDomainsRaw = await appSetting('student_email_domains', 'kkumail.com');
        const staffDomainsRaw = await appSetting('staff_email_domains', 'kku.ac.th');
        const allowExternalRaw = await appSetting('allow_external_registration', 'true');

        const userGroup = resolveUserGroup(cleanEmail, user_type, {
            student_email_domains: studentDomainsRaw,
            staff_email_domains: staffDomainsRaw
        });

        if (userGroup === 'external' && String(allowExternalRaw) === 'false') {
            return res.status(403).json({ error: "ระบบปิดรับการลงทะเบียนสำหรับบุคคลภายนอกชั่วคราว" });
        }

        const hashed = await bcrypt.hash(password, 10);
        // Strictly prevent automatic admin escalation via email prefix
        const role = resolveRole(cleanEmail);
        
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password, phone, role, user_type) VALUES (?, ?, ?, ?, ?, ?)",
            [name.trim(), cleanEmail, hashed, phone ? phone.trim() : '', role, userGroup]
        );

        req.session.user = {
            id: result.insertId,
            name: name.trim(),
            email: cleanEmail,
            role: role,
            user_type: userGroup
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

exports.getProfile = async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const [rows] = await pool.query(
            "SELECT id, name, email, phone, role, user_type, faculty, student_id, avatar_url, created_at FROM users WHERE id = ?", 
            [userId]
        );
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้งาน" });
        }

        const userData = rows[0];
        // If student_id is a legacy auto-generated dummy (STD-00000X), clear it so student can enter real ID
        if (userData.student_id && /^STD-\d{6}$/.test(userData.student_id)) {
            userData.student_id = '';
        }

        res.json({ user: userData });
    } catch (err) {
        console.error('Get Profile error:', err);
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูลโปรไฟล์ได้" });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const { name, phone, faculty, student_id, avatar_url, current_password, new_password } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "กรุณากรอกชื่อ-นามสกุล" });
        }

        const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (!users || users.length === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้งาน" });
        }
        const user = users[0];

        // If changing password, verify current password first
        let newHashedPassword = null;
        if (new_password) {
            if (new_password.length < 6) {
                return res.status(400).json({ error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" });
            }

            if (user.password) {
                if (!current_password) {
                    return res.status(400).json({ error: "กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนรหัสผ่าน" });
                }
                const isMatch = await bcrypt.compare(current_password, user.password);
                if (!isMatch) {
                    return res.status(400).json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
                }
            }

            newHashedPassword = await bcrypt.hash(new_password, 10);
        }

        const cleanName = name.trim();
        const cleanPhone = phone ? phone.trim() : (user.phone || '');
        const cleanFaculty = faculty !== undefined ? (faculty ? faculty.trim() : '') : (user.faculty || '');
        const cleanStudentId = student_id !== undefined ? (student_id ? student_id.trim() : '') : (user.student_id || '');
        const cleanAvatar = avatar_url !== undefined ? avatar_url : (user.avatar_url || null);

        if (newHashedPassword) {
            await pool.query(
                "UPDATE users SET name = ?, phone = ?, faculty = ?, student_id = ?, avatar_url = ?, password = ? WHERE id = ?",
                [cleanName, cleanPhone, cleanFaculty, cleanStudentId, cleanAvatar, newHashedPassword, userId]
            );
        } else {
            await pool.query(
                "UPDATE users SET name = ?, phone = ?, faculty = ?, student_id = ?, avatar_url = ? WHERE id = ?",
                [cleanName, cleanPhone, cleanFaculty, cleanStudentId, cleanAvatar, userId]
            );
        }

        req.session.user = {
            id: user.id,
            name: cleanName,
            email: user.email,
            role: user.role,
            user_type: user.user_type || 'external',
            faculty: cleanFaculty,
            student_id: cleanStudentId,
            avatar_url: cleanAvatar
        };

        res.json({
            success: true,
            message: "อัปเดตโปรไฟล์เรียบร้อยแล้ว",
            user: req.session.user
        });
    } catch (err) {
        console.error('Update Profile error:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกโปรไฟล์" });
    }
};

exports.resolveRole = resolveRole;
exports.resolveUserGroup = resolveUserGroup;
exports.isAllowedEmailDomain = isAllowedEmailDomain;
exports.parseAllowedDomains = parseAllowedDomains;

