-- Fix admin_settings: Remove public access, restrict to admins only
DROP POLICY IF EXISTS "Users can view settings" ON public.admin_settings;

CREATE POLICY "Only admins can view settings"
ON public.admin_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  )
);

-- Fix profiles: Add INSERT policy for users to create their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);