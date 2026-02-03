-- Fix new-user default credits: start at 0 used/remaining until plan activation.
-- This prevents showing a misleading default like "5" for brand-new users.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    free_plan_id UUID;
BEGIN
    -- Get free plan ID
    SELECT id INTO free_plan_id FROM public.plans WHERE name = 'free' LIMIT 1;

    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, plan_id, credits)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        free_plan_id,
        0 -- start at 0 so UI doesn't show phantom credits for new users
    );

    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');

    RETURN NEW;
END;
$function$;