/**
 * Payment 15-Minute Timeout & Slot Reclaim Worker
 * 
 * Automatically monitors pending payments that exceeded the 15-minute checkout window.
 * - Expires the payment record (status = 'EXPIRED')
 * - Cancels the reservation (status = 'cancelled') and releases the court slot
 * - Writes structured audit logs
 * 
 * Can be run:
 * 1. As an internal cron worker via node-cron (for standalone Node server)
 * 2. On-demand via /api/cron/cleanup (for serverless environments e.g. Vercel)
 */
const cron = require('node-cron');
const { pool } = require('../config/db');

/**
 * Scans and expires pending payments older than their expires_at threshold
 * @returns {Promise<{ expiredCount: number, expiredPayments: Array }>}
 */
async function processExpiredPayments() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Select pending payments that have expired with row-level locking
        const selectQuery = `
            SELECT p.id, p.booking_id, p.user_id, p.transaction_ref, p.amount, p.expires_at
            FROM payments p
            WHERE p.status = 'PENDING'
              AND p.expires_at IS NOT NULL
              AND p.expires_at < NOW()
            FOR UPDATE SKIP LOCKED;
        `;
        const { rows: expiredList } = await client.query(selectQuery);

        if (expiredList.length === 0) {
            await client.query('COMMIT');
            return { expiredCount: 0, expiredPayments: [] };
        }

        console.log(`⏳ Found ${expiredList.length} expired payment(s). Reclaiming court slots...`);

        for (const item of expiredList) {
            // Update payment status
            await client.query(
                `UPDATE payments 
                 SET status = 'EXPIRED', payment_status = 'EXPIRED', updated_at = NOW() 
                 WHERE id = $1`,
                [item.id]
            );

            // Update booking status to cancelled to release court slot
            await client.query(
                `UPDATE bookings 
                 SET status = 'cancelled', updated_at = NOW() 
                 WHERE id = $1 AND status != 'confirmed'`,
                [item.booking_id]
            );

            // Audit log
            try {
                await client.query(`
                    INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target_type, target_id, reason, details)
                    VALUES ($1, 'System Cron', 'system', 'PAYMENT_TIMEOUT_EXPIRED', 'PAYMENT', $2, '15-minute checkout window expired', $3)
                `, [
                    item.user_id,
                    String(item.id),
                    JSON.stringify({
                        bookingId: item.booking_id,
                        transactionRef: item.transaction_ref,
                        amount: item.amount,
                        reason: 'Unpaid within 15-minute checkout window'
                    })
                ]);
            } catch (auditErr) {
                console.warn('Could not write audit log for expired payment:', auditErr.message);
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Successfully expired ${expiredList.length} reservation(s) and reclaimed slots.`);
        return { expiredCount: expiredList.length, expiredPayments: expiredList };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error processing expired payments:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

let cronTask = null;

/**
 * Initializes the background cron worker (Runs every minute)
 */
function initPaymentTimeoutCron() {
    if (process.env.DISABLE_INTERNAL_CRON === 'true') {
        console.log('ℹ️ Internal Payment Timeout Cron disabled by environment.');
        return;
    }

    if (cronTask) {
        return;
    }

    cronTask = cron.schedule('* * * * *', async () => {
        try {
            await processExpiredPayments();
        } catch (err) {
            // Error already logged in processExpiredPayments
        }
        try {
            const { applyBookingTimeouts } = require('../utils/helpers');
            await applyBookingTimeouts();
        } catch (err) {
            console.error('Error applying booking timeouts in background cron:', err.message);
        }
    });

    console.log('🚀 Payment & Booking Timeout Cron Worker active (running every 1 min).');
}

module.exports = {
    processExpiredPayments,
    initPaymentTimeoutCron
};
