-- Lock down EXECUTE on SECURITY DEFINER functions flagged by Supabase advisors
-- (anon_security_definer_function_executable / authenticated_security_definer_function_executable).
--
-- ⚠ REVIEWED MIGRATION — DO NOT auto-apply to prod. Apply on a Supabase branch/preview
--   first, then smoke the admin app (a *_admin RPC must still succeed for an admin) and a
--   normal user dashboard load, before promoting. Authored 2026-06-22.
--
-- WHY each grant choice (verified read-only against prod, 2026-06-22):
--   * Postgres grants EXECUTE to PUBLIC by default, so anon/authenticated have access via
--     PUBLIC. Revoking only anon/authenticated would be a no-op — we REVOKE FROM PUBLIC and
--     re-GRANT to the roles that should keep it.
--   * is_admin(uuid) and has_role(uuid, app_role) are INTENTIONALLY LEFT ALONE: 41 RLS
--     policies call them directly, evaluated as the querying role. Revoking would break RLS.
--     Their advisor WARNs are accepted.
--   * Admin RPCs (*_admin, update_*, search_*, toggle_*, extend_*, remove_*, log_admin_action,
--     get_ebay_*_admin, adjust_user_credits_admin, update_ebay_global_feature_control): the
--     admin SPA calls them as an authenticated admin and they self-guard with is_admin(). Keep
--     `authenticated` + `service_role`; drop anon.
--   * list_user_listings: user-facing (scopes to the caller). Keep authenticated + service_role; drop anon.
--   * Trigger functions (handle_new_user, prevent_audit_modification, sync_profile_credits_from_ledger,
--     guard_profile_billing_columns): fire as the table owner; never called directly. Drop all client roles.
--   * deduct_usage_atomic: SECURITY DEFINER counter-mutator with NO role guard, currently callable by any
--     authenticated user with an arbitrary p_user_id (IDOR griefing — its lockdown was missed). Restrict to
--     service_role (the only legitimate caller is plan-middleware via the edge service-role client).

-- ── Admin RPCs: drop anon, keep authenticated + service_role ──────────────────────────────
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.adjust_user_credits_admin(uuid, integer, text, text)',
    'public.extend_user_subscription_admin(uuid, integer, text)',
    'public.get_admin_audit_log_detail(uuid)',
    'public.get_ebay_admin_stats()',
    'public.get_ebay_feature_controls_admin()',
    'public.get_ebay_user_admin_summary(uuid)',
    'public.get_ebay_user_dashboard_stats_admin(uuid)',
    'public.get_ebay_user_support_timeline(uuid)',
    'public.get_user_credits_admin(uuid)',
    'public.get_user_feature_overrides_admin(uuid)',
    'public.log_admin_action(uuid, text, text, text, text, text, text, jsonb)',
    'public.remove_user_feature_override(uuid, text, text)',
    'public.search_admin_audit_logs(text, text, integer, integer)',
    'public.search_ebay_users_admin(text, text, integer, integer)',
    'public.search_user_credits_admin(text, integer, integer)',
    'public.toggle_user_status_admin(uuid, boolean, text)',
    'public.update_ebay_global_feature_control(text, boolean, text)',
    'public.update_user_feature_override(uuid, text, boolean, text)',
    'public.update_user_limits_admin(uuid, integer, integer, integer, text)',
    'public.update_user_plan_admin(uuid, uuid, text)',
    'public.queue_user_order_resync_admin(uuid)',
    'public.list_user_listings(text, text, integer, timestamp with time zone, uuid)'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role;', fn);
  END LOOP;
END $$;

-- ── Trigger functions: drop all client roles (invoked by triggers as the owner) ──────────
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.handle_new_user()',
    'public.prevent_audit_modification()',
    'public.sync_profile_credits_from_ledger()',
    'public.guard_profile_billing_columns()'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', fn);
  END LOOP;
END $$;

-- ── deduct_usage_atomic: service_role only (close the IDOR) ───────────────────────────────
REVOKE EXECUTE ON FUNCTION public.deduct_usage_atomic(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.deduct_usage_atomic(uuid, text, integer, integer) TO service_role;

-- ── Pin search_path on the one user function flagged function_search_path_mutable ─────────
--    (the other flagged entries are pg_trgm extension internals — accepted; relocating the
--    extension out of `public` is a separate, riskier change tracked under the "extension in
--    public" WARN.)
ALTER FUNCTION public.is_valid_ebay_feature(text) SET search_path = public;

-- ── Verify (run after apply): expect anon_exec=false on every row; authenticated_exec=false
--    for the trigger fns + deduct_usage_atomic, true for admin RPCs + list_user_listings. ──
-- SELECT p.proname,
--        has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname='public' AND p.prosecdef ORDER BY anon_exec DESC, p.proname;
