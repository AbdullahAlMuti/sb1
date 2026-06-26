-- Restore user_plans foreign key to profiles
ALTER TABLE public.user_plans
  DROP CONSTRAINT IF EXISTS user_plans_user_id_fkey;

ALTER TABLE public.user_plans
  ADD CONSTRAINT user_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
