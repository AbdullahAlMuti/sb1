-- Collapse the role model to a single privileged role: `admin`.
--
-- Rationale: `super_admin` was speculative scaffolding for a multi-operator org
-- that does not exist. With a single operator, the super_admin/admin split adds
-- complexity without separation-of-duties value. `has_role()` already treats
-- super_admin as a superset of admin, so collapsing removes no access.
--
-- NOTE: the `super_admin` *enum value* on public.app_role is intentionally LEFT
-- in place. Postgres cannot cleanly drop an enum value without recreating the
-- type and rewriting every dependent column/policy — high risk for zero benefit.
-- It simply becomes an unused value once the rows below are migrated.

-- 1. Migrate data: any super_admin row becomes an admin row.
--    Drop super_admin rows for users who already have an admin row to avoid a
--    (user_id, role) unique-constraint collision, then promote the rest.
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.role = 'super_admin'
  AND b.role = 'admin'
  AND a.user_id = b.user_id;

UPDATE public.user_roles
SET role = 'admin'
WHERE role = 'super_admin';

-- 2. Simplify has_role(): drop the now-dead super_admin special case.
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
      AND role = _role
  )
$function$;
