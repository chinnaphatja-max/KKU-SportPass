const express = require('express');
const router = express.Router();
const passport = require('passport');
const { requireAuth, requireAdmin, requireRole } = require('../middleware/authMiddleware');
const { authLimiter, bookingLimiter, submissionLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const courtsController = require('../controllers/courtsController');
const bookingController = require('../controllers/bookingController');
const adminController = require('../controllers/adminController');
const surveyController = require('../controllers/surveyController');
const formController = require('../controllers/formController');
const trackingController = require('../controllers/trackingController');
const paymentController = require('../controllers/paymentController');

// --- Auth endpoints ---
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/register', authLimiter, authController.register);
router.get('/auth/status', authController.status);
router.post('/auth/logout', authController.logout);

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
router.post('/surveys', submissionLimiter, surveyController.submitSurvey);
router.get('/forms/:id', formController.getPublicForm);
router.post('/forms/:id/responses', submissionLimiter, formController.submitFormResponse);
router.post('/cookies/consent', submissionLimiter, trackingController.saveConsent);

// --- Cron / Automated Maintenance Endpoint (Triggered by Vercel Cron or External Pinger) ---
router.get('/cron/cleanup', async (req, res) => {
    try {
        if (process.env.CRON_SECRET) {
            const authHeader = req.headers.authorization;
            if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                return res.status(401).json({ error: 'Unauthorized cron trigger' });
            }
        }
        const result = await applyBookingTimeouts();
        res.json({ success: true, ...result, timestamp: new Date().toISOString() });
    } catch (err) {
        console.error('Cron cleanup error:', err);
        res.status(500).json({ error: 'Failed to run cleanup' });
    }
});

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

// --- User Payment & E-Receipt Endpoints ---
router.post('/payments/pay', requireAuth, bookingLimiter, paymentController.processPayment);
router.get('/payments/receipt/:receipt_no', requireAuth, paymentController.getReceipt);
router.get('/payments/booking/:booking_id', requireAuth, paymentController.getBookingPayment);

// --- Staff / Admin Operational: QR Token Generation ---
router.get('/qrToken', requireRole('admin', 'super_admin', 'staff'), bookingController.getQrToken);

// --- Admin Protected Area (/api/admin/*) ---
// Blanket protection: Every /api/admin/* route requires at least one administrative role
router.use('/admin', requireRole('admin', 'super_admin', 'staff', 'viewer'));

// Admin - Operational Bookings
router.get('/admin/bookings', bookingController.getAdminBookings);
router.post('/admin/bookings/:id/checkin', requireRole('admin', 'super_admin', 'staff'), bookingController.adminManualCheckin);
router.post('/admin/bookings/:id/cancel', requireRole('admin', 'super_admin', 'staff'), bookingController.adminCancelBooking);

// Admin - Audit Logs
router.get('/admin/audit-logs', requireRole('admin', 'super_admin', 'viewer'), adminController.getAuditLogs);

// Admin - Survey & Dynamic Forms
router.get('/admin/surveys/stats', surveyController.getSurveyStats);
router.get('/admin/forms', formController.getAllForms);
router.post('/admin/forms', requireRole('admin', 'super_admin'), formController.createForm);
router.get('/admin/forms/:id', formController.getFormById);
router.put('/admin/forms/:id', requireRole('admin', 'super_admin'), formController.updateForm);
router.delete('/admin/forms/:id', requireRole('admin', 'super_admin'), formController.deleteForm);

// Admin - Tracking & Analytics
router.get('/admin/tracking-stats', trackingController.getStats);
router.get('/admin/utilization-heatmap', requireRole('admin', 'super_admin', 'staff', 'viewer'), trackingController.getUtilizationHeatmap);

// Admin - Waitlists & Payments Oversight
router.get('/admin/waitlists', requireRole('admin', 'super_admin', 'staff', 'viewer'), bookingController.getAdminWaitlists);
router.get('/admin/payments', requireRole('admin', 'super_admin', 'staff', 'viewer'), paymentController.getAdminPayments);

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
router.delete('/admin/timeslots', requireRole('admin', 'super_admin'), adminController.deleteTimeslot);

// Admin - Admins Management
router.get('/admin/admins', requireRole('admin', 'super_admin'), adminController.getAdmins);
router.post('/admin/admins', requireRole('super_admin'), adminController.createAdmin);
router.delete('/admin/admins', requireRole('super_admin'), adminController.deleteAdmin);

// Admin - Settings
router.get('/admin/settings', requireRole('admin', 'super_admin'), adminController.getSettings);
router.put('/admin/settings', requireRole('admin', 'super_admin'), adminController.updateSettings);

module.exports = router;
