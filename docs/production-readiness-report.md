# รายงานตรวจความพร้อมก่อนนำ KKU SportPass ขึ้นใช้งานจริง

วันที่ตรวจล่าสุด: 2026-09-06  
สภาพแวดล้อมที่ตรวจ: `D:\KKU SportPass`  
ฐานข้อมูลที่ตรวจ: PostgreSQL ผ่าน `DATABASE_URL` ใน `.env`  
ผลสรุป: **ยังไม่ควรเปิดใช้งานจริงแบบ public production จนกว่าจะแก้รายการ Blocker ที่เหลือ**

## บทสรุป

ระบบดีขึ้นจากการตรวจรอบก่อนอย่างชัดเจน: frontend build ผ่าน, backend ต่อ PostgreSQL ได้, admin routes ถูกล็อกด้วย `requireAdmin`, user booking routes ถูกล็อกด้วย `requireAuth`, `/api/debug-env` ถูกถอดออกแล้ว, survey stats controller แก้แล้ว, และมี automated tests สำหรับ auth middleware/QR/role escalation ผ่านทั้งหมด

อย่างไรก็ตาม ยังเหลือความเสี่ยงก่อนขึ้น production จริง ได้แก่ dependency vulnerabilities ระดับ critical/high, session secret ยังมี fallback ค่า default, CORS ยัง fallback เป็นเปิดกว้างหากไม่ตั้ง `ALLOWED_ORIGINS`, rate limiter มีไฟล์แล้วแต่ยังไม่ได้ mount ใน routes/server, และชุด Firebase Functions ยังเป็นโค้ดเก่าที่ไม่เท่ากับชุด Vercel/Express ปัจจุบัน

คำตัดสิน: **พร้อมสำหรับ staging/demo ที่จำกัดคนเข้า แต่ยังไม่พร้อมสำหรับ public production**

## ผลตรวจล่าสุด

| รายการ | ผลลัพธ์ | หมายเหตุ |
|---|---:|---|
| `client npm run build` | ผ่าน | bundle ถูกแยก chunk แล้ว ดีขึ้นจากรอบก่อน |
| `client npm run lint` | ผ่านแบบมี warning | ยังมี unused imports/vars และ hook dependency warning |
| `npm test` ที่ root | ผ่าน | 15 tests ผ่านทั้งหมด |
| root `npm audit --audit-level=moderate` | ไม่ผ่าน | พบ 6 vulnerabilities รวม critical จาก `bcrypt` dependency chain |
| client `npm audit --audit-level=moderate` | ไม่ผ่าน | พบ high vulnerability ใน `nanoid` |
| PostgreSQL connection/schema query | ผ่าน | พบ 12 tables หลัก |
| `applyBookingTimeouts()` | ผ่าน | คืน `{ cancelled: 0, missed: 0 }` |
| `GET /api/auth/status` | 200 | ปกติ |
| `GET /api/courts` | 200 | ปกติ |
| `GET /api/admin/courts` ไม่ login | 401 | ปลอดภัยขึ้นแล้ว |
| `GET /api/admin/settings` ไม่ login | 401 | ปลอดภัยขึ้นแล้ว |
| `GET /api/admin/admins` ไม่ login | 401 | ปลอดภัยขึ้นแล้ว |
| `GET /api/admin/surveys/stats` ไม่ login | 401 | ปลอดภัยขึ้นแล้ว |
| `GET /api/debug-env` | 404 | debug endpoint ถูกถอดแล้ว |
| `GET /api/qrToken?court_id=...` ไม่ login | 401 | ปลอดภัยขึ้นแล้ว |
| `GET /api/myBookings` ไม่ login | 401 | ปกติ |

## สิ่งที่แก้แล้วหรือพร้อมขึ้นกว่าเดิม

### 1. Admin API ถูกป้องกันแล้ว

ไฟล์ที่เกี่ยวข้อง:

- `src/routes/api.js`
- `src/middleware/authMiddleware.js`
- `tests/authMiddleware.test.js`

พบว่า route กลุ่ม `/api/admin/*` ถูกครอบด้วย:

```js
router.use('/admin', requireAdmin);
```

ผลทดสอบ runtime ล่าสุด:

- `/api/admin/courts` ไม่ login ได้ 401
- `/api/admin/settings` ไม่ login ได้ 401
- `/api/admin/admins` ไม่ login ได้ 401
- `/api/admin/surveys/stats` ไม่ login ได้ 401

สถานะ: **แก้แล้วใน Express/Vercel path**

### 2. User booking routes ถูกป้องกันแล้ว

ไฟล์ที่เกี่ยวข้อง:

- `src/routes/api.js`
- `src/controllers/bookingController.js`

routes สำคัญถูกใส่ `requireAuth` แล้ว:

- `POST /api/book`
- `GET /api/myBookings`
- `POST /api/preConfirm`
- `POST /api/checkin`

และ controller ใน `src/controllers/bookingController.js` ไม่ fallback ไปใช้ `req.body.user_id` หรือ `req.query.user_id` แล้ว

สถานะ: **แก้แล้วใน Express/Vercel path**

### 3. Debug endpoint ถูกถอดแล้ว

ผลทดสอบล่าสุด:

- `GET /api/debug-env` ได้ 404

สถานะ: **แก้แล้วใน Express/Vercel path**

### 4. Survey stats controller แก้ผลลัพธ์ database wrapper แล้ว

ไฟล์ที่เกี่ยวข้อง:

- `src/controllers/surveyController.js`

เดิมใช้ผลลัพธ์แบบ `pg` ตรง ๆ (`res.rows`) แต่ตอนนี้ใช้รูปแบบ `[rows] = await pool.query(...)` ตรงกับ wrapper แล้ว

สถานะ: **แก้แล้วใน code path ปัจจุบัน แต่ยังควรเพิ่ม integration test ของ endpoint หลัง login admin**

### 5. Role escalation จาก email ขึ้นต้น admin ถูกลดความเสี่ยงแล้ว

ไฟล์ที่เกี่ยวข้อง:

- `src/config/passport.js`
- `tests/authMiddleware.test.js`

ตอนนี้ role admin ถูก resolve จาก `ADMIN_EMAILS` แทนการดูว่า email ขึ้นต้นด้วย `admin`

สถานะ: **แก้แล้วใน OAuth/passport path ปัจจุบัน**

### 6. มี structured logging และ PostgreSQL session store แล้ว

ไฟล์ที่เกี่ยวข้อง:

- `server.js`
- `api/index.js`
- `src/middleware/logger.js`

พบการใช้ `connect-pg-simple` และ logger พร้อม request id

สถานะ: **ดีขึ้น เหมาะกับ production มากกว่าเดิม**

## Blocker ที่ยังต้องแก้ก่อนขึ้น Production

### 1. Dependency audit ยังมี critical/high vulnerabilities

ความรุนแรง: Critical  
ไฟล์ที่เกี่ยวข้อง:

- `package.json`
- `package-lock.json`
- `client/package-lock.json`

ผล root audit:

- 6 vulnerabilities
- มี critical จาก `bcrypt@5.1.1` ผ่าน `@mapbox/node-pre-gyp` และ `tar`
- มี moderate จาก `express/body-parser/qs`

ผล client audit:

- 1 high vulnerability ใน `nanoid`

แนวทางแก้:

- อัปเกรด `bcrypt` เป็น `6.x` แล้วทดสอบ register/login/hash compatibility
- รัน `npm audit fix` ใน root และ client
- ทดสอบซ้ำ `npm test`, `client npm run build`, auth flow และ booking flow

### 2. `SESSION_SECRET` ยังมี fallback เป็นค่า default

ความรุนแรง: High  
ไฟล์ที่เกี่ยวข้อง:

- `server.js`
- `api/index.js`

พบ:

```js
secret: process.env.SESSION_SECRET || 'kku-sportpass-secret-key-node'
```

ผลกระทบ:

- ถ้า production ลืมตั้ง `SESSION_SECRET` ระบบยังรันด้วย secret ที่คาดเดา/รู้ได้จาก source
- session signing security ลดลงมาก

แนวทางแก้:

- ใน production ให้ throw error ทันทีถ้าไม่มี `SESSION_SECRET`
- ใช้ secret ที่ยาว สุ่ม และเก็บใน Vercel/Firebase environment variables เท่านั้น

### 3. CORS fallback ยังเปิดกว้างหากไม่ตั้ง `ALLOWED_ORIGINS`

ความรุนแรง: High  
ไฟล์ที่เกี่ยวข้อง:

- `server.js`
- `api/index.js`

พบว่า `allowedOrigins` fallback เป็น `true` หากไม่มี `ALLOWED_ORIGINS`

ผลกระทบ:

- ถ้าลืมตั้ง env ใน production ระบบจะยอมรับ origin กว้างเกินจำเป็น

แนวทางแก้:

- ใน production ให้บังคับต้องมี `ALLOWED_ORIGINS`
- จำกัดเฉพาะ domain จริง เช่น `https://kku-sportpass.example`
- แยก config dev/staging/production ให้ชัด

### 4. Rate limiter มีไฟล์แล้วแต่ยังไม่ได้ mount

ความรุนแรง: High  
ไฟล์ที่เกี่ยวข้อง:

- `src/middleware/rateLimiter.js`
- `src/routes/api.js`
- `server.js` หรือ `api/index.js`

พบไฟล์ `rateLimiter.js` ที่ define `authLimiter`, `bookingLimiter`, `submissionLimiter` แล้ว แต่ยังไม่พบการ import/use ใน routes หรือ server

ผลกระทบ:

- login/register ยังเสี่ยง brute force
- booking/check-in/form submission ยังเสี่ยง spam/abuse

แนวทางแก้:

- mount `authLimiter` กับ `/auth/login` และ `/auth/register`
- mount `bookingLimiter` กับ `/book`, `/preConfirm`, `/checkin`
- mount `submissionLimiter` กับ `/surveys`, `/forms/:id/responses`, `/cookies/consent`
- ทดสอบว่าเกิน limit แล้วได้ 429

### 5. Firebase Functions code path ยังเป็นชุดเก่าและไม่ปลอดภัยเท่า `src`

ความรุนแรง: High หากจะ deploy Firebase  
ไฟล์ที่เกี่ยวข้อง:

- `functions/index.js`
- `functions/src/controllers/bookingController.js`
- `functions/src/config/passport.js`
- `functions/src/utils/helpers.js`

พบว่า `functions/` ยังมี pattern เก่า เช่น:

- CORS เปิดกว้าง
- cookie `secure: false`
- session secret fallback
- booking controller ยัง fallback รับ `req.body.user_id` / `req.query.user_id`
- auth/passport ยังมี logic email startsWith admin และ SSONext mock
- QR secrets ยัง hardcoded

ผลกระทบ:

- ถ้า deploy ผ่าน Firebase จะไม่ได้ใช้ code ที่แก้แล้วใน `src`
- ความปลอดภัยของ production ขึ้นกับ target ที่เลือก

แนวทางแก้:

- หาก production เลือก Vercel/Express ให้ระบุชัดว่า Firebase Functions ไม่ใช่ production target
- หากต้องใช้ Firebase ให้ sync security fixes จาก `src/` ไป `functions/src/`
- ลด duplicated backend code หรือทำ shared package/source เดียว

## High Priority ที่ควรแก้ก่อน public launch

### 1. QR secrets ยัง fallback เป็นค่าที่อยู่ใน source

ไฟล์ที่เกี่ยวข้อง:

- `src/utils/helpers.js`

แม้ตอนนี้รองรับ `QR_DYNAMIC_SECRET` และ `QR_STATIC_SECRET` แล้ว แต่ยัง fallback เป็นค่าคงที่ใน source

แนวทางแก้:

- production ต้องบังคับให้มี `QR_DYNAMIC_SECRET` และ `QR_STATIC_SECRET`
- ถ้าไม่มี secret ใน production ให้ throw error
- วางแผน rotate secret

### 2. SSONext ยังต้อง verify ตาม spec จริง

ไฟล์ที่เกี่ยวข้อง:

- `src/config/passport.js`

ตอนนี้ code พยายามอ่าน `id_token` หรือ userinfo endpoint แต่ยังควรตรวจเพิ่ม:

- issuer
- audience/client id
- expiry
- signature/JWKS
- allowed domain/organization

### 3. ยังไม่มี CSRF protection ชัดเจนสำหรับ session-based auth

ระบบใช้ cookie session และมี state-changing endpoints หลายตัว

แนวทางแก้:

- ประเมิน CSRF model ให้ชัด
- ใช้ `sameSite: 'lax'` ต่อไปถ้าไม่ต้อง cross-site
- เพิ่ม CSRF token สำหรับ POST/PUT/DELETE ที่สำคัญ หากมี cross-site หรือ embed scenario

### 4. ยังไม่มี integration tests ครบ flow

ตอนนี้ `npm test` ผ่าน 15 tests แต่เน้น middleware/QR/role logic ยังไม่ได้ครอบ:

- login/register กับ database จริงหรือ test database
- admin endpoint หลัง login admin
- booking/preConfirm/checkIn lifecycle
- forms/surveys/tracking endpoints
- rate limit behavior

## Medium Priority / Technical Debt

### 1. Lint warnings ยังมีอยู่

`client npm run lint` ผ่านแต่มี warnings เช่น unused imports/vars และ missing dependency ใน React hooks

แนวทางแก้:

- ลบ import/variable ที่ไม่ใช้
- แก้ hook dependencies หรือใช้ `useCallback` ในจุดที่เหมาะสม

### 2. Bundle size ดีขึ้น แต่ยังควรจับตา

ผล build ล่าสุดแยก chunk ได้ดีขึ้น:

- main index ประมาณ 468 kB
- `ScanCheckIn` ประมาณ 378 kB
- `html2canvas` ประมาณ 199 kB

แนวทางต่อ:

- รักษา lazy loading ของหน้าใหญ่
- แยก scanner/html2canvas เฉพาะ route ที่ใช้

### 3. PostgreSQL SSL warning

ขณะ query database มี warning จาก `pg-connection-string` เรื่อง SSL mode semantics ใน major version ถัดไป

แนวทางแก้:

- ตรวจ `DATABASE_URL` ว่าระบุ SSL mode ที่ต้องการชัดเจน
- พิจารณา `sslmode=verify-full` หาก provider รองรับ certificate verification เต็มรูปแบบ

### 4. Monitoring/alerting ยังควรเพิ่ม

มี structured logger แล้ว แต่ยังควรมี:

- error tracking
- uptime monitor
- alert เมื่อ 5xx เพิ่ม
- alert เมื่อ login fail หรือ rate limit spike
- backup/restore monitoring ของ database

## Checklist ก่อนขึ้น Production

ต้องทำก่อน public launch:

- แก้ `npm audit` ให้ไม่มี critical/high vulnerability
- บังคับ production ต้องมี `SESSION_SECRET`
- บังคับ production ต้องมี `ALLOWED_ORIGINS` และจำกัด origin จริง
- mount rate limiter ใน routes สำคัญ
- บังคับ production ต้องมี `QR_DYNAMIC_SECRET` และ `QR_STATIC_SECRET`
- ตัดสินใจ deploy target หลัก: Vercel/Express หรือ Firebase Functions
- หากใช้ Firebase ให้ sync security fixes ไปที่ `functions/`
- ตรวจ SSONext/OIDC validation ตาม spec จริง
- เพิ่ม integration/smoke tests สำหรับ auth/admin/booking/check-in
- ทดสอบ staging บน domain จริงพร้อม HTTPS/cookie/session

ควรทำหลัง blocker ผ่าน:

- เคลียร์ lint warnings
- เพิ่ม monitoring/alerting
- ทำ backup/restore runbook
- ทำ incident rollback plan
- ทบทวน privacy/data retention สำหรับ cookie consent, survey และ form responses

## คำตัดสินสุดท้าย

**ยังไม่พร้อมเปิดใช้งานจริงแบบ public production**

แต่สถานะล่าสุดถือว่าใกล้กว่าเดิมมาก: route สำคัญถูกล็อกแล้ว, debug endpoint หายแล้ว, tests ด้าน auth/QR/role ผ่านแล้ว และ frontend build ผ่าน หากแก้ dependency audit, production env enforcement, rate limiting และเคลียร์ deploy target ให้ชัด ระบบจะพร้อมเข้าสู่ staging production-like เพื่อทดสอบรอบสุดท้ายก่อนเปิดจริง
