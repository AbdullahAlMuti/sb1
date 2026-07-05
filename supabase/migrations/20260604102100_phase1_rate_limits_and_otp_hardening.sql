CREATE TABLE IF NOT EXISTS public.function_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  subject_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS function_rate_limits_bucket_subject_window_key
  ON public.function_rate_limits (bucket, subject_hash, window_start);

CREATE INDEX IF NOT EXISTS idx_function_rate_limits_expires_at
  ON public.function_rate_limits (expires_at);

ALTER TABLE public.function_rate_limits ENABLE ROW LEVEL SECURITY;

-- auth_codes was created out-of-band in prod (used by supabase/functions/auth-otp)
-- before this migration ran; no earlier migration creates it, so define it
-- here for a from-scratch replay, matching the columns auth-otp reads/writes.
CREATE TABLE IF NOT EXISTS public.auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_codes
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_auth_codes_user_used_expires
  ON public.auth_codes (user_id, used, expires_at);
