-- Fix handle_new_user() to persist goal from user_metadata into settings column.
-- Without this, the PostgreSQL trigger creates the profile with settings = NULL,
-- meaning the Shopify goal chosen during registration is lost at the DB level
-- until auth-otp or ensure-profile patches it up later (fragile).

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    plan_id,
    credits,
    is_active,
    pending_plan_id,
    payment_status,
    subscription_status,
    settings
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULL,
    0,
    true,
    (NEW.raw_user_meta_data->>'pending_plan_id')::uuid,
    'unpaid',
    'inactive',
    CASE
      WHEN NEW.raw_user_meta_data->>'goal' IS NOT NULL
        THEN jsonb_build_object('goal', NEW.raw_user_meta_data->>'goal')
      ELSE '{}'::jsonb
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
