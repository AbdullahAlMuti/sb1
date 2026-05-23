-- Phase 10: Advanced Admin Support Actions

-- 1. Schema Additions for Sync State
-- We add a dedicated table to track user-level sync preferences and state.
CREATE TABLE IF NOT EXISTS public.user_ebay_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_sync_enabled boolean DEFAULT true,
  sync_frequency text DEFAULT 'daily',
  last_sync_requested_at timestamp with time zone,
  sync_state text DEFAULT 'idle', -- 'idle', 'syncing', 'error', 'reset_requested'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_ebay_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own ebay settings" ON public.user_ebay_settings
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all ebay settings" ON public.user_ebay_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Also add a resolved flag to ebay_sync_logs if not exists
ALTER TABLE public.ebay_sync_logs ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;
ALTER TABLE public.ebay_sync_logs ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id);


-- 2. Clear Sync Error
CREATE OR REPLACE FUNCTION public.clear_user_sync_error(p_user_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason required';
  END IF;

  WITH updated AS (
    UPDATE public.ebay_sync_logs
    SET resolved_at = now(), resolved_by = auth.uid()
    WHERE user_id = p_user_id AND status = 'error' AND resolved_at IS NULL
    RETURNING id
  )
  SELECT count(*) INTO updated_count FROM updated;

  -- Also reset state if stuck in error
  UPDATE public.user_ebay_settings 
  SET sync_state = 'idle', updated_at = now()
  WHERE user_id = p_user_id AND sync_state = 'error';

  PERFORM public.log_admin_action(p_user_id, 'clear_sync_error', 'ebay_sync', NULL, NULL, updated_count::text || ' errors cleared', p_reason, '{}'::jsonb);
  
  RETURN jsonb_build_object('cleared_count', updated_count, 'success', true);
END;
$$;


-- 3. Reset Sync State
CREATE OR REPLACE FUNCTION public.reset_user_sync_state(p_user_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason required';
  END IF;

  -- Upsert settings to reset state
  INSERT INTO public.user_ebay_settings (user_id, sync_state, updated_at)
  VALUES (p_user_id, 'idle', now())
  ON CONFLICT (user_id) DO UPDATE SET sync_state = 'idle', updated_at = now();

  PERFORM public.log_admin_action(p_user_id, 'reset_sync_state', 'ebay_sync', NULL, 'unknown', 'idle', p_reason, '{}'::jsonb);
  
  RETURN jsonb_build_object('success', true);
END;
$$;


-- 4. Add Admin Support Note / Mark Issue Status
CREATE OR REPLACE FUNCTION public.add_admin_support_note(p_user_id uuid, p_note text, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_note IS NULL OR trim(p_note) = '' THEN
    RAISE EXCEPTION 'Note required';
  END IF;

  INSERT INTO public.admin_support_notes (user_id, admin_id, note, status)
  VALUES (p_user_id, auth.uid(), p_note, p_status)
  RETURNING id INTO new_id;

  PERFORM public.log_admin_action(p_user_id, 'add_support_note', 'support_note', new_id::text, NULL, p_status, p_note, '{}'::jsonb);
  
  RETURN jsonb_build_object('success', true, 'note_id', new_id);
END;
$$;


-- 5. Request Manual Resync
CREATE OR REPLACE FUNCTION public.request_user_manual_resync(p_user_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason required';
  END IF;

  -- Mark state as reset requested
  INSERT INTO public.user_ebay_settings (user_id, sync_state, last_sync_requested_at, updated_at)
  VALUES (p_user_id, 'reset_requested', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET sync_state = 'reset_requested', last_sync_requested_at = now(), updated_at = now();

  PERFORM public.log_admin_action(p_user_id, 'request_manual_resync', 'ebay_sync', NULL, NULL, 'reset_requested', p_reason, '{}'::jsonb);
  
  RETURN jsonb_build_object('success', true);
END;
$$;


-- 6. Update Sync Settings
CREATE OR REPLACE FUNCTION public.update_user_ebay_sync_settings(p_user_id uuid, p_is_enabled boolean, p_frequency text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason required';
  END IF;

  INSERT INTO public.user_ebay_settings (user_id, is_sync_enabled, sync_frequency, updated_at)
  VALUES (p_user_id, p_is_enabled, p_frequency, now())
  ON CONFLICT (user_id) DO UPDATE SET is_sync_enabled = EXCLUDED.is_sync_enabled, sync_frequency = EXCLUDED.sync_frequency, updated_at = now();

  PERFORM public.log_admin_action(p_user_id, 'update_sync_settings', 'ebay_sync', NULL, NULL, p_is_enabled::text, p_reason, jsonb_build_object('frequency', p_frequency));
  
  RETURN jsonb_build_object('success', true);
END;
$$;
