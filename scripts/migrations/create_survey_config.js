require('dotenv').config();
const { Pool } = require('pg');

async function migrate() {
    console.log('🚀 Starting Migration: Create survey_config table and modify satisfaction_surveys...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS survey_config (
                id SERIAL PRIMARY KEY,
                is_active BOOLEAN DEFAULT true,
                start_date TIMESTAMP NULL,
                end_date TIMESTAMP NULL,
                form_schema JSONB NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table 'survey_config' created successfully.");

        // Insert default config if it doesn't exist
        const result = await pool.query('SELECT COUNT(*) FROM survey_config');
        if (parseInt(result.rows[0].count) === 0) {
            const defaultSchema = JSON.stringify([
                { id: 'q1', type: 'rating', label: 'ความง่ายและสะดวกในการใช้งาน (Ease of Use)', required: true },
                { id: 'q2', type: 'text', label: 'ข้อเสนอแนะเพิ่มเติม', required: false }
            ]);
            await pool.query(`INSERT INTO survey_config (is_active, form_schema) VALUES (true, $1)`, [defaultSchema]);
            console.log("✅ Default survey config inserted.");
        }

        // Add dynamic_responses column if it doesn't exist
        try {
            await pool.query(`ALTER TABLE satisfaction_surveys ADD COLUMN dynamic_responses JSONB NULL;`);
            console.log("✅ Column 'dynamic_responses' added to 'satisfaction_surveys'.");
        } catch (err) {
            // Error code 42701 means column already exists
            if (err.code === '42701') {
                console.log("✅ Column 'dynamic_responses' already exists.");
            } else {
                throw err;
            }
        }

        await pool.end();
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrate();
