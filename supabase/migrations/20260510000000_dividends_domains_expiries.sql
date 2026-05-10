-- Decouple recurring revenue from project profit:
-- - Partner DIVIDENDS (separate from share-based partner_withdrawals): bank-funded payouts to suhaib/mohammed
-- - DOMAINS: track domain expiries with optional links to projects and/or recurring_revenue
-- - end_date columns on recurring_revenue / recurring_expenses for expiry countdown logic

-- ============================================
-- partner_dividends — bank-funded payouts (the "salary" mechanism)
-- ============================================
CREATE TABLE IF NOT EXISTS partner_dividends (
  id TEXT PRIMARY KEY,
  partner_name TEXT NOT NULL CHECK (partner_name IN ('suhaib', 'mohammed')),
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_dividends_partner ON partner_dividends(partner_name);
CREATE INDEX IF NOT EXISTS idx_partner_dividends_date ON partner_dividends(date);

ALTER TABLE partner_dividends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Auth manage partner_dividends" ON partner_dividends
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- domains — expiry tracking
-- ============================================
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  recurring_revenue_id TEXT REFERENCES recurring_revenue(id) ON DELETE SET NULL,
  registrar TEXT,
  auto_renew BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domains_expiry_date ON domains(expiry_date);
CREATE INDEX IF NOT EXISTS idx_domains_project_id ON domains(project_id);
CREATE INDEX IF NOT EXISTS idx_domains_recurring_revenue_id ON domains(recurring_revenue_id);

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Auth manage domains" ON domains
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- end_date on recurring items (for expiry alerts)
-- ============================================
ALTER TABLE recurring_revenue ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS end_date DATE;
