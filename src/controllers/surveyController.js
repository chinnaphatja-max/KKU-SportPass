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

        const userId = req.user ? req.user.id : null;

        await pool.query(`
            INSERT INTO satisfaction_surveys (
                user_id, user_role, usage_frequency, preferred_sports, gender, age, faculty,
                rating_ux_modern, rating_ux_clarity, rating_ux_nav, rating_ux_feedback,
                rating_func_status, rating_func_booking, rating_func_checkin, rating_func_manual,
                rating_perf_speed, rating_perf_gps, rating_perf_security,
                rating_prob_time, rating_prob_queue, rating_prob_plan, rating_overall
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11,
                $12, $13, $14, $15,
                $16, $17, $18,
                $19, $20, $21, $22
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
        const totalRes = await pool.query('SELECT COUNT(*) FROM satisfaction_surveys');
        const total = parseInt(totalRes.rows[0].count);

        if (total === 0) {
            return res.json({ success: true, total: 0, demographics: {}, averages: {} });
        }

        // Averages
        const avgRes = await pool.query(`
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
        const roleRes = await pool.query('SELECT user_role, COUNT(*) FROM satisfaction_surveys GROUP BY user_role');
        const freqRes = await pool.query('SELECT usage_frequency, COUNT(*) FROM satisfaction_surveys GROUP BY usage_frequency');
        const sportRes = await pool.query('SELECT preferred_sports, COUNT(*) FROM satisfaction_surveys GROUP BY preferred_sports');
        const ageRes = await pool.query('SELECT age, COUNT(*) FROM satisfaction_surveys GROUP BY age');

        const formatGroup = (rows, keyName) => {
            return rows.reduce((acc, row) => {
                acc[row[keyName] || 'ไม่ระบุ'] = parseInt(row.count);
                return acc;
            }, {});
        };

        res.json({
            success: true,
            total,
            averages: avgRes.rows[0],
            demographics: {
                roles: formatGroup(roleRes.rows, 'user_role'),
                frequencies: formatGroup(freqRes.rows, 'usage_frequency'),
                sports: formatGroup(sportRes.rows, 'preferred_sports'),
                ages: formatGroup(ageRes.rows, 'age')
            }
        });

    } catch (err) {
        console.error('Get Survey Stats Error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' });
    }
};
