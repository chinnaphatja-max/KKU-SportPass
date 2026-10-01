const express = require('express');
const router = express.Router();
const passport = require('passport');
const { requireAuth, requireAdmin, requireRole } = require('../middleware/authMiddleware');
const { authLimiter, bookingLimiter, submissionLimiter, paymentLimiter } = require('../middleware/rateLimiter');
const { financialOriginShield } = require('../middleware/financialOriginShield');
const authController = require('../controllers/authController');
const courtsController = require('../controllers/courtsController');
const bookingController = require('../controllers/bookingController');
const adminController = require('../controllers/adminController');
const surveyController = require('../controllers/surveyController');
const formController = require('../controllers/formController');
const trackingController = require('../controllers/trackingController');
const paymentController = require('../controllers/paymentController');
const notificationController = require('../controllers/notificationController');

// --- Auth endpoints ---
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/register', authLimiter, authController.register);
router.get('/auth/status', authController.status);
router.post('/auth/logout', authController.logout);
router.get('/user/profile', requireAuth, authController.getProfile);
router.put('/user/profile', requireAuth, authController.updateProfile);

// OAuth Routes using Passport
router.use('/auth/google', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        req.session.user = req.user;
        if (req.user && ['admin', 'super_admin', 'staff', 'viewer'].includes(req.user.role)) {
            res.redirect('/admin');
        } else {
            res.redirect('/');
        }
    }
);

router.get('/auth/ssonext', passport.authenticate('ssonext'));
router.get('/auth/ssonext/callback', 
    passport.authenticate('ssonext', { failureRedirect: '/login' }),
    (req, res) => {
        req.session.user = req.user;
        if (req.user && ['admin', 'super_admin', 'staff', 'viewer'].includes(req.user.role)) {
            res.redirect('/admin');
        } else {
            res.redirect('/');
        }
    }
);

const { applyBookingTimeouts } = require('../utils/helpers');

// --- Public Endpoints ---
router.get('/courts', courtsController.getCourts);
router.get('/public-settings', adminController.getPublicSettings);
router.post('/surveys', submissionLimiter, surveyController.submitSurvey);
router.get('/forms/active-survey', formController.getActiveSurvey);
router.get('/forms/early-evaluation', formController.getEvaluationForm);
router.get('/forms/:id', formController.getPublicForm);
router.post('/forms/:id/responses', submissionLimiter, formController.submitFormResponse);
router.post('/cookies/consent', submissionLimiter, trackingController.saveConsent);

const { processExpiredPayments } = require('../cron/paymentTimeoutWorker');

// --- Cron / Automated Maintenance Endpoint (Triggered by Vercel Cron or External Pinger) ---
router.get('/cron/cleanup', async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === 'production';
        const cronSecret = process.env.CRON_SECRET;

        // Production: CRON_SECRET is mandatory (enforced by envValidator at startup)
        if (isProduction) {
            if (!cronSecret) {
                return res.status(503).json({ error: 'Cron endpoint disabled: CRON_SECRET not configured' });
            }
            const authHeader = req.headers.authorization;
            if (authHeader !== `Bearer ${cronSecret}`) {
                return res.status(401).json({ error: 'Unauthorized cron trigger' });
            }
        } else if (cronSecret) {
            // Dev/test: optional check if CRON_SECRET is set
            const authHeader = req.headers.authorization;
            if (authHeader !== `Bearer ${cronSecret}`) {
                return res.status(401).json({ error: 'Unauthorized cron trigger' });
            }
        }

        const result = await applyBookingTimeouts();
        const expiredPayments = await processExpiredPayments();
        res.json({ success: true, ...result, expiredPayments, timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('Cron cleanup error:', err);
        res.status(500).json({ error: 'Failed to run cleanup' });
    }
});

// --- Pricing Engine Endpoint ---
router.post('/pricing/calculate', paymentController.calculatePrice);

// --- User Protected Endpoints (Requires Active Login & Rate Limiting) ---
router.post('/book', requireAuth, bookingLimiter, bookingController.bookCourt);
router.get('/myBookings', requireAuth, bookingController.getMyBookings);
router.post('/preConfirm', requireAuth, bookingLimiter, bookingController.preConfirm);
router.post('/checkin', requireAuth, bookingLimiter, bookingController.checkIn);
router.post('/cancelBooking', requireAuth, bookingLimiter, bookingController.cancelBooking);

// --- User Waitlist System Endpoints ---
router.post('/waitlist/join', requireAuth, bookingLimiter, bookingController.joinWaitlist);
router.get('/waitlist/my', requireAuth, bookingController.getMyWaitlists);
router.post('/waitlist/cancel', requireAuth, bookingLimiter, bookingController.cancelWaitlist);

// --- User Payment & E-Receipt Endpoints (Protected by Origin Shield against external windows & CSRF) ---
router.use('/payments', financialOriginShield);
router.use('/payment', financialOriginShield);

router.get('/payments/config', paymentController.getPaymentConfig);
router.post('/payments/pay', requireAuth, paymentLimiter, paymentController.processPayment);
router.post('/payments/verify', requireAuth, paymentLimiter, paymentController.verifyPayment);
router.post('/payment/checkout', requireAuth, paymentLimiter, paymentController.checkout);
router.post('/payments/checkout', requireAuth, paymentLimiter, paymentController.checkout);
router.post('/payment/webhook', paymentController.handleWebhook);
router.post('/payments/webhook', paymentController.handleWebhook);
router.get('/payments/receipt/:receipt_no', requireAuth, paymentController.getReceipt);
router.get('/payments/booking/:booking_id', requireAuth, paymentController.getBookingPayment);

// --- User In-App Notifications Endpoints ---
router.get('/notifications', requireAuth, notificationController.getNotifications);
router.get('/notifications/unread-count', requireAuth, notificationController.getUnreadCount);
router.post('/notifications/read-all', requireAuth, notificationController.markAllAsRead);
router.post('/notifications/:id/read', requireAuth, notificationController.markAsRead);

// --- Staff / Admin Operational: QR Token Generation ---
router.get('/qrToken', requireRole('admin', 'super_admin', 'staff'), bookingController.getQrToken);

// --- Admin Protected Area (/api/admin/*) ---
// Blanket protection: Every /api/admin/* route requires at least one administrative role
router.use('/admin', requireRole('admin', 'super_admin', 'staff', 'viewer'));

// Admin - Operational Bookings
router.get('/admin/bookings', bookingController.getAdminBookings);
router.get('/admin/bookings/export-csv', requireRole('admin', 'super_admin', 'staff', 'viewer'), bookingController.exportBookingsCsv);
router.post('/admin/bookings/:id/checkin', requireRole('admin', 'super_admin', 'staff'), bookingController.adminManualCheckin);
router.post('/admin/bookings/:id/cancel', requireRole('admin', 'super_admin', 'staff'), bookingController.adminCancelBooking);

// Admin - Audit Logs
router.get('/admin/audit-logs', requireRole('admin', 'super_admin', 'viewer'), adminController.getAuditLogs);

// Admin - Survey & Dynamic Forms
router.get('/admin/surveys/stats', surveyController.getSurveyStats);
router.get('/admin/forms', formController.getAllForms);
router.post('/admin/forms', requireRole('admin', 'super_admin'), formController.createForm);
router.get('/admin/forms/:id/export-csv', formController.exportFormResponsesCsv);
router.get('/admin/forms/:id', formController.getFormById);
router.put('/admin/forms/:id', requireRole('admin', 'super_admin'), formController.updateForm);
router.delete('/admin/forms/:id', requireRole('admin', 'super_admin'), formController.deleteForm);

// Admin - Tracking & Analytics
router.get('/admin/tracking-stats', trackingController.getStats);
router.get('/admin/utilization-heatmap', requireRole('admin', 'super_admin', 'staff', 'viewer'), trackingController.getUtilizationHeatmap);

// Admin - Waitlists & Payments Oversight
router.get('/admin/waitlists', requireRole('admin', 'super_admin', 'staff', 'viewer'), bookingController.getAdminWaitlists);
router.get('/admin/payments', requireRole('admin', 'super_admin', 'staff', 'viewer'), paymentController.getAdminPayments);
router.get('/admin/payments/export-csv', requireRole('admin', 'super_admin', 'staff', 'viewer'), paymentController.exportPaymentsCsv);

// Admin - Courts Management
router.get('/admin/courts', adminController.getAdminCourts);
router.post('/admin/courts', requireRole('admin', 'super_admin'), adminController.createCourt);
router.put('/admin/courts', requireRole('admin', 'super_admin'), adminController.updateCourt);
router.delete('/admin/courts', requireRole('admin', 'super_admin'), adminController.deleteCourt);

// Admin - Closures (Partial-Day & Full-Day)
router.get('/admin/closures', adminController.getClosures);
router.post('/admin/closures', requireRole('admin', 'super_admin', 'staff'), adminController.createClosure);
router.delete('/admin/closures', requireRole('admin', 'super_admin', 'staff'), adminController.deleteClosure);

// Admin - Timeslots
router.get('/admin/timeslots', adminController.getTimeslots);
router.post('/admin/timeslots', requireRole('admin', 'super_admin'), adminController.createTimeslot);
router.put('/admin/timeslots', requireRole('admin', 'super_admin'), adminController.updateTimeslot);
router.post('/admin/timeslots/bulk', requireRole('admin', 'super_admin'), adminController.bulkCreateTimeslots);
router.post('/admin/timeslots/copy', requireRole('admin', 'super_admin'), adminController.copyTimeslots);
router.post('/admin/timeslots/clear', requireRole('admin', 'super_admin'), adminController.clearCourtTimeslots);
router.delete('/admin/timeslots', requireRole('admin', 'super_admin'), adminController.deleteTimeslot);

// Admin - Admins Management
router.get('/admin/admins', requireRole('admin', 'super_admin'), adminController.getAdmins);
router.post('/admin/admins', requireRole('super_admin'), adminController.createAdmin);
router.put('/admin/admins', requireRole('super_admin'), adminController.updateAdmin);
router.delete('/admin/admins', requireRole('super_admin'), adminController.deleteAdmin);


// Admin - Settings
router.get('/admin/settings', requireRole('admin', 'super_admin'), adminController.getSettings);
router.put('/admin/settings', requireRole('admin', 'super_admin'), adminController.updateSettings);

module.exports = router;
