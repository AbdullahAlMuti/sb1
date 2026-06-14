-- Launch hardening (advisors 0028/0029 + 0011).
--
-- 1.1 — Revoke client EXECUTE on PII/enumeration functions. `check_user_exists` is
--       unused by any client; `get_user_goal(email)` was called by ANON on the auth
--       page and leaked account existence + the user's goal to anyone. The web client
--       no longer calls it (see apps/web/src/pages/auth/Auth.tsx). RLS/trigger/internal
--       callers run as definer and are unaffected by these REST grants.
-- Rollback: GRANT EXECUTE ON FUNCTION ... TO authenticated;  (and anon if ever needed)
REVOKE EXECUTE ON FUNCTION public.check_user_exists(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_goal(text)     FROM anon, authenticated;

-- 1.6 — Pin search_path on SECURITY DEFINER / trigger functions flagged as mutable.
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.list_user_listings(text, text, integer, timestamp with time zone, uuid)
  SET search_path = public;
ALTER FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
  SET search_path = public;
