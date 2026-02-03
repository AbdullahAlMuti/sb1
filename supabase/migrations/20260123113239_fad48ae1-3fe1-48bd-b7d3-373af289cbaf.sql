-- Fix overly permissive audit log insert policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Admins can insert audit logs'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can insert audit logs" ON public.audit_logs';
  END IF;

  EXECUTE $p$
    CREATE POLICY "Admins can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role))
  $p$;
END $$;
