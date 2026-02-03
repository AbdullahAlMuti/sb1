-- Fix audit logs security: Make them append-only (no updates/deletes even for admins)
-- Drop the existing ALL policy and create separate policies

DROP POLICY IF EXISTS "Admins can manage audit logs" ON public.audit_logs;

-- Admins can only INSERT audit logs (append-only)
CREATE POLICY "Admins can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Allow system (triggers/functions) to insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- No one can update or delete audit logs (immutable audit trail)