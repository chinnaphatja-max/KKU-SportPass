require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const { pool } = require('../src/config/db');
const passport = require('../src/config/passport');
const apiRoutes = require('../src/routes/api');
const structuredLogger = require('../src/middleware/logger');
const { validateProductionEnv } = require('../src/config/envValidator');

// Validate critical secrets before accepting any traffic in production
validateProductionEnv();

const app = express();

// Trust first proxy (required for secure cookies behind Vercel edge/load balancer)
app.set('trust proxy', 1);

// Structured logger & request ID tracking
app.use(structuredLogger);

// CORS configuration - Restrict to allowed origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : (process.env.NODE_ENV === 'production' ? false : true);

app.use(cors({ 
    origin: allowedOrigins,
    credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Persistent PostgreSQL Session Store for Serverless
const sessionStore = pool ? new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15 // Prune every 15 minutes
}) : undefined;

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'kku-sportpass-secret-key-node',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Vercel routes `/api/*` to this handler. Mount routes at both `/api` and `/`
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Fallback 404 handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'API Endpoint not found' });
});


module.exports = app;
