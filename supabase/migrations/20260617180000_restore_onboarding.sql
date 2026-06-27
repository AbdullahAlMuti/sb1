-- Migration to restore onboarding by default and reset onboarding_completed to false
-- Target: public.profiles

ALTER TABLE public.profiles 
  ALTER COLUMN onboarding_completed SET DEFAULT false;

-- Reset onboarding_completed to false for active dev testing
UPDATE public.profiles 
  SET onboarding_completed = false;
