-- Phase 2: daily logical snapshots + OTP gate for destructive restore.
-- The worker (service_role) writes snapshots and manages OTPs; clients only READ snapshot metadata.

CREATE TABLE IF NOT EXISTS db_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,                 -- 'cron' | admin email
  row_counts JSONB,                -- { table: count } summary (shown in UI)
  data JSONB                       -- full snapshot of all data tables
);
CREATE INDEX IF NOT EXISTS idx_db_snapshots_created ON db_snapshots(created_at DESC);
GRANT SELECT ON public.db_snapshots TO authenticated;   -- admins read metadata; worker writes via service_role
ALTER TABLE db_snapshots ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "admin reads snapshots" ON db_snapshots FOR SELECT TO authenticated USING (public.app_is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- OTP codes for gating restore. Managed exclusively by the worker (service_role); no client access.
CREATE TABLE IF NOT EXISTS admin_otp (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE admin_otp ENABLE ROW LEVEL SECURITY;  -- no policies → authenticated/anon cannot touch it; service_role bypasses

-- Restore the 16 business-data tables from a snapshot. Owner-run (postgres) so it can disable
-- FK checks + triggers during the atomic swap. Only the worker (service_role) may call it.
-- Never touches app_users / audit_log / db_snapshots / admin_otp (so it can't lock anyone out
-- or wipe history). Callers should take a fresh safety snapshot first.
CREATE OR REPLACE FUNCTION public.restore_snapshot(p_snapshot_id BIGINT) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  snap JSONB;
  t TEXT;
  tables TEXT[] := ARRAY[
    'payment_schedule_payments','recurring_revenue_payments','recurring_expense_payments',
    'budget_spending','payments','expenses','domains',
    'payment_schedule','recurring_revenue','recurring_expenses',
    'bank_spending','secret_investment_spending','partner_withdrawals','partner_dividends',
    'budgets','projects'
  ];
BEGIN
  SELECT data INTO snap FROM db_snapshots WHERE id = p_snapshot_id;
  IF snap IS NULL THEN RAISE EXCEPTION 'snapshot % not found', p_snapshot_id; END IF;

  SET session_replication_role = replica;   -- disable FK checks + triggers during swap
  -- delete children→parents
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DELETE FROM public.%I', t);
  END LOOP;
  -- insert parents→children (reverse order)
  FOR i IN REVERSE array_length(tables, 1)..1 LOOP
    t := tables[i];
    EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1->%L)', t, t, t) USING snap;
  END LOOP;
  SET session_replication_role = DEFAULT;
END $$;

REVOKE EXECUTE ON FUNCTION public.restore_snapshot(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_snapshot(BIGINT) TO service_role;
