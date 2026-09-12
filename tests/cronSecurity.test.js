const { describe, it } = require('node:test');
const assert = require('node:assert');

/**
 * Cron Endpoint Security Tests
 * 
 * Tests the cron cleanup endpoint authorization logic extracted from api.js.
 * We test the authorization decision logic directly rather than spinning up
 * the full Express server.
 */

/**
 * Simulates the cron endpoint authorization check from api.js
 * Returns: { allowed: boolean, status?: number, error?: string }
 */
function checkCronAuth(nodeEnv, cronSecret, authorizationHeader) {
    const isProduction = nodeEnv === 'production';

    if (isProduction) {
        if (!cronSecret) {
            return { allowed: false, status: 503, error: 'Cron endpoint disabled: CRON_SECRET not configured' };
        }
        if (authorizationHeader !== `Bearer ${cronSecret}`) {
            return { allowed: false, status: 401, error: 'Unauthorized cron trigger' };
        }
    } else if (cronSecret) {
        if (authorizationHeader !== `Bearer ${cronSecret}`) {
            return { allowed: false, status: 401, error: 'Unauthorized cron trigger' };
        }
    }

    return { allowed: true };
}

describe('Cron Endpoint Security Tests', () => {

    // --- Production Mode Tests ---

    it('should reject in production when CRON_SECRET is not configured (503)', () => {
        const result = checkCronAuth('production', undefined, undefined);
        assert.strictEqual(result.allowed, false);
        assert.strictEqual(result.status, 503);
    });

    it('should reject in production when CRON_SECRET is empty string (503)', () => {
        const result = checkCronAuth('production', '', undefined);
        assert.strictEqual(result.allowed, false);
        assert.strictEqual(result.status, 503);
    });

    it('should reject in production when Authorization header is missing (401)', () => {
        const result = checkCronAuth('production', 'my-secret', undefined);
        assert.strictEqual(result.allowed, false);
        assert.strictEqual(result.status, 401);
    });

    it('should reject in production when Authorization header has wrong secret (401)', () => {
        const result = checkCronAuth('production', 'my-secret', 'Bearer wrong-secret');
        assert.strictEqual(result.allowed, false);
        assert.strictEqual(result.status, 401);
    });

    it('should reject in production when Authorization header format is wrong (401)', () => {
        const result = checkCronAuth('production', 'my-secret', 'my-secret');
        assert.strictEqual(result.allowed, false);
        assert.strictEqual(result.status, 401);
    });

    it('should allow in production when Authorization header matches CRON_SECRET', () => {
        const result = checkCronAuth('production', 'my-secret', 'Bearer my-secret');
        assert.strictEqual(result.allowed, true);
    });

    // --- Development Mode Tests ---

    it('should allow in development without any secret configured', () => {
        const result = checkCronAuth('development', undefined, undefined);
        assert.strictEqual(result.allowed, true);
    });

    it('should allow in development without Authorization header when no secret set', () => {
        const result = checkCronAuth('development', '', undefined);
        assert.strictEqual(result.allowed, true);
    });

    it('should reject in development when CRON_SECRET is set but header is wrong (401)', () => {
        const result = checkCronAuth('development', 'dev-secret', 'Bearer wrong');
        assert.strictEqual(result.allowed, false);
        assert.strictEqual(result.status, 401);
    });

    it('should allow in development when CRON_SECRET is set and header matches', () => {
        const result = checkCronAuth('development', 'dev-secret', 'Bearer dev-secret');
        assert.strictEqual(result.allowed, true);
    });

    // --- Test mode (same as development) ---

    it('should allow in test mode without any secret', () => {
        const result = checkCronAuth('test', undefined, undefined);
        assert.strictEqual(result.allowed, true);
    });
});
