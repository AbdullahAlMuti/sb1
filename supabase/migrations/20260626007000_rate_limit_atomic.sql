-- Atomic rate-limit check using INSERT … ON CONFLICT … DO UPDATE.
--
-- The previous TypeScript implementation did SELECT → check → INSERT or UPDATE
-- across two round-trips, leaving a TOCTOU window where two concurrent requests
-- could both pass the limit check and both be incremented. Under burst traffic
-- this allows ~2× the intended limit.
--
-- This function does the whole check-and-increment in one statement under
-- PostgreSQL's serialization guarantee. It returns the post-increment count
-- so the caller can compare against the limit.
--
-- Callers: supabase/functions/_shared/rate-limit.ts

CREATE OR REPLACE FUNCTION public.rate_limit_check(
  p_bucket       text,
  p_subject_hash text,
  p_window_start timestamptz,
  p_expires_at   timestamptz,
  p_limit        int
) RETURNS TABLE(request_count int, allowed boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO public.function_rate_limits
    (bucket, subject_hash, window_start, request_count, expires_at)
  VALUES
    (p_bucket, p_subject_hash, p_window_start, 1, p_expires_at)
  ON CONFLICT (bucket, subject_hash, window_start) DO UPDATE
    SET request_count = function_rate_limits.request_count + 1,
        expires_at    = EXCLUDED.expires_at
  RETURNING function_rate_limits.request_count INTO v_count;

  RETURN QUERY SELECT v_count, (v_count <= p_limit);
END $$;

-- Only the service role (used by edge functions) may call this.
REVOKE ALL ON FUNCTION public.rate_limit_check(text, text, timestamptz, timestamptz, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rate_limit_check(text, text, timestamptz, timestamptz, int) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.rate_limit_check(text, text, timestamptz, timestamptz, int) TO service_role;
