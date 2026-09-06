const { pool } = require('../src/config/db');

async function createSessionTable() {
    console.log('Ensuring session table exists for connect-pg-simple...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL,
                CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
            );
            CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);
        console.log('✅ Session table ready.');
    } catch (err) {
        console.error('❌ Failed to create session table:', err);
    } finally {
        await pool.end();
    }
}

createSessionTable();
