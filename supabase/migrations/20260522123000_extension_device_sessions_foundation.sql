-- Extension device/session foundation.
-- Additive only: no drops, no destructive updates, no migration of existing user data.

-- Feature flags provide the production rollback switches for the new extension auth rollout.
CREATE TABLE IF NOT EXISTS public.app_feature_flags (
  key text PRIMARY KEY,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  rollout_percentage integer NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_feature_flags (key, description, enabled, rollout_percentage, config)
VALUES
  ('extension_new_auth_enabled', 'Enables backend-issued extension device sessions.', false, 0, '{}'::jsonb),
  ('extension_legacy_fallback_enabled', 'Allows legacy saasToken flow during one-release migration window.', true, 100, '{}'::jsonb),
  ('extension_pairing_fallback_enabled', 'Enables short-lived pairing-code fallback when auto-connect fails.', true, 100, '{}'::jsonb),
  ('extension_auto_connect_enabled', 'Enables website-based auto-connect for extension devices.', false, 0, '{}'::jsonb),
  ('extension_admin_control_plane_enabled', 'Enables admin UI surfaces for extension devices, sessions, and rollout controls.', false, 0, '{}'::jsonb),
  ('extension_bootstrap_v2_enabled', 'Enables the extension v2 source-of-truth bootstrap response.', false, 0, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Workspace',
  slug text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_owner_default_unique
ON public.workspaces (owner_user_id)
WHERE slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_user_id ON public.workspaces (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON public.workspaces (status);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'support')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_status ON public.workspace_members (workspace_id, status);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('ebay', 'shopify', 'amazon', 'walmart')),
  display_name text,
  seller_identifier text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disconnected', 'error', 'revoked')),
  health_score integer NOT NULL DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider, seller_identifier)
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_workspace_provider ON public.seller_profiles (workspace_id, provider);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON public.seller_profiles (user_id);

CREATE TABLE IF NOT EXISTS public.ebay_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_profile_id uuid REFERENCES public.seller_profiles(id) ON DELETE SET NULL,
  ebay_user_id text,
  ebay_username text,
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'pending', 'active', 'expired', 'revoked', 'error')),
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  token_storage_status text NOT NULL DEFAULT 'none' CHECK (token_storage_status IN ('none', 'server', 'expired', 'revoked')),
  access_token_expires_at timestamptz,
  last_verified_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, ebay_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ebay_connections_workspace_id ON public.ebay_connections (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ebay_connections_user_id ON public.ebay_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_ebay_connections_status ON public.ebay_connections (status);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'free', 'trialing', 'active', 'past_due', 'canceled', 'expired', 'paused')),
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_subscription_unique
ON public.subscriptions (provider, provider_subscription_id)
WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON public.subscriptions (workspace_id);

CREATE TABLE IF NOT EXISTS public.feature_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_key, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_entitlements_feature_key ON public.feature_entitlements (feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_entitlements_plan_id ON public.feature_entitlements (plan_id);

CREATE TABLE IF NOT EXISTS public.feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  reason text,
  expires_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR workspace_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_feature_overrides_user_id ON public.feature_overrides (user_id);
CREATE INDEX IF NOT EXISTS idx_feature_overrides_workspace_id ON public.feature_overrides (workspace_id);
CREATE INDEX IF NOT EXISTS idx_feature_overrides_feature_key ON public.feature_overrides (feature_key);

CREATE TABLE IF NOT EXISTS public.extension_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  install_id_hash text NOT NULL,
  device_name text,
  browser text,
  browser_version text,
  os text,
  extension_version text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'blocked', 'migration_required')),
  trust_score integer NOT NULL DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoke_reason text,
  legacy_user_id uuid,
  legacy_auth_detected boolean NOT NULL DEFAULT false,
  migration_status text NOT NULL DEFAULT 'not_started' CHECK (migration_status IN ('not_started', 'in_progress', 'completed', 'failed', 'legacy_fallback')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS extension_devices_install_hash_unique
ON public.extension_devices (install_id_hash);

CREATE INDEX IF NOT EXISTS idx_extension_devices_user_id ON public.extension_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_extension_devices_workspace_id ON public.extension_devices (workspace_id);
CREATE INDEX IF NOT EXISTS idx_extension_devices_status ON public.extension_devices (status);
CREATE INDEX IF NOT EXISTS idx_extension_devices_user_status ON public.extension_devices (user_id, status);
CREATE INDEX IF NOT EXISTS idx_extension_devices_last_seen_at ON public.extension_devices (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.extension_pairing_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_type text NOT NULL DEFAULT 'pairing' CHECK (flow_type IN ('auto', 'pairing')),
  code_hash text,
  connect_token_hash text,
  client_secret_hash text,
  install_id_hash text NOT NULL,
  device_name text,
  browser text,
  extension_version text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'used')),
  approved_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  approved_at timestamptz,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  device_id uuid REFERENCES public.extension_devices(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (code_hash IS NOT NULL OR connect_token_hash IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS extension_pairing_codes_code_hash_unique
ON public.extension_pairing_codes (code_hash)
WHERE code_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS extension_pairing_codes_connect_token_hash_unique
ON public.extension_pairing_codes (connect_token_hash)
WHERE connect_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_extension_pairing_codes_status_expires ON public.extension_pairing_codes (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_extension_pairing_codes_install_hash ON public.extension_pairing_codes (install_id_hash);
CREATE INDEX IF NOT EXISTS idx_extension_pairing_codes_device_id ON public.extension_pairing_codes (device_id);

CREATE TABLE IF NOT EXISTS public.extension_session_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.extension_devices(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.extension_pairing_codes(id) ON DELETE SET NULL,
  grant_token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'redeemed', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extension_session_grants_device_id ON public.extension_session_grants (device_id);
CREATE INDEX IF NOT EXISTS idx_extension_session_grants_status_expires ON public.extension_session_grants (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_extension_session_grants_user_status ON public.extension_session_grants (user_id, status);

CREATE TABLE IF NOT EXISTS public.extension_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.extension_devices(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token_hash text NOT NULL UNIQUE,
  access_token_expires_at timestamptz NOT NULL,
  refresh_token_family_id uuid NOT NULL DEFAULT gen_random_uuid(),
  current_refresh_token_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'replay_detected')),
  ip_address text,
  user_agent text,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoke_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Some production databases may already have an older extension_sessions table.
-- Keep this migration additive by adding missing columns instead of replacing that table.
ALTER TABLE public.extension_sessions
ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.extension_devices(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS access_token_hash text,
ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS refresh_token_family_id uuid NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS current_refresh_token_id uuid,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS revoke_reason text,
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_extension_sessions_device_id ON public.extension_sessions (device_id);
CREATE INDEX IF NOT EXISTS idx_extension_sessions_user_id ON public.extension_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_extension_sessions_status ON public.extension_sessions (status);
CREATE INDEX IF NOT EXISTS idx_extension_sessions_user_status ON public.extension_sessions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_extension_sessions_access_expires ON public.extension_sessions (access_token_expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS extension_sessions_access_token_hash_unique
ON public.extension_sessions (access_token_hash)
WHERE access_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.extension_session_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.extension_sessions(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.extension_devices(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_family_id uuid NOT NULL,
  parent_token_id uuid REFERENCES public.extension_session_refresh_tokens(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  replay_detected_at timestamptz,
  replaced_by_token_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'extension_sessions_current_refresh_token_fk'
  ) THEN
    ALTER TABLE public.extension_sessions
    ADD CONSTRAINT extension_sessions_current_refresh_token_fk
    FOREIGN KEY (current_refresh_token_id)
    REFERENCES public.extension_session_refresh_tokens(id)
    ON DELETE SET NULL
    NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_extension_refresh_tokens_session_id ON public.extension_session_refresh_tokens (session_id);
CREATE INDEX IF NOT EXISTS idx_extension_refresh_tokens_family ON public.extension_session_refresh_tokens (token_family_id);
CREATE INDEX IF NOT EXISTS idx_extension_refresh_tokens_expires ON public.extension_session_refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_extension_refresh_tokens_device_id ON public.extension_session_refresh_tokens (device_id);

CREATE TABLE IF NOT EXISTS public.extension_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.extension_devices(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.extension_sessions(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  feature_key text,
  request_id text,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extension_activity_logs_user_created ON public.extension_activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extension_activity_logs_device_created ON public.extension_activity_logs (device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extension_activity_logs_event_type ON public.extension_activity_logs (event_type);

CREATE TABLE IF NOT EXISTS public.extension_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.extension_devices(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.extension_sessions(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  error_class text NOT NULL DEFAULT 'unknown',
  error_code text,
  message text,
  stack text,
  feature_key text,
  recoverable boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extension_error_logs_user_created ON public.extension_error_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extension_error_logs_device_created ON public.extension_error_logs (device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extension_error_logs_error_class ON public.extension_error_logs (error_class);

CREATE TABLE IF NOT EXISTS public.extension_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.extension_devices(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'retrying')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error_class text,
  error_message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extension_jobs_user_status ON public.extension_jobs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_extension_jobs_device_status ON public.extension_jobs (device_id, status);
CREATE INDEX IF NOT EXISTS idx_extension_jobs_next_retry ON public.extension_jobs (next_retry_at) WHERE status = 'retrying';

CREATE TABLE IF NOT EXISTS public.extension_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.extension_devices(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  migration_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'completed', 'failed', 'rolled_back', 'legacy_fallback')),
  source_version text,
  target_version text,
  legacy_storage_backup_created boolean NOT NULL DEFAULT false,
  telemetry jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extension_migrations_device_key ON public.extension_migrations (device_id, migration_key);
CREATE INDEX IF NOT EXISTS idx_extension_migrations_status ON public.extension_migrations (status);

CREATE TABLE IF NOT EXISTS public.support_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.extension_devices(id) ON DELETE SET NULL,
  note text NOT NULL,
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'user_visible')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_notes_user_created ON public.support_notes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_notes_workspace_created ON public.support_notes (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.extension_devices(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_status_severity ON public.admin_alerts (status, severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_user_created ON public.admin_alerts (user_id, created_at DESC);

-- Enable RLS on all new public tables.
ALTER TABLE public.app_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_session_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_session_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Minimal owner-read policies for future dashboard/admin UI. Token/session tables remain backend-only by having no direct user policies.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspaces' AND policyname = 'Workspace members can view workspaces') THEN
    CREATE POLICY "Workspace members can view workspaces"
    ON public.workspaces
    FOR SELECT
    TO authenticated
    USING (
      owner_user_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = workspaces.id
          AND wm.user_id = (select auth.uid())
          AND wm.status = 'active'
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_members' AND policyname = 'Users can view their workspace memberships') THEN
    CREATE POLICY "Users can view their workspace memberships"
    ON public.workspace_members
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'extension_devices' AND policyname = 'Users can view their extension devices') THEN
    CREATE POLICY "Users can view their extension devices"
    ON public.extension_devices
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seller_profiles' AND policyname = 'Users can view their seller profiles') THEN
    CREATE POLICY "Users can view their seller profiles"
    ON public.seller_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_connections' AND policyname = 'Users can view their eBay connection status') THEN
    CREATE POLICY "Users can view their eBay connection status"
    ON public.ebay_connections
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Users can view their subscription mirror') THEN
    CREATE POLICY "Users can view their subscription mirror"
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'extension_activity_logs' AND policyname = 'Users can view their extension activity') THEN
    CREATE POLICY "Users can view their extension activity"
    ON public.extension_activity_logs
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'extension_error_logs' AND policyname = 'Users can view their extension errors') THEN
    CREATE POLICY "Users can view their extension errors"
    ON public.extension_error_logs
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'extension_jobs' AND policyname = 'Users can view their extension jobs') THEN
    CREATE POLICY "Users can view their extension jobs"
    ON public.extension_jobs
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'extension_migrations' AND policyname = 'Users can view their extension migrations') THEN
    CREATE POLICY "Users can view their extension migrations"
    ON public.extension_migrations
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
  END IF;
END $$;
