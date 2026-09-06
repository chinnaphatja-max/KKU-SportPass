const pool = require('../config/db');

exports.submitSurvey = async (req, res) => {
    try {
        const {
            userRole, usageFrequency, preferredSports, gender, age, faculty,
            rating_ux_modern, rating_ux_clarity, rating_ux_nav, rating_ux_feedback,
            rating_func_status, rating_func_booking, rating_func_checkin, rating_func_manual,
            rating_perf_speed, rating_perf_gps, rating_perf_security,
            rating_prob_time, rating_prob_queue, rating_prob_plan, rating_overall
        } = req.body;

        const userId = req.session?.user?.id || req.user?.id || null;

        await pool.query(`
            INSERT INTO satisfaction_surveys (
                user_id, user_role, usage_frequency, preferred_sports, gender, age, faculty,
                rating_ux_modern, rating_ux_clarity, rating_ux_nav, rating_ux_feedback,
                rating_func_status, rating_func_booking, rating_func_checkin, rating_func_manual,
                rating_perf_speed, rating_perf_gps, rating_perf_security,
                rating_prob_time, rating_prob_queue, rating_prob_plan, rating_overall
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?
            )
        `, [
            userId, userRole, usageFrequency, preferredSports, gender, age, faculty,
            rating_ux_modern, rating_ux_clarity, rating_ux_nav, rating_ux_feedback,
            rating_func_status, rating_func_booking, rating_func_checkin, rating_func_manual,
            rating_perf_speed, rating_perf_gps, rating_perf_security,
            rating_prob_time, rating_prob_queue, rating_prob_plan, rating_overall
        ]);

        res.json({ success: true, message: 'บันทึกแบบประเมินความพึงพอใจสำเร็จ ขอบคุณสำหรับความร่วมมือครับ/ค่ะ' });
    } catch (err) {
        console.error('Submit Survey Error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
};

exports.getSurveyStats = async (req, res) => {
    try {
        // Total respondents
        const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM satisfaction_surveys');
        const total = totalRows && totalRows.length > 0 ? parseInt(totalRows[0].count, 10) : 0;

        if (total === 0) {
            return res.json({ success: true, total: 0, demographics: {}, averages: {} });
        }

        // Averages
        const [avgRows] = await pool.query(`
            SELECT 
                AVG(rating_ux_modern) as ux_modern,
                AVG(rating_ux_clarity) as ux_clarity,
                AVG(rating_ux_nav) as ux_nav,
                AVG(rating_ux_feedback) as ux_feedback,
                
                AVG(rating_func_status) as func_status,
                AVG(rating_func_booking) as func_booking,
                AVG(rating_func_checkin) as func_checkin,
                AVG(rating_func_manual) as func_manual,
                
                AVG(rating_perf_speed) as perf_speed,
                AVG(rating_perf_gps) as perf_gps,
                AVG(rating_perf_security) as perf_security,
                
                AVG(rating_prob_time) as prob_time,
                AVG(rating_prob_queue) as prob_queue,
                AVG(rating_prob_plan) as prob_plan,
                AVG(rating_overall) as overall
            FROM satisfaction_surveys
        `);

        // Demographics grouping
        const [roleRows] = await pool.query('SELECT user_role, COUNT(*) as count FROM satisfaction_surveys GROUP BY user_role');
        const [freqRows] = await pool.query('SELECT usage_frequency, COUNT(*) as count FROM satisfaction_surveys GROUP BY usage_frequency');
        const [sportRows] = await pool.query('SELECT preferred_sports, COUNT(*) as count FROM satisfaction_surveys GROUP BY preferred_sports');
        const [ageRows] = await pool.query('SELECT age, COUNT(*) as count FROM satisfaction_surveys GROUP BY age');

        const formatGroup = (rows, keyName) => {
            if (!Array.isArray(rows)) return {};
            return rows.reduce((acc, row) => {
                acc[row[keyName] || 'ไม่ระบุ'] = parseInt(row.count, 10);
                return acc;
            }, {});
        };

        res.json({
            success: true,
            total,
            averages: (avgRows && avgRows[0]) || {},
            demographics: {
                roles: formatGroup(roleRows, 'user_role'),
                frequencies: formatGroup(freqRows, 'usage_frequency'),
                sports: formatGroup(sportRows, 'preferred_sports'),
                ages: formatGroup(ageRows, 'age')
            }
        });

    } catch (err) {
        console.error('Get Survey Stats Error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' });
    }
};
