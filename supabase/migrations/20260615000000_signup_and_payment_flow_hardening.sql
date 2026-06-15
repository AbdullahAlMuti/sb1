-- Signup and Payment Flow Hardening Migration
-- Adds pending_plan_id, selected_plan_id, payment_status, subscription_status, and Stripe info to profiles.

-- 1. Add columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_plan_id uuid REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS selected_plan_id uuid REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone,
  ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone,
  ADD COLUMN IF NOT EXISTS subscription_provider text;

-- 2. Update trigger function public.handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $function$
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
         subscription_status
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
         'inactive'
     )
     ON CONFLICT (id) DO UPDATE
     SET 
         pending_plan_id = EXCLUDED.pending_plan_id;

     INSERT INTO public.user_roles (user_id, role)
     VALUES (NEW.id, 'user')
     ON CONFLICT (user_id, role) DO NOTHING;

     RETURN NEW;
 END;
 $function$;
