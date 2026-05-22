-- Update handle_new_user trigger to grant 20 trial credits and set users active by default

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
    INSERT INTO public.profiles (id, email, full_name, plan_id, credits, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        free_plan_id,
        20, -- start at 20 trial credits
        true -- active for trial usage
    )
    ON CONFLICT (id) DO UPDATE 
    SET credits = 20, is_active = true WHERE public.profiles.credits = 0;

    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$function$;
