-- O(1) auth lookups for the auth-otp edge function.
-- Replaces the paginated auth.admin.listUsers scan (broke past ~20k users)
-- with an indexed profiles lookup plus a direct auth.users fallback.

-- Fast path: profiles.email equality lookup used on every OTP request.
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- Fallback: resolve a user id straight from auth.users (already indexed on
-- email by Supabase). SECURITY DEFINER because auth schema is not readable
-- by the service-role PostgREST connection through the public API.
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- GoTrue stores emails lowercased, so equality on the stored column keeps
  -- the auth.users email index usable (lower(email) would force a seq scan).
  SELECT id FROM auth.users
  WHERE email = lower(trim(p_email))
  LIMIT 1;
$$;

-- Only the service role (edge functions) may call this — it exposes the
-- existence of accounts by email.
REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) TO service_role;
