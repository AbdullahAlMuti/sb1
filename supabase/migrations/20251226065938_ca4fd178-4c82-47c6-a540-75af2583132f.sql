-- Add unique constraint on user_plans.user_id for proper upsert operations
ALTER TABLE public.user_plans
ADD CONSTRAINT user_plans_user_id_unique UNIQUE (user_id);

-- Ensure profiles table has a trigger to auto-create profiles on signup
-- First check if trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();