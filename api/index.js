require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const passport = require('../src/config/passport');
const apiRoutes = require('../src/routes/api');

// We are using PostgreSQL now, so no need for ephemeral SQLite setup hack

const app = express();

// Middleware
app.use(cors({ origin: true }));
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

// Vercel routes all `/api/*` to this file. 
// We should mount the routes at `/api` to match the router expectations.
app.use('/api', apiRoutes);

// Fallback error handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'API Endpoint not found' });
});

// Export the Express API for Vercel
module.exports = app;
