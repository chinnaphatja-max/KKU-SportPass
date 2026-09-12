const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateProductionEnv } = require('../src/config/envValidator');

describe('Production Environment Enforcement Tests', () => {
    it('should not throw in development or test environment even if secrets are missing', () => {
        const prevEnv = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = 'development';
            delete process.env.SESSION_SECRET;
            delete process.env.ALLOWED_ORIGINS;
            delete process.env.QR_DYNAMIC_SECRET;
            delete process.env.QR_STATIC_SECRET;
            delete process.env.CRON_SECRET;

            assert.doesNotThrow(() => validateProductionEnv());
        } finally {
            process.env.NODE_ENV = prevEnv;
        }
    });

    it('should throw fatal error in production if required variables are missing', () => {
        const prevEnv = process.env.NODE_ENV;
        const prevSession = process.env.SESSION_SECRET;
        const prevOrigins = process.env.ALLOWED_ORIGINS;
        const prevDyn = process.env.QR_DYNAMIC_SECRET;
        const prevStat = process.env.QR_STATIC_SECRET;
        const prevCron = process.env.CRON_SECRET;

        try {
            process.env.NODE_ENV = 'production';
            delete process.env.SESSION_SECRET;
            delete process.env.ALLOWED_ORIGINS;
            delete process.env.QR_DYNAMIC_SECRET;
            delete process.env.QR_STATIC_SECRET;
            delete process.env.CRON_SECRET;

            assert.throws(() => validateProductionEnv(), (err) => {
                return err.message.includes('FATAL: Missing required production environment variables') &&
                       err.message.includes('SESSION_SECRET') &&
                       err.message.includes('ALLOWED_ORIGINS') &&
                       err.message.includes('QR_DYNAMIC_SECRET') &&
                       err.message.includes('QR_STATIC_SECRET') &&
                       err.message.includes('CRON_SECRET');
            });
        } finally {
            process.env.NODE_ENV = prevEnv;
            process.env.SESSION_SECRET = prevSession;
            process.env.ALLOWED_ORIGINS = prevOrigins;
            process.env.QR_DYNAMIC_SECRET = prevDyn;
            process.env.QR_STATIC_SECRET = prevStat;
            process.env.CRON_SECRET = prevCron;
        }
    });

    it('should pass in production when all required variables are set', () => {
        const prevEnv = process.env.NODE_ENV;
        const prevSession = process.env.SESSION_SECRET;
        const prevOrigins = process.env.ALLOWED_ORIGINS;
        const prevDyn = process.env.QR_DYNAMIC_SECRET;
        const prevStat = process.env.QR_STATIC_SECRET;
        const prevCron = process.env.CRON_SECRET;

        try {
            process.env.NODE_ENV = 'production';
            process.env.SESSION_SECRET = 'valid-session-secret-123';
            process.env.ALLOWED_ORIGINS = 'https://kku-sportpass.vercel.app';
            process.env.QR_DYNAMIC_SECRET = 'valid-qr-dyn-123';
            process.env.QR_STATIC_SECRET = 'valid-qr-stat-123';
            process.env.CRON_SECRET = 'valid-cron-secret-123';

            assert.doesNotThrow(() => validateProductionEnv());
        } finally {
            process.env.NODE_ENV = prevEnv;
            process.env.SESSION_SECRET = prevSession;
            process.env.ALLOWED_ORIGINS = prevOrigins;
            process.env.QR_DYNAMIC_SECRET = prevDyn;
            process.env.QR_STATIC_SECRET = prevStat;
            process.env.CRON_SECRET = prevCron;
        }
    });

    it('should throw in production if only CRON_SECRET is missing', () => {
        const prevEnv = process.env.NODE_ENV;
        const prevSession = process.env.SESSION_SECRET;
        const prevOrigins = process.env.ALLOWED_ORIGINS;
        const prevDyn = process.env.QR_DYNAMIC_SECRET;
        const prevStat = process.env.QR_STATIC_SECRET;
        const prevCron = process.env.CRON_SECRET;

        try {
            process.env.NODE_ENV = 'production';
            process.env.SESSION_SECRET = 'valid';
            process.env.ALLOWED_ORIGINS = 'https://example.com';
            process.env.QR_DYNAMIC_SECRET = 'valid';
            process.env.QR_STATIC_SECRET = 'valid';
            delete process.env.CRON_SECRET;

            assert.throws(() => validateProductionEnv(), (err) => {
                return err.message.includes('CRON_SECRET') &&
                       !err.message.includes('SESSION_SECRET');
            });
        } finally {
            process.env.NODE_ENV = prevEnv;
            process.env.SESSION_SECRET = prevSession;
            process.env.ALLOWED_ORIGINS = prevOrigins;
            process.env.QR_DYNAMIC_SECRET = prevDyn;
            process.env.QR_STATIC_SECRET = prevStat;
            process.env.CRON_SECRET = prevCron;
        }
    });
});

