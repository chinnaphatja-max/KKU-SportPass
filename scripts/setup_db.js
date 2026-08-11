require('dotenv').config();
const { Pool } = require('pg');

async function setupDatabase() {
    console.log('🚀 Starting KKU SportPass PostgreSQL Database Setup...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
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
            await pool.query('ALTER TABLE courts ADD COLUMN price TEXT DEFAULT \'ฟรี\'');
            console.log("✅ Added 'price' column to 'courts' table.");
        } catch (e) { }
        try {
            await pool.query('ALTER TABLE courts ADD COLUMN capacity INTEGER DEFAULT 1');
            console.log("✅ Added 'capacity' column to 'courts' table.");
        } catch (e) { }
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
                pre_confirmed_at TIMESTAMP NULL,
                checked_in_at TIMESTAMP NULL,
                cancelled_at TIMESTAMP NULL,
                missed_at TIMESTAMP NULL,
                checkin_lat REAL NULL,
                checkin_lng REAL NULL,
                checkin_distance_m INTEGER NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
            )
        `);
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
                reason TEXT NULL,
                FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Table 'court_closures' verified.");

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

        // Insert Default Settings
        const defaultSettings = [
            ['pre_confirm_open_minutes', '10', 'เวลาเปิดให้กดยืนยันก่อนถึงเวลา (นาที)'],
            ['pre_confirm_close_minutes', '5', 'เวลาปิดให้กดยืนยันก่อนถึงเวลา (นาที)'],
            ['checkin_grace_minutes', '10', 'อนุโลมเวลาเช็คอินสายได้ไม่เกิน (นาที)'],
            ['gps_radius_meters', '30', 'รัศมี GPS สำหรับเช็คอิน (เมตร)'],
            ['allowed_email_domains', 'kkumail.com,kku.ac.th', 'โดเมนอีเมลที่อนุญาตให้สมัครสมาชิก'],
            ['booking_slot_minutes', '60', 'ระยะเวลาจองต่อสล็อต (นาที)']
        ];

        for (const [key, value, label] of defaultSettings) {
            await pool.query(
                `INSERT INTO app_settings (setting_key, setting_value, label_th)
                 VALUES ($1, $2, $3)
                 ON CONFLICT(setting_key) DO UPDATE SET label_th = EXCLUDED.label_th`,
                [key, value, label]
            );
        }

        // Clear existing mock courts and timeslots
        await pool.query('DELETE FROM court_timeslots');
        await pool.query('DELETE FROM courts');
        console.log("✅ Existing mock courts cleared.");

        // Insert Real KKU Courts
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

        await pool.end();
        console.log("🎉 PostgreSQL Database setup completed successfully!");
    } catch (err) {
        console.error("❌ Database setup failed:", err);
        process.exit(1);
    }
}

setupDatabase();
