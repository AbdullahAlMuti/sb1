-- Alter checkout_sessions.user_id foreign key to SET NULL on delete of profiles
ALTER TABLE public.checkout_sessions
  DROP CONSTRAINT IF EXISTS checkout_sessions_user_id_fkey;

ALTER TABLE public.checkout_sessions
  ADD CONSTRAINT checkout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
