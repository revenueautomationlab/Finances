-- Payment Tracking (todo-style scheduling) — incoming + outgoing obligations.
-- IMPORTANT: This is a tracking / reminder layer ONLY. It deliberately does NOT
-- feed into the bank pool, profit split, margins, or any money computation.
-- Recurring revenue/expenses (which DO affect money) live in their own tables.
--
-- An item recurs from start_date by `frequency`. Each due occurrence can be marked
-- paid via payment_schedule_payments. It keeps generating upcoming occurrences until
-- end_date (if set) or until the item is closed manually (active = false).

CREATE TABLE IF NOT EXISTS payment_schedule (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  category TEXT NOT NULL DEFAULT 'other',          -- domain | cr | vps | apple | android | hosting | amc | other
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'yearly' CHECK (frequency IN ('monthly', 'yearly', 'one_time')),
  start_date DATE NOT NULL,                         -- first due date (the anchor)
  end_date DATE,                                    -- optional; recurs until here. NULL = until manually closed
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,             -- false = closed/ended (stops generating dues + reminders)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_schedule_project ON payment_schedule(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_start ON payment_schedule(start_date);

-- One row per due occurrence that has been marked paid (the "todo done" record).
CREATE TABLE IF NOT EXISTS payment_schedule_payments (
  id TEXT PRIMARY KEY,
  payment_schedule_id TEXT NOT NULL REFERENCES payment_schedule(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,                        -- the due occurrence date this payment clears
  paid_date DATE,                                   -- when it was actually marked paid
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (payment_schedule_id, period_date)
);

CREATE INDEX IF NOT EXISTS idx_psp_schedule ON payment_schedule_payments(payment_schedule_id);
CREATE INDEX IF NOT EXISTS idx_psp_period ON payment_schedule_payments(period_date);

-- Explicit grants (future-proof against the Oct 30, 2026 Data API change). App uses the
-- authenticated role only; the reminder worker uses the service_role key (bypasses RLS/grants).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_schedule TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_schedule_payments TO authenticated;

ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedule_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Auth manage payment_schedule" ON payment_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Auth manage payment_schedule_payments" ON payment_schedule_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Sample obligations (placeholder amounts/dates — edit in the Payments tab).
-- Idempotent: ON CONFLICT (id) DO NOTHING so a re-run never duplicates.
-- ---------------------------------------------------------------------------
INSERT INTO payment_schedule (id, direction, category, name, amount, frequency, start_date, end_date, project_id, active, notes) VALUES
  ('seed_ps_cr',      'outgoing', 'cr',      'Commercial Registration (CR) Renewal', 50.000,  'yearly',   '2025-09-10', NULL, NULL, true, 'Sabah / MOIC commercial registration'),
  ('seed_ps_vps',     'outgoing', 'vps',     'VPS Hosting',                          8.000,   'monthly',  '2026-05-16', NULL, NULL, true, 'Production VPS'),
  ('seed_ps_apple',   'outgoing', 'apple',   'Apple Developer Program',              37.700,  'yearly',   '2025-11-20', NULL, NULL, true, 'USD 99 / yr'),
  ('seed_ps_android', 'outgoing', 'android', 'Google Play Developer Account',        9.400,   'one_time', '2026-02-01', NULL, NULL, true, 'USD 25 one-time'),
  ('seed_ps_amc2',    'incoming', 'amc',     'AMC — Annual Maintenance (Client B)',  200.000, 'yearly',   '2026-06-20', NULL, NULL, true, 'Annual maintenance contract')
ON CONFLICT (id) DO NOTHING;

-- AMC linked to the oldest existing project (demonstrates project linking). project_id is NULL if no projects exist yet.
INSERT INTO payment_schedule (id, direction, category, name, amount, frequency, start_date, end_date, project_id, active, notes)
SELECT 'seed_ps_amc1', 'incoming', 'amc', 'AMC — Annual Maintenance (Client A)', 150.000, 'yearly', '2026-07-01', NULL,
       (SELECT id FROM projects ORDER BY created_at NULLS LAST LIMIT 1), true, 'Annual maintenance contract'
ON CONFLICT (id) DO NOTHING;

-- Mark already-settled occurrences paid so each item's "next due" lands in the future
-- (current annual cycles for CR + Apple, the latest VPS month, the one-time Android fee).
INSERT INTO payment_schedule_payments (id, payment_schedule_id, period_date, paid_date, note) VALUES
  ('seed_psp_vps_may', 'seed_ps_vps',     '2026-05-16', '2026-05-16', NULL),
  ('seed_psp_android', 'seed_ps_android', '2026-02-01', '2026-02-01', NULL),
  ('seed_psp_cr',      'seed_ps_cr',      '2025-09-10', '2025-09-10', NULL),
  ('seed_psp_apple',   'seed_ps_apple',   '2025-11-20', '2025-11-20', NULL)
ON CONFLICT (id) DO NOTHING;

-- A sample domain in the domains table (shown under the Domains category of the Payments tab).
INSERT INTO domains (id, name, expiry_date, registrar, auto_renew, notes)
SELECT 'seed_dom_raltech', 'raltech.dev', '2027-03-15', 'Cloudflare', true, 'Primary domain'
WHERE NOT EXISTS (SELECT 1 FROM domains WHERE lower(name) = 'raltech.dev');
