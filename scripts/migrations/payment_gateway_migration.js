/**
 * Migration: Payment Gateway Integration
 * Adds missing columns, indexes, and seed pricing matrix to PostgreSQL/Supabase
 */
const { pool } = require('../../src/config/db');

async function runMigration() {
    console.log('🔄 Running Payment Gateway Integration Migration...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update pricing_rules table
        await client.query(`
            ALTER TABLE pricing_rules
            ADD COLUMN IF NOT EXISTS sport_type VARCHAR(50) NOT NULL DEFAULT 'general',
            ADD COLUMN IF NOT EXISTS user_category VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
            ADD COLUMN IF NOT EXISTS start_time TIME NOT NULL DEFAULT '06:00:00',
            ADD COLUMN IF NOT EXISTS end_time TIME NOT NULL DEFAULT '22:00:00',
            ADD COLUMN IF NOT EXISTS base_price_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS lighting_fee_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
        `);

        // Make court_id and user_type nullable if they were NOT NULL
        try {
            await client.query('ALTER TABLE pricing_rules ALTER COLUMN court_id DROP NOT NULL;');
            await client.query('ALTER TABLE pricing_rules ALTER COLUMN user_type DROP NOT NULL;');
        } catch (e) {
            // Already nullable
        }

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_pricing_matrix_lookup 
            ON pricing_rules (sport_type, user_category, is_active, start_time, end_time);
        `);

        // 2. Update payments table
        await client.query(`
            ALTER TABLE payments
            ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'THB',
            ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
            ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS qr_payload TEXT,
            ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS raw_webhook_payload JSONB,
            ADD COLUMN IF NOT EXISTS failure_reason TEXT,
            ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        `);

        // 3. Update bookings table
        await client.query(`
            ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS ticket_qr TEXT,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_payments_booking_status ON payments (booking_id, status);
            CREATE INDEX IF NOT EXISTS idx_payments_expires_pending ON payments (status, expires_at) WHERE status = 'PENDING';
            CREATE INDEX IF NOT EXISTS idx_payments_gateway_txn ON payments (gateway_transaction_id);
            CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency_key ON payments (idempotency_key) WHERE idempotency_key IS NOT NULL;
        `);

        // 3. Seed Pricing Rules for Student, Staff, and External
        const seedRules = [
            // Tennis
            { sport: 'tennis', cat: 'STUDENT', start: '06:00:00', end: '18:00:00', base: 0, light: 0 },
            { sport: 'tennis', cat: 'STUDENT', start: '18:00:00', end: '22:00:00', base: 0, light: 40 },
            { sport: 'tennis', cat: 'STAFF', start: '06:00:00', end: '18:00:00', base: 40, light: 0 },
            { sport: 'tennis', cat: 'STAFF', start: '18:00:00', end: '22:00:00', base: 40, light: 40 },
            { sport: 'tennis', cat: 'EXTERNAL', start: '06:00:00', end: '18:00:00', base: 120, light: 0 },
            { sport: 'tennis', cat: 'EXTERNAL', start: '18:00:00', end: '22:00:00', base: 120, light: 80 },
            // Badminton
            { sport: 'badminton', cat: 'STUDENT', start: '06:00:00', end: '22:00:00', base: 0, light: 0 },
            { sport: 'badminton', cat: 'STAFF', start: '06:00:00', end: '22:00:00', base: 20, light: 0 },
            { sport: 'badminton', cat: 'EXTERNAL', start: '06:00:00', end: '22:00:00', base: 80, light: 0 },
            // Basketball
            { sport: 'basketball', cat: 'STUDENT', start: '06:00:00', end: '22:00:00', base: 0, light: 0 },
            { sport: 'basketball', cat: 'STAFF', start: '06:00:00', end: '22:00:00', base: 30, light: 0 },
            { sport: 'basketball', cat: 'EXTERNAL', start: '06:00:00', end: '22:00:00', base: 100, light: 50 }
        ];

        for (const r of seedRules) {
            const check = await client.query(
                `SELECT id FROM pricing_rules WHERE sport_type = $1 AND user_category = $2 AND start_time = $3 AND end_time = $4`,
                [r.sport, r.cat, r.start, r.end]
            );
            if (check.rows.length === 0) {
                await client.query(`
                    INSERT INTO pricing_rules (sport_type, user_category, user_type, start_time, end_time, base_price_per_hour, lighting_fee_per_hour, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                `, [r.sport, r.cat, r.cat.toLowerCase(), r.start, r.end, r.base, r.light]);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Payment Gateway Integration Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
        throw err;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runMigration };
