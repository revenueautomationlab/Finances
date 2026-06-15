-- Allow granting the 'admin' role to onboarded users (not just the hard-coded owner email),
-- and make admin-gated policies role-based (app_is_admin()) so granted admins get the powers.

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('reader', 'full', 'admin'));

-- app_users management: any admin (owner email OR role=admin) can manage the directory.
DROP POLICY IF EXISTS "admin manage app_users" ON app_users;
CREATE POLICY "admin manage app_users" ON app_users FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());

-- audit_log: any admin can read + mark reverted.
DROP POLICY IF EXISTS "admin reads audit_log" ON audit_log;
CREATE POLICY "admin reads audit_log" ON audit_log FOR SELECT TO authenticated
  USING (public.app_is_admin());
DROP POLICY IF EXISTS "admin marks audit reverted" ON audit_log;
CREATE POLICY "admin marks audit reverted" ON audit_log FOR UPDATE TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());
