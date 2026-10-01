/**
 * Pricing Engine Service
 * Calculates court booking fees based on user category (Student, Staff, External),
 * sport type, court ID, and timeslot (e.g. daytime vs nighttime lighting fee).
 */
const { pool } = require('../config/db');

/**
 * Normalizes user role/category into standard ENUM: 'STUDENT', 'STAFF', 'EXTERNAL'
 * @param {string} roleOrCategory 
 * @returns {'STUDENT' | 'STAFF' | 'EXTERNAL'}
 */
function normalizeUserCategory(roleOrCategory) {
    if (!roleOrCategory) return 'EXTERNAL';
    const val = String(roleOrCategory).toUpperCase().trim();
    if (val === 'STUDENT' || val.includes('STUDENT')) return 'STUDENT';
    if (val === 'STAFF' || val === 'ADMIN' || val === 'SUPER_ADMIN' || val.includes('STAFF')) return 'STAFF';
    return 'EXTERNAL';
}

/**
 * Calculates duration in hours between two HH:mm(:ss) times
 * @param {string} startTime - '18:00' or '18:00:00'
 * @param {string} endTime - '20:00' or '20:00:00'
 * @returns {number}
 */
function calculateHours(startTime, endTime) {
    const [sh, sm = 0] = String(startTime).split(':').map(Number);
    const [eh, em = 0] = String(endTime).split(':').map(Number);
    const startDecimal = sh + (sm / 60);
    const endDecimal = eh + (em / 60);
    const diff = endDecimal - startDecimal;
    return diff > 0 ? diff : 1.0;
}

/**
 * Calculates booking price according to pricing matrix
 * @param {Object} params
 * @param {string} [params.courtId] - Specific court ID (optional)
 * @param {string} [params.sportType] - Sport type ('tennis', 'badminton', etc.)
 * @param {string} params.userCategory - 'student' | 'staff' | 'external'
 * @param {string} params.startTime - e.g. '18:00:00'
 * @param {string} params.endTime - e.g. '20:00:00'
 * @returns {Promise<Object>}
 */
async function calculateBookingPrice({ courtId, sportType, userCategory, startTime, endTime }) {
    const category = normalizeUserCategory(userCategory);
    const durationHours = calculateHours(startTime, endTime);

    // If sportType not provided but courtId is, look up sportType
    let resolvedSport = sportType;
    if (!resolvedSport && courtId) {
        const courtRes = await pool.query('SELECT sport_type FROM courts WHERE id = $1', [courtId]);
        if (courtRes.rows && courtRes.rows.length > 0) {
            resolvedSport = courtRes.rows[0].sport_type;
        }
    }
    resolvedSport = (resolvedSport || 'general').toLowerCase();

    // Query pricing_rules prioritizing specific court_id over sport_type fallback
    const query = `
        SELECT 
            base_price_per_hour,
            lighting_fee_per_hour,
            start_time,
            end_time
        FROM pricing_rules
        WHERE (court_id = $1 OR (court_id IS NULL AND LOWER(sport_type) = $2))
          AND (user_category = $3 OR LOWER(user_type) = LOWER($3))
          AND is_active = true
          AND start_time <= $4
          AND end_time >= $5
        ORDER BY court_id NULLS LAST
        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [
        courtId || null,
        resolvedSport,
        category,
        startTime || '06:00:00',
        endTime || '22:00:00'
    ]);

    if (!rows || rows.length === 0) {
        // Fallback: check if any general rule matches user_category and sport
        const fallbackRes = await pool.query(`
            SELECT base_price_per_hour, lighting_fee_per_hour
            FROM pricing_rules
            WHERE LOWER(sport_type) = $1 AND (user_category = $2 OR LOWER(user_type) = LOWER($2)) AND is_active = true
            LIMIT 1;
        `, [resolvedSport, category]);

        if (fallbackRes.rows && fallbackRes.rows.length > 0) {
            const rule = fallbackRes.rows[0];
            const baseCourtFee = Number(rule.base_price_per_hour) * durationHours;
            const lightingFee = Number(rule.lighting_fee_per_hour) * durationHours;
            const totalAmount = baseCourtFee + lightingFee;
            return {
                userCategory: category,
                sportType: resolvedSport,
                durationHours,
                basePricePerHour: Number(rule.base_price_per_hour),
                lightingFeePerHour: Number(rule.lighting_fee_per_hour),
                baseCourtFee,
                lightingFee,
                totalAmount,
                isFree: totalAmount === 0,
                currency: 'THB'
            };
        }

        // Default: If student, free; if staff, 30 THB; if external, 100 THB
        const defaultRates = { STUDENT: 0, STAFF: 30, EXTERNAL: 100 };
        const rate = defaultRates[category] ?? 100;
        const totalAmount = rate * durationHours;

        return {
            userCategory: category,
            sportType: resolvedSport,
            durationHours,
            basePricePerHour: rate,
            lightingFeePerHour: 0,
            baseCourtFee: totalAmount,
            lightingFee: 0,
            totalAmount,
            isFree: totalAmount === 0,
            currency: 'THB',
            isDefaultRate: true
        };
    }

    const rule = rows[0];
    const baseCourtFee = Number(rule.base_price_per_hour) * durationHours;
    const lightingFee = Number(rule.lighting_fee_per_hour) * durationHours;
    const totalAmount = baseCourtFee + lightingFee;

    return {
        userCategory: category,
        sportType: resolvedSport,
        durationHours,
        basePricePerHour: Number(rule.base_price_per_hour),
        lightingFeePerHour: Number(rule.lighting_fee_per_hour),
        baseCourtFee,
        lightingFee,
        totalAmount,
        isFree: totalAmount === 0,
        currency: 'THB'
    };
}

module.exports = {
    normalizeUserCategory,
    calculateHours,
    calculateBookingPrice
};
