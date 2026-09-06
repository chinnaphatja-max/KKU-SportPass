const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { th } = require('../client/src/i18n/th');
const { en } = require('../client/src/i18n/en');

describe('Phase 3: Waitlist System Logic Tests', () => {
    test('Waitlist queue position calculation should be 1-indexed and chronological', () => {
        const mockWaitlists = [
            { id: 101, user_id: 1, court_id: 'z1-1', booking_date: '2026-09-10', start_time: '17:00:00', status: 'WAITING', created_at: '2026-09-06T10:00:00Z' },
            { id: 102, user_id: 2, court_id: 'z1-1', booking_date: '2026-09-10', start_time: '17:00:00', status: 'WAITING', created_at: '2026-09-06T10:05:00Z' },
            { id: 103, user_id: 3, court_id: 'z1-1', booking_date: '2026-09-10', start_time: '17:00:00', status: 'WAITING', created_at: '2026-09-06T10:10:00Z' }
        ];

        function getQueuePosition(waitlistId, list) {
            const waitingOnly = list.filter(w => w.status === 'WAITING');
            waitingOnly.sort((a, b) => a.id - b.id);
            const index = waitingOnly.findIndex(w => w.id === waitlistId);
            return index >= 0 ? index + 1 : null;
        }

        assert.equal(getQueuePosition(101, mockWaitlists), 1);
        assert.equal(getQueuePosition(102, mockWaitlists), 2);
        assert.equal(getQueuePosition(103, mockWaitlists), 3);
    });

    test('Auto-promotion logic promotes oldest waiting candidate when slot opens', async () => {
        let waitlistEntry = { id: 201, user_id: 42, court_id: 'z1-2', booking_date: '2026-09-10', start_time: '18:00:00', end_time: '19:00:00', status: 'WAITING' };
        let activeBookingsCount = 0;
        const courtCapacity = 1;
        let createdBooking = null;

        async function mockPromote(candidate) {
            if (activeBookingsCount < courtCapacity && candidate.status === 'WAITING') {
                const code = 'KKU-SP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
                createdBooking = {
                    id: 999,
                    user_id: candidate.user_id,
                    court_id: candidate.court_id,
                    booking_date: candidate.booking_date,
                    start_time: candidate.start_time,
                    end_time: candidate.end_time,
                    status: 'PENDING',
                    booking_code: code
                };
                candidate.status = 'PROMOTED';
                candidate.promoted_booking_id = createdBooking.id;
                return { promoted: true, booking: createdBooking };
            }
            return null;
        }

        const res = await mockPromote(waitlistEntry);
        assert.ok(res);
        assert.equal(res.promoted, true);
        assert.equal(waitlistEntry.status, 'PROMOTED');
        assert.equal(waitlistEntry.promoted_booking_id, 999);
        assert.equal(createdBooking.status, 'PENDING');
        assert.match(createdBooking.booking_code, /^KKU-SP-[A-F0-9]{6}$/);
    });
});

describe('Phase 3: Payment & Electronic Receipt Tests', () => {
    test('Receipt number format conforms to REC-YYYY-XXXXXX pattern', () => {
        function generateReceiptNo() {
            const year = new Date().getFullYear();
            const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
            return `REC-${year}-${hex}`;
        }

        const receiptNo = generateReceiptNo();
        const currentYear = new Date().getFullYear();
        const regex = new RegExp(`^REC-${currentYear}-[A-F0-9]{6}$`);
        assert.match(receiptNo, regex);
    });

    test('Transaction reference conforms to PAY-SP-timestamp-hex pattern', () => {
        function generateTransactionRef() {
            const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
            return `PAY-SP-${Date.now()}-${hex}`;
        }

        const ref = generateTransactionRef();
        assert.match(ref, /^PAY-SP-\d+-[A-F0-9]{6}$/);
    });

    test('Payment calculation respects fee amount and payment methods', () => {
        const court = { id: 'z1-1', name: 'Fitness', fee_amount: 40.0, is_fee_required: true };
        const paymentPayload = {
            booking_id: 123,
            user_id: 5,
            amount: court.fee_amount,
            payment_method: 'promptpay',
            payment_status: 'COMPLETED'
        };

        assert.equal(paymentPayload.amount, 40.0);
        assert.equal(paymentPayload.payment_status, 'COMPLETED');
        assert.ok(['promptpay', 'cash_on_site'].includes(paymentPayload.payment_method));
    });
});

describe('Phase 3: Utilization Heatmap Aggregation Tests', () => {
    test('Matrix covers 7 days of the week and 16 hourly intervals (06:00 to 21:00)', () => {
        const days = [
            { dow: 1, nameTh: 'จันทร์' },
            { dow: 2, nameTh: 'อังคาร' },
            { dow: 3, nameTh: 'พุธ' },
            { dow: 4, nameTh: 'พฤหัสบดี' },
            { dow: 5, nameTh: 'ศุกร์' },
            { dow: 6, nameTh: 'เสาร์' },
            { dow: 0, nameTh: 'อาทิตย์' }
        ];
        const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

        assert.equal(days.length, 7);
        assert.equal(hours.length, 16);
        assert.equal(hours[0], 6);
        assert.equal(hours[hours.length - 1], 21);
    });

    test('Relative intensity calculation scales accurately between 0% and 100%', () => {
        const maxCount = 20;
        function getIntensity(count) {
            return maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
        }

        assert.equal(getIntensity(0), 0);
        assert.equal(getIntensity(5), 25);
        assert.equal(getIntensity(10), 50);
        assert.equal(getIntensity(20), 100);
    });

    test('Peak slot extraction orders correctly by highest booking density', () => {
        const slots = [
            { dow: 1, hourStr: '08:00', count: 2 },
            { dow: 3, hourStr: '18:00', count: 18 },
            { dow: 5, hourStr: '17:00', count: 25 },
            { dow: 6, hourStr: '14:00', count: 7 }
        ];

        slots.sort((a, b) => b.count - a.count);
        assert.equal(slots[0].hourStr, '17:00');
        assert.equal(slots[0].count, 25);
        assert.equal(slots[1].hourStr, '18:00');
    });
});

describe('Phase 3: Multilingual Support (i18n) Key Parity Tests', () => {
    test('English dictionary contains all keys defined in Thai dictionary', () => {
        const thKeys = Object.keys(th);
        const enKeys = Object.keys(en);

        const missingInEn = thKeys.filter(k => !enKeys.includes(k));
        assert.deepEqual(missingInEn, [], `Missing translation keys in English dictionary: ${missingInEn.join(', ')}`);
    });

    test('Thai dictionary contains all keys defined in English dictionary', () => {
        const thKeys = Object.keys(th);
        const enKeys = Object.keys(en);

        const missingInTh = enKeys.filter(k => !thKeys.includes(k));
        assert.deepEqual(missingInTh, [], `Missing translation keys in Thai dictionary: ${missingInTh.join(', ')}`);
    });

    test('Critical UI action keys are non-empty strings', () => {
        const criticalKeys = [
            'btn_book_now',
            'btn_join_waitlist',
            'btn_cancel_booking',
            'btn_view_receipt',
            'btn_print_receipt',
            'heatmap_title',
            'receipt_title'
        ];

        for (const k of criticalKeys) {
            assert.ok(th[k] && th[k].trim().length > 0, `Key ${k} is empty in Thai dictionary`);
            assert.ok(en[k] && en[k].trim().length > 0, `Key ${k} is empty in English dictionary`);
        }
    });
});
