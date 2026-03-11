-- ============================================
-- Mizra Orders Table — PayPlus Integration
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Customer info (required)
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  city TEXT NOT NULL,

  -- Optional customer fields
  current_website TEXT,
  instagram TEXT,
  facebook TEXT,
  description TEXT,
  website_lang TEXT DEFAULT 'he',

  -- Plan & pricing
  plan TEXT NOT NULL CHECK (plan IN ('landing_page', 'custom')),
  amount_ht INTEGER NOT NULL,
  vat_rate NUMERIC(5,2) DEFAULT 18.00,
  vat_amount INTEGER NOT NULL,
  amount_ttc INTEGER NOT NULL,
  installments INTEGER DEFAULT 1,

  -- Payment
  payment_method TEXT CHECK (payment_method IN ('payplus_1x', 'payplus_2x', 'payplus_3x')),
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'pending_review')),
  payplus_payment_id TEXT,
  payplus_page_url TEXT,
  payplus_transaction_uid TEXT,

  -- Custom project
  custom_description TEXT,

  -- Invoice
  invoice_requested BOOLEAN DEFAULT false,
  invoice_data JSONB,

  -- Internal tracking
  onboarding_status TEXT DEFAULT 'not_started'
    CHECK (onboarding_status IN ('not_started', 'in_progress', 'delivered', 'approved', 'completed')),
  notes TEXT
);

-- Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Anon users can only insert (form submissions)
CREATE POLICY "anon_insert_orders" ON orders
  FOR INSERT TO anon
  WITH CHECK (true);

-- Service role has full access (Netlify Functions)
CREATE POLICY "service_full_access" ON orders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_payplus_uid ON orders(payplus_transaction_uid);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_plan ON orders(plan);

-- Monitoring view
CREATE OR REPLACE VIEW order_stats AS
SELECT
  COUNT(*) AS total_orders,
  COUNT(*) FILTER (WHERE payment_status = 'paid') AS paid,
  COUNT(*) FILTER (WHERE payment_status = 'processing') AS processing,
  COUNT(*) FILTER (WHERE payment_status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE payment_status = 'pending_review') AS pending_review,
  COUNT(*) FILTER (WHERE plan = 'landing_page') AS landing_page_orders,
  COUNT(*) FILTER (WHERE plan = 'custom') AS custom_orders,
  COUNT(*) FILTER (WHERE invoice_requested = true) AS invoices_requested,
  SUM(amount_ttc) FILTER (WHERE payment_status = 'paid') AS total_revenue_ttc,
  SUM(vat_amount) FILTER (WHERE payment_status = 'paid') AS total_vat_collected
FROM orders;
