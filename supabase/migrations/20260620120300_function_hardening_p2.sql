-- P2 defense-in-depth function hardening (SS-A1-002, SS-A1-004).
--
-- SS-A1-002: the *_admin SECURITY DEFINER RPCs are EXECUTE-granted to anon +
-- authenticated and flagged by the Supabase security advisor. They are gated
-- internally by has_role(auth.uid(),'admin'), and they are called DIRECTLY by
-- authenticated admin users from the admin panel (that internal check is the
-- auth), so we must NOT revoke from `authenticated` — that would break the
-- panel. We only revoke from `anon` (anon has no auth.uid() and already fails
-- the internal gate; this just removes the ability to even invoke).
--
-- IMPORTANT: is_admin / has_role are intentionally NOT in this list — RLS
-- policies call them, so their EXECUTE grants must remain intact.
--
-- SS-A1-004: pin a mutable search_path on is_valid_ebay_feature.

DO $$
DECLARE
  fn record;
  admin_fns text[] := ARRAY[
    'adjust_user_credits_admin',
    'extend_user_subscription_admin',
    'get_admin_audit_log_detail',
    'get_ebay_admin_stats',
    'get_ebay_feature_controls_admin',
    'get_ebay_user_admin_summary',
    'get_ebay_user_dashboard_stats_admin',
    'get_ebay_user_support_timeline',
    'get_user_credits_admin',
    'get_user_feature_overrides_admin',
    'list_user_listings',
    'log_admin_action',
    'remove_user_feature_override',
    'search_admin_audit_logs',
    'search_ebay_users_admin',
    'search_user_credits_admin',
    'toggle_user_status_admin',
    'update_ebay_global_feature_control',
    'update_user_feature_override',
    'update_user_limits_admin',
    'update_user_plan_admin'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(admin_fns)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn.sig);
  END LOOP;
END $$;

-- SS-A1-004
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_valid_ebay_feature'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn.sig);
  END LOOP;
END $$;
