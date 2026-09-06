const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy;
const pool = require('./db');

function resolveRole(email) {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
    return adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user';
}

// Serialize user into the sessions
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from the sessions
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Helper function to find or create user in DB
const findOrCreateUser = async (email, name, role) => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [cleanEmail]);
        let user = users[0];
        if (!user) {
            const assignedRole = role || resolveRole(cleanEmail);
            const [result] = await pool.query(
                "INSERT INTO users (name, email, role) VALUES (?, ?, ?)",
                [name, cleanEmail, assignedRole]
            );
            user = { id: result.insertId, name, email: cleanEmail, role: assignedRole };
        }
        return user;
    } catch (err) {
        throw err;
    }
};

// --- Google OAuth2 Strategy ---
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        proxy: true
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@google.com`;
            const name = profile.displayName || 'Google User';
            const role = resolveRole(email);
            
            const user = await findOrCreateUser(email, name, role);
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
} else {
    // Development fallback mock
    passport.use(new GoogleStrategy({
        clientID: 'mock_google_id',
        clientSecret: 'mock_google_secret',
        callbackURL: '/api/auth/google/callback',
        proxy: true
    }, (accessToken, refreshToken, profile, done) => {
        done(new Error('Google OAuth is not configured in this environment'));
    }));
}

// --- KKU SSONext Strategy ---
if (process.env.SSONEXT_CLIENT_ID && process.env.SSONEXT_CLIENT_SECRET) {
    passport.use('ssonext', new OAuth2Strategy({
        authorizationURL: process.env.SSONEXT_AUTH_URL || 'https://sso.kku.ac.th/oauth2/authorize',
        tokenURL: process.env.SSONEXT_TOKEN_URL || 'https://sso.kku.ac.th/oauth2/token',
        clientID: process.env.SSONEXT_CLIENT_ID,
        clientSecret: process.env.SSONEXT_CLIENT_SECRET,
        callbackURL: '/api/auth/ssonext/callback'
    }, async (accessToken, refreshToken, params, profile, done) => {
        try {
            // Attempt to extract identity from id_token or params if available
            let email = null;
            let name = 'KKU SSONext User';

            if (params && params.id_token) {
                try {
                    const payload = JSON.parse(Buffer.from(params.id_token.split('.')[1], 'base64').toString('utf8'));
                    email = payload.email || payload.upn || payload.sub;
                    name = payload.name || payload.display_name || name;
                } catch (e) {
                    console.warn('Failed to parse id_token payload:', e.message);
                }
            }

            // If userinfo URL provided, fetch actual user profile
            if (!email && process.env.SSONEXT_USERINFO_URL) {
                try {
                    const response = await fetch(process.env.SSONEXT_USERINFO_URL, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    const info = await response.json();
                    email = info.email || info.upn || info.username;
                    name = info.name || info.display_name || name;
                } catch (e) {
                    console.warn('Failed to fetch from SSONEXT_USERINFO_URL:', e.message);
                }
            }

            if (!email) {
                return done(new Error('Unable to extract user identity from SSONext token response'));
            }

            const role = resolveRole(email);
            const user = await findOrCreateUser(email, name, role);
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
}

module.exports = passport;
