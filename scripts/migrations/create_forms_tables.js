require('dotenv').config();
const { Pool } = require('pg');

async function createFormsTables() {
    console.log('🚀 Creating forms and form_responses tables...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS forms (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NULL,
                is_active BOOLEAN DEFAULT false,
                start_date TIMESTAMP NULL,
                end_date TIMESTAMP NULL,
                form_schema JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table 'forms' created.");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS form_responses (
                id SERIAL PRIMARY KEY,
                form_id INTEGER NOT NULL,
                user_id INTEGER NULL,
                responses_json JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Table 'form_responses' created.");

        await pool.end();
        console.log("🎉 Database migration completed successfully!");
    } catch (err) {
        console.error("❌ Database migration failed:", err);
        process.exit(1);
    }
}

createFormsTables();
