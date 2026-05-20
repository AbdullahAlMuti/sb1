-- Create a helper function to securely check user's registered goal before authentication
CREATE OR REPLACE FUNCTION public.get_user_goal(lookup_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_goal text;
  profile_exists boolean;
BEGIN
  -- Check if a profile exists with this email
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = lookup_email
  ) INTO profile_exists;

  IF NOT profile_exists THEN
    RETURN 'none';
  END IF;

  -- Fetch the goal from the user's settings jsonb column
  SELECT (settings->>'goal') INTO user_goal
  FROM public.profiles
  WHERE email = lookup_email;
  
  RETURN COALESCE(user_goal, 'ebay');
END;
$$;
