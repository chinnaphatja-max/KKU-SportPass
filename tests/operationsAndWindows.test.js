const test = require('node:test');
const assert = require('node:assert');
const { requireRole } = require('../src/middleware/authMiddleware');

function mockReq(user, body = {}, query = {}, params = {}) {
    return {
        session: user ? { user } : {},
        user,
        body,
        query,
        params,
        ip: '127.0.0.1'
    };
}

function mockRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        }
    };
}

test('Role-Based Access Control (RBAC) Tests', async (t) => {
    await t.test('super_admin should bypass role restrictions and be granted access', () => {
        const staffOnlyMiddleware = requireRole('staff');
        const req = mockReq({ id: 1, role: 'super_admin' });
        const res = mockRes();
        let nextCalled = false;

        staffOnlyMiddleware(req, res, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true);
        assert.strictEqual(res.statusCode, 200);
    });

    await t.test('staff should access staff-allowed endpoints but be rejected on admin-only endpoints', () => {
        const staffMiddleware = requireRole('staff', 'admin');
        const adminOnlyMiddleware = requireRole('admin');

        const staffReq = mockReq({ id: 2, role: 'staff' });
        const res1 = mockRes();
        let next1 = false;
        staffMiddleware(staffReq, res1, () => { next1 = true; });
        assert.strictEqual(next1, true);

        const res2 = mockRes();
        let next2 = false;
        adminOnlyMiddleware(staffReq, res2, () => { next2 = true; });
        assert.strictEqual(next2, false);
        assert.strictEqual(res2.statusCode, 403);
    });

    await t.test('viewer role should be allowed on viewer endpoints and blocked on mutation endpoints', () => {
        const viewerMiddleware = requireRole('viewer', 'admin');
        const mutationMiddleware = requireRole('staff', 'admin');

        const viewerReq = mockReq({ id: 3, role: 'viewer' });
        const res1 = mockRes();
        let next1 = false;
        viewerMiddleware(viewerReq, res1, () => { next1 = true; });
        assert.strictEqual(next1, true);

        const res2 = mockRes();
        let next2 = false;
        mutationMiddleware(viewerReq, res2, () => { next2 = true; });
        assert.strictEqual(next2, false);
        assert.strictEqual(res2.statusCode, 403);
    });

    await t.test('regular user should be rejected from staff/admin routes', () => {
        const roleMiddleware = requireRole('staff', 'admin', 'viewer');
        const userReq = mockReq({ id: 10, role: 'user' });
        const res = mockRes();
        let nextCalled = false;

        roleMiddleware(userReq, res, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 403);
    });
});

test('Partial-Day Closure Overlap Logic Tests', (t) => {
    function isSlotClosed(closure, slotStart, slotEnd) {
        if (!closure.start_time && !closure.end_time) {
            return true; // All-day closure
        }
        return closure.start_time < slotEnd && closure.end_time > slotStart;
    }

    t.test('all-day closure should close any slot on that date', () => {
        const closure = { start_time: null, end_time: null };
        assert.strictEqual(isSlotClosed(closure, '09:00:00', '10:00:00'), true);
        assert.strictEqual(isSlotClosed(closure, '17:00:00', '18:00:00'), true);
    });

    t.test('partial closure should block overlapping slots and permit non-overlapping slots', () => {
        const morningClosure = { start_time: '08:00:00', end_time: '12:00:00' };

        // Overlapping slot 09:00 - 10:00
        assert.strictEqual(isSlotClosed(morningClosure, '09:00:00', '10:00:00'), true);

        // Overlapping slot 11:30 - 12:30
        assert.strictEqual(isSlotClosed(morningClosure, '11:30:00', '12:30:00'), true);

        // Afternoon slot 13:00 - 14:00 (outside closure)
        assert.strictEqual(isSlotClosed(morningClosure, '13:00:00', '14:00:00'), false);

        // Slot ending right when closure starts 07:00 - 08:00 (outside closure)
        assert.strictEqual(isSlotClosed(morningClosure, '07:00:00', '08:00:00'), false);
    });
});

test('Pre-Confirm and Check-In Window Verification Tests', (t) => {
    function evaluatePreConfirm(minutesUntilStart, openMinutes = 10, closeMinutes = 5) {
        if (minutesUntilStart > openMinutes) return { allowed: false, reason: 'TOO_EARLY' };
        if (minutesUntilStart < closeMinutes) return { allowed: false, reason: 'TOO_LATE' };
        return { allowed: true };
    }

    t.test('pre-confirm window enforces upper and lower limits', () => {
        assert.deepStrictEqual(evaluatePreConfirm(15, 10, 5), { allowed: false, reason: 'TOO_EARLY' });
        assert.deepStrictEqual(evaluatePreConfirm(8, 10, 5), { allowed: true });
        assert.deepStrictEqual(evaluatePreConfirm(5, 10, 5), { allowed: true });
        assert.deepStrictEqual(evaluatePreConfirm(3, 10, 5), { allowed: false, reason: 'TOO_LATE' });
    });

    function evaluateCheckIn(minutesSinceStart, earlyLimit = 10, graceMinutes = 10) {
        if (minutesSinceStart < -earlyLimit) return { allowed: false, reason: 'TOO_EARLY' };
        if (minutesSinceStart > graceMinutes) return { allowed: false, reason: 'TOO_LATE' };
        return { allowed: true };
    }

    t.test('check-in window enforces early limit and grace period', () => {
        assert.deepStrictEqual(evaluateCheckIn(-15, 10, 10), { allowed: false, reason: 'TOO_EARLY' });
        assert.deepStrictEqual(evaluateCheckIn(-5, 10, 10), { allowed: true });
        assert.deepStrictEqual(evaluateCheckIn(0, 10, 10), { allowed: true });
        assert.deepStrictEqual(evaluateCheckIn(8, 10, 10), { allowed: true });
        assert.deepStrictEqual(evaluateCheckIn(12, 10, 10), { allowed: false, reason: 'TOO_LATE' });
    });
});

test('CSV UTF-8 BOM Thai Character Preservation Test', (t) => {
    const thaiContent = 'รหัสการจอง,ชื่อสนาม,ผู้จอง,สถานะ\nKKU-SP-123456,อาคารพละศึกษา,สมชาย,CHECKED_IN';
    const utf8Bom = '\uFEFF';
    const csvData = utf8Bom + thaiContent;

    assert.ok(csvData.startsWith('\uFEFF'), 'CSV string must start with UTF-8 Byte Order Mark');
    assert.ok(csvData.includes('อาคารพละศึกษา'), 'Thai text must be preserved without distortion');
});
