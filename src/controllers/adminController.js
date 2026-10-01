const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { logAudit } = require('../utils/auditLogger');
const { invalidateSettingCache } = require('../utils/helpers');

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
        const { name, type, lat, lng, capacity, fee_amount, is_fee_required, fee_structure, pricing_unit } = req.body;
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
        const feeAmount = fee_amount !== undefined ? Number(fee_amount) : 0;
        const isFeeReq = is_fee_required !== undefined ? Boolean(is_fee_required) : false;
        const feeStruct = fee_structure ? JSON.stringify(fee_structure) : null;
        const pUnit = pricing_unit || 'per_hour';

        await pool.query(
            `INSERT INTO courts (id, name, type, icon, capacity, latitude, longitude, fee_amount, is_fee_required, fee_structure, pricing_unit) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newId, name.trim(), type || 'other', icon, courtCapacity, lat, lng, feeAmount, isFeeReq, feeStruct, pUnit]
        );

        await logAudit(req, {
            action: 'CREATE_COURT',
            target_type: 'court',
            target_id: newId,
            details: { name: name.trim(), type: type || 'other', capacity: courtCapacity, lat, lng, is_fee_required: isFeeReq, pricing_unit: pUnit }
        });

        res.json({ success: true, id: newId });
    } catch (err) {
        console.error('Error creating court:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกสนามลงฐานข้อมูล" });
    }
};

exports.updateCourt = async (req, res) => {
    try {
        const { id, name, lat, lng, capacity, type, fee_amount, is_fee_required, fee_structure, pricing_unit } = req.body;
        if (!id) return res.status(400).json({ error: "ระบุรหัสสนาม (ID)" });

        const [existingCourts] = await pool.query("SELECT * FROM courts WHERE id = ?", [id]);
        if (!existingCourts || existingCourts.length === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลสนามที่ต้องการแก้ไข" });
        }
        const current = existingCourts[0];

        const updatedName = (name !== undefined && name !== null) ? name.trim() : current.name;
        const updatedLat = (lat !== undefined && lat !== null) ? parseFloat(lat) : current.latitude;
        const updatedLng = (lng !== undefined && lng !== null) ? parseFloat(lng) : current.longitude;
        if (!validateCoordinate(updatedLat, updatedLng)) {
            return res.status(400).json({ error: "พิกัดสนามไม่ถูกต้อง" });
        }

        const updatedCapacity = capacity !== undefined ? Math.max(1, parseInt(capacity, 10)) : (current.capacity || 1);
        const updatedType = type !== undefined ? type : current.type;
        const updatedFee = fee_amount !== undefined ? Number(fee_amount) : (Number(current.fee_amount) || 0);
        const updatedFeeReq = is_fee_required !== undefined ? Boolean(is_fee_required) : Boolean(current.is_fee_required);
        const updatedFeeStructure = fee_structure !== undefined ? (fee_structure ? JSON.stringify(fee_structure) : null) : current.fee_structure;
        const updatedPricingUnit = pricing_unit || current.pricing_unit || 'per_hour';

        let updatedIcon = current.icon;
        if (type !== undefined && type !== current.type) {
            const [sportTypes] = await pool.query("SELECT icon FROM sport_types WHERE name_en = ?", [type]);
            if (sportTypes && sportTypes.length > 0) {
                updatedIcon = sportTypes[0].icon;
            }
        }

        await pool.query(`
            UPDATE courts 
            SET name = ?, latitude = ?, longitude = ?, capacity = ?, type = ?, icon = ?, fee_amount = ?, is_fee_required = ?, fee_structure = ?, pricing_unit = ?
            WHERE id = ?
        `, [updatedName, updatedLat, updatedLng, updatedCapacity, updatedType, updatedIcon, updatedFee, updatedFeeReq, updatedFeeStructure, updatedPricingUnit, id]);

        await logAudit(req, {
            action: 'UPDATE_COURT',
            target_type: 'court',
            target_id: id,
            details: {
                name: updatedName,
                lat: updatedLat,
                lng: updatedLng,
                capacity: updatedCapacity,
                type: updatedType,
                fee_amount: updatedFee,
                is_fee_required: updatedFeeReq,
                pricing_unit: updatedPricingUnit
            }
        });

        res.json({ 
            success: true, 
            court: { 
                id, 
                name: updatedName, 
                capacity: updatedCapacity, 
                type: updatedType,
                latitude: updatedLat,
                longitude: updatedLng,
                fee_amount: updatedFee,
                is_fee_required: updatedFeeReq,
                fee_structure: updatedFeeStructure,
                pricing_unit: updatedPricingUnit
            } 
        });
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

exports.updateTimeslot = async (req, res) => {
    try {
        const { id, start_time, end_time } = req.body;
        if (!id || !start_time || !end_time) return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });

        await pool.query(
            "UPDATE court_timeslots SET start_time = ?, end_time = ? WHERE id = ?",
            [start_time, end_time, id]
        );

        await logAudit(req, {
            action: 'UPDATE_TIMESLOT',
            target_type: 'timeslot',
            target_id: id,
            details: { start_time, end_time }
        });

        res.json({ success: true, message: "แก้ไขช่วงเวลาเรียบร้อยแล้ว" });
    } catch (err) {
        console.error('Error updating timeslot:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการแก้ไขช่วงเวลา" });
    }
};

exports.bulkCreateTimeslots = async (req, res) => {
    try {
        const { court_ids, slots } = req.body;
        const targetCourtIds = Array.isArray(court_ids) ? court_ids : [req.body.court_id].filter(Boolean);
        if (targetCourtIds.length === 0 || !Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ error: "กรุณาระบุสนามและช่วงเวลาที่ต้องการสร้าง" });
        }

        let insertedCount = 0;
        for (const court_id of targetCourtIds) {
            for (const slot of slots) {
                if (!slot.start_time || !slot.end_time) continue;
                const [exists] = await pool.query(
                    "SELECT id FROM court_timeslots WHERE court_id = ? AND start_time = ? AND end_time = ?",
                    [court_id, slot.start_time, slot.end_time]
                );
                if (exists.length === 0) {
                    await pool.query(
                        "INSERT INTO court_timeslots (court_id, start_time, end_time) VALUES (?, ?, ?)",
                        [court_id, slot.start_time, slot.end_time]
                    );
                    insertedCount++;
                }
            }
        }

        await logAudit(req, {
            action: 'BULK_CREATE_TIMESLOTS',
            target_type: 'timeslot',
            details: { courts: targetCourtIds, count: insertedCount }
        });

        res.json({ success: true, count: insertedCount, message: `สร้างช่วงเวลาสำเร็จ ${insertedCount} รายการ` });
    } catch (err) {
        console.error('Error bulk creating timeslots:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้างช่วงเวลาอัตโนมัติ" });
    }
};

exports.copyTimeslots = async (req, res) => {
    try {
        const { source_court_id, target_court_id, replace_existing } = req.body;
        if (!source_court_id || !target_court_id) {
            return res.status(400).json({ error: "กรุณาระบุสนามต้นทางและสนามปลายทาง" });
        }
        if (source_court_id === target_court_id) {
            return res.status(400).json({ error: "สนามต้นทางและปลายทางต้องไม่เป็นสนามเดียวกัน" });
        }

        const [sourceSlots] = await pool.query(
            "SELECT start_time, end_time FROM court_timeslots WHERE court_id = ? ORDER BY start_time ASC",
            [source_court_id]
        );

        if (sourceSlots.length === 0) {
            return res.status(400).json({ error: "สนามต้นทางไม่มีช่วงเวลาเปิดให้บริการ" });
        }

        if (replace_existing) {
            await pool.query("DELETE FROM court_timeslots WHERE court_id = ?", [target_court_id]);
        }

        let copied = 0;
        for (const s of sourceSlots) {
            const [exists] = await pool.query(
                "SELECT id FROM court_timeslots WHERE court_id = ? AND start_time = ? AND end_time = ?",
                [target_court_id, s.start_time, s.end_time]
            );
            if (exists.length === 0) {
                await pool.query(
                    "INSERT INTO court_timeslots (court_id, start_time, end_time) VALUES (?, ?, ?)",
                    [target_court_id, s.start_time, s.end_time]
                );
                copied++;
            }
        }

        await logAudit(req, {
            action: 'COPY_TIMESLOTS',
            target_type: 'timeslot',
            details: { source_court_id, target_court_id, copied_count: copied }
        });

        res.json({ success: true, count: copied, message: `คัดลอกช่วงเวลาสำเร็จ ${copied} รายการ` });
    } catch (err) {
        console.error('Error copying timeslots:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการคัดลอกช่วงเวลา" });
    }
};

exports.clearCourtTimeslots = async (req, res) => {
    try {
        const { court_id } = req.body;
        if (!court_id) return res.status(400).json({ error: "กรุณาระบุสนามที่ต้องการลบช่วงเวลา" });

        await pool.query("DELETE FROM court_timeslots WHERE court_id = ?", [court_id]);

        await logAudit(req, {
            action: 'CLEAR_COURT_TIMESLOTS',
            target_type: 'timeslot',
            details: { court_id }
        });

        res.json({ success: true, message: `ลบช่วงเวลาทั้งหมดของสนามเรียบร้อยแล้ว` });
    } catch (err) {
        console.error('Error clearing court timeslots:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบช่วงเวลาทั้งหมด" });
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

exports.updateAdmin = async (req, res) => {
    try {
        const { id, name, phone, role, password } = req.body;
        if (!id) return res.status(400).json({ error: "กรุณาระบุ ID ผู้ดูแลระบบ" });

        const currentUserId = req.session?.user?.id;
        const allowedRoles = ['super_admin', 'admin', 'staff', 'viewer'];
        const targetRole = allowedRoles.includes(role) ? role : undefined;

        // Prevent demoting yourself
        if (parseInt(id, 10) === currentUserId && targetRole && targetRole !== req.session?.user?.role) {
            return res.status(403).json({ error: "ไม่สามารถเปลี่ยน Role ของตัวเองได้" });
        }

        const [existing] = await pool.query("SELECT id, name, role FROM users WHERE id = ?", [id]);
        if (!existing.length) return res.status(404).json({ error: "ไม่พบผู้ดูแลระบบ" });

        const updates = [];
        const params = [];
        if (name) { updates.push('name = ?'); params.push(name.trim()); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone ? phone.trim() : ''); }
        if (targetRole) { updates.push('role = ?'); params.push(targetRole); }
        if (password && password.length >= 6) {
            const hashed = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            params.push(hashed);
        }

        if (updates.length === 0) return res.status(400).json({ error: "ไม่มีข้อมูลที่ต้องอัปเดต" });

        params.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        await logAudit(req, {
            action: 'UPDATE_ADMIN_USER',
            target_type: 'user',
            target_id: id,
            details: { name, role: targetRole, phone }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating admin:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูลแอดมิน" });
    }
};


// Public Settings (accessible by all users and guests for Manual and UI display)
exports.getPublicSettings = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT setting_key, setting_value, label_th FROM app_settings WHERE setting_key IN (" +
            "'pre_confirm_open_minutes', 'pre_confirm_close_minutes', 'checkin_early_minutes', " +
            "'checkin_baseline_grace_minutes', 'checkin_grace_minutes', 'gps_radius_meters', " +
            "'max_active_bookings_per_user', 'max_advance_booking_days', 'cancellation_lead_minutes')"
        );
        const settingsMap = {};
        for (const r of rows) {
            settingsMap[r.setting_key] = isNaN(Number(r.setting_value)) ? r.setting_value : Number(r.setting_value);
        }
        res.json({
            settings: {
                pre_confirm_open_minutes: settingsMap.pre_confirm_open_minutes ?? 10,
                pre_confirm_close_minutes: settingsMap.pre_confirm_close_minutes ?? 5,
                checkin_early_minutes: settingsMap.checkin_early_minutes ?? 10,
                checkin_baseline_grace_minutes: settingsMap.checkin_baseline_grace_minutes ?? 5,
                checkin_grace_minutes: settingsMap.checkin_grace_minutes ?? 10,
                gps_radius_meters: settingsMap.gps_radius_meters ?? 30,
                max_active_bookings_per_user: settingsMap.max_active_bookings_per_user ?? 2,
                max_advance_booking_days: settingsMap.max_advance_booking_days ?? 7,
                cancellation_lead_minutes: settingsMap.cancellation_lead_minutes ?? 30
            }
        });
    } catch (err) {
        console.error('Error fetching public settings:', err);
        res.json({
            settings: {
                pre_confirm_open_minutes: 10,
                pre_confirm_close_minutes: 5,
                checkin_early_minutes: 10,
                checkin_baseline_grace_minutes: 5,
                checkin_grace_minutes: 10,
                gps_radius_meters: 30,
                max_active_bookings_per_user: 2,
                max_advance_booking_days: 7,
                cancellation_lead_minutes: 30
            }
        });
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

        // Invalidate in-memory settings cache for immediate freshness
        invalidateSettingCache();

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า" });
    }
};

// Manage Audit Logs
exports.getAuditLogs = async (req, res) => {
    try {
        const { limit = 100, action, target_type, search, date, start_date, end_date } = req.query;
        let sql = `SELECT * FROM audit_logs WHERE 1=1`;
        const params = [];

        if (date) {
            sql += ` AND DATE(created_at) = ?`;
            params.push(date);
        }
        if (start_date) {
            sql += ` AND DATE(created_at) >= ?`;
            params.push(start_date);
        }
        if (end_date) {
            sql += ` AND DATE(created_at) <= ?`;
            params.push(end_date);
        }
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
        params.push(Math.min(parseInt(limit, 10) || 100, 500));

        const [logs] = await pool.query(sql, params);
        res.json({ logs });
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูล Audit Logs ได้" });
    }
};
