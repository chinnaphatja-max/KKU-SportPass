const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy;
const pool = require('./db');

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
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        let user = users[0];
        if (!user) {
            const [result] = await pool.query(
                "INSERT INTO users (name, email, role) VALUES (?, ?, ?)",
                [name, email, role]
            );
            user = { id: result.insertId, name, email, role };
        }
        return user;
    } catch (err) {
        throw err;
    }
};

// --- Google OAuth2 Strategy ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
    callbackURL: '/api/auth/google/callback',
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@google.com`;
        const name = profile.displayName || 'Google User';
        // Auto-assign admin if email matches pattern, else user
        const role = email.toLowerCase().startsWith('admin') ? 'admin' : 'user';
        
        const user = await findOrCreateUser(email, name, role);
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// --- KKU SSONext Strategy ---
// Assuming standard OAuth2 since we lack the exact spec. 
// Can be swapped to OpenID Connect or SAML later if needed.
passport.use('ssonext', new OAuth2Strategy({
    authorizationURL: process.env.SSONEXT_AUTH_URL || 'https://sso.kku.ac.th/oauth2/authorize',
    tokenURL: process.env.SSONEXT_TOKEN_URL || 'https://sso.kku.ac.th/oauth2/token',
    clientID: process.env.SSONEXT_CLIENT_ID || 'mock_ssonext_client_id',
    clientSecret: process.env.SSONEXT_CLIENT_SECRET || 'mock_ssonext_client_secret',
    callbackURL: '/api/auth/ssonext/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // In a real OAuth2 strategy without a standard profile endpoint, 
        // you might need to fetch the profile manually here using the accessToken.
        // For demonstration, we'll mock the profile data extraction.
        
        // This is a placeholder. You need to decode JWT or fetch from process.env.SSONEXT_PROFILE_URL
        const email = 'user.ssonext@kku.ac.th'; 
        const name = 'KKU SSONext User';
        const role = 'user';

        const user = await findOrCreateUser(email, name, role);
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

module.exports = passport;
