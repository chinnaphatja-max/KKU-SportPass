require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const passport = require('./src/config/passport');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'kku-sportpass-secret-key-node',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

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

app.listen(PORT, () => {
    console.log(`⚡ [Node.js Server] Running at http://localhost:${PORT}`);
});
