-- Tighten service-role insert policies flagged by linter

-- coupon_usages (table is created later, in 20260613100000_billing_foundation.sql;
-- guard so a from-scratch migration replay doesn't fail on the missing relation)
DO $$
BEGIN
  IF to_regclass('public.coupon_usages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert coupon usages" ON public.coupon_usages';
    EXECUTE 'CREATE POLICY "Service role can insert coupon usages" ON public.coupon_usages FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;

-- notification_logs (guarded for the same reason as coupon_usages above)
DO $$
BEGIN
  IF to_regclass('public.notification_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.notification_logs';
    EXECUTE 'CREATE POLICY "Service role can insert notification logs" ON public.notification_logs FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
  END IF;
END $$;