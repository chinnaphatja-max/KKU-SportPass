const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { pool } = require('../src/config/db');
const { calculateBookingPrice, normalizeUserCategory, calculateHours } = require('../src/services/pricingService');
const { generatePromptPayPayload, verifyPromptPayCrc } = require('../src/utils/promptpay');
const { processExpiredPayments } = require('../src/cron/paymentTimeoutWorker');
const paymentController = require('../src/controllers/paymentController');

describe('KKU SportPass - Payment Gateway Integration Test Suite', () => {

    let testUserId;
    let testCourtId;
    let testBookingId;

    before(async () => {
        // Ensure test user exists
        const userRes = await pool.query(`
            INSERT INTO users (name, email, password, role, user_type)
            VALUES ('Test Gateway User', 'gateway_test_${Date.now()}@kku.ac.th', 'hashed', 'student', 'student')
            RETURNING id;
        `);
        testUserId = userRes.rows[0].id;

        // Ensure test court exists
        const courtRes = await pool.query(`
            SELECT id FROM courts WHERE type = 'tennis' LIMIT 1;
        `);
        if (courtRes.rows && courtRes.rows.length > 0) {
            testCourtId = courtRes.rows[0].id;
        } else {
            const newCourt = await pool.query(`
                INSERT INTO courts (name, type, price_per_slot, is_active)
                VALUES ('Test Tennis Court', 'tennis', 0, true)
                RETURNING id;
            `);
            testCourtId = newCourt.rows[0].id;
        }
    });

    after(async () => {
        // Cleanup test data
        if (testUserId) {
            await pool.query('DELETE FROM payments WHERE user_id = $1', [testUserId]);
            await pool.query('DELETE FROM bookings WHERE user_id = $1', [testUserId]);
            await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
        }
    });

    // ------------------------------------------------------------------------
    // 1. Pricing Engine Tests
    // ------------------------------------------------------------------------
    describe('1. Pricing Engine Matrix Calculation', () => {
        test('normalizes user categories correctly', () => {
            assert.strictEqual(normalizeUserCategory('student'), 'STUDENT');
            assert.strictEqual(normalizeUserCategory('STAFF'), 'STAFF');
            assert.strictEqual(normalizeUserCategory('admin'), 'STAFF');
            assert.strictEqual(normalizeUserCategory('external'), 'EXTERNAL');
            assert.strictEqual(normalizeUserCategory('unknown'), 'EXTERNAL');
        });

        test('calculates duration in hours accurately', () => {
            assert.strictEqual(calculateHours('08:00', '10:00'), 2);
            assert.strictEqual(calculateHours('18:00:00', '19:30:00'), 1.5);
        });

        test('Student daytime: Tennis 10:00-12:00 is FREE (0 THB)', async () => {
            const price = await calculateBookingPrice({
                courtId: testCourtId,
                sportType: 'tennis',
                userCategory: 'student',
                startTime: '10:00:00',
                endTime: '12:00:00'
            });

            assert.strictEqual(price.userCategory, 'STUDENT');
            assert.strictEqual(price.isFree, true);
            assert.strictEqual(price.totalAmount, 0);
            assert.strictEqual(price.lightingFee, 0);
        });

        test('Student nighttime: Tennis 18:00-20:00 charges lighting fee only (80 THB for 2 hrs)', async () => {
            const price = await calculateBookingPrice({
                courtId: testCourtId,
                sportType: 'tennis',
                userCategory: 'student',
                startTime: '18:00:00',
                endTime: '20:00:00'
            });

            assert.strictEqual(price.userCategory, 'STUDENT');
            assert.strictEqual(price.isFree, false);
            assert.strictEqual(price.baseCourtFee, 0);
            assert.strictEqual(price.lightingFee, 80); // 40 THB/hr * 2 hrs
            assert.strictEqual(price.totalAmount, 80);
        });

        test('Staff daytime vs night rates', async () => {
            const dayPrice = await calculateBookingPrice({
                courtId: testCourtId,
                sportType: 'tennis',
                userCategory: 'staff',
                startTime: '10:00:00',
                endTime: '11:00:00'
            });
            assert.strictEqual(dayPrice.baseCourtFee, 40);
            assert.strictEqual(dayPrice.lightingFee, 0);
            assert.strictEqual(dayPrice.totalAmount, 40);

            const nightPrice = await calculateBookingPrice({
                courtId: testCourtId,
                sportType: 'tennis',
                userCategory: 'staff',
                startTime: '18:00:00',
                endTime: '19:00:00'
            });
            assert.strictEqual(nightPrice.baseCourtFee, 40);
            assert.strictEqual(nightPrice.lightingFee, 40);
            assert.strictEqual(nightPrice.totalAmount, 80);
        });

        test('External user: full rates applied', async () => {
            const externalPrice = await calculateBookingPrice({
                courtId: testCourtId,
                sportType: 'tennis',
                userCategory: 'external',
                startTime: '18:00:00',
                endTime: '19:00:00'
            });
            assert.strictEqual(externalPrice.baseCourtFee, 120);
            assert.strictEqual(externalPrice.lightingFee, 80);
            assert.strictEqual(externalPrice.totalAmount, 200);
        });
    });

    // ------------------------------------------------------------------------
    // 2. Thai QR PromptPay Dynamic Payload & CRC-16 Checksum
    // ------------------------------------------------------------------------
    describe('2. PromptPay EMVCo QR Generator', () => {
        test('generates valid EMVCo PromptPay payload with Tag 62 reference', () => {
            const payload = generatePromptPayPayload('0994000159562', 150.00, { referenceNo: 'KKU12345' });
            assert.ok(payload.startsWith('00020101021229370016A000000677010111'));
            assert.ok(payload.includes('5406150.00'));
            assert.ok(payload.includes('62120508KKU12345'));
            assert.strictEqual(verifyPromptPayCrc(payload), true);
        });
    });

    // ------------------------------------------------------------------------
    // 3. Checkout API Tests (Dynamic QR + 15-Minute Expiration Window)
    // ------------------------------------------------------------------------
    describe('3. Checkout API & Free Tier Auto-Confirmation', () => {
        test('Free booking instantly auto-confirms without pending payment', async () => {
            // Create a daytime student booking
            const bRes = await pool.query(`
                INSERT INTO bookings (user_id, court_id, booking_date, start_time, end_time, status)
                VALUES ($1, $2, '2026-09-20', '10:00:00', '11:00:00', 'pending')
                RETURNING id;
            `, [testUserId, testCourtId]);
            const freeBookingId = bRes.rows[0].id;

            const req = {
                body: { bookingId: freeBookingId },
                user: { id: testUserId, role: 'student' },
                session: { user: { id: testUserId, role: 'student' } }
            };

            let responseData = null;
            const res = {
                status: (code) => ({
                    json: (data) => { responseData = { code, ...data }; }
                }),
                json: (data) => { responseData = { code: 200, ...data }; }
            };

            await paymentController.checkout(req, res);

            assert.strictEqual(responseData.success, true);
            assert.strictEqual(responseData.isFree, true);

            // Verify booking confirmed in DB
            const check = await pool.query('SELECT status, ticket_qr FROM bookings WHERE id = $1', [freeBookingId]);
            assert.strictEqual(check.rows[0].status, 'confirmed');
            assert.ok(check.rows[0].ticket_qr);
        });

        test('Paid booking creates PENDING payment with 15-minute expiration and QR Base64', async () => {
            // Create a nighttime booking for External rate
            const bRes = await pool.query(`
                INSERT INTO bookings (user_id, court_id, booking_date, start_time, end_time, status)
                VALUES ($1, $2, '2026-09-20', '18:00:00', '19:00:00', 'pending')
                RETURNING id;
            `, [testUserId, testCourtId]);
            testBookingId = bRes.rows[0].id;

            const req = {
                body: { bookingId: testBookingId, paymentMethod: 'PROMPTPAY' },
                user: { id: testUserId, role: 'external' },
                session: { user: { id: testUserId, role: 'external' } }
            };

            let responseData = null;
            const res = {
                status: (code) => ({
                    json: (data) => { responseData = { code, ...data }; }
                }),
                json: (data) => { responseData = { code: 200, ...data }; }
            };

            await paymentController.checkout(req, res);

            assert.strictEqual(responseData.code, 201);
            assert.strictEqual(responseData.success, true);
            assert.ok(responseData.paymentId);
            assert.ok(responseData.referenceNo);
            assert.strictEqual(responseData.amount, 200); // 120 base + 80 lighting
            assert.ok(responseData.qrPayload);
            assert.ok(responseData.qrImage.startsWith('data:image/png;base64,'));
            
            // Check 15-minute timeout window
            const expiresAt = new Date(responseData.expiresAt);
            const now = new Date();
            const diffMins = (expiresAt - now) / (1000 * 60);
            assert.ok(diffMins > 14 && diffMins <= 16, `Expiration should be ~15 mins, got ${diffMins}`);

            // Verify in DB
            const pCheck = await pool.query('SELECT status, payment_status, amount FROM payments WHERE id = $1', [responseData.paymentId]);
            assert.strictEqual(pCheck.rows[0].status, 'PENDING');
            assert.strictEqual(pCheck.rows[0].payment_status, 'PENDING');
            assert.strictEqual(Number(pCheck.rows[0].amount), 200);
        });
    });

    // ------------------------------------------------------------------------
    // 4. Webhook Listener API Tests (Idempotency, Amount Mismatch, and Late Payment)
    // ------------------------------------------------------------------------
    describe('4. Webhook Listener API & Idempotency', () => {
        let paymentRef;
        let webhookBookingId;

        before(async () => {
            const bRes = await pool.query(`
                INSERT INTO bookings (user_id, court_id, booking_date, start_time, end_time, status)
                VALUES ($1, $2, '2026-09-20', '18:00:00', '19:00:00', 'pending')
                RETURNING id;
            `, [testUserId, testCourtId]);
            webhookBookingId = bRes.rows[0].id;

            paymentRef = `KKU_HOOK_${Date.now()}`;
            await pool.query(`
                INSERT INTO payments (
                    booking_id, user_id, amount, currency, payment_method, status, payment_status,
                    transaction_ref, receipt_no, expires_at, created_at
                ) VALUES (
                    $1, $2, 200, 'THB', 'PROMPTPAY', 'PENDING', 'PENDING',
                    $3, $4, NOW() + INTERVAL '15 minutes', NOW()
                );
            `, [webhookBookingId, testUserId, paymentRef, `REC-HOOK-${Date.now()}`]);
        });

        test('Webhook Happy Path: confirms payment, issues ticket QR, updates booking to confirmed', async () => {
            const req = {
                body: {
                    event_type: 'PAYMENT_RECEIVED',
                    reference_no: paymentRef,
                    gateway_transaction_id: `BANK-TXN-${Date.now()}`,
                    amount: 200,
                    paid_at: new Date().toISOString()
                },
                headers: {}
            };

            let responseData = null;
            const res = {
                status: (code) => ({
                    json: (data) => { responseData = { code, ...data }; }
                }),
                json: (data) => { responseData = { code: 200, ...data }; }
            };

            await paymentController.handleWebhook(req, res);

            assert.strictEqual(responseData.code, 200);
            assert.strictEqual(responseData.status, 'SUCCESS');

            // DB verification
            const p = await pool.query('SELECT status, payment_status, gateway_transaction_id FROM payments WHERE transaction_ref = $1', [paymentRef]);
            assert.strictEqual(p.rows[0].status, 'SUCCESS');
            assert.strictEqual(p.rows[0].payment_status, 'COMPLETED');

            const b = await pool.query('SELECT status, ticket_qr FROM bookings WHERE id = $1', [webhookBookingId]);
            assert.strictEqual(b.rows[0].status, 'confirmed');
            assert.ok(b.rows[0].ticket_qr);
        });

        test('IDEMPOTENCY: Duplicate webhook event responds 200 without duplicate processing', async () => {
            const req = {
                body: {
                    reference_no: paymentRef,
                    gateway_transaction_id: `BANK-TXN-DUP`,
                    amount: 200
                },
                headers: {}
            };

            let responseData = null;
            const res = {
                status: (code) => ({
                    json: (data) => { responseData = { code, ...data }; }
                }),
                json: (data) => { responseData = { code: 200, ...data }; }
            };

            await paymentController.handleWebhook(req, res);

            assert.strictEqual(responseData.code, 200);
            assert.strictEqual(responseData.status, 'ALREADY_PROCESSED');
            assert.strictEqual(responseData.success, true);
        });

        test('EDGE CASE: Late payment after 15-minute slot timeout flags REFUND_PENDING', async () => {
            // Create an expired booking and payment
            const bRes = await pool.query(`
                INSERT INTO bookings (user_id, court_id, booking_date, start_time, end_time, status)
                VALUES ($1, $2, '2026-09-21', '18:00:00', '19:00:00', 'cancelled')
                RETURNING id;
            `, [testUserId, testCourtId]);
            const lateBookingId = bRes.rows[0].id;

            const lateRef = `KKU_LATE_${Date.now()}`;
            const pRes = await pool.query(`
                INSERT INTO payments (
                    booking_id, user_id, amount, currency, payment_method, status, payment_status,
                    transaction_ref, receipt_no, expires_at, created_at
                ) VALUES (
                    $1, $2, 200, 'THB', 'PROMPTPAY', 'EXPIRED', 'EXPIRED',
                    $3, $4, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '20 minutes'
                ) RETURNING id;
            `, [lateBookingId, testUserId, lateRef, `REC-LATE-${Date.now()}`]);
            const latePaymentId = pRes.rows[0].id;

            // Bank webhook arrives late
            const req = {
                body: {
                    reference_no: lateRef,
                    gateway_transaction_id: `BANK-LATE-${Date.now()}`,
                    amount: 200,
                    paid_at: new Date().toISOString()
                },
                headers: {}
            };

            let responseData = null;
            const res = {
                status: (code) => ({
                    json: (data) => { responseData = { code, ...data }; }
                }),
                json: (data) => { responseData = { code: 200, ...data }; }
            };

            await paymentController.handleWebhook(req, res);

            assert.strictEqual(responseData.code, 200);
            assert.strictEqual(responseData.status, 'REFUND_QUEUED');

            // DB check: Payment must be marked REFUND_PENDING
            const p = await pool.query('SELECT status, payment_status FROM payments WHERE id = $1', [latePaymentId]);
            assert.strictEqual(p.rows[0].status, 'REFUND_PENDING');

            // Booking remains cancelled (not confirmed)
            const b = await pool.query('SELECT status FROM bookings WHERE id = $1', [lateBookingId]);
            assert.strictEqual(b.rows[0].status, 'cancelled');
        });
    });

    // ------------------------------------------------------------------------
    // 5. 15-Minute Timeout Worker
    // ------------------------------------------------------------------------
    describe('5. Payment 15-Minute Timeout Cron Worker', () => {
        test('Automatically expires unpaid reservations older than expires_at', async () => {
            // Create a pending booking with expired payment
            const bRes = await pool.query(`
                INSERT INTO bookings (user_id, court_id, booking_date, start_time, end_time, status)
                VALUES ($1, $2, '2026-09-22', '18:00:00', '19:00:00', 'pending')
                RETURNING id;
            `, [testUserId, testCourtId]);
            const timeoutBookingId = bRes.rows[0].id;

            const timeoutRef = `KKU_TIMEOUT_${Date.now()}`;
            await pool.query(`
                INSERT INTO payments (
                    booking_id, user_id, amount, currency, payment_method, status, payment_status,
                    transaction_ref, receipt_no, expires_at, created_at
                ) VALUES (
                    $1, $2, 100, 'THB', 'PROMPTPAY', 'PENDING', 'PENDING',
                    $3, $4, NOW() - INTERVAL '1 minute', NOW() - INTERVAL '16 minutes'
                );
            `, [timeoutBookingId, testUserId, timeoutRef, `REC-TIMEOUT-${Date.now()}`]);

            // Run timeout worker
            const result = await processExpiredPayments();

            assert.ok(result.expiredCount >= 1);

            // Check booking cancelled
            const b = await pool.query('SELECT status FROM bookings WHERE id = $1', [timeoutBookingId]);
            assert.strictEqual(b.rows[0].status, 'cancelled');

            // Check payment expired
            const p = await pool.query('SELECT status, payment_status FROM payments WHERE transaction_ref = $1', [timeoutRef]);
            assert.strictEqual(p.rows[0].status, 'EXPIRED');
            assert.strictEqual(p.rows[0].payment_status, 'EXPIRED');
        });
    });
});
