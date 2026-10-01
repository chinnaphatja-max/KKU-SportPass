const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Timeline & Check-In Policy Rules (Pre-Confirm vs Baseline & Dropped Slot Outcomes)', () => {
    const earlyCheckinMinutes = 10;
    const checkinBaselineGraceMinutes = 5; // Admin configurable grace window (T = 0 to T + 5 min)
    const checkinGraceMinutes = 10; // Extended grace for PRE_CONFIRMED users

    function evaluateCheckinEligibility(status, minutesSinceStart) {
        // Eligibility window:
        // Opens earlyCheckinMinutes before start time (-earlyCheckinMinutes)
        // Closes at +checkinBaselineGraceMinutes for PENDING (baseline grace window)
        // Closes at +checkinGraceMinutes for PRE_CONFIRMED (extended grace period)
        const maxGrace = status === 'PRE_CONFIRMED' ? checkinGraceMinutes : checkinBaselineGraceMinutes;
        
        if (minutesSinceStart < -earlyCheckinMinutes) {
            return { allowed: false, reason: 'TOO_EARLY' };
        }
        if (minutesSinceStart > maxGrace) {
            return { allowed: false, reason: 'EXPIRED' };
        }
        return { allowed: true, reason: 'OK' };
    }

    it('should allow check-in during early window for both PENDING and PRE_CONFIRMED', () => {
        // Arriving 5 minutes before start (m = -5)
        const pendingEarly = evaluateCheckinEligibility('PENDING', -5);
        const preConfirmedEarly = evaluateCheckinEligibility('PRE_CONFIRMED', -5);

        assert.strictEqual(pendingEarly.allowed, true);
        assert.strictEqual(preConfirmedEarly.allowed, true);
    });

    it('should allow on-time check-in at T=0 for both PENDING and PRE_CONFIRMED', () => {
        const pendingOnTime = evaluateCheckinEligibility('PENDING', 0);
        const preConfirmedOnTime = evaluateCheckinEligibility('PRE_CONFIRMED', 0);

        assert.strictEqual(pendingOnTime.allowed, true);
        assert.strictEqual(preConfirmedOnTime.allowed, true);
    });

    it('should reject check-in earlier than earlyCheckinMinutes (e.g. 15 min before)', () => {
        const tooEarly = evaluateCheckinEligibility('PENDING', -15);
        assert.strictEqual(tooEarly.allowed, false);
        assert.strictEqual(tooEarly.reason, 'TOO_EARLY');
    });

    it('should ALLOW PENDING check-in within baseline grace window (e.g. 3 min after start, T=0 to T+5m)', () => {
        // User did not pre-confirm, but is within configurable baseline grace window (5 min)
        const withinGrace = evaluateCheckinEligibility('PENDING', 3);
        assert.strictEqual(withinGrace.allowed, true);
        assert.strictEqual(withinGrace.reason, 'OK');
    });

    it('should reject PENDING check-in if arriving beyond baseline grace window (e.g. 6 min late)', () => {
        // Exceeded baseline grace window (5 min)
        const latePending = evaluateCheckinEligibility('PENDING', 6);
        assert.strictEqual(latePending.allowed, false);
        assert.strictEqual(latePending.reason, 'EXPIRED');
    });

    it('should allow PRE_CONFIRMED check-in during extended grace period (e.g. 7 min late)', () => {
        // User pre-confirmed, allowed up to +10 min
        const latePreConfirmed = evaluateCheckinEligibility('PRE_CONFIRMED', 7);
        assert.strictEqual(latePreConfirmed.allowed, true);
        assert.strictEqual(latePreConfirmed.reason, 'OK');
    });

    it('should reject PRE_CONFIRMED check-in if arriving beyond extended grace period (e.g. 12 min late)', () => {
        const tooLatePreConfirmed = evaluateCheckinEligibility('PRE_CONFIRMED', 12);
        assert.strictEqual(tooLatePreConfirmed.allowed, false);
        assert.strictEqual(tooLatePreConfirmed.reason, 'EXPIRED');
    });

    it('should NOT cancel PENDING bookings while within baseline grace window (e.g. at T+3m)', () => {
        const minutesSinceStart = 3;
        const isCancelled = minutesSinceStart > checkinBaselineGraceMinutes;
        assert.strictEqual(isCancelled, false);
    });

    it('should cancel PENDING bookings once baseline grace window expires (e.g. at T+6m)', () => {
        const minutesSinceStart = 6;
        const isCancelled = minutesSinceStart > checkinBaselineGraceMinutes;
        assert.strictEqual(isCancelled, true);
    });

    describe('Dropped Booking Outcomes (2 Options: Waitlist vs Walk-in)', () => {
        function resolveDroppedSlotOutcome(waitlistQueueLength) {
            if (waitlistQueueLength > 0) {
                return {
                    action: 'PROMOTE_WAITLIST',
                    nextQueueIndex: 1,
                    isWalkIn: false
                };
            }
            return {
                action: 'OPEN_WALKIN',
                nextQueueIndex: null,
                isWalkIn: true
            };
        }

        it('Option 1: If waitlist exists, automatically transfer slot to Waitlist Queue #1', () => {
            const outcome = resolveDroppedSlotOutcome(2);
            assert.strictEqual(outcome.action, 'PROMOTE_WAITLIST');
            assert.strictEqual(outcome.nextQueueIndex, 1);
            assert.strictEqual(outcome.isWalkIn, false);
        });

        it('Option 2: If NO waitlist exists, open slot as Walk-in for players on-site', () => {
            const outcome = resolveDroppedSlotOutcome(0);
            assert.strictEqual(outcome.action, 'OPEN_WALKIN');
            assert.strictEqual(outcome.nextQueueIndex, null);
            assert.strictEqual(outcome.isWalkIn, true);
        });
    });
});
