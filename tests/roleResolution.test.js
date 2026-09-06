const { describe, it } = require('node:test');
const assert = require('node:assert');
const { resolveRole } = require('../src/controllers/authController');

describe('Role Resolution & Privilege Escalation Prevention', () => {
    it('should assign admin only when email is in ADMIN_EMAILS environment variable', () => {
        const prevAdminEmails = process.env.ADMIN_EMAILS;
        try {
            process.env.ADMIN_EMAILS = 'official.admin@kku.ac.th, director@kku.ac.th';

            assert.strictEqual(resolveRole('official.admin@kku.ac.th'), 'admin');
            assert.strictEqual(resolveRole('DIRECTOR@KKU.AC.TH'), 'admin'); // case-insensitive check
            assert.strictEqual(resolveRole('student@kku.ac.th'), 'user');
        } finally {
            process.env.ADMIN_EMAILS = prevAdminEmails;
        }
    });

    it('should NOT escalate role for emails merely starting with "admin"', () => {
        const prevAdminEmails = process.env.ADMIN_EMAILS;
        try {
            process.env.ADMIN_EMAILS = 'real_admin@kku.ac.th';

            // Attacker trying to bypass using email prefix
            assert.strictEqual(resolveRole('admin@attacker.com'), 'user');
            assert.strictEqual(resolveRole('administrator@kku.ac.th'), 'user');
            assert.strictEqual(resolveRole('admin.hack@kku.ac.th'), 'user');
        } finally {
            process.env.ADMIN_EMAILS = prevAdminEmails;
        }
    });

    it('should default to user when ADMIN_EMAILS is empty or unset', () => {
        const prevAdminEmails = process.env.ADMIN_EMAILS;
        try {
            delete process.env.ADMIN_EMAILS;
            assert.strictEqual(resolveRole('admin@kku.ac.th'), 'user');
            assert.strictEqual(resolveRole('someone@kku.ac.th'), 'user');
        } finally {
            process.env.ADMIN_EMAILS = prevAdminEmails;
        }
    });
});
