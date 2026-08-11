require('dotenv').config();
const { Pool } = require('pg');

async function migrate() {
    console.log('🚀 Starting Migration: Create satisfaction_surveys table...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS satisfaction_surveys (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NULL,
                user_role TEXT NULL,
                usage_frequency TEXT NULL,
                preferred_sports TEXT NULL,
                gender TEXT NULL,
                age TEXT NULL,
                faculty TEXT NULL,
                rating_ux_modern INTEGER NULL,
                rating_ux_clarity INTEGER NULL,
                rating_ux_nav INTEGER NULL,
                rating_ux_feedback INTEGER NULL,
                rating_func_status INTEGER NULL,
                rating_func_booking INTEGER NULL,
                rating_func_checkin INTEGER NULL,
                rating_func_manual INTEGER NULL,
                rating_perf_speed INTEGER NULL,
                rating_perf_gps INTEGER NULL,
                rating_perf_security INTEGER NULL,
                rating_prob_time INTEGER NULL,
                rating_prob_queue INTEGER NULL,
                rating_prob_plan INTEGER NULL,
                rating_overall INTEGER NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("✅ Table 'satisfaction_surveys' created successfully.");
        await pool.end();
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrate();
