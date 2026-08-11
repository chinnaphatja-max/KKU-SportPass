const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const courtsController = require('../controllers/courtsController');
const bookingController = require('../controllers/bookingController');
const adminController = require('../controllers/adminController');
const surveyController = require('../controllers/surveyController');

// Auth endpoints
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/status', authController.status);
router.post('/auth/logout', authController.logout);

// Real OAuth Routes using Passport
// Prevent caching of OAuth redirects
router.use('/auth/google', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        req.session.user = req.user;
        if (req.user && req.user.role === 'admin') {
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
        if (req.user && req.user.role === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/');
        }
    }
);

// Courts & User endpoints
router.get('/courts', courtsController.getCourts);
router.post('/book', bookingController.bookCourt);
router.get('/myBookings', bookingController.getMyBookings);
router.post('/preConfirm', bookingController.preConfirm);
router.post('/checkin', bookingController.checkIn);
router.get('/qrToken', bookingController.getQrToken);

router.get('/debug-env', (req, res) => {
    res.json({
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        googleClientIdLength: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.length : 0,
        googleClientId: process.env.GOOGLE_CLIENT_ID || 'missing'
    });
});

// Survey endpoints
router.post('/surveys', surveyController.submitSurvey);
router.get('/admin/surveys/stats', surveyController.getSurveyStats);

// Admin endpoints
router.get('/admin/courts', adminController.getAdminCourts);
router.post('/admin/courts', adminController.createCourt);
router.put('/admin/courts', adminController.updateCourt);
router.delete('/admin/courts', adminController.deleteCourt);

router.get('/admin/closures', adminController.getClosures);
router.post('/admin/closures', adminController.createClosure);
router.delete('/admin/closures', adminController.deleteClosure);

router.get('/admin/timeslots', adminController.getTimeslots);
router.post('/admin/timeslots', adminController.createTimeslot);
router.delete('/admin/timeslots', adminController.deleteTimeslot);

router.get('/admin/admins', adminController.getAdmins);
router.post('/admin/admins', adminController.createAdmin);
router.delete('/admin/admins', adminController.deleteAdmin);

router.get('/admin/settings', adminController.getSettings);
router.put('/admin/settings', adminController.updateSettings);

module.exports = router;
