-- Restructure: bank holds ALL real cash (no 55% split); secret investment becomes a
-- year-end 25%-of-net-profit transfer that is physically moved out and marked as "moved".
--
-- 1. secret_investment_transfers: one row per year recording the amount set aside.
-- 2. Make recurring payment records work for GENERAL (untagged) recurring too
--    (project_id was NOT NULL) so untagged recurring can be marked received -> hits the bank.
-- 3. Per-occurrence amount on payment_schedule_payments so each paid year is frozen
--    independently (editing an upcoming amount never rewrites a previous year's).

-- ---------------------------------------------------------------------------
-- 1. Yearly secret-investment transfers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS secret_investment_transfers (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  amount NUMERIC(15, 3) NOT NULL,
  moved_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Explicit grant (harmless before Oct 30 2026, required after) — authenticated role only.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secret_investment_transfers TO authenticated;

ALTER TABLE secret_investment_transfers ENABLE ROW LEVEL SECURITY;

-- Role-aware RLS + audit trigger, mirroring rbac_audit.sql for the other 16 data tables.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'secret_investment_transfers' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.secret_investment_transfers', p.policyname);
  END LOOP;

  CREATE POLICY "app_read" ON public.secret_investment_transfers
    FOR SELECT TO authenticated USING (public.app_can_read());
  CREATE POLICY "app_write" ON public.secret_investment_transfers
    FOR ALL TO authenticated USING (public.app_can_write()) WITH CHECK (public.app_can_write());

  DROP TRIGGER IF EXISTS audit_secret_investment_transfers ON public.secret_investment_transfers;
  CREATE TRIGGER audit_secret_investment_transfers
    AFTER INSERT OR UPDATE OR DELETE ON public.secret_investment_transfers
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
END $$;

-- ---------------------------------------------------------------------------
-- 2. Allow general (untagged) recurring to have paid-period records
-- ---------------------------------------------------------------------------
ALTER TABLE recurring_revenue_payments ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE recurring_expense_payments ALTER COLUMN project_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Per-occurrence amount (tracking-only; captured at mark-paid, frozen per year)
-- ---------------------------------------------------------------------------
ALTER TABLE payment_schedule_payments ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 3);
