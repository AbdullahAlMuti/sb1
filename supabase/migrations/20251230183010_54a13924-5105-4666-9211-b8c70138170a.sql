-- Allow admins to manage subscription plans (INSERT/UPDATE/DELETE)
-- (SELECT is already public via existing policy)

CREATE POLICY "Admins can insert plans"
ON public.plans
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update plans"
ON public.plans
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete plans"
ON public.plans
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
