const { describe, it } = require('node:test');
const assert = require('node:assert');
const { requireAuth, requireAdmin } = require('../src/middleware/authMiddleware');

function mockReq(sessionUser = null, reqUser = null) {
    return {
        session: sessionUser ? { user: sessionUser } : {},
        user: reqUser
    };
}

function mockRes() {
    const res = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
    return res;
}

describe('Auth Middleware Security Tests', () => {
    describe('requireAuth', () => {
        it('should block unauthenticated requests with 401', () => {
            const req = mockReq(null);
            const res = mockRes();
            let nextCalled = false;

            requireAuth(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, false);
            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.body.error, 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)');
        });

        it('should allow authenticated requests via session and populate req.user', () => {
            const user = { id: 42, name: 'Student Test', role: 'user' };
            const req = mockReq(user);
            const res = mockRes();
            let nextCalled = false;

            requireAuth(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
            assert.deepStrictEqual(req.user, user);
            assert.deepStrictEqual(req.currentUser, user);
        });

        it('should allow authenticated requests via req.user', () => {
            const user = { id: 10, name: 'Passport User', role: 'user' };
            const req = mockReq(null, user);
            const res = mockRes();
            let nextCalled = false;

            requireAuth(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
            assert.strictEqual(req.user.id, 10);
        });
    });

    describe('requireAdmin', () => {
        it('should block unauthenticated requests with 401', () => {
            const req = mockReq(null);
            const res = mockRes();
            let nextCalled = false;

            requireAdmin(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, false);
            assert.strictEqual(res.statusCode, 401);
        });

        it('should block non-admin authenticated users with 403 Forbidden', () => {
            const req = mockReq({ id: 99, role: 'user' });
            const res = mockRes();
            let nextCalled = false;

            requireAdmin(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, false);
            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual(res.body.error, 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (Forbidden: Admin Only)');
        });

        it('should allow users with admin role to proceed', () => {
            const req = mockReq({ id: 1, role: 'admin' });
            const res = mockRes();
            let nextCalled = false;

            requireAdmin(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
        });
    });
});
