const crypto = require('crypto');
const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

/**
 * Payment Controller — SIMULATED PAYMENT MODE
 * 
 * This controller records payments and issues e-receipts but does NOT connect
 * to a real payment gateway. Payments are marked as COMPLETED immediately.
 * 
 * For real online payments, integrate a payment provider (e.g., PromptPay API,
 * Omise, Stripe) with webhook verification, idempotency keys, and refund support.
 * 
 * All responses include `payment_mode: 'simulated'` so the frontend can display
 * appropriate messaging to users.
 */

function generateReceiptNo() {
    const year = new Date().getFullYear();
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `REC-${year}-${hex}`;
}

function generateTransactionRef() {
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PAY-SP-${Date.now()}-${hex}`;
}

// User: Process payment for a fee-based court booking
exports.processPayment = async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" });
        }

        const { booking_id, payment_method = 'promptpay' } = req.body;
        if (!booking_id) {
            return res.status(400).json({ error: "ระบุรหัสการจองที่ต้องการชำระเงิน" });
        }

        // Verify booking
        const [bookings] = await pool.query(
            "SELECT b.*, c.name as court_name, c.fee_amount, c.is_fee_required, c.price as court_price FROM bookings b JOIN courts c ON b.court_id = c.id WHERE b.id = ?",
            [booking_id]
        );

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลการจอง" });
        }

        const booking = bookings[0];
        const userRole = req.session?.user?.role || req.user?.role;
        const isStaff = ['admin', 'super_admin', 'staff'].includes(userRole);

        if (booking.user_id !== userId && !isStaff) {
            return res.status(403).json({ error: "คุณไม่มีสิทธิ์ทำรายการชำระเงินสำหรับการจองนี้" });
        }

        if (booking.status === 'CANCELLED') {
            return res.status(400).json({ error: "การจองนี้ถูกยกเลิกไปแล้ว ไม่สามารถชำระเงินได้" });
        }

        // Check if already paid
        const [existingPayment] = await pool.query(
            "SELECT * FROM payments WHERE booking_id = ? AND payment_status = 'COMPLETED'",
            [booking_id]
        );

        if (existingPayment && existingPayment.length > 0) {
            return res.json({
                success: true,
                message: "รายการนี้ได้รับการชำระเงินเรียบร้อยแล้ว",
                payment: existingPayment[0],
                payment_mode: 'simulated'
            });
        }

        const amount = Number(booking.fee_amount) || 0;
        const receiptNo = generateReceiptNo();
        const transactionRef = generateTransactionRef();

        const [paymentRes] = await pool.query(`
            INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status, transaction_ref, receipt_no, paid_at)
            VALUES (?, ?, ?, ?, 'COMPLETED', ?, ?, CURRENT_TIMESTAMP)
            RETURNING *
        `, [booking_id, booking.user_id, amount, payment_method, transactionRef, receiptNo]);

        const payment = paymentRes[0] || {
            booking_id,
            user_id: booking.user_id,
            amount,
            payment_method,
            payment_status: 'COMPLETED',
            transaction_ref: transactionRef,
            receipt_no: receiptNo
        };

        await logAudit(req, {
            action: 'PAYMENT_COMPLETED',
            target_type: 'payment',
            target_id: payment.id ? String(payment.id) : receiptNo,
            reason: `ชำระเงินค่าบำรุงรักษาสนาม (${booking.court_name})`,
            details: {
                booking_id,
                amount,
                payment_method,
                receipt_no: receiptNo,
                transaction_ref: transactionRef
            }
        });

        res.json({
            success: true,
            message: "ชำระเงินและออกใบเสร็จอิเล็กทรอนิกส์สำเร็จ (บันทึกภายในระบบ)",
            payment,
            payment_mode: 'simulated'
        });
    } catch (err) {
        console.error('Process Payment Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// User / Staff: View E-Receipt by receipt_no
exports.getReceipt = async (req, res) => {
    try {
        const { receipt_no } = req.params;
        const userId = req.session?.user?.id || req.user?.id;
        const userRole = req.session?.user?.role || req.user?.role;
        const isStaff = ['admin', 'super_admin', 'staff', 'viewer'].includes(userRole);

        const [rows] = await pool.query(`
            SELECT p.*,
                   b.booking_code, b.booking_date, b.start_time, b.end_time, b.status as booking_status,
                   c.name as court_name, c.type as court_type,
                   u.name as user_name, u.email as user_email, u.phone as user_phone
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN courts c ON b.court_id = c.id
            JOIN users u ON p.user_id = u.id
            WHERE p.receipt_no = ?
        `, [receipt_no]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "ไม่พบใบเสร็จรับเงินที่ระบุ" });
        }

        const receipt = rows[0];

        // Access check: Only booking owner or facility staff
        if (receipt.user_id !== userId && !isStaff) {
            return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงใบเสร็จนี้" });
        }

        res.json({ receipt });
    } catch (err) {
        console.error('Get Receipt Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// User / Staff: Get Payment by Booking ID
exports.getBookingPayment = async (req, res) => {
    try {
        const { booking_id } = req.params;
        const userId = req.session?.user?.id || req.user?.id;
        const userRole = req.session?.user?.role || req.user?.role;
        const isStaff = ['admin', 'super_admin', 'staff', 'viewer'].includes(userRole);

        const [rows] = await pool.query(`
            SELECT p.*,
                   b.booking_code, b.booking_date, b.start_time, b.end_time,
                   c.name as court_name, c.fee_amount, c.is_fee_required,
                   u.name as user_name, u.email as user_email
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN courts c ON b.court_id = c.id
            JOIN users u ON p.user_id = u.id
            WHERE p.booking_id = ?
            ORDER BY p.id DESC LIMIT 1
        `, [booking_id]);

        if (!rows || rows.length === 0) {
            return res.json({ payment: null });
        }

        const payment = rows[0];
        if (payment.user_id !== userId && !isStaff) {
            return res.status(403).json({ error: "คุณไม่มีสิทธิ์ดูข้อมูลการชำระเงินนี้" });
        }

        res.json({ payment });
    } catch (err) {
        console.error('Get Booking Payment Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Admin: Overview of all payments
exports.getAdminPayments = async (req, res) => {
    try {
        const { date, payment_method, search } = req.query;

        let sql = `
            SELECT p.*,
                   b.booking_code, b.booking_date, b.start_time, b.end_time,
                   c.name as court_name, c.type as court_type,
                   u.name as user_name, u.email as user_email, u.phone as user_phone
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN courts c ON b.court_id = c.id
            JOIN users u ON p.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (date) {
            sql += ` AND DATE(p.paid_at) = ?`;
            params.push(date);
        }
        if (payment_method) {
            sql += ` AND p.payment_method = ?`;
            params.push(payment_method);
        }
        if (search) {
            sql += ` AND (p.receipt_no ILIKE ? OR p.transaction_ref ILIKE ? OR u.name ILIKE ? OR u.email ILIKE ?)`;
            const q = `%${search.trim()}%`;
            params.push(q, q, q, q);
        }

        sql += ` ORDER BY p.paid_at DESC LIMIT 150`;

        const [payments] = await pool.query(sql, params);

        // Calculate summary stats
        const [sumRows] = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_revenue,
                COUNT(*) as total_transactions
            FROM payments
            WHERE payment_status = 'COMPLETED'
        `);

        res.json({
            payments,
            summary: {
                total_revenue: parseFloat(sumRows[0]?.total_revenue || 0),
                total_transactions: parseInt(sumRows[0]?.total_transactions || 0, 10)
            }
        });
    } catch (err) {
        console.error('Get Admin Payments Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};
