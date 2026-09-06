// [DEPRECATED / LEGACY TARGET]
// KKU SportPass production target is Vercel + PostgreSQL (Supabase).
// This Firebase Function with SQLite setup was for local/isolated prototype testing and is NOT permitted in production.
require('dotenv').config();

// Strict guard: Refuse to run Firebase Functions in production
if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Firebase Functions is not permitted for KKU SportPass production. Deploy to Vercel + PostgreSQL instead. See DEPLOYMENT.md.');
}

const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const passport = require('./src/config/passport');
const apiRoutes = require('./src/routes/api');

// SQLite DB initialization for Firebase
// Since Firebase Functions are stateless, we'll try to run the setup script when the function spins up
// if the DB doesn't exist.
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
if (!fs.existsSync(dbPath)) {
    console.log("Database not found, running setup script...");
    require('./scripts/setup_db');
}

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : (process.env.NODE_ENV === 'production' ? false : true);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'kku-sportpass-secret-key-node',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Express API Routes
// Note: We use '/' instead of '/api' here because Firebase rewrites /api/** to this function
// but the function will receive the full path '/api/...'. 
// Actually, it's safer to mount on '/api' or use `app.use('/', apiRoutes)` depending on how Firebase handles rewrites.
// Let's stick to '/api' to match local structure if Firebase passes the full path.
app.use('/api', apiRoutes);

// Fallback error handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Export the API as a Firebase Function
exports.api = onRequest({ region: "asia-southeast1", memory: "256MiB" }, app);
