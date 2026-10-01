const { describe, it } = require('node:test');
const assert = require('node:assert');
const { financialOriginShield, isOriginAllowed } = require('../src/middleware/financialOriginShield');

describe('Financial Origin Shield & Window Protection Tests', () => {
    it('isOriginAllowed correctly validates matching domains', () => {
        const allowed = ['https://kku-sportpass.vercel.app', 'http://localhost:5173'];

        assert.strictEqual(isOriginAllowed('https://kku-sportpass.vercel.app', allowed), true);
        assert.strictEqual(isOriginAllowed('https://kku-sportpass.vercel.app/', allowed), true);
        assert.strictEqual(isOriginAllowed('http://localhost:5173', allowed), true);
        assert.strictEqual(isOriginAllowed('https://evil-attacker.com', allowed), false);
        assert.strictEqual(isOriginAllowed(null, allowed), false);
    });

    it('blocks request when sec-fetch-site is cross-site', () => {
        const req = {
            originalUrl: '/api/payments/checkout',
            path: '/payments/checkout',
            headers: {
                'sec-fetch-site': 'cross-site',
                'origin': 'https://evil-hacker.com'
            }
        };

        let status = null;
        let responseJson = null;
        const res = {
            status: (code) => {
                status = code;
                return {
                    json: (data) => { responseJson = data; }
                };
            }
        };

        let nextCalled = false;
        financialOriginShield(req, res, () => { nextCalled = true; });

        assert.strictEqual(status, 403);
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(responseJson.success, false);
        assert.ok(responseJson.error.includes('Cross-Site'));
    });

    it('blocks request from unauthorized external origin in production', () => {
        const prevEnv = process.env.NODE_ENV;
        const prevOrigins = process.env.ALLOWED_ORIGINS;

        try {
            process.env.NODE_ENV = 'production';
            process.env.ALLOWED_ORIGINS = 'https://kku-sportpass.vercel.app';

            const req = {
                originalUrl: '/api/payments/pay',
                path: '/payments/pay',
                method: 'POST',
                headers: {
                    'origin': 'https://malicious-window.com'
                }
            };

            let status = null;
            let responseJson = null;
            const res = {
                status: (code) => {
                    status = code;
                    return {
                        json: (data) => { responseJson = data; }
                    };
                }
            };

            let nextCalled = false;
            financialOriginShield(req, res, () => { nextCalled = true; });

            assert.strictEqual(status, 403);
            assert.strictEqual(nextCalled, false);
            assert.strictEqual(responseJson.success, false);
            assert.ok(responseJson.error.includes('Forbidden Origin'));
        } finally {
            process.env.NODE_ENV = prevEnv;
            process.env.ALLOWED_ORIGINS = prevOrigins;
        }
    });

    it('allows request from authorized origin', () => {
        const prevEnv = process.env.NODE_ENV;
        const prevOrigins = process.env.ALLOWED_ORIGINS;

        try {
            process.env.NODE_ENV = 'production';
            process.env.ALLOWED_ORIGINS = 'https://kku-sportpass.vercel.app';

            const req = {
                originalUrl: '/api/payments/pay',
                path: '/payments/pay',
                method: 'POST',
                headers: {
                    'origin': 'https://kku-sportpass.vercel.app',
                    'sec-fetch-site': 'same-origin'
                }
            };

            let nextCalled = false;
            const res = {};
            financialOriginShield(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
        } finally {
            process.env.NODE_ENV = prevEnv;
            process.env.ALLOWED_ORIGINS = prevOrigins;
        }
    });

    it('allows webhook requests without origin header (server-to-server)', () => {
        const req = {
            originalUrl: '/api/payments/webhook',
            path: '/payments/webhook',
            method: 'POST',
            headers: {}
        };

        let nextCalled = false;
        const res = {};
        financialOriginShield(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true);
    });
});
