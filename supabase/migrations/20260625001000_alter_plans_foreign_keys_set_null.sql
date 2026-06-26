-- Alter profiles foreign keys to SET NULL on delete of plans
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_id_fkey,
  DROP CONSTRAINT IF EXISTS profiles_pending_plan_id_fkey,
  DROP CONSTRAINT IF EXISTS profiles_selected_plan_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD CONSTRAINT profiles_pending_plan_id_fkey FOREIGN KEY (pending_plan_id) REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD CONSTRAINT profiles_selected_plan_id_fkey FOREIGN KEY (selected_plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;

-- Alter user_plans foreign keys to SET NULL on delete of plans
ALTER TABLE public.user_plans
  DROP CONSTRAINT IF EXISTS user_plans_plan_id_fkey;

-- Allow plan_id in user_plans to be NULL
ALTER TABLE public.user_plans ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE public.user_plans
  ADD CONSTRAINT user_plans_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;

-- Alter checkout_sessions foreign keys to SET NULL on delete of plans
ALTER TABLE public.checkout_sessions
  DROP CONSTRAINT IF EXISTS checkout_sessions_selected_plan_id_fkey;

ALTER TABLE public.checkout_sessions
  ADD CONSTRAINT checkout_sessions_selected_plan_id_fkey FOREIGN KEY (selected_plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;
