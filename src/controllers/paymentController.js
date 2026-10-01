const crypto = require('crypto');
const QRCode = require('qrcode');
const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { appSetting } = require('../utils/helpers');
const { generatePromptPayPayload } = require('../utils/promptpay');
const pricingService = require('../services/pricingService');

/**
 * Payment Controller — Multi-Gateway Production Architecture
 * 
 * Supports 3 payment modes configured via PAYMENT_MODE environment variable or app_settings:
 * 1. 'simulated' (Default in development/testing):
 *    - Instant completion and electronic receipt issuance without external payment gateway.
 * 2. 'promptpay' (Native Thai QR PromptPay):
 *    - Generates EMVCo-compliant Thai QR code with BOT PromptPay standard.
 *    - Compatible with all Thai mobile banking applications (SCB, K-Plus, Krungthai NEXT, etc.).
 * 3. 'omise' (Opn Payments Gateway):
 *    - Integrates with Omise Payment Gateway API for PromptPay QR and credit/debit card processing.
 *    - Supports live QR generation, real-time polling verification, and webhook confirmation.
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

async function getPaymentMode() {
    const envMode = process.env.PAYMENT_MODE;
    if (envMode) return envMode.toLowerCase().trim();
    const dbMode = await appSetting('payment_mode', 'simulated');
    return (dbMode || 'simulated').toLowerCase().trim();
}

async function getPromptPayId() {
    return process.env.PROMPTPAY_ID || await appSetting('promptpay_id', '0994000159491');
}

/**
 * Calls Omise REST API to create a PromptPay charge
 */
async function createOmisePromptPayCharge(amountInBaht, bookingId, userEmail) {
    const secretKey = process.env.OMISE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('OMISE_SECRET_KEY is not configured in environment');
    }

    const amountInSatangs = Math.round(Number(amountInBaht) * 100);
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

    // Step 1: Create Omise PromptPay Source
    const sourceRes = await fetch('https://api.omise.co/sources', {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amountInSatangs,
            currency: 'thb',
            type: 'promptpay'
        })
    });

    const sourceData = await sourceRes.json();
    if (!sourceRes.ok) {
        throw new Error(sourceData.message || 'Failed to create Omise payment source');
    }

    // Step 2: Create Charge with the PromptPay source
    const chargeRes = await fetch('https://api.omise.co/charges', {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amountInSatangs,
            currency: 'thb',
            source: sourceData.id,
            description: `KKU SportPass Booking #${bookingId}`,
            metadata: {
                booking_id: bookingId,
                email: userEmail
            }
        })
    });

    const chargeData = await chargeRes.json();
    if (!chargeRes.ok) {
        throw new Error(chargeData.message || 'Failed to create Omise charge');
    }

    return chargeData;
}

/**
 * Queries Omise charge status by charge ID
 */
async function getOmiseCharge(chargeId) {
    const secretKey = process.env.OMISE_SECRET_KEY;
    if (!secretKey) return null;

    try {
        const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
        const res = await fetch(`https://api.omise.co/charges/${chargeId}`, {
            headers: { 'Authorization': authHeader }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error('Error querying Omise charge:', e.message);
        return null;
    }
}

// Public: Get Payment Gateway Config for Frontend
exports.getPaymentConfig = async (req, res) => {
    try {
        const mode = await getPaymentMode();
        const promptpayId = await getPromptPayId();
        const omisePublicKey = process.env.OMISE_PUBLIC_KEY || null;
        const omiseConfigured = Boolean(process.env.OMISE_SECRET_KEY);

        res.json({
            success: true,
            payment_mode: mode,
            promptpay_enabled: Boolean(promptpayId),
            promptpay_id_masked: promptpayId && promptpayId.length >= 6 
                ? `${promptpayId.slice(0, 3)}****${promptpayId.slice(-3)}` 
                : null,
            omise_enabled: omiseConfigured,
            omise_public_key: omisePublicKey
        });
    } catch (err) {
        console.error('Get Payment Config Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

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

        const currentMode = await getPaymentMode();

        if (existingPayment && existingPayment.length > 0) {
            return res.json({
                success: true,
                message: "รายการนี้ได้รับการชำระเงินเรียบร้อยแล้ว",
                payment: existingPayment[0],
                payment_mode: currentMode,
                payment_status: 'COMPLETED'
            });
        }

        const amount = Number(booking.fee_amount) || 0;
        const receiptNo = generateReceiptNo();
        const transactionRef = generateTransactionRef();

        // 1. FREE COURT / 0 FEE HANDLING
        if (amount <= 0 || !booking.is_fee_required) {
            const [freePaymentRes] = await pool.query(`
                INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status, transaction_ref, receipt_no, paid_at)
                VALUES (?, ?, 0, 'free', 'COMPLETED', ?, ?, CURRENT_TIMESTAMP)
                RETURNING *
            `, [booking_id, booking.user_id, transactionRef, receiptNo]);

            const freePayment = freePaymentRes[0] || {
                booking_id,
                user_id: booking.user_id,
                amount: 0,
                payment_method: 'free',
                payment_status: 'COMPLETED',
                transaction_ref: transactionRef,
                receipt_no: receiptNo
            };

            return res.json({
                success: true,
                message: "ไม่มีค่าธรรมเนียมสำหรับสนามนี้ บันทึกรายการสำเร็จ",
                payment: freePayment,
                payment_mode: currentMode,
                payment_status: 'COMPLETED'
            });
        }

        // 2. OMISE GATEWAY MODE
        if (currentMode === 'omise') {
            if (!process.env.OMISE_SECRET_KEY) {
                return res.status(503).json({ 
                    error: "ยังไม่ได้กำหนดค่า OMISE_SECRET_KEY สำหรับเชื่อมต่อ Omise Payment Gateway" 
                });
            }

            try {
                const userEmail = req.session?.user?.email || req.user?.email || '';
                const omiseCharge = await createOmisePromptPayCharge(amount, booking.id, userEmail);

                const chargeId = omiseCharge.id;
                const qrImageUrl = omiseCharge.source?.scannable_code?.image?.download_uri || null;

                const [paymentRes] = await pool.query(`
                    INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status, transaction_ref, receipt_no)
                    VALUES (?, ?, ?, 'promptpay', 'PENDING', ?, ?)
                    RETURNING *
                `, [booking_id, booking.user_id, amount, chargeId, receiptNo]);

                const payment = paymentRes[0] || {
                    booking_id,
                    user_id: booking.user_id,
                    amount,
                    payment_method: 'promptpay',
                    payment_status: 'PENDING',
                    transaction_ref: chargeId,
                    receipt_no: receiptNo
                };

                return res.json({
                    success: true,
                    message: "สร้างคำสั่งชำระเงินผ่าน Omise Gateway สำเร็จ",
                    payment_mode: 'omise',
                    payment_status: 'PENDING',
                    charge_id: chargeId,
                    qr_image_url: qrImageUrl,
                    authorize_uri: omiseCharge.authorize_uri,
                    transaction_ref: chargeId,
                    receipt_no: receiptNo,
                    amount,
                    payment
                });
            } catch (gatewayErr) {
                console.error('Omise Gateway Error:', gatewayErr);
                return res.status(502).json({ 
                    error: `เกิดข้อผิดพลาดในการเชื่อมต่อ Payment Gateway: ${gatewayErr.message}` 
                });
            }
        }

        // 3. NATIVE PROMPTPAY QR MODE (EMVCo Bank of Thailand Standard)
        if (currentMode === 'promptpay') {
            const promptpayId = await getPromptPayId();
            let qrPayload = '';
            try {
                qrPayload = generatePromptPayPayload(promptpayId, amount);
            } catch (qrErr) {
                return res.status(500).json({ error: `ไม่สามารถสร้าง PromptPay QR: ${qrErr.message}` });
            }

            const [paymentRes] = await pool.query(`
                INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status, transaction_ref, receipt_no)
                VALUES (?, ?, ?, 'promptpay', 'PENDING', ?, ?)
                RETURNING *
            `, [booking_id, booking.user_id, amount, transactionRef, receiptNo]);

            const payment = paymentRes[0] || {
                booking_id,
                user_id: booking.user_id,
                amount,
                payment_method: 'promptpay',
                payment_status: 'PENDING',
                transaction_ref: transactionRef,
                receipt_no: receiptNo
            };

            return res.json({
                success: true,
                message: "สร้าง QR Code PromptPay สำเร็จ กรุณาสแกนผ่านแอปธนาคารเพื่อชำระเงิน",
                payment_mode: 'promptpay',
                payment_status: 'PENDING',
                qr_payload: qrPayload,
                promptpay_id: promptpayId,
                transaction_ref: transactionRef,
                receipt_no: receiptNo,
                amount,
                payment
            });
        }

        // 4. SIMULATED PAYMENT MODE (Default Fallback)
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
            reason: `ชำระเงินค่าบำรุงรักษาสนาม (${booking.court_name}) [โหมดจำลอง Simulated]`,
            details: {
                booking_id,
                amount,
                payment_method,
                receipt_no: receiptNo,
                transaction_ref: transactionRef,
                payment_mode: 'simulated'
            }
        });

        res.json({
            success: true,
            message: "ชำระเงินและออกใบเสร็จอิเล็กทรอนิกส์สำเร็จ (โหมดจำลอง Simulated)",
            payment,
            payment_mode: 'simulated',
            payment_status: 'COMPLETED'
        });
    } catch (err) {
        console.error('Process Payment Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// User / Staff: Verify or poll payment status
exports.verifyPayment = async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        const userRole = req.session?.user?.role || req.user?.role;
        const isStaff = ['admin', 'super_admin', 'staff'].includes(userRole);

        const { booking_id, transaction_ref } = req.body;
        if (!booking_id && !transaction_ref) {
            return res.status(400).json({ error: "ระบุ booking_id หรือ transaction_ref" });
        }

        let query = "SELECT * FROM payments WHERE ";
        const params = [];
        if (transaction_ref) {
            query += "transaction_ref = ?";
            params.push(transaction_ref);
        } else {
            query += "booking_id = ? ORDER BY id DESC LIMIT 1";
            params.push(booking_id);
        }

        const [rows] = await pool.query(query, params);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "ไม่พบข้อมูลการชำระเงิน" });
        }

        const payment = rows[0];
        if (payment.user_id !== userId && !isStaff) {
            return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงรายการชำระเงินนี้" });
        }

        if (payment.payment_status === 'COMPLETED') {
            return res.json({ 
                success: true, 
                payment_status: 'COMPLETED', 
                payment,
                message: "รายการนี้ได้รับการชำระเงินเรียบร้อยแล้ว"
            });
        }

        // If Omise charge, query Omise REST API
        if (payment.transaction_ref && payment.transaction_ref.startsWith('chrg_')) {
            const charge = await getOmiseCharge(payment.transaction_ref);
            if (charge && charge.status === 'successful') {
                await pool.query(
                    "UPDATE payments SET payment_status = 'COMPLETED', paid_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [payment.id]
                );
                payment.payment_status = 'COMPLETED';
                payment.paid_at = new Date();

                await logAudit(req, {
                    action: 'PAYMENT_COMPLETED',
                    target_type: 'payment',
                    target_id: String(payment.id),
                    reason: `ยืนยันการชำระเงินสำเร็จผ่าน Omise Gateway (${charge.id})`,
                    details: { payment_id: payment.id, charge_id: charge.id, amount: payment.amount }
                });

                return res.json({
                    success: true,
                    payment_status: 'COMPLETED',
                    payment,
                    message: "ยืนยันการชำระเงินสำเร็จ"
                });
            } else if (charge && charge.status === 'failed') {
                await pool.query("UPDATE payments SET payment_status = 'FAILED' WHERE id = ?", [payment.id]);
                payment.payment_status = 'FAILED';
                return res.json({
                    success: false,
                    payment_status: 'FAILED',
                    payment,
                    error: "การชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
                });
            }
        }

        // If staff manual confirmation or simulation confirmation
        if (isStaff && req.body.action === 'approve') {
            await pool.query(
                "UPDATE payments SET payment_status = 'COMPLETED', paid_at = CURRENT_TIMESTAMP WHERE id = ?",
                [payment.id]
            );
            payment.payment_status = 'COMPLETED';
            payment.paid_at = new Date();

            await logAudit(req, {
                action: 'PAYMENT_MANUAL_APPROVED',
                target_type: 'payment',
                target_id: String(payment.id),
                reason: `เจ้าหน้าที่ตรวจสอบและยืนยันการชำระเงินด้วยตนเอง`,
                details: { payment_id: payment.id, amount: payment.amount }
            });

            return res.json({ 
                success: true, 
                payment_status: 'COMPLETED', 
                payment,
                message: "เจ้าหน้าที่ยืนยันการชำระเงินสำเร็จ"
            });
        }

        res.json({
            success: true,
            payment_status: payment.payment_status,
            payment,
            message: "อยู่ระหว่างรอการชำระเงิน"
        });
    } catch (err) {
        console.error('Verify Payment Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ============================================================================
// 1. Pricing Engine API Endpoint
// ============================================================================
exports.calculatePrice = async (req, res) => {
    try {
        const { courtId, sportType, userCategory, startTime, endTime } = req.body;
        const effectiveCategory = userCategory || req.user?.role || req.session?.user?.role || 'student';
        
        const pricing = await pricingService.calculateBookingPrice({
            courtId,
            sportType,
            userCategory: effectiveCategory,
            startTime,
            endTime
        });

        res.json({
            success: true,
            pricing
        });
    } catch (err) {
        console.error('Calculate Price Error:', err);
        res.status(500).json({ error: 'Failed to calculate price' });
    }
};

// ============================================================================
// 2. Checkout API Endpoint (Dynamic QR PromptPay & 15-Minute Expiration)
// ============================================================================
exports.checkout = async (req, res) => {
    const client = await pool.pool.connect();
    try {
        const { bookingId, paymentMethod = 'PROMPTPAY', idempotencyKey } = req.body;
        const userId = req.session?.user?.id || req.user?.id;
        const userRole = req.session?.user?.role || req.user?.role || 'student';

        if (!bookingId) {
            return res.status(400).json({ error: 'bookingId is required' });
        }

        // 1. Verify booking and fetch details
        const bookingRes = await client.query(
            `SELECT b.*, c.type as sport_type, c.id as court_id, c.name as court_name
             FROM bookings b 
             JOIN courts c ON b.court_id = c.id 
             WHERE b.id = $1 AND (b.user_id = $2 OR $3 = true)`,
            [bookingId, userId, ['admin', 'super_admin'].includes(userRole)]
        );

        if (!bookingRes.rows || bookingRes.rows.length === 0) {
            return res.status(404).json({ error: 'ไม่พบรายการจองนี้ หรือไม่มีสิทธิ์เข้าถึง' });
        }

        const booking = bookingRes.rows[0];
        if (booking.status === 'confirmed') {
            return res.status(400).json({ error: 'รายการจองนี้ได้รับการยืนยันเรียบร้อยแล้ว' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ error: 'รายการจองนี้ถูกยกเลิกแล้ว ไม่สามารถชำระเงินได้' });
        }

        // 2. Calculate price using Pricing Engine
        const pricing = await pricingService.calculateBookingPrice({
            courtId: booking.court_id,
            sportType: booking.sport_type,
            userCategory: userRole,
            startTime: booking.start_time,
            endTime: booking.end_time
        });

        // If free (e.g. student during daytime)
        if (pricing.isFree || pricing.totalAmount === 0) {
            const ticketToken = crypto.randomBytes(16).toString('hex');
            await client.query(
                `UPDATE bookings 
                 SET status = 'confirmed', ticket_qr = $1, updated_at = NOW() 
                 WHERE id = $2`,
                [ticketToken, bookingId]
            );

            return res.json({
                success: true,
                isFree: true,
                amount: 0,
                bookingId,
                message: 'ยืนยันการจองเรียบร้อย ไม่มีค่าบริการสำหรับสิทธิ์ของคุณ'
            });
        }

        await client.query('BEGIN');

        // 3. Prepare payment metadata & reference
        const referenceNo = `KKU${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        const receiptNo = generateReceiptNo();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute checkout window

        // 4. Generate Dynamic PromptPay QR Payload (BOT EMVCo standard)
        const promptPayTarget = await getPromptPayId();
        const qrPayload = generatePromptPayPayload(promptPayTarget, pricing.totalAmount, { referenceNo });

        // Generate Base64 QR Image Data URL
        const qrImage = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 8
        });

        // 5. Insert / Update payment record
        const insertQuery = `
            INSERT INTO payments (
                booking_id, user_id, amount, base_amount, net_amount, currency,
                payment_method, payment_status, status, transaction_ref, receipt_no,
                qr_payload, expires_at, idempotency_key, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, 'THB',
                $6, 'PENDING', 'PENDING', $7, $8,
                $9, $10, $11, NOW(), NOW()
            )
            RETURNING id, transaction_ref, receipt_no, amount, expires_at;
        `;

        const paymentRes = await client.query(insertQuery, [
            bookingId,
            userId,
            pricing.totalAmount,
            pricing.baseCourtFee,
            pricing.totalAmount,
            paymentMethod.toUpperCase(),
            referenceNo,
            receiptNo,
            qrPayload,
            expiresAt,
            idempotencyKey || null
        ]);

        await client.query('COMMIT');

        const payment = paymentRes.rows[0];

        res.status(201).json({
            success: true,
            paymentId: payment.id,
            referenceNo: payment.transaction_ref,
            receiptNo: payment.receipt_no,
            amount: pricing.totalAmount,
            breakdown: {
                baseCourtFee: pricing.baseCourtFee,
                lightingFee: pricing.lightingFee,
                durationHours: pricing.durationHours
            },
            expiresAt: payment.expires_at,
            qrPayload,
            qrImage
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Checkout API Error:', err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน' });
    } finally {
        client.release();
    }
};

// ============================================================================
// 3. Webhook Listener API Endpoint (Idempotency, HMAC, and Late Payment Refund)
// ============================================================================
exports.handleWebhook = async (req, res) => {
    // 1. Signature Verification (HMAC-SHA256)
    const secretKey = process.env.PAYMENT_WEBHOOK_SECRET;
    const signature = req.headers['x-signature'] || req.headers['x-gateway-signature'];
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, PAYMENT_WEBHOOK_SECRET and a valid signature are strictly mandatory
    if (isProduction) {
        if (!secretKey) {
            console.error('🚨 Webhook Error: PAYMENT_WEBHOOK_SECRET is not configured in production.');
            return res.status(503).json({ error: 'Webhook processing unavailable: Webhook secret unconfigured' });
        }
        if (!signature) {
            console.warn('⚠️ Webhook rejected: Missing required signature header in production.');
            return res.status(401).json({ error: 'Missing webhook signature header' });
        }
    }

    // When secret is set or signature is provided, verify authenticity
    if (secretKey) {
        if (!signature) {
            return res.status(401).json({ error: 'Missing webhook signature header' });
        }
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const expected = crypto.createHmac('sha256', secretKey).update(rawBody, 'utf8').digest('hex');
        try {
            const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
            if (!isValid) {
                console.warn('⚠️ Webhook Signature Verification Failed!');
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }
        } catch (sigErr) {
            return res.status(401).json({ error: 'Malformed webhook signature' });
        }
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Extract reference from either Bank Switch payload or Omise format
    let ref = payload.reference_no || payload.transaction_ref;
    let gatewayTxnId = payload.gateway_transaction_id || payload.id;
    let paidAmount = payload.amount !== undefined ? Number(payload.amount) : null;
    let paidAt = payload.paid_at ? new Date(payload.paid_at) : new Date();

    // Check Omise format
    if (payload.object === 'event' && payload.key === 'charge.complete' && payload.data) {
        gatewayTxnId = payload.data.id;
        ref = payload.data.metadata?.reference_no || payload.data.id;
        paidAmount = Number(payload.data.amount) / 100;
    } else if (payload.object === 'charge') {
        gatewayTxnId = payload.id;
        ref = payload.metadata?.reference_no || payload.id;
        paidAmount = Number(payload.amount) / 100;
    }

    if (!ref && !gatewayTxnId) {
        return res.status(400).json({ error: 'Missing reference or transaction ID' });
    }

    const client = await pool.pool.connect();
    try {
        await client.query('BEGIN');

        // 2. Row-Level Lock & Idempotency Check (SELECT FOR UPDATE)
        const selectQuery = `
            SELECT p.*, b.status AS booking_status
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            WHERE p.transaction_ref = $1 OR p.gateway_transaction_id = $1 OR p.transaction_ref = $2
            FOR UPDATE OF p, b;
        `;
        const { rows } = await client.query(selectQuery, [ref, gatewayTxnId]);

        if (!rows || rows.length === 0) {
            await client.query('ROLLBACK');
            console.warn(`Webhook: Payment record not found for ref: ${ref || gatewayTxnId}`);
            return res.status(404).json({ error: 'Payment record not found' });
        }

        const payment = rows[0];

        // 3. IDEMPOTENT CHECK: If already COMPLETED or SUCCESS, acknowledge immediately
        if (payment.status === 'SUCCESS' || payment.payment_status === 'COMPLETED') {
            await client.query('ROLLBACK');
            console.log(`ℹ️ Webhook: Payment ${payment.transaction_ref} already processed (Idempotent OK).`);
            return res.status(200).json({ status: 'ALREADY_PROCESSED', success: true });
        }

        // Amount verification
        if (paidAmount !== null && Math.abs(Number(payment.amount) - paidAmount) > 0.01) {
            console.error(`🚨 Amount mismatch! Expected: ${payment.amount}, Received: ${paidAmount}`);
            await client.query(
                `UPDATE payments 
                 SET status = 'FAILED', payment_status = 'FAILED', failure_reason = 'Amount mismatch', 
                     raw_webhook_payload = $1, updated_at = NOW() 
                 WHERE id = $2`,
                [payload, payment.id]
            );
            await client.query('COMMIT');
            return res.status(400).json({ error: 'Amount mismatch' });
        }

        const now = new Date();
        const isExpired = (payment.expires_at && new Date(payment.expires_at) < now) || 
                          payment.status === 'EXPIRED' || 
                          payment.payment_status === 'EXPIRED' ||
                          payment.booking_status === 'cancelled';

        // 4. LATE PAYMENT / TIMEOUT REFUND EDGE CASE
        if (isExpired) {
            console.warn(`⚠️ LATE PAYMENT DETECTED: Booking ${payment.booking_id} expired, but payment received! Marking REFUND_PENDING.`);
            await client.query(`
                UPDATE payments 
                SET status = 'REFUND_PENDING', payment_status = 'REFUND_PENDING',
                    gateway_transaction_id = $1, paid_at = $2, raw_webhook_payload = $3, updated_at = NOW()
                WHERE id = $4
            `, [gatewayTxnId, paidAt, payload, payment.id]);

            // Audit log for Admin to trigger refund or re-queue
            try {
                await client.query(`
                    INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target_type, target_id, reason, details)
                    VALUES ($1, 'Payment Gateway', 'system', 'LATE_PAYMENT_REFUND_ALERT', 'PAYMENT', $2, 'Received after 15-minute slot timeout', $3)
                `, [
                    payment.user_id,
                    String(payment.id),
                    JSON.stringify({
                        bookingId: payment.booking_id,
                        transactionRef: payment.transaction_ref,
                        amount: payment.amount,
                        paidAmount,
                        note: 'Received after 15-minute slot timeout. Admin refund or court re-assignment required.'
                    })
                ]);
            } catch (auditErr) {
                console.warn('Could not write audit log for late payment:', auditErr.message);
            }

            await client.query('COMMIT');
            return res.status(200).json({
                status: 'REFUND_QUEUED',
                message: 'Payment received after expiration; queued for administrative refund'
            });
        }

        // 5. HAPPY PATH: Update to SUCCESS & Confirm Booking with Ticket QR
        const ticketToken = crypto.randomBytes(16).toString('hex');

        await client.query(`
            UPDATE payments 
            SET status = 'SUCCESS', payment_status = 'COMPLETED',
                gateway_transaction_id = $1, paid_at = $2, raw_webhook_payload = $3, updated_at = NOW()
            WHERE id = $4
        `, [gatewayTxnId, paidAt, payload, payment.id]);

        await client.query(`
            UPDATE bookings 
            SET status = 'confirmed', ticket_qr = $1, updated_at = NOW()
            WHERE id = $2
        `, [ticketToken, payment.booking_id]);

        // Audit log
        try {
            await client.query(`
                INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target_type, target_id, reason, details)
                VALUES ($1, 'Payment Gateway', 'system', 'PAYMENT_WEBHOOK_CONFIRMED', 'PAYMENT', $2, 'Webhook confirmed payment', $3)
            `, [
                payment.user_id,
                String(payment.id),
                JSON.stringify({
                    bookingId: payment.booking_id,
                    transactionRef: payment.transaction_ref,
                    gatewayTxnId,
                    amount: payment.amount
                })
            ]);
        } catch (auditErr) {
            console.warn('Could not write audit log:', auditErr.message);
        }

        await client.query('COMMIT');
        console.log(`✅ Webhook: Payment ${payment.transaction_ref} SUCCESS & Booking ${payment.booking_id} CONFIRMED.`);

        return res.status(200).json({
            status: 'SUCCESS',
            bookingId: payment.booking_id,
            transactionRef: payment.transaction_ref
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Webhook Processing Error:', err);
        return res.status(500).json({ error: 'Webhook processing failed' });
    } finally {
        client.release();
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

// Admin: Export Payments as CSV
exports.exportPaymentsCsv = async (req, res) => {
    try {
        const { date, payment_method, payment_status, search } = req.query;

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
        if (payment_status) {
            sql += ` AND p.payment_status = ?`;
            params.push(payment_status);
        }
        if (search) {
            sql += ` AND (p.receipt_no ILIKE ? OR p.transaction_ref ILIKE ? OR u.name ILIKE ? OR u.email ILIKE ? OR b.booking_code ILIKE ?)`;
            const q = `%${search.trim()}%`;
            params.push(q, q, q, q, q);
        }

        sql += ` ORDER BY p.paid_at DESC LIMIT 5000`;

        const [payments] = await pool.query(sql, params);

        const METHOD_TH = {
            PROMPTPAY: 'พร้อมเพย์ (PromptPay)',
            CREDIT_CARD: 'บัตรเครดิต/เดบิต',
            SIMULATED: 'จำลองการชำระเงิน (Simulated)',
            CASH: 'เงินสด/เคาน์เตอร์'
        };

        const STATUS_TH = {
            COMPLETED: 'ชำระเงินสำเร็จ',
            PENDING: 'รอชำระเงิน',
            FAILED: 'ล้มเหลว',
            REFUNDED: 'คืนเงินแล้ว'
        };

        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const headers = [
            'เลขที่ใบเสร็จ',
            'รหัสอ้างอิงธุรกรรม',
            'รหัสการจอง',
            'สนาม',
            'ประเภทกีฬา',
            'วันที่ใช้บริการ',
            'ช่วงเวลา',
            'ผู้ชำระเงิน',
            'อีเมล',
            'เบอร์โทร',
            'ยอดเงิน (บาท)',
            'ช่องทางชำระ',
            'สถานะการชำระ',
            'วันเวลาที่ชำระ'
        ];

        const rows = [headers.map(escapeCsv).join(',')];

        for (const p of payments) {
            rows.push([
                escapeCsv(p.receipt_no || '-'),
                escapeCsv(p.transaction_ref || '-'),
                escapeCsv(p.booking_code || p.booking_id),
                escapeCsv(p.court_name),
                escapeCsv(p.court_type),
                escapeCsv(p.booking_date),
                escapeCsv(`${p.start_time || ''} - ${p.end_time || ''}`),
                escapeCsv(p.user_name),
                escapeCsv(p.user_email),
                escapeCsv(p.user_phone || '-'),
                escapeCsv(Number(p.amount || 0).toFixed(2)),
                escapeCsv(METHOD_TH[p.payment_method] || p.payment_method),
                escapeCsv(STATUS_TH[p.payment_status] || p.payment_status),
                escapeCsv(p.paid_at ? new Date(p.paid_at).toLocaleString('th-TH') : '-')
            ].join(','));
        }

        const csvContent = '\uFEFF' + rows.join('\r\n');
        const filename = `payments_${date || 'all'}_${Date.now()}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);
    } catch (err) {
        console.error('Export Payments CSV Error:', err);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Exports for unit testing
exports.generateReceiptNo = generateReceiptNo;
exports.generateTransactionRef = generateTransactionRef;
exports.getPaymentMode = getPaymentMode;
exports.getPromptPayId = getPromptPayId;

