-- Harden role management.
-- Role writes must go through service-role Edge Functions that enforce caller checks.
-- Authenticated clients may only read their own role rows; admins may read all role rows.

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Keep existing admin policies compatible with super_admin accounts without
-- requiring duplicate {admin, super_admin} role rows for the same user.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin'::public.app_role AND role = 'super_admin'::public.app_role)
      )
  )
$function$;

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);
