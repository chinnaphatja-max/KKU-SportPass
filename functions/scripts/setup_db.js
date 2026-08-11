require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function setupDatabase() {
    console.log('🚀 Starting KKU SportPass SQLite Database Setup...');

    const dbPath = path.join(__dirname, '../database.sqlite');
    
    try {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        await db.run('PRAGMA foreign_keys = ON');

        // Table: Users
        await db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NULL,
                password TEXT NULL,
                phone TEXT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table 'users' verified.");

        // Clear existing mock users (to avoid duplicates)
        await db.run(`DELETE FROM users WHERE email LIKE '%@mock.com'`);

        // Seed mock users
        const bcrypt = require('bcrypt');
        const defaultHash = await bcrypt.hash('password123', 10);
        
        await db.run(`
            INSERT INTO users (name, email, password, role) VALUES 
            ('แอดมิน (Admin)', 'admin@mock.com', ?, 'admin'),
            ('นักศึกษา (Student)', 'student@mock.com', ?, 'user'),
            ('บุคลากร (Staff)', 'staff@mock.com', ?, 'user'),
            ('บุคคลภายนอก (Outsider)', 'outsider@mock.com', ?, 'user')
        `, [defaultHash, defaultHash, defaultHash, defaultHash]);
        console.log("✅ Mock users seeded.");

        // Table: Sport Types
        await db.run(`
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
        await db.run(`
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
            await db.run('ALTER TABLE courts ADD COLUMN price TEXT DEFAULT "ฟรี"');
            console.log("✅ Added 'price' column to 'courts' table.");
        } catch (e) {
            // ignore if column exists
        }
        try {
            await db.run('ALTER TABLE courts ADD COLUMN capacity INTEGER DEFAULT 1');
            console.log("✅ Added 'capacity' column to 'courts' table.");
        } catch (e) {
            // ignore if column exists
        }
        console.log("✅ Table 'courts' verified.");

        // Table: Bookings
        await db.run(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                court_id TEXT NOT NULL,
                booking_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                status TEXT DEFAULT 'PENDING',
                pre_confirmed_at DATETIME NULL,
                checked_in_at DATETIME NULL,
                cancelled_at DATETIME NULL,
                missed_at DATETIME NULL,
                checkin_lat REAL NULL,
                checkin_lng REAL NULL,
                checkin_distance_m INTEGER NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Table 'bookings' verified.");

        // Table: Court Timeslots
        await db.run(`
            CREATE TABLE IF NOT EXISTS court_timeslots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                court_id TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Table 'court_timeslots' verified.");

        // Table: Court Closures
        await db.run(`
            CREATE TABLE IF NOT EXISTS court_closures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                court_id TEXT NULL,
                close_date TEXT NOT NULL,
                reason TEXT NULL,
                FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Table 'court_closures' verified.");

        // Table: App Settings
        await db.run(`
            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL,
                label_th TEXT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table 'app_settings' verified.");

        // Insert Default Settings
        const defaultSettings = [
            ['pre_confirm_open_minutes', '10', 'เปิดให้ยืนยันสิทธิ์ก่อนเริ่มกี่นาที'],
            ['pre_confirm_close_minutes', '5', 'ปิดการยืนยันสิทธิ์ก่อนเริ่มกี่นาที'],
            ['checkin_grace_minutes', '10', 'อนุญาตเช็คอินหลังเริ่มเวลาได้กี่นาที'],
            ['gps_radius_meters', '30', 'รัศมี GPS สำหรับเช็คอิน (เมตร)'],
            ['allowed_email_domains', 'kkumail.com,kku.ac.th', 'โดเมนอีเมลที่สมัครสมาชิกได้'],
            ['booking_slot_minutes', '60', 'ระยะเวลาจองเริ่มต้น (นาที)']
        ];

        for (const [key, value, label] of defaultSettings) {
            await db.run(
                `INSERT INTO app_settings (setting_key, setting_value, label_th)
                 VALUES (?, ?, ?)
                 ON CONFLICT(setting_key) DO UPDATE SET label_th = excluded.label_th`,
                [key, value, label]
            );
        }

        // Clear existing mock courts and timeslots
        await db.run('DELETE FROM court_timeslots');
        await db.run('DELETE FROM courts');
        console.log("✅ Existing mock courts cleared.");

        // Insert Real KKU Courts
        await db.run(`
            INSERT INTO courts (id, name, type, icon, price, capacity, latitude, longitude) VALUES 
            -- Zone 1
            ('z1-1', 'ศูนย์ปฏิบัติการออกกำลังกาย (FITNESS)', 'fitness', 'fa-dumbbell', '40-200 บาท/ครั้ง', 20, 16.4429, 102.8252),
            ('z1-2', 'สระว่ายน้ำชนเห็นชอบ', 'swimming', 'fa-person-swimming', '40-200 บาท/ครั้ง', 10, 16.4429, 102.8252),
            ('z1-3', 'สนามกีฬา 50 ปี มข. (ฟุตบอล)', 'football', 'fa-futbol', '3,600 บาท/ชม.', 1, 16.4429, 102.8252),
            ('z1-4', 'สนามเทนนิสแก่นกัลปพฤกษ์', 'tennis', 'fa-baseball', '400 บาท/ชม./สนาม', 1, 16.4429, 102.8252),
            ('z1-5', 'สนามเปตอง', 'petanque', 'fa-bowling-ball', 'ฟรี', 1, 16.4429, 102.8252),
            ('z1-6', 'สนามบาสเกตบอล ลานกีฬาอเนกประสงค์', 'basketball', 'fa-basketball', 'ฟรี', 1, 16.4429, 102.8252),
            ('z1-7', 'สนามเซปักตะกร้อ ลานกีฬาอเนกประสงค์', 'sepak_takraw', 'fa-volleyball', 'ฟรี', 1, 16.4429, 102.8252),
            ('z1-8', 'สนามฟุตบอล 7 คน หญ้าเทียม', 'football', 'fa-futbol', '1,000 บาท/ชม.', 1, 16.4429, 102.8252),
            ('z1-9', 'สนามวอลเลย์บอลพื้นยาง', 'volleyball', 'fa-volleyball', 'ฟรี', 1, 16.4429, 102.8252),
            
            -- Zone 2
            ('z2-1', 'อาคารฟุตซอล', 'futsal', 'fa-futbol', '900 บาท/ชม.', 1, 16.4430, 102.8253),
            ('z2-2', 'อาคารอเนกประสงค์ (เทเบิลเทนนิส)', 'table_tennis', 'fa-table-tennis-paddle-ball', '1,200 บาท/ชม.', 1, 16.4430, 102.8253),
            ('z2-3', 'อาคารอเนกประสงค์ (ศิลปะการต่อสู้)', 'martial_arts', 'fa-hand-fist', '500 บาท/ชม.', 1, 16.4430, 102.8253),
            ('z2-4', 'อาคารอเนกประสงค์ (แบดมินตัน)', 'badminton', 'fa-table-tennis-paddle-ball', '40-60 บาท/คอร์ด', 1, 16.4430, 102.8253),
            ('z2-5', 'อาคารยิงปืน', 'shooting', 'fa-crosshairs', '600 บาท/ชม.', 5, 16.4430, 102.8253),
            ('z2-6', 'สนามยิงธนู', 'archery', 'fa-bullseye', '600 บาท/ชม.', 5, 16.4430, 102.8253),

            -- Zone 3
            ('z3-1', 'สนามซอฟท์บอล', 'softball', 'fa-baseball', '1,000 บาท/ชม.', 1, 16.4431, 102.8251),
            ('z3-2', 'สนามฮอกกี้', 'hockey', 'fa-hockey-puck', '1,000 บาท/ชม.', 1, 16.4431, 102.8251),
            ('z3-3', 'สนามรักบี้ฟุตบอล', 'rugby', 'fa-football', '1,000 บาท/ชม.', 1, 16.4431, 102.8251),
            ('z3-4', 'สนามฟุตบอล 2', 'football', 'fa-futbol', '1,000 บาท/ชม.', 1, 16.4431, 102.8251),

            -- Zone 4
            ('z4-1', 'สนามเทนนิสสีฐาน', 'tennis', 'fa-baseball', '400 บาท/ชม.', 1, 16.4410, 102.8200),
            ('z4-2', 'สนามฟุตบอลสีฐาน', 'football', 'fa-futbol', '1,000 บาท/ชม.', 1, 16.4410, 102.8200)
        `);
        console.log("✅ KKU courts seeded.");

        // Court specific opening and closing hours
        const customHours = {
            'z1-1': [{ start: '07:00', end: '21:00' }], // Fitness
            'z1-2': [{ start: '06:00', end: '09:00' }, { start: '15:00', end: '21:00' }], // Swimming
            'z1-3': [{ start: '08:30', end: '21:00' }], // 50 ปี มข.
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

        // Insert Mock Timeslots based on specific court hours
        const courts = await db.all('SELECT id FROM courts');
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
        
        await db.run(`INSERT INTO court_timeslots (court_id, start_time, end_time) VALUES ${timeslots.join(', ')}`);
        console.log("✅ Timeslots seeded for all courts.");

        await db.close();
        console.log("🎉 SQLite Database setup completed successfully!");
    } catch (err) {
        console.error("❌ Database setup failed:", err);
        process.exit(1);
    }
}

setupDatabase();
