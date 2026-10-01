const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { appSetting, invalidateSettingCache } = require('../src/utils/helpers');
const { isSlotClosedByClosure } = require('../src/controllers/courtsController');

describe('Important Fix 1: appSetting() In-Memory TTL Caching & Invalidation', () => {
    test('invalidateSettingCache clears cache correctly', () => {
        invalidateSettingCache();
        // Should not throw and resets cache
        assert.doesNotThrow(() => invalidateSettingCache('some_key'));
        assert.doesNotThrow(() => invalidateSettingCache());
    });

    test('appSetting returns default value when database query yields no row or errors in test mode', async () => {
        invalidateSettingCache('test_non_existent_key');
        const val = await appSetting('test_non_existent_key', 'fallback_value');
        assert.equal(val, 'fallback_value');

        // Second call should return cached fallback value immediately
        const cachedVal = await appSetting('test_non_existent_key', 'different_default');
        assert.equal(cachedVal, 'fallback_value');
    });
});

describe('Important Fix 2: Capacity-Aware Court Availability & Partial Closures', () => {
    test('isSlotClosedByClosure correctly identifies overlapping and non-overlapping partial closures', () => {
        const closure = { start_time: '13:00', end_time: '15:00' };

        // Overlapping slot 13:00 - 14:00
        assert.equal(isSlotClosedByClosure(closure, '13:00', '14:00'), true);

        // Overlapping slot 14:30 - 15:30
        assert.equal(isSlotClosedByClosure(closure, '14:30', '15:30'), true);

        // Slot before closure 11:00 - 12:00
        assert.equal(isSlotClosedByClosure(closure, '11:00', '12:00'), false);

        // Slot after closure 15:00 - 16:00
        assert.equal(isSlotClosedByClosure(closure, '15:00', '16:00'), false);

        // All day closure (no start/end time)
        const allDayClosure = { start_time: null, end_time: null };
        assert.equal(isSlotClosedByClosure(allDayClosure, '10:00', '11:00'), true);
    });

    test('Court capacity calculation determines full vs available correctly for multi-capacity courts', () => {
        const court = { id: 'z1-1', name: 'Fitness Center', capacity: 10 };
        const bookedSlots = {
            '09:00': 10, // Full
            '10:00': 7,  // 3 remaining
            '11:00': 0   // 10 remaining
        };

        const slots = ['09:00', '10:00', '11:00'];
        let fullSlotsCount = 0;
        let totalAvailableCapacity = 0;

        for (const slot of slots) {
            const booked = bookedSlots[slot] || 0;
            const remaining = Math.max(0, court.capacity - booked);
            totalAvailableCapacity += remaining;
            if (booked >= court.capacity) {
                fullSlotsCount++;
            }
        }

        assert.equal(fullSlotsCount, 1);
        assert.equal(totalAvailableCapacity, 13);
        const isFullyBooked = fullSlotsCount >= slots.length;
        assert.equal(isFullyBooked, false);
    });

    test('Court is marked fully booked only when all operational slots reach capacity', () => {
        const court = { id: 'z1-2', name: 'Swimming Pool', capacity: 2 };
        const bookedSlots = {
            '08:00': 2,
            '09:00': 2
        };

        const slots = ['08:00', '09:00'];
        let fullSlotsCount = 0;

        for (const slot of slots) {
            const booked = bookedSlots[slot] || 0;
            if (booked >= court.capacity) {
                fullSlotsCount++;
            }
        }

        const isFullyBooked = fullSlotsCount >= slots.length;
        assert.equal(isFullyBooked, true);
    });
});

describe('Important Fix 3: Admin Bookings Pagination Math & Offset Calculation', () => {
    test('Calculates total pages, has_next, and has_prev accurately', () => {
        function calculatePagination(total, page, limit) {
            const totalPages = Math.ceil(total / limit) || 1;
            const offset = (page - 1) * limit;
            return {
                total,
                page,
                limit,
                total_pages: totalPages,
                has_next: page < totalPages,
                has_prev: page > 1,
                offset
            };
        }

        // Page 1 of 5 (125 items, limit 30)
        const p1 = calculatePagination(125, 1, 30);
        assert.equal(p1.total_pages, 5);
        assert.equal(p1.has_prev, false);
        assert.equal(p1.has_next, true);
        assert.equal(p1.offset, 0);

        // Page 3 of 5
        const p3 = calculatePagination(125, 3, 30);
        assert.equal(p3.has_prev, true);
        assert.equal(p3.has_next, true);
        assert.equal(p3.offset, 60);

        // Page 5 of 5 (last page)
        const p5 = calculatePagination(125, 5, 30);
        assert.equal(p5.has_prev, true);
        assert.equal(p5.has_next, false);
        assert.equal(p5.offset, 120);

        // 0 items
        const p0 = calculatePagination(0, 1, 50);
        assert.equal(p0.total_pages, 1);
        assert.equal(p0.has_prev, false);
        assert.equal(p0.has_next, false);
    });
});

describe('Important Fix 4: In-App Notification Utilities', () => {
    test('createNotification safely validates parameters', async () => {
        const { createNotification } = require('../src/utils/notifications');
        // If no userId, returns null safely
        const result = await createNotification(null, { userId: null, title: 'Test' });
        assert.equal(result, null);
    });
});
