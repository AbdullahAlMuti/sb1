-- Atomic rate-limit counter + cleanup of expired windows.
--
-- _shared/rate-limit.ts used SELECT-then-UPDATE, so N concurrent requests all
-- read the same count and all passed (the limit could be exceeded by the
-- concurrency level). This function does the increment in ONE statement on the
-- existing unique index (bucket, subject_hash, window_start) and returns the
-- post-increment count. Additive only: nothing existing is changed; the edge
-- helper falls back to the old path until this function exists.

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_bucket       text,
  p_subject_hash text,
  p_window_start timestamptz,
  p_expires_at   timestamptz
) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.function_rate_limits (bucket, subject_hash, window_start, request_count, expires_at)
  VALUES (p_bucket, p_subject_hash, p_window_start, 1, p_expires_at)
  ON CONFLICT (bucket, subject_hash, window_start)
  DO UPDATE SET request_count = public.function_rate_limits.request_count + 1,
                expires_at    = EXCLUDED.expires_at,
                updated_at    = now()
  RETURNING request_count;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit(text, text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(text, text, timestamptz, timestamptz) TO service_role;

-- Expired windows were never deleted, so the table grew without bound.
CREATE OR REPLACE FUNCTION public.purge_expired_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.function_rate_limits WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_rate_limits() TO service_role;

-- Hourly purge when pg_cron is available (same guard style as
-- 20260615010000_schedule_reconcile_subscriptions.sql).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-expired-rate-limits';
    PERFORM cron.schedule('purge-expired-rate-limits', '17 * * * *', 'select public.purge_expired_rate_limits();');
    RAISE NOTICE 'purge-expired-rate-limits cron scheduled (hourly).';
  ELSE
    RAISE NOTICE 'pg_cron not installed — call public.purge_expired_rate_limits() from a scheduler.';
  END IF;
END;
$$;
