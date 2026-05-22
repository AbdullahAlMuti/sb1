-- Additive SaaS/admin profile fields.
-- Existing values are only filled when NULL so this migration remains safe to rerun.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS platform_access text[],
ADD COLUMN IF NOT EXISTS onboarding_status text,
ADD COLUMN IF NOT EXISTS account_status text,
ADD COLUMN IF NOT EXISTS ebay_connected boolean,
ADD COLUMN IF NOT EXISTS shopify_connected boolean,
ADD COLUMN IF NOT EXISTS admin_notes text,
ADD COLUMN IF NOT EXISTS mfa_enabled boolean,
ADD COLUMN IF NOT EXISTS active_sessions_count integer,
ADD COLUMN IF NOT EXISTS api_key_enabled boolean;

ALTER TABLE public.profiles
ALTER COLUMN platform_access SET DEFAULT '{"ebay"}'::text[],
ALTER COLUMN onboarding_status SET DEFAULT 'Pending',
ALTER COLUMN account_status SET DEFAULT 'Active',
ALTER COLUMN ebay_connected SET DEFAULT false,
ALTER COLUMN shopify_connected SET DEFAULT false,
ALTER COLUMN mfa_enabled SET DEFAULT false,
ALTER COLUMN active_sessions_count SET DEFAULT 0,
ALTER COLUMN api_key_enabled SET DEFAULT false;

UPDATE public.profiles
SET
  platform_access = COALESCE(platform_access, '{"ebay"}'::text[]),
  onboarding_status = COALESCE(onboarding_status, 'Pending'),
  account_status = COALESCE(
    account_status,
    CASE
      WHEN is_active = true THEN 'Active'
      ELSE 'Suspended'
    END
  ),
  ebay_connected = COALESCE(ebay_connected, false),
  shopify_connected = COALESCE(shopify_connected, false),
  mfa_enabled = COALESCE(mfa_enabled, false),
  active_sessions_count = COALESCE(active_sessions_count, 0),
  api_key_enabled = COALESCE(api_key_enabled, false)
WHERE
  platform_access IS NULL
  OR onboarding_status IS NULL
  OR account_status IS NULL
  OR ebay_connected IS NULL
  OR shopify_connected IS NULL
  OR mfa_enabled IS NULL
  OR active_sessions_count IS NULL
  OR api_key_enabled IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles (account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status ON public.profiles (onboarding_status);
CREATE INDEX IF NOT EXISTS idx_profiles_platform_access ON public.profiles USING gin (platform_access);
