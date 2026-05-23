-- Phase 7: Credits & Usage Admin Controls

-- 1. Search User Credits (for the Data Table)
CREATE OR REPLACE FUNCTION public.search_user_credits_admin(
  search_query text DEFAULT '',
  limit_val int DEFAULT 50,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  account_status text,
  credits_remaining int,
  credits_used bigint,
  last_usage_date timestamp with time zone,
  last_adjustment_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.email,
    p.full_name,
    COALESCE(p.account_status, 'active') AS account_status,
    COALESCE(p.credits, 0) AS credits_remaining,
    (SELECT COALESCE(SUM(u.credits_used), 0) FROM public.usage_logs u WHERE u.user_id = p.id) AS credits_used,
    (SELECT MAX(created_at) FROM public.usage_logs u WHERE u.user_id = p.id) AS last_usage_date,
    (SELECT MAX(created_at) FROM public.credit_transactions ct WHERE ct.user_id = p.id AND ct.transaction_type IN ('grant', 'revoke', 'correction', 'goodwill', 'refund')) AS last_adjustment_date
  FROM public.profiles p
  WHERE (
    search_query = '' OR 
    p.email ILIKE '%' || search_query || '%' OR 
    p.full_name ILIKE '%' || search_query || '%' OR
    p.id::text ILIKE '%' || search_query || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;


-- 2. Get User Credits Detail
CREATE OR REPLACE FUNCTION public.get_user_credits_admin(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_rec record;
  total_granted bigint;
  total_used bigint;
  total_adjusted bigint;
  recent_tx jsonb;
  recent_usage jsonb;
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO profile_rec FROM public.profiles WHERE id = target_user_id;
  IF profile_rec IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Totals
  SELECT COALESCE(SUM(amount), 0) INTO total_granted FROM public.credit_transactions WHERE user_id = target_user_id AND transaction_type = 'grant';
  SELECT COALESCE(SUM(credits_used), 0) INTO total_used FROM public.usage_logs WHERE user_id = target_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO total_adjusted FROM public.credit_transactions WHERE user_id = target_user_id AND transaction_type IN ('grant', 'revoke', 'correction', 'goodwill', 'refund');

  -- Recent Transactions
  SELECT jsonb_agg(tx) INTO recent_tx FROM (
    SELECT amount, transaction_type, balance_after, description, created_at 
    FROM public.credit_transactions 
    WHERE user_id = target_user_id 
    ORDER BY created_at DESC 
    LIMIT 10
  ) tx;

  -- Recent Usage
  SELECT jsonb_agg(usg) INTO recent_usage FROM (
    SELECT feature_name, credits_used, created_at 
    FROM public.usage_logs 
    WHERE user_id = target_user_id 
    ORDER BY created_at DESC 
    LIMIT 10
  ) usg;

  result := jsonb_build_object(
    'current_credits', COALESCE(profile_rec.credits, 0),
    'total_granted', total_granted,
    'total_used', total_used,
    'total_adjusted', total_adjusted,
    'recent_transactions', COALESCE(recent_tx, '[]'::jsonb),
    'recent_usage', COALESCE(recent_usage, '[]'::jsonb)
  );

  RETURN result;
END;
$$;


-- 3. Adjust User Credits
CREATE OR REPLACE FUNCTION public.adjust_user_credits_admin(
  p_user_id uuid,
  p_amount int,
  p_adjustment_type text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_balance int;
  new_balance int;
  valid_types text[] := ARRAY['grant', 'revoke', 'correction', 'goodwill', 'refund'];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT p_adjustment_type = ANY(valid_types) THEN
    RAISE EXCEPTION 'Invalid adjustment type: %', p_adjustment_type;
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Adjustment amount cannot be zero.';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to adjust credits.';
  END IF;

  -- Lock profile row
  SELECT COALESCE(credits, 0) INTO old_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF old_balance IS NULL THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  new_balance := old_balance + p_amount;
  
  -- If negative balance is not allowed, prevent it. Assuming it's not allowed.
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative balance. Use a smaller revoke amount.';
  END IF;

  -- Update profile
  UPDATE public.profiles SET credits = new_balance WHERE id = p_user_id;

  -- Insert credit_transactions
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, balance_after, description)
  VALUES (p_user_id, p_amount, p_adjustment_type, new_balance, p_reason);

  -- Insert audit log
  PERFORM public.log_admin_action(
    p_user_id, 
    'credit_adjusted', 
    p_adjustment_type, 
    p_amount::text, 
    old_balance::text, 
    new_balance::text, 
    p_reason,
    jsonb_build_object('amount', p_amount, 'type', p_adjustment_type)
  );

  RETURN jsonb_build_object(
    'old_balance', old_balance,
    'new_balance', new_balance,
    'adjustment_amount', p_amount,
    'adjustment_type', p_adjustment_type
  );
END;
$$;
