-- is_admin(uuid) is used by RLS policies from this migration onward but was
-- never defined in migration history (created out-of-band in prod at some
-- point). Define it idempotently so a from-scratch migration replay works;
-- CREATE OR REPLACE is a no-op against an existing prod function with the
-- same semantics.
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role);
$$;

-- Add duration configuration to plans
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS duration_months integer DEFAULT 1;

-- Add order tracking to user_plans (resets per billing period)
ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS orders_used integer DEFAULT 0;

-- Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('plan_grant', 'usage', 'manual_adjustment', 'promo', 'refund', 'period_reset')),
  balance_after integer NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own credit transactions"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit transactions"
ON public.credit_transactions
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert credit transactions"
ON public.credit_transactions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Create order_transactions table for order audit trail
CREATE TABLE IF NOT EXISTS public.order_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid,
  transaction_type text NOT NULL CHECK (transaction_type IN ('order_placed', 'period_reset', 'manual_adjustment')),
  orders_used_after integer NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.order_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_transactions
CREATE POLICY "Users can view own order transactions"
ON public.order_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all order transactions"
ON public.order_transactions
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert order transactions"
ON public.order_transactions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_transactions_user_id ON public.order_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_order_transactions_created_at ON public.order_transactions(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.credit_transactions IS 'Audit trail for all credit changes - grants, usage, adjustments';
COMMENT ON TABLE public.order_transactions IS 'Audit trail for order limit usage and resets';