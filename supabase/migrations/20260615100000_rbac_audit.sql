-- RBAC (reader/full/admin) + full audit logging + role-aware RLS on all data tables.
--
-- Safety: the admin email revenueautomationlab@gmail.com is hard-coded to the 'admin' role,
-- so the admin can never be locked out even if app_users is empty. The service_role key
-- (used by Cloudflare workers) bypasses RLS entirely.

-- ---------------------------------------------------------------------------
-- 1. Roles directory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'reader' CHECK (role IN ('reader', 'full')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  invited_by TEXT,
  invited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO authenticated;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Role helpers (SECURITY DEFINER so they can read app_users without recursing through RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_user_role() RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN (auth.jwt() ->> 'email') = 'revenueautomationlab@gmail.com' THEN 'admin'
    ELSE (SELECT role FROM public.app_users WHERE email = (auth.jwt() ->> 'email') AND status = 'active')
  END;
$$;

CREATE OR REPLACE FUNCTION public.app_is_admin() RETURNS BOOLEAN
  LANGUAGE sql STABLE AS $$ SELECT public.app_user_role() = 'admin'; $$;
CREATE OR REPLACE FUNCTION public.app_can_read() RETURNS BOOLEAN
  LANGUAGE sql STABLE AS $$ SELECT public.app_user_role() IN ('reader', 'full', 'admin'); $$;
CREATE OR REPLACE FUNCTION public.app_can_write() RETURNS BOOLEAN
  LANGUAGE sql STABLE AS $$ SELECT public.app_user_role() IN ('full', 'admin'); $$;

-- app_users policies: admin manages everyone; a user may read their own row (to learn their role).
DO $$ BEGIN
  CREATE POLICY "admin manage app_users" ON app_users FOR ALL TO authenticated
    USING ((auth.jwt() ->> 'email') = 'revenueautomationlab@gmail.com')
    WITH CHECK ((auth.jwt() ->> 'email') = 'revenueautomationlab@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "read own app_user row" ON app_users FOR SELECT TO authenticated
    USING (email = (auth.jwt() ->> 'email'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 3. Audit log (immutable from clients; written by a SECURITY DEFINER trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT,
  action TEXT NOT NULL,            -- INSERT | UPDATE | DELETE
  actor_email TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reverted_at TIMESTAMPTZ          -- set when this change has been reverted
);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_table_row ON audit_log(table_name, row_id);
GRANT SELECT, UPDATE ON public.audit_log TO authenticated;   -- RLS restricts to admin; UPDATE only to mark reverted_at. No client INSERT/DELETE.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "admin reads audit_log" ON audit_log FOR SELECT TO authenticated
    USING ((auth.jwt() ->> 'email') = 'revenueautomationlab@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "admin marks audit reverted" ON audit_log FOR UPDATE TO authenticated
    USING ((auth.jwt() ->> 'email') = 'revenueautomationlab@gmail.com')
    WITH CHECK ((auth.jwt() ->> 'email') = 'revenueautomationlab@gmail.com');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.audit_trigger() RETURNS TRIGGER
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor TEXT := COALESCE(auth.jwt() ->> 'email', current_user);
  v_old JSONB := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  v_new JSONB := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
  v_id TEXT := COALESCE(v_new ->> 'id', v_old ->> 'id');
BEGIN
  INSERT INTO public.audit_log(table_name, row_id, action, actor_email, old_data, new_data)
  VALUES (TG_TABLE_NAME, v_id, TG_OP, v_actor, v_old, v_new);
  RETURN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Apply role-aware RLS + audit triggers to every data table.
--    Drops ALL existing (permissive USING(true)) policies first so readers can't write.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  p RECORD;
  tables TEXT[] := ARRAY[
    'projects','payments','expenses','bank_spending','secret_investment_spending',
    'partner_withdrawals','partner_dividends','budgets','budget_spending',
    'recurring_revenue','recurring_expenses','recurring_revenue_payments',
    'recurring_expense_payments','domains','payment_schedule','payment_schedule_payments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- drop any pre-existing policies on this table
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    -- read: any active app user (reader/full/admin); write (all ops): full/admin only
    EXECUTE format('CREATE POLICY "app_read" ON public.%I FOR SELECT TO authenticated USING (public.app_can_read())', t);
    EXECUTE format('CREATE POLICY "app_write" ON public.%I FOR ALL TO authenticated USING (public.app_can_write()) WITH CHECK (public.app_can_write())', t);

    -- audit trigger (drop+recreate to be idempotent)
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger()', t, t);
  END LOOP;
END $$;
