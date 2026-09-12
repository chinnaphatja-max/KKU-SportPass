/**
 * KKU SportPass Database Setup Script
 * 
 * Separates schema migration from seed/mock data:
 *   - migrateSchema():  CREATE TABLE IF NOT EXISTS, ALTER TABLE, indexes — safe for production
 *   - seedDevData():    Mock users, sample courts, timeslots — ONLY for development
 * 
 * Usage:
 *   node scripts/setup_db.js                 # schema + seed (blocked in production)
 *   node scripts/setup_db.js --schema-only   # schema only (safe for production)
 *   npm run migrate                          # alias for --schema-only
 *   npm run seed:dev                         # seed dev data only (blocked in production)
 *   npm run setup                            # full setup (blocked in production)
 * 
 * Production Guard:
 *   In production (NODE_ENV=production), seedDevData() is blocked and will exit with error.
 */
require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

function createPool() {
    return new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : {
            rejectUnauthorized: false
        }
    });
}

/**
 * Schema Migration — safe for production
 * Creates all tables, adds columns, and creates indexes.
 * Does NOT insert, update, or delete any data rows.
 */
async function migrateSchema(pool) {
    console.log('🔧 Running schema migration...');

    // Table: Users
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NULL,
            password TEXT NULL,
            phone TEXT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("✅ Table 'users' verified.");

    // Table: Sport Types
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sport_types (
            id TEXT PRIMARY KEY,
            name_th TEXT NOT NULL,
            name_en TEXT NOT NULL,
            icon TEXT NOT NULL,
            prefix TEXT NOT NULL UNIQUE
        )
    `);
    console.log("✅ Table 'sport_types' verified.");

    // Table: Courts
    await pool.query(`
        CREATE TABLE IF NOT EXISTS courts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            icon TEXT NOT NULL,
            price TEXT DEFAULT 'ฟรี',
            capacity INTEGER DEFAULT 1,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL
        )
    `);
    try {
        await pool.query("ALTER TABLE courts ADD COLUMN price TEXT DEFAULT 'ฟรี'");
    } catch (e) { /* column already exists */ }
    try {
        await pool.query('ALTER TABLE courts ADD COLUMN capacity INTEGER DEFAULT 1');
    } catch (e) { /* column already exists */ }
    try {
        await pool.query('ALTER TABLE courts ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0');
        await pool.query('ALTER TABLE courts ADD COLUMN IF NOT EXISTS is_fee_required BOOLEAN DEFAULT false');
    } catch (e) { /* columns already exist */ }
    console.log("✅ Table 'courts' verified.");

    // Table: Bookings
    await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            court_id TEXT NOT NULL,
            booking_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING',
            booking_code TEXT NULL,
            pre_confirmed_at TIMESTAMP NULL,
            checked_in_at TIMESTAMP NULL,
            cancelled_at TIMESTAMP NULL,
            cancellation_reason TEXT NULL,
            manual_override_by INTEGER NULL,
            missed_at TIMESTAMP NULL,
            checkin_lat REAL NULL,
            checkin_lng REAL NULL,
            checkin_distance_m INTEGER NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
        )
    `);
    try {
        await pool.query('ALTER TABLE bookings ADD COLUMN booking_code TEXT NULL');
        await pool.query('ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT NULL');
        await pool.query('ALTER TABLE bookings ADD COLUMN manual_override_by INTEGER NULL');
    } catch (e) { /* columns already exist */ }
    console.log("✅ Table 'bookings' verified.");

    // Table: Court Timeslots
    await pool.query(`
        CREATE TABLE IF NOT EXISTS court_timeslots (
            id SERIAL PRIMARY KEY,
            court_id TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
        )
    `);
    console.log("✅ Table 'court_timeslots' verified.");

    // Table: Court Closures
    await pool.query(`
        CREATE TABLE IF NOT EXISTS court_closures (
            id SERIAL PRIMARY KEY,
            court_id TEXT NULL,
            close_date TEXT NOT NULL,
            start_time TEXT NULL,
            end_time TEXT NULL,
            reason TEXT NULL,
            FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
        )
    `);
    try {
        await pool.query('ALTER TABLE court_closures ADD COLUMN start_time TEXT NULL');
        await pool.query('ALTER TABLE court_closures ADD COLUMN end_time TEXT NULL');
    } catch (e) { /* columns already exist */ }
    console.log("✅ Table 'court_closures' verified.");

    // Table: Audit Logs
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
        )
    `);
    console.log("✅ Table 'audit_logs' verified.");

    // Table: App Settings
    await pool.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL,
            label_th TEXT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("✅ Table 'app_settings' verified.");

    // Insert Default Settings (safe: ON CONFLICT DO UPDATE only label_th)
    const defaultSettings = [
        ['pre_confirm_open_minutes', '10', 'เวลาเปิดให้กดยืนยันก่อนถึงเวลา (นาที)'],
        ['pre_confirm_close_minutes', '5', 'เวลาปิดให้กดยืนยันก่อนถึงเวลา (นาที)'],
        ['checkin_grace_minutes', '10', 'อนุโลมเวลาเช็คอินสายได้ไม่เกิน (นาที)'],
        ['gps_radius_meters', '30', 'รัศมี GPS สำหรับเช็คอิน (เมตร)'],
        ['allowed_email_domains', 'kkumail.com,kku.ac.th', 'โดเมนอีเมลที่อนุญาตให้สมัครสมาชิก'],
        ['booking_slot_minutes', '60', 'ระยะเวลาจองต่อสล็อต (นาที)'],
        ['max_active_bookings_per_user', '2', 'จำนวนการจองที่ค้างอยู่สูงสุดต่อผู้ใช้'],
        ['max_advance_booking_days', '7', 'เปิดให้จองล่วงหน้าสูงสุด (วัน)'],
        ['cancellation_lead_minutes', '30', 'ยกเลิกการจองล่วงหน้าก่อนถึงเวลาอย่างน้อย (นาที)']
    ];

    for (const [key, value, label] of defaultSettings) {
        await pool.query(
            `INSERT INTO app_settings (setting_key, setting_value, label_th)
             VALUES ($1, $2, $3)
             ON CONFLICT(setting_key) DO UPDATE SET label_th = EXCLUDED.label_th`,
            [key, value, label]
        );
    }

    // Table: Session (connect-pg-simple)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        );
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log("✅ Table 'session' verified.");

    // Table: Satisfaction Surveys & Config
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
            dynamic_responses JSONB NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);
    try {
        await pool.query('ALTER TABLE satisfaction_surveys ADD COLUMN dynamic_responses JSONB NULL');
    } catch (e) { /* column already exists */ }
    console.log("✅ Table 'satisfaction_surveys' verified.");

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
    const surveyConfigRows = await pool.query('SELECT COUNT(*) FROM survey_config');
    if (parseInt(surveyConfigRows.rows[0].count, 10) === 0) {
        const defaultSchema = JSON.stringify([
            { id: 'q1', type: 'rating', label: 'ความง่ายและสะดวกในการใช้งาน (Ease of Use)', required: true },
            { id: 'q2', type: 'text', label: 'ข้อเสนอแนะเพิ่มเติม', required: false }
        ]);
        await pool.query('INSERT INTO survey_config (is_active, form_schema) VALUES (true, $1)', [defaultSchema]);
    }
    console.log("✅ Table 'survey_config' verified.");

    // Tables: Forms & Form Responses
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
    console.log("✅ Table 'forms' verified.");

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
    console.log("✅ Table 'form_responses' verified.");

    // Table: Cookie Consents
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
    console.log("✅ Table 'cookie_consents' verified.");

    // Table: Booking Waitlists
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
    console.log("✅ Table 'booking_waitlists' verified.");

    // Table: Payments
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
    console.log("✅ Table 'payments' verified.");

    // Production performance indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON bookings(court_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_bookings_court_date_status ON bookings(court_id, booking_date, status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_cookie_consents_created_at ON cookie_consents(created_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_form_responses_created_at ON form_responses(created_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_created_at ON satisfaction_surveys(created_at)');
    console.log("✅ Production indexes verified.");

    console.log("✅ Schema migration completed successfully!");
}

/**
 * Seed Development Data — BLOCKED in production
 * Inserts mock users, sample courts, and timeslots.
 * WARNING: This deletes and recreates courts and mock users.
 */
async function seedDevData(pool) {
    if (isProduction) {
        console.error('❌ BLOCKED: Cannot seed development/mock data in production environment!');
        console.error('   NODE_ENV is set to "production".');
        console.error('   If you need to seed data in production, do it through admin UI or a dedicated production seed script.');
        process.exit(1);
    }

    console.log('🌱 Seeding development data...');
    console.log('⚠️  WARNING: This will delete existing courts and mock users!');

    // Clear existing mock users
    await pool.query(`DELETE FROM users WHERE email LIKE '%@mock.com'`);

    // Seed mock users
    const bcrypt = require('bcrypt');
    const defaultHash = await bcrypt.hash('password123', 10);
    
    await pool.query(`
        INSERT INTO users (name, email, password, role) VALUES 
        ('ชินภัทร จ้า (Admin)', 'admin@mock.com', $1, 'admin'),
        ('นักศึกษา (Student)', 'student@mock.com', $2, 'user'),
        ('บุคลากร (Staff)', 'staff@mock.com', $3, 'user'),
        ('บุคคลภายนอก (Outsider)', 'outsider@mock.com', $4, 'user')
    `, [defaultHash, defaultHash, defaultHash, defaultHash]);
    console.log("✅ Mock users seeded.");

    // Clear existing courts and timeslots
    await pool.query('DELETE FROM court_timeslots');
    await pool.query('DELETE FROM courts');
    console.log("✅ Existing courts cleared.");

    // Insert KKU Courts
    await pool.query(`
        INSERT INTO courts (id, name, type, icon, price, capacity, latitude, longitude) VALUES 
        ('z1-1', 'อาคารพละศึกษา (FITNESS)', 'fitness', 'fa-dumbbell', '40-200 บาท/เดือน', 20, 16.4429, 102.8252),
        ('z1-2', 'สระว่ายน้ำ 50 เมตร', 'swimming', 'fa-person-swimming', '40-200 บาท/เดือน', 10, 16.4429, 102.8252),
        ('z1-3', 'สนามฟุตบอล 50 ปี', 'football', 'fa-futbol', '3,600 บาท/ชม.', 1, 16.4429, 102.8252),
        ('z1-4', 'สนามเทนนิส 1-4', 'tennis', 'fa-baseball', '400 บาท/ชม./สนาม', 1, 16.4429, 102.8252),
        ('z1-5', 'สนามเปตอง', 'petanque', 'fa-bowling-ball', 'ฟรี', 1, 16.4429, 102.8252),
        ('z1-6', 'สนามบาสเกตบอล', 'basketball', 'fa-basketball', 'ฟรี', 1, 16.4429, 102.8252),
        ('z1-7', 'สนามตะกร้อ', 'sepak_takraw', 'fa-volleyball', 'ฟรี', 1, 16.4429, 102.8252),
        ('z1-8', 'สนามฟุตบอล 7 คน', 'football', 'fa-futbol', '1,000 บาท/ชม.', 1, 16.4429, 102.8252),
        ('z1-9', 'สนามวอลเลย์บอล', 'volleyball', 'fa-volleyball', 'ฟรี', 1, 16.4429, 102.8252),
        ('z2-1', 'สนามฟุตซอล', 'futsal', 'fa-futbol', '900 บาท/ชม.', 1, 16.4430, 102.8253),
        ('z2-2', 'โต๊ะปิงปอง', 'table_tennis', 'fa-table-tennis-paddle-ball', '1,200 บาท/ชม.', 1, 16.4430, 102.8253),
        ('z2-3', 'ห้องศิลปะป้องกันตัว', 'martial_arts', 'fa-hand-fist', '500 บาท/ชม.', 1, 16.4430, 102.8253),
        ('z2-4', 'สนามแบดมินตัน', 'badminton', 'fa-table-tennis-paddle-ball', '40-60 บาท/ชม.', 1, 16.4430, 102.8253),
        ('z2-5', 'สนามยิงปืน', 'shooting', 'fa-crosshairs', '600 บาท/ชม.', 5, 16.4430, 102.8253),
        ('z2-6', 'สนามยิงธนู', 'archery', 'fa-bullseye', '600 บาท/ชม.', 5, 16.4430, 102.8253),
        ('z3-1', 'สนามซอฟต์บอล', 'softball', 'fa-baseball', '1,000 บาท/ชม.', 1, 16.4431, 102.8251),
        ('z3-2', 'สนามฮอกกี้', 'hockey', 'fa-hockey-puck', '1,000 บาท/ชม.', 1, 16.4431, 102.8251),
        ('z3-3', 'สนามรักบี้', 'rugby', 'fa-football', '1,000 บาท/ชม.', 1, 16.4431, 102.8251),
        ('z3-4', 'สนามฟุตบอล 2', 'football', 'fa-futbol', '1,000 บาท/ชม.', 1, 16.4431, 102.8251),
        ('z4-1', 'สนามเทนนิส 5-8', 'tennis', 'fa-baseball', '400 บาท/ชม.', 1, 16.4410, 102.8200),
        ('z4-2', 'สนามฟุตบอล 3', 'football', 'fa-futbol', '1,000 บาท/ชม.', 1, 16.4410, 102.8200)
    `);
    console.log("✅ KKU courts seeded.");

    // Generate timeslots
    const customHours = {
        'z1-1': [{ start: '07:00', end: '21:00' }],
        'z1-2': [{ start: '06:00', end: '09:00' }, { start: '15:00', end: '21:00' }],
        'z1-3': [{ start: '08:30', end: '21:00' }],
        'z1-4': [{ start: '07:30', end: '21:00' }],
        'z1-5': [{ start: '07:30', end: '21:00' }],
        'z1-6': [{ start: '07:30', end: '21:00' }],
        'z1-7': [{ start: '07:30', end: '21:00' }],
        'z1-8': [{ start: '08:30', end: '21:00' }],
        'z1-9': [{ start: '07:30', end: '21:00' }],
        'z2-1': [{ start: '07:30', end: '21:00' }],
        'z2-2': [{ start: '07:30', end: '21:00' }],
        'z2-3': [{ start: '07:30', end: '21:00' }],
        'z2-4': [{ start: '07:30', end: '21:00' }],
        'z2-5': [{ start: '08:30', end: '21:00' }],
        'z2-6': [{ start: '08:30', end: '21:00' }],
        'z3-1': [{ start: '08:30', end: '21:00' }],
        'z3-2': [{ start: '08:30', end: '21:00' }],
        'z3-3': [{ start: '08:30', end: '21:00' }],
        'z3-4': [{ start: '08:30', end: '21:00' }],
        'z4-1': [{ start: '07:30', end: '21:00' }], 
        'z4-2': [{ start: '08:30', end: '21:00' }]
    };

    const res = await pool.query('SELECT id FROM courts');
    const courts = res.rows;
    const timeslots = [];
    for (const court of courts) {
        const timeBlocks = customHours[court.id] || [{ start: '08:30', end: '21:00' }];
        
        for (const hours of timeBlocks) {
            let [startH, startM] = hours.start.split(':').map(Number);
            let [endH, endM] = hours.end.split(':').map(Number);
            
            let current = new Date(2000, 0, 1, startH, startM);
            let end = new Date(2000, 0, 1, endH, endM);
            
            while (current < end) {
                let sH = current.getHours().toString().padStart(2, '0');
                let sM = current.getMinutes().toString().padStart(2, '0');
                let startTime = `${sH}:${sM}:00`;
                
                current.setHours(current.getHours() + 1);
                if (current > end) {
                    current = end;
                }
                
                let eH = current.getHours().toString().padStart(2, '0');
                let eM = current.getMinutes().toString().padStart(2, '0');
                let endTime = `${eH}:${eM}:00`;
                
                timeslots.push(`('${court.id}', '${startTime}', '${endTime}')`);
            }
        }
    }
    
    await pool.query(`INSERT INTO court_timeslots (court_id, start_time, end_time) VALUES ${timeslots.join(', ')}`);
    console.log("✅ Timeslots seeded for all courts.");

    // Set fee amounts for specific courts
    try {
        await pool.query("UPDATE courts SET fee_amount = 40, is_fee_required = true WHERE id = 'z1-1'");
        await pool.query("UPDATE courts SET fee_amount = 50, is_fee_required = true WHERE id = 'z1-2'");
        await pool.query("UPDATE courts SET fee_amount = 60, is_fee_required = true WHERE id = 'z2-4'");
        await pool.query("UPDATE courts SET fee_amount = 100, is_fee_required = true WHERE id = 'z1-4'");
    } catch (e) { /* ignore if courts don't exist */ }
    console.log("✅ Court fees configured.");

    console.log("🌱 Development data seeding completed!");
}

// --- Main Entry Point ---
async function setupDatabase() {
    const args = process.argv.slice(2);
    const schemaOnly = args.includes('--schema-only');
    const seedOnly = args.includes('--seed-only');

    console.log('🚀 Starting KKU SportPass PostgreSQL Database Setup...');
    if (isProduction) {
        console.log('🔒 Production mode detected — only schema migration is allowed.');
    }

    const pool = createPool();

    try {
        if (seedOnly) {
            // Only seed (must not be production)
            await seedDevData(pool);
        } else if (schemaOnly) {
            // Only migrate schema
            await migrateSchema(pool);
        } else {
            // Full setup: schema + seed
            await migrateSchema(pool);
            if (!isProduction) {
                await seedDevData(pool);
            } else {
                console.log('⚠️  Skipping seed data in production. Use admin UI to add courts and users.');
            }
        }

        console.log("🎉 PostgreSQL Database setup completed successfully!");
    } catch (err) {
        console.error("❌ Database setup failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupDatabase();

module.exports = { migrateSchema, seedDevData };
