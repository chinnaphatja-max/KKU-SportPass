const { describe, it } = require('node:test');
const assert = require('node:assert');
const rateLimit = require('express-rate-limit');
const { authLimiter, bookingLimiter, submissionLimiter } = require('../src/middleware/rateLimiter');

describe('Rate Limiter Middleware Security Tests', () => {
    it('should export valid middleware functions', () => {
        assert.strictEqual(typeof authLimiter, 'function');
        assert.strictEqual(typeof bookingLimiter, 'function');
        assert.strictEqual(typeof submissionLimiter, 'function');
    });

    it('should return 429 when rate limit threshold is exceeded', async () => {
        const testLimiter = rateLimit({
            windowMs: 1000,
            max: 2,
            message: { error: 'Too Many Requests' },
            legacyHeaders: false,
            standardHeaders: true,
            validate: false
        });

        let responseBody = null;

        const fakeReq = {
            ip: '192.168.1.100',
            headers: {},
            socket: { remoteAddress: '192.168.1.100' },
            app: { get: () => false }
        };

        const createRes = () => ({
            statusCode: 200,
            headers: {},
            setHeader(name, val) { this.headers[name] = val; },
            getHeader(name) { return this.headers[name]; },
            status(code) { this.statusCode = code; return this; },
            send(body) { responseBody = body; return this; },
            json(body) { responseBody = body; return this; }
        });

        let nextCalled = 0;
        const next = () => { nextCalled++; };

        // Request 1: Allowed
        await new Promise(r => testLimiter(fakeReq, createRes(), () => { next(); r(); }));
        assert.strictEqual(nextCalled, 1);

        // Request 2: Allowed
        await new Promise(r => testLimiter(fakeReq, createRes(), () => { next(); r(); }));
        assert.strictEqual(nextCalled, 2);

        // Request 3: Blocked with 429
        const blockedRes = createRes();
        await new Promise(r => {
            blockedRes.send = (body) => { responseBody = body; r(); };
            blockedRes.json = (body) => { responseBody = body; r(); };
            testLimiter(fakeReq, blockedRes, () => { next(); r(); });
        });

        assert.strictEqual(blockedRes.statusCode, 429);
        assert.deepStrictEqual(responseBody, { error: 'Too Many Requests' });
        assert.strictEqual(nextCalled, 2); // next() should not have been called on 3rd request
    });
});
