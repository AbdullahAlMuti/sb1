-- SS-A1-001: scope admin_settings SELECT.
--
-- Previously: policy "Authenticated users can read admin_settings" USING
-- (auth.uid() IS NOT NULL) — every signed-in user could read every row. Benign
-- today (flags only), but a leak the moment any secret lands in value.
--
-- The only non-admin client reader is the dashboard's EbaySyncSettings, which
-- reads the three global ebay_sync_* keys. (Its WRITES are already admin-gated by
-- the existing INSERT/UPDATE policies — unchanged here.) Edge functions read other
-- keys via service_role, which bypasses RLS. So: admins read everything; everyone
-- else reads only the explicit ebay_sync_* allowlist.

DROP POLICY IF EXISTS "Authenticated users can read admin_settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Users can view settings" ON public.admin_settings;

CREATE POLICY "Read admin_settings: admins all, users allowlist"
  ON public.admin_settings
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR key IN ('ebay_sync_enabled', 'ebay_sync_days', 'ebay_sync_interval')
  );
