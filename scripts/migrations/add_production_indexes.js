/**
 * Migration: Add production performance indexes
 * 
 * Adds indexes for common production queries on bookings, audit_logs,
 * cookie_consents, and form_responses tables.
 * 
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
require('dotenv').config();
const { Pool } = require('pg');

async function addProductionIndexes() {
    console.log('📊 Adding production performance indexes...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : {
            rejectUnauthorized: false
        }
    });

    try {
        // Bookings indexes for common queries
        await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON bookings(court_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_court_date_status ON bookings(court_id, booking_date, status)');
        console.log('✅ Bookings indexes created.');

        // Audit logs indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id)');
        console.log('✅ Audit logs indexes created.');

        // Cookie consents index
        await pool.query('CREATE INDEX IF NOT EXISTS idx_cookie_consents_created_at ON cookie_consents(created_at)');
        console.log('✅ Cookie consents index created.');

        // Form responses index
        await pool.query('CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_form_responses_created_at ON form_responses(created_at)');
        console.log('✅ Form responses indexes created.');

        // Satisfaction surveys index
        await pool.query('CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_created_at ON satisfaction_surveys(created_at)');
        console.log('✅ Satisfaction surveys index created.');

        console.log('🎉 All production indexes added successfully!');
    } catch (err) {
        console.error('❌ Failed to add indexes:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run directly if called as script
if (require.main === module) {
    addProductionIndexes();
}

module.exports = { addProductionIndexes };
