require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
    console.log("Starting Migration from SQLite to Postgres...");
    
    // Postgres Pool
    const pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // SQLite DB
    const sqliteDb = await open({
        filename: path.join(__dirname, '../database.sqlite'),
        driver: sqlite3.Database
    });

    try {
        const users = await sqliteDb.all('SELECT * FROM users');
        console.log(`Found ${users.length} users in SQLite.`);
        
        let migratedCount = 0;
        for (const user of users) {
            // Check if mock user, skip if so (since setup_db already seeded them and password hashing might be updated)
            if (user.email && user.email.includes('@mock.com')) continue;

            const res = await pgPool.query(`
                INSERT INTO users (name, email, password, phone, role, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            `, [
                user.name, 
                user.email, 
                user.password, 
                user.phone, 
                user.role, 
                user.created_at
            ]);

            if (res.rowCount > 0) {
                console.log(`Migrated user: ${user.email}`);
                migratedCount++;
            }
        }
        
        console.log(`Migration Complete! Migrated ${migratedCount} new users.`);
        
    } catch (e) {
        console.error("Migration Error:", e);
    } finally {
        await sqliteDb.close();
        await pgPool.end();
    }
}

migrate();
