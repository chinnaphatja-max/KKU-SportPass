import urllib.request
import json
import base64
import zlib
import os
import sys

os.makedirs("docs/diagrams", exist_ok=True)

diagrams = {
    "flowchart_1_overview.png": """
flowchart TD
    subgraph Users ["1. ฝั่งผู้ใช้งานทั่วไป (User Portal)"]
        U_Start([เข้าสู่ระบบ / ลงทะเบียน]) --> U_Browse[ค้นหาสนาม & เลือกวันเวลา]
        U_Browse --> U_Book[ส่งคำขอจอง / ลงคิวรอ Waitlist]
        U_Book --> U_Pay[ชำระเงิน & แนบสลิป]
        U_Pay --> U_Ticket[รับบัตรผ่าน Dynamic QR Ticket]
        U_Ticket --> U_CheckIn[แสดง QR เช็คอินหน้าสนาม]
    end

    subgraph Staff ["2. ฝั่งเจ้าหน้าที่ & ผู้ดูแลระบบ (Staff/Admin Portal)"]
        S_Start([เข้าสู่ระบบระดับ Staff/Admin]) --> S_Dashboard[แดชบอร์ดบริหารจัดการ]
        S_Dashboard --> S_Review[ตรวจสอบการจอง & ตรวจสลิปโอนเงิน]
        S_Dashboard --> S_Scan[สแกนเนอร์ QR ตรวจเช็คอินผู้ใช้]
        S_Dashboard --> S_Manage[จัดการสนาม & ปิดปรับปรุงบำรุงรักษา]
        S_Dashboard --> S_Analytics[วิเคราะห์สถิติ Heatmap & Audit Logs]
    end

    subgraph Backend ["3. ระบบประมวลผลกลาง & คลาวด์ดาต้าเบส"]
        API_GW[Vercel Serverless API Gateway + Express.js]
        DB[(PostgreSQL on Supabase)]
        Security[Security Layer: CSRF + RateLimit + RBAC]
    end

    subgraph Automation ["4. ระบบงานเบื้องหลังอัตโนมัติ (Automated Cron Engine)"]
        Cron_Trigger([Vercel Cron Trigger ทุก 10 นาที]) --> Cron_Auth{ตรวจสอบ Bearer CRON_SECRET}
        Cron_Auth -- ผ่าน --> Cron_Clean[ยกเลิกการจองที่ค้างชำระเกินกำหนด Timeout]
        Cron_Clean --> Cron_Promote[เลื่อนคิวผู้ใช้ใน Waitlist มารับสิทธิ์แทนที่]
    end

    Users <--> Security
    Staff <--> Security
    Security <--> API_GW
    API_GW <--> DB
    Automation <--> API_GW
""",

    "flowchart_2_security.png": """
flowchart TD
    Req([HTTP Request เข้าสู่ระบบ]) --> Step1[1. Structured Logger & Request ID Tracking]
    Step1 --> Step2{2. CORS Policy: Origin ถูกต้องหรือไม่?}
    
    Step2 -- ไม่ถูกต้อง --> ErrCORS[403 Forbidden: CORS Disallowed Origin]
    Step2 -- ถูกต้อง --> Step3{3. Rate Limiter: ความถี่เกินโควตาหรือไม่?}
    
    Step3 -- เกินกำหนด DoS/Brute-force --> ErrRate[429 Too Many Requests: Rate limit exceeded]
    Step3 -- ปกติ --> Step4{4. ประเภทของ HTTP Method?}
    
    Step4 -- GET / HEAD / OPTIONS --> Step6[6. Session & Authentication Guard]
    Step4 -- POST / PUT / DELETE --> Step5{5. ตรวจสอบ Double-Submit CSRF Token}
    
    Step5 -- เส้นทางยกเว้น Login/Register/Survey/Cron --> Step6
    Step5 -- Token หาย หรือไม่ตรงกัน --> ErrCSRF[403 Forbidden: CSRF token missing or invalid]
    Step5 -- Token ถูกต้อง --> Step6
    
    Step6 --> Step7{7. เส้นทางนี้ต้องการ Login หรือไม่?}
    Step7 -- Public Route --> ExecuteController[ส่งต่อให้ Controller ประมวลผล]
    Step7 -- Private Route --> Step8{มีเซสชันผู้ใช้หรือไม่? req.user}
    
    Step8 -- ไม่ได้ Login --> Err401[401 Unauthorized: Authentication required]
    Step8 -- ล็อกอินแล้ว --> Step9{9. ตรวจสอบระดับสิทธิ์ RBAC}
    
    Step9 -- สิทธิ์ไม่ถึง เช่น User เข้าหน้า Admin --> Err403[403 Forbidden: Insufficient role privileges]
    Step9 -- สิทธิ์ถูกต้อง Super Admin / Admin / Staff --> ExecuteController
    
    ExecuteController --> ResSuccess([ประมวลผลสำเร็จ ส่งผลลัพธ์ JSON Response])
""",

    "flowchart_3_booking.png": """
flowchart TD
    StartBooking([ผู้ใช้เลือกสนาม วันที่ และสล็อตเวลา]) --> StepV1{1. วันที่เลือกเป็นอดีตหรือไม่? หรือเกิน 7 วันล่วงหน้า?}
    StepV1 -- ใช่ วันที่ไม่ถูกต้อง --> ErrDate[400 Bad Request: Invalid booking date window]
    StepV1 -- ไม่ใช่ วันที่ถูกต้อง --> StepV2{2. โควตาการจองค้างของผู้ใช้เกิน 3 รายการหรือไม่?}
    
    StepV2 -- เกินโควตาสูงสุด --> ErrQuota[400 Bad Request: Active booking quota exceeded]
    StepV2 -- อยู่ในโควตา --> StepV3{3. สนามมีประกาศปิดปรับปรุงหรือไม่? Court Closure}
    
    StepV3 -- ปิดทั้งวัน / ปิดตรงช่วงเวลานี้ --> ErrClosed[400 Bad Request: Court is under scheduled maintenance]
    StepV3 -- สนามเปิดให้บริการปกติ --> BeginTx[4. เริ่มต้น Database Transaction แบบ Serializable]
    
    BeginTx --> LockCheck[5. ตรวจสอบการชนกันของเวลา พร้อมทำ Row-Level Lock]
    LockCheck --> OverlapQuery{ตรวจพบการจองที่ทับซ้อนหรือไม่? start < new_end AND end > new_start}
    
    OverlapQuery -- พบการจองซ้อน ชนกับผู้อื่น --> RollbackTx[Rollback Transaction]
    RollbackTx --> PromptWaitlist{6. สล็อตไม่ว่าง: ผู้ใช้ต้องการลงชื่อใน Waitlist หรือไม่?}
    PromptWaitlist -- ไม่ต้องการ --> CancelAction([สิ้นสุดการทำรายการ])
    PromptWaitlist -- ต้องการ --> AddWaitlist[บันทึกลงตาราง waitlists ลำดับคิวแบบ FIFO]
    AddWaitlist --> ResWaitlist([ตอบกลับ: บันทึกคิวรอสำเร็จ รอรับการแจ้งเตือน])
    
    OverlapQuery -- ไม่พบการจองซ้อน สล็อตว่างแน่นอน --> GenRef[7. สร้างรหัสอ้างอิงการจอง KKU-SP-XXXXXX]
    GenRef --> InsertBooking[8. บันทึกแถวข้อมูลลงตาราง bookings สถานะ: pending]
    InsertBooking --> PriceCalc{9. สนามนี้มีอัตราค่าบริการหรือไม่?}
    
    PriceCalc -- ฟรี / อัตรา 0 บาท --> SetStatusPending[กำหนดสถานะ: pending_approval หรือ auto_confirmed]
    PriceCalc -- มีค่าบริการ > 0 บาท --> CreatePaymentRow[สร้างรายการในตาราง payments สถานะ: pending]
    
    SetStatusPending --> CommitTx[10. Commit Transaction บันทึกข้อมูลถาวร]
    CreatePaymentRow --> CommitTx
    CommitTx --> ResSuccess([201 Created: จองสำเร็จ ส่งข้อมูลกลับไปยังหน้าจอผู้ใช้])
""",

    "flowchart_4_payment.png": """
flowchart TD
    StartPay([การจองสถานะ pending เริ่มต้นนับเวลาถอยหลัง 15 นาที]) --> ShowQR[ระบบแสดง QR บัญชีรับเงินจำลอง & เลขที่อ้างอิง PAY-SP-timestamp-hex]
    ShowQR --> UserAction{ผู้ใช้ดำเนินการอย่างไร?}
    
    UserAction -- ปล่อยเวลาผ่านเลย 15 นาที --> CronTimeout[Cron ตรวจพบการหมดเวลา Timeout]
    CronTimeout --> CancelAuto[ปรับสถานะการจองเป็น cancelled และปลดคืนสล็อต]
    
    UserAction -- อัปโหลดรูปภาพสลิปการโอนเงิน --> UploadCheck{ตรวจสอบไฟล์สลิป}
    UploadCheck -- ไฟล์ไม่ใช่รูปภาพ หรือขนาดเกิน 5MB --> ErrUpload[แจ้งเตือน: ไฟล์ไม่ถูกต้อง กรุณาอัปโหลดใหม่]
    ErrUpload --> UserAction
    
    UploadCheck -- ไฟล์ถูกต้อง --> SaveSlip[บันทึกรูปสลิป & ปรับสถานะ payment เป็น: pending_verification]
    SaveSlip --> NotifyStaff[ระบบแจ้งเตือนไปยังคิวรอตรวจของเจ้าหน้าที่ Staff Dashboard]
    
    NotifyStaff --> StaffAction{เจ้าหน้าที่ตรวจสอบสลิปและยอดเงิน}
    StaffAction -- สลิปปลอม / ยอดไม่ตรง / ไม่ชัดเจน --> RejectStaff[เจ้าหน้าที่กด 'ปฏิเสธ' พร้อมระบุเหตุผล]
    RejectStaff --> UpdateReject[ปรับ payment: rejected, booking: cancelled]
    UpdateReject --> WriteAudit1[บันทึกลง audit_logs และแจ้งเตือนผู้ใช้]
    
    StaffAction -- ข้อมูลถูกต้อง ครบถ้วนตามจริง --> ApproveStaff[เจ้าหน้าที่กด 'อนุมัติ']
    ApproveStaff --> UpdateApprove[ปรับ payment: verified, booking: confirmed]
    UpdateApprove --> GenReceipt[ออกเลขใบเสร็จอิเล็กทรอนิกส์ REC-YYYY-XXXXXX]
    GenReceipt --> TriggerTicket[สั่งสร้างตั๋ว Dynamic QR Ticket อัตโนมัติ]
    TriggerTicket --> WriteAudit2[บันทึกลง audit_logs และส่งการยืนยันถึงผู้ใช้]
    WriteAudit2 --> EndPay([เสร็จสิ้นขั้นตอนการชำระเงินและการอนุมัติ])
""",

    "flowchart_5_qr.png": """
flowchart TD
    subgraph ClientUser ["ฝั่งผู้ใช้งาน (Mobile Web Ticket)"]
        OpenTicket([ผู้ใช้เปิดหน้าบัตรผ่านอิเล็กทรอนิกส์]) --> GetTimestamp[อ่านเวลาปัจจุบันเป็นระดับนาที T_minute]
        GetTimestamp --> RequestQR[ขอ Dynamic QR Payload จาก API /api/qr/generate]
        RequestQR --> ServerSign[เซิร์ฟเวอร์นำ Booking_ID + T_minute มาเข้ารหัสด้วย HMAC-SHA256 โดยใช้ QR_SIGN_SECRET]
        ServerSign --> ReturnQR[ส่ง Payload + Signature + ตัวนับเวลาถอยหลัง 60 วินาที]
        ReturnQR --> RenderQR[แสดงผลเป็นภาพ QR Code บนหน้าจอโทรศัพท์]
        RenderQR --> AutoRefresh{ครบ 60 วินาทีหรือไม่?}
        AutoRefresh -- ใช่ ครบเวลา --> OpenTicket
    end

    subgraph ClientStaff ["ฝั่งเจ้าหน้าที่สนาม (On-Site Staff Scanner)"]
        ScanAction([เจ้าหน้าที่เปิดกล้องสแกน QR Code หน้าสนาม]) --> ReadPayload[อ่านค่าข้อมูล Payload จาก QR Code]
        ReadPayload --> SendVerify[ส่งข้อมูลไปยัง POST /api/qr/verify]
    end

    subgraph VerificationServer ["เซิร์ฟเวอร์ตรวจสอบความถูกต้อง (Backend Verification Engine)"]
        SendVerify --> StepH1{1. คำนวณ HMAC Signature ซ้ำ ตรงกันหรือไม่?}
        StepH1 -- ไม่ตรง ข้อมูลถูกดัดแปลง --> DenyTamper[400 Bad Request: Tampered or invalid QR signature]
        
        StepH1 -- ลายเซ็นถูกต้อง --> StepH2{2. เวลาของ QR เกิน 1 นาทีหรือไม่?}
        StepH2 -- เกินเวลา QR หมดอายุ --> DenyExpired[400 Bad Request: Dynamic QR expired, please refresh]
        
        StepH2 -- อยู่ในเวลา --> StepH3{3. ตรวจสอบสถานะการจองในฐานข้อมูล}
        StepH3 -- สถานะไม่ใช่ confirmed ยกเลิกหรือเสร็จสิ้นไปแล้ว --> DenyStatus[400 Bad Request: Booking is not in confirmed state]
        
        StepH3 -- สถานะ confirmed --> StepH4{4. ตรวจสอบหน้าต่างเวลาเช็คอิน Check-In Window}
        StepH4 -- มาก่อนเวลาเกิน 15 นาที หรือ มาสายเกิน Grace Period 15 นาที --> DenyWindow[400 Bad Request: Outside permitted check-in window]
        
        StepH4 -- อยู่ในช่วงเวลาที่ถูกต้อง --> AllowCheckIn[5. อนุมัติการเข้าสนาม ปรับสถานะเป็น: checked_in]
        AllowCheckIn --> RecordCheckInTime[บันทึกเวลา check_in_time ลงฐานข้อมูล]
        RecordCheckInTime --> LogAudit[บันทึกเข้า Audit Log: QR Check-in Success]
        LogAudit --> ResSuccessCheckIn([200 OK: ยืนยันสำเร็จ แสดงไฟเขียวอนุญาตให้เข้าสนาม])
    end
""",

    "flowchart_6_cron.png": """
flowchart TD
    CronStart([Vercel Scheduled Cron Trigger ทำงานทุก 10 นาที]) --> CheckEnv{ตรวจสอบ Node Environment?}
    
    CheckEnv -- โหมด Development / Test --> BypassSecret[ข้ามการตรวจสอบ Secret เพื่อความสะดวกในการทดสอบ]
    CheckEnv -- โหมด Production --> VerifyHeader{มี Header Authorization: Bearer CRON_SECRET หรือไม่?}
    
    VerifyHeader -- ไม่มี หรือ Secret ไม่ตรง --> RejectCron[401 / 503 Unauthorized: Invalid or missing CRON_SECRET]
    VerifyHeader -- Secret ถูกต้องแม่นยำ --> AuthCronPass[ยืนยันสิทธิ์สำเร็จ เริ่มต้นกระบวนการล้างข้อมูล]
    
    BypassSecret --> AuthCronPass
    AuthCronPass --> QueryExpired[1. ค้นหารายการจองสถานะ pending ที่สร้างขึ้นเกิน 15 นาที]
    
    QueryExpired --> LoopExpired{พบรายการค้างชำระหรือไม่?}
    LoopExpired -- ไม่พบรายการค้างชำระ --> LogClean[บันทึก Log: ไม่มีรายการค้างชำระ]
    
    LoopExpired -- พบรายการค้างชำระ N รายการ --> ForEachBooking[วนลูปประมวลผลทีละรายการ]
    ForEachBooking --> CancelItem[2. ปรับสถานะการจองเป็น: cancelled ด้วยเหตุผล Payment Timeout]
    CancelItem --> LogAuditCancel[บันทึกเข้า audit_logs: System auto-cancelled expired booking]
    
    CancelItem --> FindWaitlist[3. ค้นหาคิวรอในตาราง waitlists ของ court_id, booking_date, start_time นี้]
    FindWaitlist --> HasWaitlist{มีผู้ใช้ลงชื่อรอคิวหรือไม่?}
    
    HasWaitlist -- ไม่มีผู้ใช้รอ --> FreeSlot[ปลดสล็อตเวลานั้นกลับมาเป็นสถานะว่าง Available 100%]
    
    HasWaitlist -- มีผู้ใช้รอคิว --> PickOldest[4. คัดเลือกผู้ใช้ลำดับแรกตามเวลาลงชื่อ FIFO: ORDER BY created_at ASC LIMIT 1]
    PickOldest --> AutoPromote[5. เลื่อนสิทธิ์ผู้ใช้เป็น pending reservation สร้างรายการจองใหม่ให้ทันที]
    AutoPromote --> UpdateWaitlistStatus[ปรับสถานะคิวใน waitlists เป็น: promoted]
    UpdateWaitlistStatus --> SendPromotionAlert[6. ส่งข้อความแจ้งเตือนถึงผู้ใช้: ท่านได้รับสิทธิ์จองแล้ว กรุณาชำระเงินใน 15 นาที]
    
    FreeSlot --> CheckNextBooking{ยังมีรายการอื่นในลูปหรือไม่?}
    SendPromotionAlert --> CheckNextBooking
    
    CheckNextBooking -- มีรายการถัดไป --> ForEachBooking
    CheckNextBooking -- ครบทุกรายการแล้ว --> FinishCron([200 OK: การประมวลผลงานเบื้องหลังสำเร็จสมบูรณ์])
"""
}

for name, code in diagrams.items():
    print(f"Downloading {name}...")
    j = json.dumps({"code": code.strip(), "mermaid": {"theme": "default"}})
    compressor = zlib.compressobj(9, zlib.DEFLATED, 15, 8, zlib.Z_DEFAULT_STRATEGY)
    deflated = compressor.compress(j.encode("utf-8")) + compressor.flush()
    pako_b64 = base64.urlsafe_b64encode(deflated).decode("ascii")
    url = f"https://mermaid.ink/img/pako:{pako_b64}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            filepath = os.path.join("docs/diagrams", name)
            with open(filepath, "wb") as f:
                f.write(data)
            print(f"  [OK] {name} saved ({len(data)} bytes)")
    except Exception as e:
        print(f"  [FAIL] {name}: {e}")

print("All diagrams downloaded successfully!")
