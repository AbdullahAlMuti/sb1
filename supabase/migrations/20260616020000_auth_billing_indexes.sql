-- Create lookup indexes for Stripe customer and subscription integrations (launch P0)
-- Speeds up database lookups for webhook processing and payment status queries.

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
  ON public.profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_plans_stripe_subscription_id 
  ON public.user_plans(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_stripe_checkout_session_id 
  ON public.checkout_sessions(stripe_checkout_session_id);
