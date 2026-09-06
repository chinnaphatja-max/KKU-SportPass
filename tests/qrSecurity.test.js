const { describe, it } = require('node:test');
const assert = require('node:assert');
const { makeQrPayload, makeStaticQrPayload, parseQrCourtId } = require('../src/utils/helpers');

describe('QR Security and Verification Tests', () => {
    it('should successfully parse valid dynamic QR payload for current minute', () => {
        const courtId = 'court-1';
        const currentMinute = Math.floor(Date.now() / 60000);
        const payload = makeQrPayload(courtId, currentMinute);

        const parsed = parseQrCourtId(payload);
        assert.strictEqual(parsed, courtId);
    });

    it('should reject expired dynamic QR payload (> 1 minute old)', () => {
        const courtId = 'court-1';
        const oldMinute = Math.floor(Date.now() / 60000) - 5;
        const payload = makeQrPayload(courtId, oldMinute);

        const parsed = parseQrCourtId(payload);
        assert.strictEqual(parsed, null);
    });

    it('should reject tampered signature in dynamic QR payload', () => {
        const courtId = 'court-1';
        const currentMinute = Math.floor(Date.now() / 60000);
        const payload = makeQrPayload(courtId, currentMinute);
        const tampered = payload.slice(0, -4) + 'abcd';

        const parsed = parseQrCourtId(tampered);
        assert.strictEqual(parsed, null);
    });

    it('should successfully parse valid static court QR payload', () => {
        const courtId = 'court-tennis-2';
        const payload = makeStaticQrPayload(courtId);

        const parsed = parseQrCourtId(payload);
        assert.strictEqual(parsed, courtId);
    });

    it('should reject tampered static court QR payload', () => {
        const courtId = 'court-tennis-2';
        const payload = makeStaticQrPayload(courtId);
        const tampered = payload.replace(courtId, 'court-tennis-99');

        const parsed = parseQrCourtId(tampered);
        assert.strictEqual(parsed, null);
    });

    it('should reject raw courtId strings in production mode', () => {
        const prevEnv = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = 'production';
            const raw = 'court-1';
            const parsed = parseQrCourtId(raw);
            assert.strictEqual(parsed, null);
        } finally {
            process.env.NODE_ENV = prevEnv;
        }
    });

    it('should throw error in production mode if QR secrets are not set', () => {
        const prevEnv = process.env.NODE_ENV;
        const prevDyn = process.env.QR_DYNAMIC_SECRET;
        const prevStat = process.env.QR_STATIC_SECRET;
        try {
            process.env.NODE_ENV = 'production';
            delete process.env.QR_DYNAMIC_SECRET;
            delete process.env.QR_STATIC_SECRET;

            assert.throws(() => makeQrPayload('court-1'), /QR_DYNAMIC_SECRET must be configured/);
            assert.throws(() => makeStaticQrPayload('court-1'), /QR_STATIC_SECRET must be configured/);
        } finally {
            process.env.NODE_ENV = prevEnv;
            process.env.QR_DYNAMIC_SECRET = prevDyn;
            process.env.QR_STATIC_SECRET = prevStat;
        }
    });

    it('should generate and verify QR with configured secrets in production mode', () => {
        const prevEnv = process.env.NODE_ENV;
        const prevDyn = process.env.QR_DYNAMIC_SECRET;
        const prevStat = process.env.QR_STATIC_SECRET;
        try {
            process.env.NODE_ENV = 'production';
            process.env.QR_DYNAMIC_SECRET = 'prod-dyn-secret-123';
            process.env.QR_STATIC_SECRET = 'prod-stat-secret-456';

            const payload = makeStaticQrPayload('court-badminton-1');
            const parsed = parseQrCourtId(payload);
            assert.strictEqual(parsed, 'court-badminton-1');
        } finally {
            process.env.NODE_ENV = prevEnv;
            process.env.QR_DYNAMIC_SECRET = prevDyn;
            process.env.QR_STATIC_SECRET = prevStat;
        }
    });
});
