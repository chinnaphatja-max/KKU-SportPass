require('dotenv').config();
const { Pool } = require('pg');

async function migrate() {
    console.log('?? Running migration: add_phase2_operations...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Table: audit_logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                actor_id INTEGER NULL,
                actor_name TEXT NOT NULL,
                actor_role TEXT NOT NULL,
                action TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_id TEXT NULL,
                reason TEXT NULL,
                details TEXT NULL,
                ip_address TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        `);
        console.log("? Table 'audit_logs' verified.");

        // Table: court_closures (add start_time, end_time for partial closures)
        await pool.query(`
            ALTER TABLE court_closures 
            ADD COLUMN IF NOT EXISTS start_time TEXT NULL,
            ADD COLUMN IF NOT EXISTS end_time TEXT NULL;
        `);
        console.log("? Partial closure columns added to 'court_closures'.");

        // Table: bookings (add cancellation_reason & manual_override_by)
        await pool.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL,
            ADD COLUMN IF NOT EXISTS manual_override_by INTEGER NULL;
        `);
        console.log("? Override/reason columns added to 'bookings'.");

        console.log("?? Phase 2 database migration completed successfully.");
    } catch (err) {
        console.error("? Migration error:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
