-- Launch hardening (advisors 0028/0029 + 0011).
--
-- 1.1 — Revoke client EXECUTE on PII/enumeration functions. `check_user_exists` is
--       unused by any client; `get_user_goal(email)` was called by ANON on the auth
--       page and leaked account existence + the user's goal to anyone. The web client
--       no longer calls it (see apps/web/src/pages/auth/Auth.tsx). RLS/trigger/internal
--       callers run as definer and are unaffected by these REST grants.
-- Rollback: GRANT EXECUTE ON FUNCTION ... TO authenticated;  (and anon if ever needed)
--
-- Some of these functions were created out-of-band in prod (not present in
-- migration history at this point) or may not exist in a fresh local replay;
-- guard each statement so it's a no-op instead of failing the migration.
DO $$
BEGIN
  IF to_regprocedure('public.check_user_exists(text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.check_user_exists(text) FROM anon, authenticated;
  END IF;
  IF to_regprocedure('public.get_user_goal(text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_user_goal(text) FROM anon, authenticated;
  END IF;

  -- 1.6 — Pin search_path on SECURITY DEFINER / trigger functions flagged as mutable.
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    ALTER FUNCTION public.set_updated_at() SET search_path = public;
  END IF;
  IF to_regprocedure('public.list_user_listings(text, text, integer, timestamp with time zone, uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.list_user_listings(text, text, integer, timestamp with time zone, uuid)
      SET search_path = public;
  END IF;
  IF to_regprocedure('public.create_listing_with_variations(uuid, jsonb, jsonb)') IS NOT NULL THEN
    ALTER FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
      SET search_path = public;
  END IF;
END $$;
