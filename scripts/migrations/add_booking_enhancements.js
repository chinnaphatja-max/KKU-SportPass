require('dotenv').config();
const { Pool } = require('pg');

async function migrate() {
    console.log('?? Running migration: add_booking_enhancements...');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Add booking_code column if not exists
        await pool.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS booking_code TEXT;
        `);
        console.log("? Column 'booking_code' verified in 'bookings'.");

        // Add indexes for efficient quota & slot checking
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_bookings_court_date_slot ON bookings(court_id, booking_date, start_time);
            CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);
        `);
        console.log("? Indexes created.");

        // Add default operational settings
        const settings = [
            ['max_active_bookings_per_user', '2', '?????????????????????????????????????'],
            ['max_advance_booking_days', '7', '???????????????????????? (???)'],
            ['cancellation_lead_minutes', '30', '???????????????????????????????????????? (????)']
        ];

        for (const [key, val, label] of settings) {
            await pool.query(`
                INSERT INTO app_settings (setting_key, setting_value, label_th)
                VALUES ($1, $2, $3)
                ON CONFLICT (setting_key) DO UPDATE SET label_th = EXCLUDED.label_th
            `, [key, val, label]);
        }
        console.log("? Operational settings initialized in app_settings.");

        // Backfill existing bookings with booking_code if null
        const result = await pool.query(`SELECT id FROM bookings WHERE booking_code IS NULL`);
        for (const b of (result.rows || [])) {
            const code = 'KKU-SP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            await pool.query(`UPDATE bookings SET booking_code = $1 WHERE id = $2`, [code, b.id]);
        }
        console.log("? Existing bookings backfilled with reference codes.");

        console.log("?? Migration completed successfully.");
    } catch (err) {
        console.error("? Migration error:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
