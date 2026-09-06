# รายงานตรวจสอบฟังก์ชันการทำงานและความพร้อมของระบบ KKU SportPass ก่อนขึ้นเว็บใช้งานจริง (Production Readiness & Go-Live Audit Report)

**วันที่ตรวจสอบ**: 6 กันยายน 2026  
**ขอบเขตการประเมิน**: ระบบ KKU SportPass ทั้งหมด (Frontend SPA, Backend API, Database, Security, Operations)  
**ผลการประเมินภาพรวม**: **“พร้อมสำหรับการนำขึ้นเว็บจริง (Production Deployment) และเริ่มเปิดใช้งานจริง (Go-Live) ในเฟสแรกได้แล้ว”**  
โดยไม่มีข้อบกพร่องระดับวิกฤต (Zero Critical Blockers) หลงเหลืออยู่ แต่มีข้อปฏิบัติการและ Checklist ด้าน Infrastructure ที่ต้องดำเนินการก่อนเปิดให้ประชาชน/นักศึกษาใช้งานทั่วไป

---

## 1. บทสรุปสถานะความพร้อม (Executive Summary)

จากการตรวจสอบอย่างละเอียดตามเกณฑ์การใช้งานจริงของระบบบริการสาธารณะระดับมหาวิทยาลัย:
- **Core Booking Workflow**: การจอง, การยืนยันสิทธิ์ล่วงหน้า (Pre-Confirm), การเช็คอินด้วย QR Code + GPS, การยกเลิกการจอง และการเคลียร์โควตาอัตโนมัติ ทำงานได้ครบถ้วนและผ่านการทดสอบอัตโนมัติ 100%
- **Concurrency & Transaction Safety**: ปัญหาสล็อตล้นจากการกดจองพร้อมกัน (Race Conditions) ได้รับการป้องกันด้วย **Database Atomic Transaction พร้อม Row-Level Locking (`FOR UPDATE`)**
- **Session & Infrastructure**: แก้ปัญหาเซสชันหลุดบน Serverless อย่างเด็ดขาด โดยเปลี่ยนมาใช้ PostgreSQL Persistent Session (`connect-pg-simple`) พร้อมตาราง `session` ถาวร
- **Access Control & Governance**: วางระบบ RBAC 4 บทบาท (`super_admin`, `admin`, `staff`, `viewer`) และมี **Audit Log** บันทึกประวัติการทำงานของเจ้าหน้าที่ทุกการกระทำสำคัญ
- **Code Quality**: Unit Test ผ่าน **40/40 รายการ (8 Test Suites)**, Frontend Lint **0 errors, 0 warnings**, และ Vite Build สร้าง Bundle ขนาดกะทัดรัดพร้อม Code-Splitting สมบูรณ์

---

## 2. ตารางประเมินความพร้อมแยกตามมิติ (Readiness Matrix)

| มิติการตรวจสอบ | สถานะ | รายละเอียดการประเมิน |
|---|:---:|---|
| **1. ฟังก์ชันการจองและการใช้งานของผู้ใช้ (User Booking Core)** | ✅ **พร้อม** | มีการตรวจสอบวัน/เวลาย้อนหลัง, จำกัดระยะเวลาจองล่วงหน้า (`max_advance_booking_days`), จำกัดโควตาการจองพร้อมกันต่อคน (`max_active_bookings_per_user`), ระบบสร้างรหัสอ้างอิงมนุษย์อ่านง่าย (`KKU-SP-XXXXXX`) |
| **2. ความถูกต้องของช่วงเวลา (Window Enforcement)** | ✅ **พร้อม** | บังคับใช้ Pre-Confirm Window และ Check-in Window ฝั่ง Server อย่างเคร่งครัด ป้องกันการกดยืนยันหรือเช็คอินผิดรอบ |
| **3. การยกเลิกและการคืนสิทธิ์ (Cancellation & Quota Release)** | ✅ **พร้อม** | ผู้ใช้สามารถกดยกเลิกการจองได้เองผ่านหน้าเว็บ มีการตรวจสอบเวลาล่วงหน้าอย่างน้อย 30 นาที และคืนสิทธิ์ให้ผู้ใช้อื่นทันที |
| **4. ความปลอดภัยและการเข้ารหัส (Security & QR Cryptography)** | ✅ **พร้อม** | ล็อก Dynamic QR Token ด้วย HMAC-SHA256 หมดอายุภายใน 1 นาที, ปิด Raw Court ID Bypass ในโหมด Production, มี Rate Limiter 3 ระดับ ป้องกัน Brute-force |
| **5. การบริหารจัดการของเจ้าหน้าที่ (Staff Operations & RBAC)** | ✅ **พร้อม** | แดชบอร์ดประจำวัน (`/admin/bookings`) ค้นหา/กรองได้เรียลไทม์, มี Manual Override บันทึกเหตุผล, ส่งออก CSV รองรับภาษาไทยด้วย UTF-8 BOM |
| **6. การปิดสนามเพื่อซ่อมบำรุง (Court Closures)** | ✅ **พร้อม** | รองรับทั้งการปิดทั้งวัน และการปิดเฉพาะบางช่วงเวลา (Partial-Day Closure) ระบบคำนวณ Overlap ของสล็อตอย่างแม่นยำ |
| **7. การตรวจสอบย้อนหลัง (Audit Trail)** | ✅ **พร้อม** | บันทึกผู้กระทำ, บทบาท, การกระทำ, เป้าหมาย, เหตุผล, รายละเอียด JSON, IP Address ลงตาราง `audit_logs` พร้อมหน้าจอตรวจสอบ |
| **8. การเคลียร์สถานะหมดเวลาอัตโนมัติ (Automated Maintenance)** | ✅ **พร้อม** | รองรับ Lazy Evaluation ทุก Request และมี Endpoint `/api/cron/cleanup` เชื่อมต่อ Vercel Cron ทำงานทุก 5 นาที |
| **9. สถาปัตยกรรมและฐานข้อมูล (Database & Deploy Consistency)** | ✅ **พร้อม** | ฐานข้อมูล PostgreSQL (Supabase) มีครบทั้ง 14 ตาราง, สคริปต์ `npm run setup` ทำงานแบบ Idempotent สมบูรณ์ |
| **10. คุณภาพโค้ดและประสิทธิภาพ (Code Quality & Build)** | ✅ **พร้อม** | Unit Tests ผ่าน 40/40 รายการ, Oxlint 0 warnings/errors, Vite Production Build ผ่านใน 880ms |

---

## 3. สิ่งที่ต้องดำเนินการก่อนเปิดให้ใช้งานจริง (Pre-Launch Operational Checklist)

ก่อนที่จะประกาศเปิดระบบให้บุคลากรและนักศึกษาใช้งานจริง มีขั้นตอนการเตรียมการด้านการปฏิบัติการและโครงสร้างพื้นฐานดังนี้:

### 1) การตั้งค่า Environment Variables บน Production (Vercel)
ระบบมีกลไก `validateProductionEnv()` ซึ่งจะปฏิเสธการเริ่มทำงานทันทีหากพบว่าขาดคีย์สำคัญ ดังนั้นในหน้า **Vercel Dashboard > Project Settings > Environment Variables** จะต้องตั้งค่าให้ครบถ้วน:
```ini
NODE_ENV=production
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true
SESSION_SECRET=[สร้างคีย์สุ่มความยาว 32 ตัวอักษรขึ้นไป]
ALLOWED_ORIGINS=https://kku-sportpass.vercel.app,https://sportpass.kku.ac.th
QR_DYNAMIC_SECRET=[สร้างคีย์สุ่มสำหรับ Dynamic QR HMAC]
QR_STATIC_SECRET=[สร้างคีย์สุ่มสำหรับ Static QR]
ADMIN_EMAILS=admin@kku.ac.th,chinnaphat@kku.ac.th
GOOGLE_CLIENT_ID=[Client ID จาก Google Cloud Console]
GOOGLE_CLIENT_SECRET=[Client Secret จาก Google Cloud Console]
CRON_SECRET=[คีย์สุ่มสำหรับรักษาความปลอดภัยของ /api/cron/cleanup]
```

> [!TIP]
> **การใช้พอร์ต 6543 (Transaction Pooler)**:
> ในการเชื่อมต่อ Supabase จาก Vercel Serverless แนะนำให้ใช้พอร์ต `6543` พร้อมต่อท้าย `?pgbouncer=true` เพื่อให้ระบบ Connection Pooling ของ Supabase จัดการสลับ Connection อัตโนมัติ ป้องกันปัญหา Database Connection เต็มเมื่อมีคนเข้าใช้งานพร้อมกันจำนวนมาก

### 2) การอัปเดตพิกัด GPS จริงของสนาม (Ground Truth Coordinates)
- ข้อมูลพิกัดที่ Seed เบื้องต้นเป็นพิกัดใจกลางพื้นที่สนามกีฬา มข.
- เจ้าหน้าที่ควรนำโทรศัพท์มือถือไปยืนที่จุดติดตั้งป้าย QR Code ของแต่ละสนามจริง แล้วกดตรวจสอบพิกัด ละติจูด/ลองจิจูด
- เข้าไปที่หน้า **แดชบอร์ดผู้ดูแล > จัดการสนาม (`/admin/courts`)** เพื่อแก้ไขพิกัดให้ตรงกับจุดติดตั้งป้ายจริง เพื่อให้ระบบตรวจสอบรัศมี 30 เมตรทำงานได้อย่างแม่นยำ

### 3) การพิมพ์ป้าย QR Code สำหรับติดตั้งหน้าสนาม
- เข้าสู่ระบบด้วยสิทธิ์ผู้ดูแล แล้วไปที่เมนู **“สร้าง QR” (`/admin/qr`)** หรือ **“พิมพ์โปสเตอร์ QR” (`/admin/qr-print`)**
- เลือกระบบ Static Court QR หรือ Dynamic QR เพื่อพิมพ์ป้ายโปสเตอร์ขนาด A4/A3 ไปเคลือบและติดตั้งที่ทางเข้าของแต่ละสนาม

### 4) การตั้งค่า Google OAuth Authorized Redirect URI
- ใน Google Cloud Console (APIs & Services > Credentials):
  - ตรวจสอบว่าในช่อง **Authorized redirect URIs** มี URL ของ Production เช่น:  
    `https://kku-sportpass.vercel.app/api/auth/google/callback`  
    หรือโดเมนจริงของมหาวิทยาลัย

---

## 4. ข้อสังเกตและข้อเสนอแนะสำหรับการพัฒนาในอนาคต (Phase 3 Roadmap)

เมื่อระบบเปิดใช้งานจริงแล้ว มีฟังก์ชันที่แนะนำให้วางแผนพัฒนาเพิ่มเติมในระยะถัดไป (Phase 3):

1. **ระบบคิวสำรองอัตโนมัติ (Waitlist System)**:
   - เมื่อมีผู้ยกเลิกการจอง หรือขาดการเช็คอิน (Missed) ระบบควรแจ้งเตือนและเลื่อนลำดับผู้ที่ลงชื่อใน Waitlist ขึ้นมาแทนโดยอัตโนมัติ
2. **ระบบการชำระเงินและออกใบเสร็จ (Payment & E-Receipt)**:
   - สำหรับสนามที่มีค่าบำรุงรักษา (เช่น อาคารพละศึกษา/ฟิตเนส หรือสระว่ายน้ำ 50 เมตร) รองรับการชำระผ่าน PromptPay QR และออกหลักฐานยืนยัน
3. **แผนผังความหนาแน่นการใช้งาน (Utilization Heatmap & Analytics)**:
   - สรุปสถิติชั่วโมงที่มีการใช้งานหนาแน่นที่สุดของแต่ละประเภทกีฬา เพื่อให้ผู้บริหารจัดสรรเวลาและบุคลากรดูแลสนามได้อย่างมีประสิทธิภาพ
4. **ภาพถ่ายสนามจริงและข้อมูลอุปกรณ์ (Venue Photos & Facilities Info)**:
   - เพิ่มระบบอัปโหลดภาพถ่ายสถานที่จริง ระบุจำนวนคอร์ตย่อย และข้อมูลอุปกรณ์ที่มีให้บริการยืม
5. **ระบบหลายภาษา (Multilingual Support)**:
   - เพิ่มการสลับภาษาไทย / ภาษาอังกฤษ (i18n) สำหรับนักศึกษาและบุคลากรชาวต่างชาติ

---

## 5. สรุปผลการตรวจสอบ

> **สรุปขั้นเด็ดขาด**:  
> **KKU SportPass มีความสมบูรณ์ทั้งในแง่ฟังก์ชันการทำงาน ความปลอดภัยของระบบ และเสถียรภาพของสถาปัตยกรรม สามารถนำขึ้นเซิร์ฟเวอร์จริง (Vercel + PostgreSQL) และเปิดให้ทดสอบใช้งานจริงได้ทันที** โดยเพียงปฏิบัติตาม **Pre-Launch Operational Checklist** ในข้อ 3 ให้ครบถ้วน
