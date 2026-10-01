require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { pool } = require('./src/config/db');
const passport = require('./src/config/passport');
const apiRoutes = require('./src/routes/api');
const structuredLogger = require('./src/middleware/logger');
const csrfProtection = require('./src/middleware/csrfProtection');
const { validateProductionEnv } = require('./src/config/envValidator');

// Validate critical secrets before accepting any traffic in production
validateProductionEnv();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Structured logger & request ID tracking
app.use(structuredLogger);

// Anti-Clickjacking & Window Isolation Headers
app.use((req, res, next) => {
    // Prevent rendering inside external iframes / frames (Anti-Clickjacking)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Protect referer leak to third-party sites
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Isolate browsing context so external tabs/windows cannot inspect or tamper via window.opener
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
});

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : (process.env.NODE_ENV === 'production' ? false : true);

app.use(cors({ 
    origin: allowedOrigins,
    credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Persistent PostgreSQL Session Store
const sessionStore = pool ? new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15
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

// CSRF Protection (double-submit cookie pattern for mutation routes)
app.use('/api', csrfProtection);

// Express API Routes
app.use('/api', apiRoutes);

// Serve Built React SPA Files
app.use(express.static(path.join(__dirname, 'client/dist')));

// Fallback route for React SPA routing
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    const distIndex = path.join(__dirname, 'client/dist/index.html');
    res.sendFile(distIndex, (err) => {
        if (err) {
            res.status(200).send(`
                <html>
                    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1>KKU SportPass Server Running (Node.js)</h1>
                        <p>API status: OK (/api/courts, /api/auth/status)</p>
                        <p>To view React UI, run <code>cd client && npm run dev</code> in development.</p>
                    </body>
                </html>
            `);
        }
    });
});

const { initPaymentTimeoutCron } = require('./src/cron/paymentTimeoutWorker');

app.listen(PORT, () => {
    console.log(`⚡ [Node.js Server] Running at http://localhost:${PORT}`);
    // Start background 15-minute payment timeout monitor
    initPaymentTimeoutCron();
});
