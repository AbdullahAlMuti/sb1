-- Tighten service-role insert policies flagged by linter

-- coupon_usages
DROP POLICY IF EXISTS "Service role can insert coupon usages" ON public.coupon_usages;
CREATE POLICY "Service role can insert coupon usages"
ON public.coupon_usages
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- notification_logs
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.notification_logs;
CREATE POLICY "Service role can insert notification logs"
ON public.notification_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');