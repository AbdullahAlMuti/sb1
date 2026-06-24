-- Harden read permissions on public.admin_settings to protect sensitive API keys.
-- Revokes public select access and restricts SELECT to users with is_admin(auth.uid()) = true.

DROP POLICY IF EXISTS "Authenticated users can read admin_settings" ON public.admin_settings;

CREATE POLICY "Admins can select admin_settings"
  ON public.admin_settings
  FOR SELECT
  USING (
    public.is_admin(auth.uid())
  );
