import { useEffect, useRef } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { usePlans } from '@repo/api-client/hooks/usePlans';
import { getPlanIntent, setPlanIntent, resolvePlanToken } from '@repo/auth/lib/planIntent';
import { canAccessDashboard } from '@repo/auth/ProtectedRoute';

type Interval = 'monthly' | 'yearly';

/**
 * Page-based checkout entry (no modal). Validates the selected plan and starts
 * a server-side Stripe Checkout session, then redirects to Stripe.
 *
 * Guards (in order):
 *   - not authenticated → /signup?plan=<token> (keep intent)
 *   - already has access → /dashboard (no duplicate checkout)
 *   - no valid plan     → /pricing
 *   - otherwise         → create session on the server and redirect to Stripe
 *
 * The plan price is never sent from the client — create-checkout resolves it
 * from the DB and re-validates the plan id server-side.
 */
export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isAdmin, isLoading: authLoading } = useAuth();
  const { createCheckout, access } = useSubscription();
  const { plans, isLoading: plansLoading } = usePlans();
  const startedRef = useRef(false);

  const urlPlan = searchParams.get('plan');
  const interval: Interval = searchParams.get('interval') === 'yearly' ? 'yearly' : 'monthly';
  const planToken = urlPlan || getPlanIntent() || profile?.pending_plan_id || null;
  const plan = resolvePlanToken(planToken, plans);

  // Wait for session, profile (when a user exists), and plans before deciding —
  // avoids firing checkout for an active user whose profile hasn't loaded yet.
  const ready = !authLoading && !plansLoading && (!user || !!profile);
  const hasAccess =
    Boolean(user) &&
    (access === 'active' || access === 'trial' || canAccessDashboard(user, profile, isAdmin));

  // Persist a URL plan token so a bounce through /signup keeps the intent.
  useEffect(() => {
    if (urlPlan) setPlanIntent(urlPlan);
  }, [urlPlan]);

  // Start the Stripe session exactly once, only when all guards pass.
  useEffect(() => {
    if (!ready || !user || hasAccess || !plan) return;
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const { url } = await createCheckout(plan.id, interval);
      if (url) {
        window.location.href = url;
        return;
      }
      // createCheckout already surfaced the error via toast — send them back to
      // choose a plan rather than stranding them on a blank checkout page.
      navigate('/pricing', { replace: true });
    })();
  }, [ready, user, hasAccess, plan, interval, createCheckout, navigate]);

  if (ready && !user) {
    const dest = planToken ? `/signup?plan=${encodeURIComponent(planToken)}` : '/signup';
    return <Navigate to={dest} replace />;
  }
  if (ready && hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  if (ready && !plan) {
    return <Navigate to="/pricing" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Redirecting to secure checkout…
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan ? `Starting your ${plan.display_name} plan.` : 'Preparing your plan.'}
          </p>
        </div>
      </div>
    </div>
  );
}
