-- Phase 5-8: Additional Tables for eBay Admin Command Center

-- 1. admin_support_notes
CREATE TABLE IF NOT EXISTS public.admin_support_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL,
  status text DEFAULT 'open',
  created_at timestamp with time zone DEFAULT now()
);

-- RLS: Only admins can read/write
ALTER TABLE public.admin_support_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage support notes" ON public.admin_support_notes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- 2. user_feature_overrides
CREATE TABLE IF NOT EXISTS public.user_feature_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

-- RLS: Only admins can write. Users can read their own.
ALTER TABLE public.user_feature_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage feature overrides" ON public.user_feature_overrides
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view own feature overrides" ON public.user_feature_overrides
  FOR SELECT
  USING (auth.uid() = user_id);


-- 3. ebay_sync_logs
CREATE TABLE IF NOT EXISTS public.ebay_sync_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL, -- 'success', 'error'
  error_category text,  -- 'extension', 'session', 'csv', 'backend'
  payload_preview jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_ebay_sync_logs_user_id ON public.ebay_sync_logs(user_id);

-- RLS: Users can insert and read their own. Admins can read all.
ALTER TABLE public.ebay_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sync logs" ON public.ebay_sync_logs
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sync logs" ON public.ebay_sync_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- RPC: get_ebay_user_support_timeline
CREATE OR REPLACE FUNCTION public.get_ebay_user_support_timeline(target_user_id uuid)
RETURNS TABLE (
  event_type text,
  event_date timestamp with time zone,
  description text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  -- 1. Sync Logs
  SELECT 
    'sync_log'::text AS event_type,
    created_at AS event_date,
    status || CASE WHEN error_category IS NOT NULL THEN ' (' || error_category || ')' ELSE '' END || 
    CASE WHEN (metadata->>'message') IS NOT NULL THEN ': ' || (metadata->>'message') ELSE '' END AS description,
    payload_preview AS metadata
  FROM public.ebay_sync_logs
  WHERE user_id = target_user_id

  UNION ALL

  -- 2. Support Notes
  SELECT 
    'support_note'::text AS event_type,
    created_at AS event_date,
    note AS description,
    jsonb_build_object('status', status, 'admin_id', admin_id) AS metadata
  FROM public.admin_support_notes
  WHERE user_id = target_user_id

  ORDER BY event_date DESC
  LIMIT 100;
END;
$$;
