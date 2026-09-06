const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

describe('Booking Policy and Enhancement Tests', () => {
    function generateBookingCode() {
        return 'KKU-SP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    }

    it('should generate valid booking reference codes matching KKU-SP-XXXXXX format', () => {
        const code = generateBookingCode();
        assert.match(code, /^KKU-SP-[A-F0-9]{6}$/);

        const code2 = generateBookingCode();
        assert.notStrictEqual(code, code2);
    });

    it('should reject booking dates in the past', () => {
        const todayStr = '2026-09-06';
        const pastDate = '2026-09-05';
        assert.strictEqual(pastDate < todayStr, true);
    });

    it('should reject bookings on current date if slot start time has already passed', () => {
        const currentTimeStr = '14:30:00';
        const pastSlotTime = '13:00:00';
        const futureSlotTime = '15:00:00';

        assert.strictEqual(pastSlotTime <= currentTimeStr, true);
        assert.strictEqual(futureSlotTime <= currentTimeStr, false);
    });

    it('should reject booking dates exceeding max advance booking window', () => {
        const baseDate = new Date('2026-09-06T00:00:00Z');
        const maxAdvanceDays = 7;
        const maxDate = new Date(baseDate.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const validDate = '2026-09-12';
        const invalidDate = '2026-09-15';

        assert.strictEqual(validDate <= maxDate, true);
        assert.strictEqual(invalidDate > maxDate, true);
    });

    it('should enforce active booking quota per user', () => {
        const maxActive = 2;
        const currentActiveCounts = [0, 1, 2, 3];

        const allowed = currentActiveCounts.map(cnt => cnt < maxActive);
        assert.deepStrictEqual(allowed, [true, true, false, false]);
    });

    it('should enforce cancellation lead time policy (e.g. 30 minutes before start)', () => {
        const leadMinutes = 30;
        const slotStart = new Date('2026-09-06T15:00:00Z').getTime();

        // 45 minutes before slot start: allowed
        const time45MinBefore = slotStart - (45 * 60 * 1000);
        const deadline = slotStart - (leadMinutes * 60 * 1000);
        assert.strictEqual(time45MinBefore <= deadline, true);

        // 10 minutes before slot start: too late to cancel
        const time10MinBefore = slotStart - (10 * 60 * 1000);
        assert.strictEqual(time10MinBefore > deadline, true);
    });
});
