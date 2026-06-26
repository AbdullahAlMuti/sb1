-- Fix admin_settings RLS policy name mismatch.
--
-- The base migration (20251226021050) created:
--   CREATE POLICY "Users can view settings" ON public.admin_settings FOR SELECT USING (true);
--
-- The hardening migration (20260625000000) dropped:
--   DROP POLICY IF EXISTS "Authenticated users can read admin_settings" ON public.admin_settings;
--
-- Because the names differ, the original USING(true) public-read policy survived.
-- This exposes all admin_settings rows (incl. API keys, prompts, Stripe config)
-- to every authenticated user. This migration drops the surviving open policy.

DROP POLICY IF EXISTS "Users can view settings" ON public.admin_settings;

-- Ensure the admin-only SELECT policy exists (may already exist from 20260625000000,
-- but we add IF NOT EXISTS guard so this is idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'admin_settings'
      AND policyname = 'Admins can select admin_settings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can select admin_settings"
        ON public.admin_settings
        FOR SELECT
        USING (public.is_admin((select auth.uid())))
    $policy$;
  END IF;
END;
$$;
