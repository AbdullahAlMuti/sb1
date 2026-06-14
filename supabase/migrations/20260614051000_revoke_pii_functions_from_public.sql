-- Follow-up to 20260614050000: the role-level REVOKE was insufficient because
-- EXECUTE is granted to PUBLIC (which anon/authenticated inherit). Revoke from
-- PUBLIC to actually close anon/authenticated access to these enumeration/PII
-- functions. service_role retains access for any backend use.
-- Verified: has_function_privilege('anon'|'authenticated', …, 'execute') = false.
REVOKE EXECUTE ON FUNCTION public.check_user_exists(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_goal(text)     FROM PUBLIC, anon, authenticated;
