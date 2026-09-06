const pool = require('../config/db');

exports.saveConsent = async (req, res) => {
    try {
        const { analytics, marketing } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        await pool.query(
            "INSERT INTO cookie_consents (ip_address, user_agent, analytics_accepted, marketing_accepted) VALUES ($1, $2, $3, $4)",
            [ip, userAgent, !!analytics, !!marketing]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Error saving cookie consent:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    }
};

exports.getStats = async (req, res) => {
    try {
        // Analytics Stats
        const [analyticsRows] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN analytics_accepted = true THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN analytics_accepted = false THEN 1 ELSE 0 END) as declined
            FROM cookie_consents
        `);

        // Marketing Stats
        const [marketingRows] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN marketing_accepted = true THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN marketing_accepted = false THEN 1 ELSE 0 END) as declined
            FROM cookie_consents
        `);

        // Popular Browsers Mock (Derived from user agents in a real complex app, but here we'll just mock or simple matching)
        const [browsersResult] = await pool.query(`
            SELECT user_agent, COUNT(*) as count 
            FROM cookie_consents 
            GROUP BY user_agent 
            ORDER BY count DESC 
            LIMIT 10
        `);

        // User Stats
        const [usersRows] = await pool.query(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
                SUM(CASE WHEN role != 'admin' THEN 1 ELSE 0 END) as normal_users
            FROM users
        `);

        // Booking Stats
        const [bookingRows] = await pool.query(`
            SELECT 
                COUNT(*) as total_bookings,
                SUM(CASE WHEN status = 'CHECKED_IN' THEN 1 ELSE 0 END) as completed_bookings,
                SUM(CASE WHEN status = 'MISSED' THEN 1 ELSE 0 END) as missed_bookings,
                SUM(CASE WHEN status IN ('PENDING', 'PRE_CONFIRMED') THEN 1 ELSE 0 END) as active_bookings
            FROM bookings
        `);

        // Popular Courts
        const [popularCourts] = await pool.query(`
            SELECT c.name, COUNT(b.id) as booking_count
            FROM courts c
            LEFT JOIN bookings b ON c.id = b.court_id
            GROUP BY c.id, c.name
            ORDER BY booking_count DESC
            LIMIT 5
        `);

        const analytics = analyticsRows[0] || { total: 0, accepted: 0, declined: 0 };
        const marketing = marketingRows[0] || { total: 0, accepted: 0, declined: 0 };
        const users = usersRows[0] || { total_users: 0, admin_users: 0, normal_users: 0 };
        const bookings = bookingRows[0] || { total_bookings: 0, completed_bookings: 0, missed_bookings: 0, active_bookings: 0 };

        res.json({
            analytics: {
                total: parseInt(analytics.total || 0, 10),
                accepted: parseInt(analytics.accepted || 0, 10),
                declined: parseInt(analytics.declined || 0, 10)
            },
            marketing: {
                total: parseInt(marketing.total || 0, 10),
                accepted: parseInt(marketing.accepted || 0, 10),
                declined: parseInt(marketing.declined || 0, 10)
            },
            users: {
                total: parseInt(users.total_users || 0, 10),
                admin: parseInt(users.admin_users || 0, 10),
                normal: parseInt(users.normal_users || 0, 10)
            },
            bookings: {
                total: parseInt(bookings.total_bookings || 0, 10),
                completed: parseInt(bookings.completed_bookings || 0, 10),
                missed: parseInt(bookings.missed_bookings || 0, 10),
                active: parseInt(bookings.active_bookings || 0, 10)
            },
            popularCourts,
            rawBrowsers: browsersResult
        });
    } catch (err) {
        console.error('Error fetching cookie stats:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ" });
    }
};

exports.getUtilizationHeatmap = async (req, res) => {
    try {
        const { court_id, range_days = 30 } = req.query;

        // Query court count
        const [courtRows] = await pool.query("SELECT COUNT(*) as cnt FROM courts");
        const totalCourts = parseInt(courtRows[0]?.cnt || 21, 10);

        // Filter conditions
        let dateCondition = "CAST(booking_date AS DATE) >= CURRENT_DATE - INTERVAL '" + parseInt(range_days, 10) + " days'";
        let courtCondition = "";
        const params = [];

        if (court_id) {
            courtCondition = " AND b.court_id = ?";
            params.push(court_id);
        }

        // Aggregate bookings by day of week (0=Sun, 1=Mon, ..., 6=Sat) and hour
        const [rows] = await pool.query(`
            SELECT 
                EXTRACT(DOW FROM CAST(b.booking_date AS DATE))::int as dow,
                SUBSTRING(b.start_time FROM 1 FOR 2)::int as hour_slot,
                COUNT(*) as count
            FROM bookings b
            WHERE ${dateCondition}
              AND b.status IN ('CHECKED_IN', 'PRE_CONFIRMED', 'PENDING')
              ${courtCondition}
            GROUP BY dow, hour_slot
            ORDER BY dow ASC, hour_slot ASC
        `, params);

        // Sport type distribution
        const [sportDistRows] = await pool.query(`
            SELECT c.type as sport_type, COUNT(b.id) as count
            FROM bookings b
            JOIN courts c ON b.court_id = c.id
            WHERE ${dateCondition}
              AND b.status IN ('CHECKED_IN', 'PRE_CONFIRMED', 'PENDING')
            GROUP BY c.type
            ORDER BY count DESC
        `);

        // Define matrix days: Monday to Sunday
        const days = [
            { dow: 1, nameTh: 'จันทร์', nameEn: 'Monday' },
            { dow: 2, nameTh: 'อังคาร', nameEn: 'Tuesday' },
            { dow: 3, nameTh: 'พุธ', nameEn: 'Wednesday' },
            { dow: 4, nameTh: 'พฤหัสบดี', nameEn: 'Thursday' },
            { dow: 5, nameTh: 'ศุกร์', nameEn: 'Friday' },
            { dow: 6, nameTh: 'เสาร์', nameEn: 'Saturday' },
            { dow: 0, nameTh: 'อาทิตย์', nameEn: 'Sunday' }
        ];

        // Hours from 06:00 to 21:00
        const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

        // Build lookup map: `${dow}-${hour}` => count
        const map = {};
        let maxCount = 0;
        for (const r of rows) {
            const key = `${r.dow}-${r.hour_slot}`;
            const cnt = parseInt(r.count, 10);
            map[key] = cnt;
            if (cnt > maxCount) {
                maxCount = cnt;
            }
        }

        // Build 7 x 16 matrix
        const matrix = [];
        const slotList = [];

        for (const d of days) {
            const rowSlots = [];
            for (const h of hours) {
                const count = map[`${d.dow}-${h}`] || 0;
                // Calculate percentage relative to maxCount (or at least 1)
                const relativeIntensity = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

                const slotInfo = {
                    dow: d.dow,
                    dayNameTh: d.nameTh,
                    dayNameEn: d.nameEn,
                    hour: h,
                    hourStr: `${String(h).padStart(2, '0')}:00`,
                    count,
                    intensity: relativeIntensity
                };

                rowSlots.push(slotInfo);
                slotList.push(slotInfo);
            }
            matrix.push({
                dow: d.dow,
                dayNameTh: d.nameTh,
                dayNameEn: d.nameEn,
                slots: rowSlots
            });
        }

        // Sort slots to find peaks and quiet periods
        slotList.sort((a, b) => b.count - a.count);
        const peakSlots = slotList.slice(0, 5).filter(s => s.count > 0);
        const quietSlots = slotList.slice(-5).filter(s => s.count >= 0);

        // Staffing recommendation engine
        let recommendation = "ปริมาณการใช้งานอยู่ในเกณฑ์ปกติ สามารถจัดเวรเจ้าหน้าที่ตามรอบเวลามาตรฐาน";
        if (peakSlots.length > 0) {
            const peakDays = [...new Set(peakSlots.map(s => s.dayNameTh))].join(', ');
            const peakHours = [...new Set(peakSlots.map(s => s.hourStr))].join(', ');
            recommendation = `ช่วงเวลาเร่งด่วนพบความหนาแน่นสูงในวัน ${peakDays} ช่วงเวลา ${peakHours} น. แนะนำเสริมเจ้าหน้าที่ประจำจุดตรวจเช็คอินและดูแลความปลอดภัยอย่างน้อย 2-3 นาย`;
        }

        res.json({
            days,
            hours,
            matrix,
            peakSlots,
            quietSlots,
            maxCount,
            recommendation,
            sportDistribution: sportDistRows,
            totalCourts
        });
    } catch (err) {
        console.error('Error calculating utilization heatmap:', err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการวิเคราะห์ Heatmap ความหนาแน่น" });
    }
};
