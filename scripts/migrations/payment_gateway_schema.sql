-- ============================================================================
-- KKU SportPass - Payment Gateway Integration Schema
-- Target Database: PostgreSQL 14+ / Supabase
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUM DEFINITIONS (IF NOT EXISTS)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_category_type') THEN
        CREATE TYPE user_category_type AS ENUM ('STUDENT', 'STAFF', 'EXTERNAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
        CREATE TYPE payment_method_type AS ENUM ('PROMPTPAY', 'KKU_WALLET', 'CREDIT_CARD', 'CASH_COUNTER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_type') THEN
        CREATE TYPE payment_status_type AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED');
    END IF;
END $$;

-- 2. TABLE: pricing_rules (Matrix กำหนดราคาตามผู้ใช้, ชนิดกีฬา, สนาม, และช่วงเวลา)
CREATE TABLE IF NOT EXISTS pricing_rules (
    id SERIAL PRIMARY KEY,
    court_id TEXT REFERENCES courts(id) ON DELETE CASCADE, -- NULL หมายถึงใช้กับทุกสนามในกีฬาประเภทนั้น
    sport_type VARCHAR(50) NOT NULL DEFAULT 'general',
    user_category VARCHAR(20) NOT NULL DEFAULT 'STUDENT',  -- 'STUDENT', 'STAFF', 'EXTERNAL'
    start_time TIME NOT NULL DEFAULT '06:00:00',
    end_time TIME NOT NULL DEFAULT '22:00:00',
    base_price_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    lighting_fee_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast pricing rule lookups
CREATE INDEX IF NOT EXISTS idx_pricing_matrix_lookup 
ON pricing_rules (sport_type, user_category, is_active, start_time, end_time);

-- 3. TABLE: payments (บันทึกธุรกรรมการเงิน, Dynamic QR, และ Webhook Audit Trail)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    base_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'THB',
    payment_method VARCHAR(32) NOT NULL DEFAULT 'PROMPTPAY',
    payment_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    transaction_ref VARCHAR(128) NOT NULL,
    receipt_no VARCHAR(128) NOT NULL,
    gateway_transaction_id VARCHAR(128),
    qr_payload TEXT,
    expires_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    raw_webhook_payload JSONB,
    failure_reason TEXT,
    idempotency_key VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance and idempotency indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_status ON payments (booking_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_expires_pending ON payments (status, expires_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_payments_txn_ref ON payments (transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_txn ON payments (gateway_transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency_key ON payments (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 4. SEED DATA ตัวอย่างกฎคิดราคาตาม 3 กลุ่มผู้ใช้งาน (นักศึกษา, บุคลากร, บุคคลภายนอก)
INSERT INTO pricing_rules (sport_type, user_category, start_time, end_time, base_price_per_hour, lighting_fee_per_hour)
VALUES
    -- นักศึกษา (ฟรีค่าสนาม, ค่าไฟกลางคืนฟรีหรือถูกมาก)
    ('tennis', 'STUDENT', '06:00:00', '18:00:00', 0.00, 0.00),
    ('tennis', 'STUDENT', '18:00:00', '22:00:00', 0.00, 40.00),
    ('badminton', 'STUDENT', '06:00:00', '22:00:00', 0.00, 0.00),
    ('basketball', 'STUDENT', '06:00:00', '22:00:00', 0.00, 0.00),

    -- บุคลากร (เรทสวัสดิการ)
    ('tennis', 'STAFF', '06:00:00', '18:00:00', 40.00, 0.00),
    ('tennis', 'STAFF', '18:00:00', '22:00:00', 40.00, 40.00),
    ('badminton', 'STAFF', '06:00:00', '22:00:00', 20.00, 0.00),
    ('basketball', 'STAFF', '06:00:00', '22:00:00', 30.00, 0.00),

    -- บุคคลภายนอก (เรทเต็ม)
    ('tennis', 'EXTERNAL', '06:00:00', '18:00:00', 120.00, 0.00),
    ('tennis', 'EXTERNAL', '18:00:00', '22:00:00', 120.00, 80.00),
    ('badminton', 'EXTERNAL', '06:00:00', '22:00:00', 80.00, 0.00),
    ('basketball', 'EXTERNAL', '06:00:00', '22:00:00', 100.00, 50.00)
ON CONFLICT DO NOTHING;
