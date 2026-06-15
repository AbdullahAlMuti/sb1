-- Migration to disable onboarding by defaulting onboarding_completed to true
-- and updating all existing profiles.

-- Update the default value to true for future registrations/profiles
ALTER TABLE public.profiles 
  ALTER COLUMN onboarding_completed SET DEFAULT true;

-- Update all existing profiles that are not yet marked completed
UPDATE public.profiles 
  SET onboarding_completed = true 
  WHERE onboarding_completed = false OR onboarding_completed IS NULL;
