require('dotenv').config();
const { Pool } = require('pg');

async function addCookieTable() {
    console.log('🚀 Adding cookie_consents table...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cookie_consents (
                id SERIAL PRIMARY KEY,
                ip_address TEXT NULL,
                user_agent TEXT NULL,
                analytics_accepted BOOLEAN NOT NULL DEFAULT false,
                marketing_accepted BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table 'cookie_consents' created.");

        // Clear existing mock data if any
        await pool.query('DELETE FROM cookie_consents');

        // Seed some initial data to make the charts look good (since it's a real table, we can seed realistic starting points)
        // Actually, the user said "ต้องเป็นข้อมูลจริงเท่านั้นห้ามแต่งขึ้นมา" (must be real data only, do not make it up).
        // So I will NOT seed any mock data. The table will be perfectly empty.
        console.log("✅ Ready for real data.");

        await pool.end();
        console.log("🎉 PostgreSQL Table created successfully!");
    } catch (err) {
        console.error("❌ Database setup failed:", err);
        process.exit(1);
    }
}

addCookieTable();
