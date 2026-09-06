# KKU SportPass - Production Deployment & Architecture Guide

## 1. Production Architecture Overview

The production architecture for KKU SportPass is standardized on **Vercel (Frontend & Serverless API)** and **PostgreSQL (Supabase)**:

```
[ User Browser / Mobile ]
         │
         ▼
[ Vercel Edge Network ]
   ├── Frontend Static SPA (Vite + React 19, Code-split <500kB chunks)
   └── Serverless Functions (/api/* handled by api/index.js Express app)
         │
         ▼
[ PostgreSQL Database (Supabase) ]
   ├── Core Tables: users, courts, timeslots, bookings, app_settings, etc.
   └── Persistent Session Store: "session" table managed by connect-pg-simple
```

> **Note on Firebase Functions**:
> The `functions/` folder containing SQLite file setup was a prototype development setup and is **deprecated** for public production. Production deployments should strictly target Vercel + PostgreSQL.

---

## 2. Security Hardening Applied

1. **Authentication & Role-Based Access Control**:
   - `authMiddleware.js` enforces `requireAuth` on all user booking endpoints and blanket `requireAdmin` across all `/api/admin/*` routes.
   - Dynamic QR token generation (`/api/qrToken`) is locked behind `requireAdmin` to prevent remote check-in spoofing.
   - Client-side `user_id` parameters in booking flows have been eradicated; the authenticated identity is extracted exclusively from `req.session.user`.
   - Admin privilege escalation based on email string prefix (`starts_with('admin')`) has been replaced by strict whitelist verification using `ADMIN_EMAILS`.

2. **Session Persistence on Serverless**:
   - Replaced in-memory session store with `connect-pg-simple` backed by PostgreSQL.
   - Sessions persist across serverless function cold starts and scale gracefully.
   - Cookies configured with `httpOnly: true`, `sameSite: 'lax'`, and `secure: true` in production.

3. **Rate Limiting & Abuse Prevention**:
   - Strict rate limiters implemented (`authLimiter`, `bookingLimiter`, `submissionLimiter`) using `express-rate-limit`.

4. **Cryptographic Protection**:
   - QR HMAC signing secrets moved to `QR_DYNAMIC_SECRET` and `QR_STATIC_SECRET`.
   - Production mode disallows unverified raw court ID bypass.

---

## 3. Deployment Steps on Vercel

### Step 1: Database Setup
Run the database schema setup and create the session store table on your PostgreSQL / Supabase instance:
```bash
# Setup main tables & default seeds
npm run setup

# Ensure persistent session table exists
node scripts/create_session_table.js
```

### Step 2: Configure Environment Variables in Vercel
In the Vercel Project Settings > **Environment Variables**, add the following:

| Variable | Description | Example / Note |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
| `SESSION_SECRET` | 32+ character random secret | `generated-secure-random-key` |
| `ADMIN_EMAILS` | Comma-separated admin whitelist | `admin@kku.ac.th,director@kku.ac.th` |
| `QR_DYNAMIC_SECRET` | HMAC secret for dynamic QR | `random-secret-key-1` |
| `QR_STATIC_SECRET` | HMAC secret for static QR | `random-secret-key-2` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Secret from Google Cloud Console |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `https://your-domain.vercel.app` |

### Step 3: Deploy via Git or Vercel CLI
```bash
vercel --prod
```
The root `vercel.json` already defines the build configuration, output directory (`client/dist`), and serverless route rewrite (`api/index.js`).

---

## 4. Automated Testing & Verification

Run the automated test suite before any release:
```bash
npm test
```
Tests verify:
- Auth middleware (`requireAuth`, `requireAdmin`) 401 & 403 status codes and session extraction
- QR token HMAC creation, expiration (>1 minute), and tampering rejection
- Role resolution and prevention of privilege escalation
