-- Partners + vesting start dates.
-- Three fixed partners (Suhaib, Mohammed, Hisham), 1/3 equity each.
-- Vesting math (4-year monthly schedule, 1-year cliff at 25%) lives in the app;
-- the DB only stores each partner's vesting/joining start date.
-- Also widens partner_name checks so Hisham can receive withdrawals/dividends
-- once his start date is set (he becomes a 10% profit partner from that date).

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  partner_name TEXT NOT NULL UNIQUE CHECK (partner_name IN ('suhaib', 'mohammed', 'hisham')),
  vesting_start DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Explicit grant (required for tables created on/after Oct 30, 2026)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Role-aware RLS + audit trigger, mirroring rbac_audit.sql for the other data tables.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'partners' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.partners', p.policyname);
  END LOOP;

  CREATE POLICY "app_read" ON public.partners
    FOR SELECT TO authenticated USING (public.app_can_read());
  CREATE POLICY "app_write" ON public.partners
    FOR ALL TO authenticated USING (public.app_can_write()) WITH CHECK (public.app_can_write());

  DROP TRIGGER IF EXISTS audit_partners ON public.partners;
  CREATE TRIGGER audit_partners
    AFTER INSERT OR UPDATE OR DELETE ON public.partners
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
END $$;

-- Seed the three fixed partner rows (start dates set from the app).
INSERT INTO partners (id, partner_name) VALUES
  ('partner_suhaib', 'suhaib'),
  ('partner_mohammed', 'mohammed'),
  ('partner_hisham', 'hisham')
ON CONFLICT (partner_name) DO NOTHING;

-- Allow Hisham as a payout recipient.
ALTER TABLE partner_withdrawals DROP CONSTRAINT IF EXISTS partner_withdrawals_partner_name_check;
ALTER TABLE partner_withdrawals ADD CONSTRAINT partner_withdrawals_partner_name_check
  CHECK (partner_name IN ('suhaib', 'mohammed', 'hisham'));

ALTER TABLE partner_dividends DROP CONSTRAINT IF EXISTS partner_dividends_partner_name_check;
ALTER TABLE partner_dividends ADD CONSTRAINT partner_dividends_partner_name_check
  CHECK (partner_name IN ('suhaib', 'mohammed', 'hisham'));
