-- =====================================================
-- PHASE 1: ENHANCED SUBSCRIPTION PLAN SYSTEM
-- =====================================================

-- 1. Add new columns to plans table for dynamic configuration
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_duration_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS auto_orders_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS seo_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_seo_titles INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_seo_descriptions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_reset_frequency TEXT DEFAULT 'monthly';

-- 2. Add usage tracking and blocking columns to user_plans
ALTER TABLE public.user_plans 
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seo_titles_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seo_descriptions_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_override_limits JSONB DEFAULT NULL;

-- 3. Update existing Trial plan to have is_trial = true
UPDATE public.plans 
SET is_trial = true, 
    trial_duration_days = 14,
    auto_orders_enabled = false,
    seo_enabled = false,
    max_seo_titles = 0,
    max_seo_descriptions = 0
WHERE LOWER(name) = 'trial';

-- 4. Update Starter plan with SEO limits
UPDATE public.plans 
SET max_seo_titles = 1000,
    max_seo_descriptions = 5000,
    seo_enabled = true,
    auto_orders_enabled = true,
    order_reset_frequency = 'daily'
WHERE LOWER(name) = 'starter';

-- 5. Update Growth plan (most popular)
UPDATE public.plans 
SET is_popular = true,
    max_seo_titles = 2000,
    max_seo_descriptions = 10000,
    seo_enabled = true,
    auto_orders_enabled = true,
    order_reset_frequency = 'daily'
WHERE LOWER(name) = 'growth';

-- 6. Update Enterprise plan (unlimited)
UPDATE public.plans 
SET max_seo_titles = 100000,
    max_seo_descriptions = 100000,
    seo_enabled = true,
    auto_orders_enabled = true,
    order_reset_frequency = 'daily'
WHERE LOWER(name) = 'enterprise';

-- 7. Create index for faster blocked user queries
CREATE INDEX IF NOT EXISTS idx_user_plans_blocked ON public.user_plans(is_blocked) WHERE is_blocked = true;

-- 8. Create index for trial expiry queries
CREATE INDEX IF NOT EXISTS idx_user_plans_trial_end ON public.user_plans(trial_end) WHERE trial_end IS NOT NULL;

-- 9. Add check constraint for order_reset_frequency
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS chk_order_reset_frequency;
ALTER TABLE public.plans ADD CONSTRAINT chk_order_reset_frequency 
CHECK (order_reset_frequency IN ('daily', 'monthly', 'never'));

-- 10. Create function to check if user is blocked (for RLS and edge functions)
CREATE OR REPLACE FUNCTION public.is_user_blocked(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_blocked FROM public.user_plans WHERE user_id = check_user_id LIMIT 1),
    false
  );
$$;

-- 11. Create function to check if user's trial/subscription is expired
CREATE OR REPLACE FUNCTION public.is_subscription_expired(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE 
        WHEN up.status = 'canceled' THEN true
        WHEN up.trial_end IS NOT NULL AND up.trial_end < NOW() AND up.status != 'active' THEN true
        WHEN up.current_period_end IS NOT NULL AND up.current_period_end < NOW() AND up.status != 'active' THEN true
        ELSE false
      END
    FROM public.user_plans up WHERE up.user_id = check_user_id LIMIT 1),
    false
  );
$$;