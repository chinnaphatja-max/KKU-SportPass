require('dotenv').config();
const { Pool } = require('pg');

async function migrate() {
    console.log('🚀 Running migration: add_phase3_features...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // 1. Table: booking_waitlists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS booking_waitlists (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                court_id TEXT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
                booking_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                status TEXT DEFAULT 'WAITING',
                promoted_booking_id INTEGER NULL REFERENCES bookings(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                promoted_at TIMESTAMP NULL
            );
            CREATE INDEX IF NOT EXISTS idx_waitlists_court_slot ON booking_waitlists(court_id, booking_date, start_time, status);
            CREATE INDEX IF NOT EXISTS idx_waitlists_user_id ON booking_waitlists(user_id);
        `);
        console.log("✅ Table 'booking_waitlists' created/verified.");

        // 2. Table: payments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
                payment_method TEXT NOT NULL DEFAULT 'promptpay',
                payment_status TEXT NOT NULL DEFAULT 'COMPLETED',
                transaction_ref TEXT UNIQUE NOT NULL,
                receipt_no TEXT UNIQUE NOT NULL,
                paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_payments_receipt_no ON payments(receipt_no);
            CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
            CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
        `);
        console.log("✅ Table 'payments' created/verified.");

        // 3. Columns on courts: fee_amount, is_fee_required
        await pool.query(`
            ALTER TABLE courts 
            ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS is_fee_required BOOLEAN DEFAULT false;
        `);
        console.log("✅ Fee columns added to 'courts'.");

        // Seed realistic fees for known paid courts
        await pool.query(`
            UPDATE courts SET fee_amount = 40, is_fee_required = true WHERE id = 'z1-1'; -- อาคารพละศึกษา (FITNESS)
            UPDATE courts SET fee_amount = 50, is_fee_required = true WHERE id = 'z1-2'; -- สระว่ายน้ำ 50 เมตร
            UPDATE courts SET fee_amount = 60, is_fee_required = true WHERE id = 'z2-4'; -- สนามแบดมินตัน
            UPDATE courts SET fee_amount = 100, is_fee_required = true WHERE id = 'z1-4'; -- สนามเทนนิส 1-4
        `);
        console.log("✅ Configured initial fees for paid facilities (Fitness, Pool, Badminton, Tennis).");

        console.log("🎉 Phase 3 database migration completed successfully.");
    } catch (err) {
        console.error("❌ Migration error:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
