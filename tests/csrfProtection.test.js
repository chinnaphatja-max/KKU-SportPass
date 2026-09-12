const { describe, it } = require('node:test');
const assert = require('node:assert');
const csrfProtection = require('../src/middleware/csrfProtection');

/**
 * CSRF Protection Middleware Tests
 * 
 * Tests the double-submit cookie pattern implementation.
 */

// Helper to create a mock request
function mockReq({ method = 'GET', path = '/api/test', cookies = {}, headers = {} } = {}) {
    return { method, path, cookies, headers };
}

// Helper to create a mock response
function mockRes() {
    const res = {
        statusCode: 200,
        _cookies: {},
        _headers: {},
        _jsonBody: null,
        _ended: false,
        cookie(name, value, options) {
            res._cookies[name] = { value, options };
        },
        setHeader(name, value) {
            res._headers[name] = value;
        },
        status(code) {
            res.statusCode = code;
            return res;
        },
        json(body) {
            res._jsonBody = body;
            res._ended = true;
            return res;
        }
    };
    return res;
}

describe('CSRF Protection Middleware Tests', () => {

    it('should set csrf_token cookie on GET request if none exists', (_, done) => {
        const req = mockReq({ method: 'GET', path: '/api/courts' });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.ok(res._cookies.csrf_token, 'csrf_token cookie should be set');
            assert.strictEqual(res._cookies.csrf_token.options.httpOnly, false, 'cookie must be readable by JS');
            assert.strictEqual(res._cookies.csrf_token.value.length, 64, 'token should be 32 bytes hex (64 chars)');
            done();
        });
    });

    it('should pass GET requests without CSRF token validation', (_, done) => {
        const req = mockReq({ method: 'GET', path: '/api/courts', cookies: { csrf_token: 'abc123' } });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not end response');
            done();
        });
    });

    it('should block POST requests without CSRF token', (_, done) => {
        const req = mockReq({
            method: 'POST',
            path: '/api/book',
            cookies: { csrf_token: 'valid-token' },
            headers: {}
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.fail('Should not call next');
        });

        // Give middleware time to execute
        setTimeout(() => {
            assert.strictEqual(res.statusCode, 403, 'should return 403');
            assert.ok(res._jsonBody.error.includes('CSRF'), 'error should mention CSRF');
            done();
        }, 10);
    });

    it('should block POST requests with mismatched CSRF token', (_, done) => {
        const req = mockReq({
            method: 'POST',
            path: '/api/book',
            cookies: { csrf_token: 'token-a' },
            headers: { 'x-csrf-token': 'token-b' }
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.fail('Should not call next');
        });

        setTimeout(() => {
            assert.strictEqual(res.statusCode, 403, 'should return 403');
            done();
        }, 10);
    });

    it('should allow POST requests with matching CSRF token', (_, done) => {
        const req = mockReq({
            method: 'POST',
            path: '/api/book',
            cookies: { csrf_token: 'valid-token' },
            headers: { 'x-csrf-token': 'valid-token' }
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not end response');
            done();
        });
    });

    it('should allow PUT requests with matching CSRF token', (_, done) => {
        const req = mockReq({
            method: 'PUT',
            path: '/api/admin/settings',
            cookies: { csrf_token: 'my-token' },
            headers: { 'x-csrf-token': 'my-token' }
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not end response');
            done();
        });
    });

    it('should allow DELETE requests with matching CSRF token', (_, done) => {
        const req = mockReq({
            method: 'DELETE',
            path: '/api/admin/courts',
            cookies: { csrf_token: 'del-token' },
            headers: { 'x-csrf-token': 'del-token' }
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not end response');
            done();
        });
    });

    // --- Exempt paths ---

    it('should exempt /api/auth/login from CSRF validation', (_, done) => {
        const req = mockReq({
            method: 'POST',
            path: '/api/auth/login',
            cookies: {},
            headers: {}
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not block exempt path');
            done();
        });
    });

    it('should exempt /api/auth/register from CSRF validation', (_, done) => {
        const req = mockReq({
            method: 'POST',
            path: '/api/auth/register',
            cookies: {},
            headers: {}
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not block exempt path');
            done();
        });
    });

    it('should exempt /api/cookies/consent from CSRF validation', (_, done) => {
        const req = mockReq({
            method: 'POST',
            path: '/api/cookies/consent',
            cookies: {},
            headers: {}
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not block exempt path');
            done();
        });
    });

    it('should exempt /api/surveys from CSRF validation', (_, done) => {
        const req = mockReq({
            method: 'POST',
            path: '/api/surveys',
            cookies: {},
            headers: {}
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not block exempt path');
            done();
        });
    });

    it('should exempt /api/forms/:id/responses from CSRF validation', (_, done) => {
        const req = mockReq({
            method: 'POST',
            path: '/api/forms/42/responses',
            cookies: {},
            headers: {}
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not block exempt path');
            done();
        });
    });

    it('should exempt /api/cron/cleanup from CSRF validation', (_, done) => {
        const req = mockReq({
            method: 'POST',
            path: '/api/cron/cleanup',
            cookies: {},
            headers: {}
        });
        const res = mockRes();

        csrfProtection(req, res, () => {
            assert.strictEqual(res._ended, false, 'should not block exempt path');
            done();
        });
    });
});
