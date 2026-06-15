-- Stores Resend's used-quota counters (only exposed on send responses) so the admin page
-- can show remaining daily/monthly email allowance. Worker writes via service_role.
CREATE TABLE IF NOT EXISTS email_quota (
  id INT PRIMARY KEY,
  daily_used INT,
  monthly_used INT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.email_quota TO authenticated;
ALTER TABLE email_quota ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "admin reads email_quota" ON email_quota FOR SELECT TO authenticated USING (public.app_is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
