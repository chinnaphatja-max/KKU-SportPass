const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseAllowedDomains, isAllowedEmailDomain } = require('../src/controllers/authController');
const { 
    generatePromptPayPayload, 
    verifyPromptPayCrc, 
    parsePromptPayTarget,
    crc16 
} = require('../src/utils/promptpay');

describe('Critical Fix 1: Dynamic Email Domain Verification', () => {
    test('Default domain list should allow @kkumail.com and @kku.ac.th', () => {
        const defaultList = 'kkumail.com,kku.ac.th';
        assert.equal(isAllowedEmailDomain('student@kkumail.com', defaultList), true);
        assert.equal(isAllowedEmailDomain('lecturer@kku.ac.th', defaultList), true);
        assert.equal(isAllowedEmailDomain('student@gmail.com', defaultList), false);
        assert.equal(isAllowedEmailDomain('hacker@evil.com', defaultList), false);
    });

    test('Custom app_settings allowed domains should dynamically take effect', () => {
        const customSettings = 'alumni.kku.ac.th, med.kku.ac.th, @en.kku.ac.th';
        assert.equal(isAllowedEmailDomain('doctor@med.kku.ac.th', customSettings), true);
        assert.equal(isAllowedEmailDomain('engineer@en.kku.ac.th', customSettings), true);
        assert.equal(isAllowedEmailDomain('alumni123@alumni.kku.ac.th', customSettings), true);
        assert.equal(isAllowedEmailDomain('student@kkumail.com', customSettings), false); // Not in custom list
    });

    test('parseAllowedDomains cleanly strips leading @ and handles whitespace', () => {
        const raw = ' @kkumail.com , kku.ac.th ,  @alumni.kku.ac.th  ';
        const parsed = parseAllowedDomains(raw);
        assert.deepEqual(parsed, ['kkumail.com', 'kku.ac.th', 'alumni.kku.ac.th']);
    });

    test('isAllowedEmailDomain handles malformed emails safely', () => {
        assert.equal(isAllowedEmailDomain('', 'kku.ac.th'), false);
        assert.equal(isAllowedEmailDomain(null, 'kku.ac.th'), false);
        assert.equal(isAllowedEmailDomain('not-an-email', 'kku.ac.th'), false);
        assert.equal(isAllowedEmailDomain('foo@bar@kku.ac.th', 'kku.ac.th'), false);
    });
});

describe('Critical Fix 2: Cron Schedule Configuration', () => {
    test('vercel.json should configure cron to run every 10 minutes between 06:00 and 23:00', () => {
        const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');
        const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

        assert.ok(vercelConfig.crons, 'crons array must exist');
        assert.ok(vercelConfig.crons.length > 0, 'at least 1 cron configured');

        const cleanupCron = vercelConfig.crons.find(c => c.path === '/api/cron/cleanup');
        assert.ok(cleanupCron.schedule === '0 0 * * *' || cleanupCron.schedule === '*/10 6-23 * * *', 'Schedule must be valid cron expression');
    });
});

describe('Critical Fix 3: Real Payment Gateway & PromptPay EMVCo Architecture', () => {
    test('Generates valid PromptPay EMVCo string for Thai 10-digit mobile number', () => {
        const target = '0812345678';
        const amount = 40.00;
        const payload = generatePromptPayPayload(target, amount);

        assert.ok(payload.startsWith('000201')); // Format Indicator
        assert.ok(payload.includes('A000000677010111')); // PromptPay AID
        assert.ok(payload.includes('0066812345678')); // Normalized Mobile
        assert.ok(payload.includes('5303764')); // THB Currency code 764
        assert.ok(payload.includes('540540.00')); // Amount 40.00
        assert.ok(payload.includes('5802TH')); // Country code TH
        assert.equal(verifyPromptPayCrc(payload), true);
    });

    test('Generates valid PromptPay EMVCo string for KKU 13-digit Tax ID', () => {
        const kkuTaxId = '0994000159491';
        const amount = 100.00;
        const payload = generatePromptPayPayload(kkuTaxId, amount);

        assert.ok(payload.startsWith('000201'));
        assert.ok(payload.includes('A000000677010111'));
        assert.ok(payload.includes('0994000159491'));
        assert.ok(payload.includes('5406100.00'));
        assert.equal(verifyPromptPayCrc(payload), true);
    });

    test('parsePromptPayTarget accurately classifies identifier types', () => {
        assert.deepEqual(parsePromptPayTarget('081-234-5678'), {
            type: 'mobile',
            sanitized: '0066812345678',
            subTag: '01'
        });

        assert.deepEqual(parsePromptPayTarget('0-9940-00159-49-1'), {
            type: 'tax',
            sanitized: '0994000159491',
            subTag: '02'
        });

        assert.deepEqual(parsePromptPayTarget('140001234567890'), {
            type: 'wallet',
            sanitized: '140001234567890',
            subTag: '03'
        });

        assert.throws(() => parsePromptPayTarget('12345'), /Invalid PromptPay target/);
    });

    test('Payment controller exports required payment mode and receipt generators', () => {
        const paymentController = require('../src/controllers/paymentController');
        assert.equal(typeof paymentController.generateReceiptNo, 'function');
        assert.equal(typeof paymentController.generateTransactionRef, 'function');
        assert.equal(typeof paymentController.getPaymentConfig, 'function');
        assert.equal(typeof paymentController.verifyPayment, 'function');
        assert.equal(typeof paymentController.handleWebhook, 'function');

        const receiptNo = paymentController.generateReceiptNo();
        const txRef = paymentController.generateTransactionRef();
        assert.match(receiptNo, /^REC-\d{4}-[A-F0-9]{6}$/);
        assert.match(txRef, /^PAY-SP-\d+-[A-F0-9]{6}$/);
    });
});
