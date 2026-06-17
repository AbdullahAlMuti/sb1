-- Migration: admin RPC to queue a user order resync job
-- Direct inserts into background_jobs are blocked by RLS (no INSERT policy), so
-- the admin "Queue resync" action goes through this SECURITY DEFINER RPC, which
-- checks the admin role, enqueues the job, and writes an audit entry.

CREATE OR REPLACE FUNCTION public.queue_user_order_resync_admin(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.background_jobs (user_id, job_type, status, payload, run_after)
  VALUES (p_user_id, 'ebay_order_sync', 'queued', jsonb_build_object('source', 'admin_manual_resync'), now())
  RETURNING id INTO v_job_id;

  INSERT INTO public.admin_audit_logs (admin_id, target_user_id, action, entity_type, entity_id, reason)
  VALUES (auth.uid(), p_user_id, 'order_resync_queued', 'background_job', v_job_id::text, 'Manual resync queued by admin');

  RETURN v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_user_order_resync_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.queue_user_order_resync_admin(uuid) TO authenticated;
