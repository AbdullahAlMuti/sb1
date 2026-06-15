import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Clock, Crown, Loader2, Rocket, Zap } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { usePlans, type Plan } from '@repo/api-client/hooks/usePlans';
import { cn } from '@repo/ui/lib/utils';
import { canAccessDashboard } from '@repo/auth/ProtectedRoute';

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  trial: Clock,
  starter: Zap,
  pro: Crown,
  growth: Rocket,
};

type BillingInterval = 'monthly' | 'yearly';

export default function ChoosePlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { createCheckout, access, isLoading: subscriptionLoading } = useSubscription();
  const { plans, isLoading: plansLoading } = usePlans();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  // Guards the auto-checkout effect so it can never fire a second Stripe session
  // (e.g. if deps change mid-request before isProcessing has updated).
  const autoFiredRef = useRef(false);

  const isTrialExpired = access === 'trial_expired';

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // Already has an active plan — go to dashboard
    if (!subscriptionLoading && profile && canAccessDashboard(user, profile, isAdmin)) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, profile, isAdmin, subscriptionLoading, navigate]);

  useEffect(() => {
    if (autoFiredRef.current) return;
    if (subscriptionLoading || plansLoading || !profile?.pending_plan_id || isProcessing) return;

    const query = new URLSearchParams(location.search);
    const auto = query.get('auto') === 'true';

    if (auto) {
      const plan = plans.find(p => p.id === profile.pending_plan_id);
      if (plan) {
        autoFiredRef.current = true;
        handleSelectPlan(plan);
      }
    }
  }, [subscriptionLoading, plansLoading, profile, location.search, plans, isProcessing]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!plan) return;

    const priceId = plan.is_trial
      ? (plan.stripe_price_id_one_time ?? undefined)
      : billingInterval === 'yearly'
        ? (plan.stripe_price_id_yearly ?? undefined)
        : (plan.stripe_price_id_monthly ?? undefined);

    if (!priceId) return;

    setIsProcessing(plan.id);
    try {
      const { url } = await createCheckout(
        plan.id,
        plan.is_trial ? 'monthly' : billingInterval,
        undefined,
        priceId,
      );
      if (url) window.location.href = url;
    } finally {
      setIsProcessing(null);
    }
  };

  const hasYearlyPlans = plans.some((p) => !p.is_trial && p.price_yearly > 0);

  // For expired trials: hide the trial card (they can't retrial)
  const visiblePlans = isTrialExpired ? plans.filter((p) => !p.is_trial) : plans;

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          {isTrialExpired ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 mb-4">
                <Clock className="h-4 w-4" />
                Your trial has ended
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                Choose a plan to continue
              </h1>
              <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
                Your 7-day trial has expired. Upgrade to keep your listings active and
                continue accessing SellerSuit features.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
                Get started with SellerSuit
              </h1>
              <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
                Try SellerSuit for $1 for 7 days, or jump straight into a full plan.
                No free tier — every plan includes real automation.
              </p>
            </>
          )}
        </div>

        {/* Billing interval toggle */}
        {hasYearlyPlans && (
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className={cn('text-sm font-medium', billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground')}>
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={billingInterval === 'yearly'}
              onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                billingInterval === 'yearly' ? 'bg-primary' : 'bg-input',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform',
                  billingInterval === 'yearly' ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </button>
            <span className={cn('text-sm font-medium flex items-center gap-1.5', billingInterval === 'yearly' ? 'text-foreground' : 'text-muted-foreground')}>
              Yearly
              <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-xs font-semibold text-success">
                Save ~20%
              </span>
            </span>
          </div>
        )}

        {/* Plan cards */}
        <div
          className={cn(
            'mx-auto grid gap-4',
            visiblePlans.length <= 2 ? 'max-w-3xl md:grid-cols-2' : 'max-w-5xl md:grid-cols-3',
          )}
        >
          {visiblePlans.map((plan) => {
            const Icon = planIcons[plan.name] || Zap;
            const isTrialPlan = Boolean(plan.is_trial);
            const trialDays = plan.trial_duration_days || 7;
            const isFeatured = plan.is_popular;
            const loading = isProcessing === plan.id;

            const displayPrice = isTrialPlan
              ? 1
              : billingInterval === 'yearly' && plan.price_yearly > 0
                ? plan.price_yearly / 12
                : plan.price_monthly;

            const hasPriceConfigured = isTrialPlan
              ? Boolean(plan.stripe_price_id_one_time)
              : Boolean(plan.stripe_price_id_monthly);

            const features = plan.features.length
              ? plan.features
              : [
                  `${plan.max_listings || 0} active listings`,
                  `${plan.credits_per_month || 0} credits per month`,
                  `${plan.max_auto_orders || 0} auto orders`,
                ];

            return (
              <article
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-lg border bg-card p-6 shadow-sm',
                  isFeatured ? 'border-primary shadow-soft-lg' : 'border-border',
                  isTrialPlan && 'border-dashed border-muted-foreground/40',
                )}
              >
                {isFeatured && (
                  <div className="absolute right-4 top-4 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                    Popular
                  </div>
                )}
                {isTrialPlan && (
                  <div className="absolute right-4 top-4 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Trial
                  </div>
                )}

                <div className="mb-6">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">{plan.display_name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-foreground">
                      ${isTrialPlan ? '1' : displayPrice % 1 === 0 ? displayPrice : displayPrice.toFixed(2)}
                    </span>
                    {isTrialPlan ? (
                      <span className="text-sm text-muted-foreground">/ {trialDays} days</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">/mo</span>
                    )}
                  </div>
                  {!isTrialPlan && billingInterval === 'yearly' && plan.price_yearly > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">Billed ${plan.price_yearly}/yr</p>
                  )}
                </div>

                <ul className="mb-6 space-y-3">
                  {features.slice(0, 6).map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-foreground">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto border-t border-border pt-5">
                  <Button
                    variant={isFeatured ? 'default' : 'outline'}
                    className={cn(
                      'h-11 w-full rounded-lg',
                      isTrialPlan &&
                        'border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20',
                    )}
                    disabled={loading || !hasPriceConfigured}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isTrialPlan ? (
                      `Start $1 Trial`
                    ) : isTrialExpired ? (
                      'Upgrade Now'
                    ) : (
                      'Get Started'
                    )}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="mt-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have a plan?{' '}
            <button
              onClick={() => navigate('/dashboard')}
              className="text-primary underline-offset-4 hover:underline"
            >
              Go to dashboard
            </button>
          </p>
          <button
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
