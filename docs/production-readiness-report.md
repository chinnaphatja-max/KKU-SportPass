# รายงานตรวจความพร้อมก่อนนำ KKU SportPass ขึ้นใช้งานจริง

วันที่ตรวจล่าสุด: 2026-09-12  
สภาพแวดล้อมที่ตรวจ: `D:\KKU SportPass`  
ฐานข้อมูลที่ตรวจ: PostgreSQL ผ่าน `DATABASE_URL` ใน `.env`  
เป้าหมาย production ที่ตรวจ: Vercel + PostgreSQL ตาม `DEPLOYMENT.md` และ `vercel.json`

## สรุปผู้บริหาร

สถานะปัจจุบัน: **พร้อมสำหรับ staging และ production candidate แต่ยังไม่ควรเปิด public production เต็มรูปแบบจนกว่าจะแก้/ยืนยันรายการ Blocker ด้านล่าง**

ระบบหลักของเว็บจองสนามกีฬาอยู่ในสภาพดีขึ้นมาก: build ผ่าน, lint ผ่าน, automated tests ผ่านทั้งหมด, dependency audit ผ่าน 0 vulnerabilities, backend เชื่อม PostgreSQL ได้, route สำคัญถูกล็อกสิทธิ์, debug endpoint ไม่เปิดเผย, และมีระบบที่เหมาะกับเว็บจองสนามกีฬา เช่น การจองสนาม, จำกัดโควต้า, pre-confirm, check-in ด้วย QR/GPS, ยกเลิกการจอง, admin dashboard, audit log, waitlist, payment/receipt และ form/survey

อย่างไรก็ตาม ก่อนเปิดใช้งานจริงกับผู้ใช้ทั่วไป ควรแก้ 3 เรื่องสำคัญก่อน: ป้องกัน cron endpoint แบบบังคับ, แยกสคริปต์ migration ออกจาก seed/mock data, และยืนยันค่า production environment/SSO/backup/monitoring บน Vercel จริง

## ผลตรวจที่รันจริง

| รายการตรวจ | ผลลัพธ์ | หมายเหตุ |
|---|---:|---|
| `npm test` ที่ root | ผ่าน | 8 test suites, 40 tests ผ่านทั้งหมด |
| `npm run build` ใน `client` | ผ่าน | Vite build สำเร็จ |
| `npm run lint` ใน `client` | ผ่าน | ไม่มี error/warning จากรอบตรวจนี้ |
| root `npm audit --audit-level=moderate` | ผ่าน | 0 vulnerabilities |
| client `npm audit --audit-level=moderate` | ผ่าน | 0 vulnerabilities |
| PostgreSQL schema smoke test | ผ่าน | พบตารางหลัก 13 ตาราง |
| `applyBookingTimeouts()` | ผ่าน | คืน `{ cancelled: 0, missed: 0 }` |
| `GET /api/auth/status` ไม่ login | 200 | ปกติ |
| `GET /api/courts` | 200 | public route ทำงาน |
| `GET /api/admin/courts` ไม่ login | 401 | ปลอดภัย |
| `GET /api/admin/bookings` ไม่ login | 401 | ปลอดภัย |
| `GET /api/admin/audit-logs` ไม่ login | 401 | ปลอดภัย |
| `GET /api/admin/settings` ไม่ login | 401 | ปลอดภัย |
| `GET /api/debug-env` | 404 | debug endpoint ไม่เปิด |
| `GET /api/qrToken?court_id=...` ไม่ login | 401 | ปลอดภัย |
| `GET /api/myBookings` ไม่ login | 401 | ปลอดภัย |

## ฟังก์ชันที่เหมาะสมกับเว็บจองสนามกีฬา

| หมวด | สถานะ | สิ่งที่พบ |
|---|---|---|
| ค้นหา/ดูสนาม | พร้อม | มี public `/api/courts` และข้อมูลสนาม/ประเภทสนาม |
| จองสนาม | พร้อม | ตรวจเวลา, วันย้อนหลัง, จำนวนวันล่วงหน้า, โควต้าการจอง, capacity และ duplicate booking |
| การจองพร้อมกัน | ดี | ใช้ transaction และ lock แถวสนามก่อนสร้าง booking ลด race condition |
| ปิดสนาม/ช่วงเวลาปิด | พร้อม | รองรับทั้งปิดทั้งวันและปิดบางช่วงเวลา |
| Pre-confirm | พร้อม | มีหน้าต่างเวลาก่อนเริ่มใช้งานตาม setting |
| Check-in | พร้อม | ใช้ QR token, GPS radius, check-in window และ audit log |
| ยกเลิกการจอง | พร้อม | จำกัดเวลายกเลิก, เปลี่ยนสถานะ และเลื่อน waitlist |
| Waitlist | พร้อมระดับใช้งาน | มี user/admin routes, UI ในหน้าจองและรายการของฉัน, promote อัตโนมัติเมื่อมีที่ว่าง |
| Payment/Receipt | พร้อมระดับ prototype/ภายใน | มี route, UI, receipt และ admin report แต่ยังเป็น simulated payment |
| Admin operations | พร้อม | ดู booking, manual check-in, cancel, court/timeslot/closure/settings/admin user |
| Audit log | พร้อม | บันทึกการกระทำสำคัญและมีหน้า admin ตรวจสอบ |
| Role-based access | พร้อม | มี `super_admin`, `admin`, `staff`, `viewer`, `user` |
| Rate limiting | พร้อม | auth, booking, submission limiter ถูก mount กับ route สำคัญ |
| Survey/Form/Cookie consent | พร้อม | มี public submission และ admin management ตามหน้าที่ |

## จุดที่แก้แล้วจากความเสี่ยงเดิม

1. Dependency vulnerabilities: ผ่าน audit ทั้ง root และ client แล้ว
2. Frontend build: ผ่านแล้ว
3. Lint: ผ่านแล้ว
4. Automated tests: ขยายเป็น 40 tests และผ่านทั้งหมด
5. Admin API: route admin สำคัญคืน 401 เมื่อไม่ login
6. User booking API: route จอง/ดูรายการ/check-in/ยกเลิกต้อง login
7. QR token: ไม่เปิดให้ผู้ใช้ไม่ login เรียกได้
8. Debug env endpoint: ไม่พบ route นี้แล้ว
9. Production env validator: production บังคับ `SESSION_SECRET`, `ALLOWED_ORIGINS`, `QR_DYNAMIC_SECRET`, `QR_STATIC_SECRET`
10. Firebase Functions legacy: มี guard ห้ามใช้เป็น production target แล้ว

## Blocker ก่อนเปิด Public Production

### 1. Cron cleanup ควรบังคับ secret เสมอใน production

ไฟล์: `src/routes/api.js`

พบว่า `/api/cron/cleanup` ตรวจ `Authorization: Bearer ...` เฉพาะเมื่อมี `CRON_SECRET` เท่านั้น ถ้า production ไม่ตั้ง `CRON_SECRET` endpoint นี้จะถูกเรียกจากภายนอกได้

ผลกระทบ: ผู้ไม่หวังดีอาจเรียกงาน cleanup ซ้ำ ๆ ได้ แม้ไม่ได้เข้าถึงข้อมูลโดยตรง แต่เป็น public operational endpoint ที่ไม่ควรเปิด

คำแนะนำ:

- เพิ่ม `CRON_SECRET` เป็น required production environment
- หรือบังคับตรวจ header ของ Vercel Cron/authorization ทุกกรณีใน production
- เพิ่ม test ว่า production ที่ไม่มี `CRON_SECRET` ต้อง fail ตั้งแต่ start

### 2. `scripts/setup_db.js` ยังรวม migration กับ seed/mock data และมีคำสั่งลบข้อมูล

ไฟล์: `scripts/setup_db.js`

พบคำสั่งเสี่ยง:

- ลบ mock users ด้วย `DELETE FROM users WHERE email LIKE '%@mock.com'`
- สร้าง mock account เช่น `admin@mock.com`, `student@mock.com`
- ลบข้อมูลสนามด้วย `DELETE FROM courts`
- update ค่า fee ของสนามตัวอย่างแบบ hard-coded

ผลกระทบ: ถ้าเผลอรัน `npm run setup` กับ production database อาจลบ/เขียนทับข้อมูลสนามจริง และสร้างบัญชีตัวอย่างในระบบจริง

คำแนะนำ:

- แยกเป็น `migrate` สำหรับ schema-only และ `seed:dev` สำหรับข้อมูลตัวอย่าง
- ห้าม seed/mock account เมื่อ `NODE_ENV=production`
- เพิ่ม guard ให้สคริปต์หยุดทันทีถ้าต่อ production DB และมีคำสั่งลบข้อมูล
- ใช้ migration แบบ versioned แทน setup script เดียว

### 3. ต้องยืนยัน production environment บน Vercel ก่อนเปิดจริง

ระบบมี validator แล้ว แต่การเปิดจริงยังขึ้นกับค่าที่ตั้งบน Vercel/Supabase

ต้องมีอย่างน้อย:

- `NODE_ENV=production`
- `DATABASE_URL`
- `SESSION_SECRET`
- `ALLOWED_ORIGINS`
- `QR_DYNAMIC_SECRET`
- `QR_STATIC_SECRET`
- `CRON_SECRET`
- `ADMIN_EMAILS`
- Google/SSO credentials ที่ใช้จริง

คำแนะนำ:

- ตั้งค่าใน Vercel production environment แล้ว redeploy
- ทดสอบจาก production domain จริงว่า cookie secure, CORS, login, admin route และ QR flow ทำงานถูกต้อง
- ห้ามใช้ secret จาก local/dev ซ้ำกับ production

### 4. ระบบชำระเงินยังเป็น simulated payment

ไฟล์: `src/controllers/paymentController.js`

ระบบ `/api/payments/pay` สร้าง payment เป็น `COMPLETED` ทันทีและออก receipt ได้ แต่ยังไม่พบการเชื่อม payment gateway จริงหรือ webhook ยืนยันยอดจริง

ผลกระทบ: เหมาะกับ prototype, internal workflow หรือการเก็บเงินนอกระบบแล้วบันทึกหลักฐาน แต่ยังไม่เหมาะถ้าจะรับชำระเงินจริงออนไลน์

คำแนะนำ:

- ถ้าจะเก็บเงินจริงออนไลน์ ให้ต่อ payment provider, webhook verification, idempotency key, refund/cancel policy และ reconciliation report
- ถ้าใช้เป็นระบบออกใบรับเงินภายใน ให้เปลี่ยนข้อความ UI/เอกสารให้ชัดว่าเป็น manual/simulated confirmation ไม่ใช่ gateway payment

### 5. ยังไม่ยืนยัน SSO production ครบวงจร

ระบบมี auth และ role control ที่ test ผ่าน แต่ก่อนใช้กับนักศึกษา/บุคลากรจริง ต้องยืนยัน SSO provider จริง เช่น Google/SSONext, callback URL, domain restriction, role mapping และกรณีผู้ใช้นอกโดเมน

คำแนะนำ:

- ทดสอบ login ด้วยบัญชีนักศึกษา, บุคลากร, admin, staff, viewer และ outsider
- ตรวจว่า role escalation ทำได้เฉพาะ admin/super_admin
- ยืนยันว่า session cookie ทำงานบน production HTTPS เท่านั้น

## ความเสี่ยงระดับกลางที่ควรแก้ก่อน/หลัง soft launch

1. PostgreSQL SSL ใช้ `rejectUnauthorized: false` สำหรับ non-localhost database ควรตรวจว่า Supabase/Vercel รองรับการ verify CA ได้หรือไม่ เพื่อเพิ่มความปลอดภัย connection
2. ยังไม่มีหลักฐาน e2e browser tests ครบ flow เช่น login -> book -> pre-confirm -> QR check-in -> cancel -> admin audit
3. ไม่มีหลักฐาน backup/restore drill ของ production database
4. ยังไม่เห็น monitoring/alerting ชัดเจนสำหรับ error rate, database latency, failed login spike, cron failure
5. ควรเพิ่ม database indexes สำหรับ query production เช่น bookings ตาม date/court/status/user และ audit logs ตาม created_at/action
6. ควรเพิ่ม CSRF protection หรือ double-submit token สำหรับ mutation route ที่ใช้ session cookie โดยเฉพาะ admin actions
7. ควรทำ data retention policy สำหรับ audit logs, cookie consent, form responses และ survey responses
8. ควรเพิ่ม structured deployment checklist สำหรับ rollback และ emergency admin access

## ข้อเสนอปรับปรุงเชิงผลิตภัณฑ์

ระบบโดยรวมเหมาะกับเว็บจองสนามกีฬาแล้ว แต่ควรพิจารณาเพิ่ม/ปรับดังนี้:

1. Notification: แจ้งเตือนเมื่อจองสำเร็จ, ใกล้เวลา pre-confirm, ถูกเลื่อนจาก waitlist, ถูกยกเลิกโดย admin
2. Calendar view: มุมมองรายวัน/รายสัปดาห์สำหรับ staff เพื่อเห็น occupancy ชัดขึ้น
3. Policy page: แสดงกติกาการจอง, ยกเลิก, no-show, check-in และค่าบริการในหน้าเดียว
4. Admin capacity tools: รายงานอัตราการใช้งานสนาม, peak hours, no-show rate, waitlist conversion
5. Better payment state: แยก `PENDING`, `PAID`, `FAILED`, `REFUNDED` ให้ชัด ถ้าจะใช้เงินจริง
6. Accessibility/mobile QA: ทดสอบบนมือถือจริงและ screen reader ขั้นพื้นฐาน โดยเฉพาะ QR/GPS/check-in
7. Incident log: ให้ staff บันทึกเหตุขัดข้องสนาม อุปกรณ์เสีย ฝนตก หรือเหตุยกเลิกพิเศษ

## Go/No-Go

### พร้อม

- ขึ้น staging หรือ closed beta ได้
- demo กับผู้ใช้งานกลุ่มจำกัดได้
- ใช้ทดสอบ operational flow กับ staff ได้
- ใช้เป็น production candidate บน Vercel + PostgreSQL ได้หลังตั้ง env จริงครบ

### ยังไม่ควรเปิด public production จนกว่าจะทำ

- บังคับ `CRON_SECRET` หรือ auth ของ cron endpoint ใน production
- แยก migration ออกจาก seed/mock data และป้องกัน `setup_db` ทำลาย production data
- ตั้งค่า Vercel production env ครบและรัน smoke test บน domain จริง
- ตัดสินใจเรื่อง payment ว่าเป็น simulated/manual หรือ gateway จริง
- ยืนยัน SSO/role mapping กับบัญชีจริง
- จัด backup, monitoring และ rollback plan

## Checklist ก่อนวันเปิดใช้งานจริง

- [ ] ตั้ง Vercel env variables ครบ รวม `CRON_SECRET`
- [ ] Redeploy production และตรวจ log ว่า env validator ผ่าน
- [ ] รัน migration แบบไม่ seed/mock data
- [ ] ยืนยันว่า production database ไม่มี mock users/password ตัวอย่าง
- [ ] ทดสอบ login ด้วย user/admin/staff/viewer จริง
- [ ] ทดสอบ booking flow ครบ: book, quota, duplicate, capacity full, waitlist, pre-confirm, check-in, cancel
- [ ] ทดสอบ admin flow: manual check-in, cancel with reason, closures, timeslots, audit logs
- [ ] ทดสอบ cron cleanup พร้อม authorization
- [ ] เปิด backup schedule และทดสอบ restore อย่างน้อย 1 รอบ
- [ ] เปิด monitoring/error alerting
- [ ] ตรวจ privacy notice/cookie consent/form data policy

## ข้อสรุป

KKU SportPass มีฟังก์ชันหลักครบและสถาปัตยกรรมปัจจุบันเหมาะกับเว็บจองสนามกีฬาแล้ว แต่สถานะที่ปลอดภัยที่สุดคือ **Production Candidate / Staging Ready** ไม่ใช่ **Public Production Ready** แบบเต็มร้อย

เมื่อแก้ blocker 3 เรื่องแรกและทดสอบบน production domain จริงผ่าน ระบบจึงควรถูกยกระดับเป็น **พร้อมเปิดใช้งานจริงแบบ soft launch** ได้
