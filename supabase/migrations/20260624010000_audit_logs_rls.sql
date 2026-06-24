-- Enable RLS on audit_logs and restrict reads to admin roles.
-- The table was created without RLS which allowed any authenticated user
-- to read all entries (action history, IPs, user agents across all users).
--
-- Safe to apply on live DB: no data changes, no column alterations.

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins and super-admins can read all audit log entries.
CREATE POLICY "audit_logs_admin_select"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- The service role (used by Edge Functions) bypasses RLS by default,
-- so existing INSERT operations from admin functions are unaffected.
