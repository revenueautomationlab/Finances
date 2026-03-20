CREATE TABLE IF NOT EXISTS partner_withdrawals (
  id TEXT PRIMARY KEY,
  partner_name TEXT NOT NULL CHECK (partner_name IN ('suhaib', 'mohammed')),
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_withdrawals_partner ON partner_withdrawals(partner_name);
CREATE INDEX IF NOT EXISTS idx_partner_withdrawals_date ON partner_withdrawals(date);

ALTER TABLE partner_withdrawals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read partner_withdrawals"
    ON partner_withdrawals FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert partner_withdrawals"
    ON partner_withdrawals FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete partner_withdrawals"
    ON partner_withdrawals FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
