import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { differenceInDays, differenceInHours, format } from "date-fns";
import {
  AlertTriangle,
  Check,
  Clock,
  CreditCard,
  Crown,
  Loader2,
  RefreshCw,
  Rocket,
  Zap,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/components/ui/card";
import { useSubscription } from "@repo/auth/hooks/useSubscription";
import { usePlans, type Plan } from "@repo/api-client/hooks/usePlans";
import { useRealtimePlans, useRealtimeUserPlan } from "@repo/api-client/hooks/useRealtimeSync";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { cn } from "@repo/ui/lib/utils";

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  trial: Clock,
  starter: Zap,
  pro: Crown,
  growth: Rocket,
};

function TrialCountdown({ trialEnd }: { trialEnd: string }) {
  const end = new Date(trialEnd);
  const now = new Date();
  const daysLeft = differenceInDays(end, now);
  const hoursLeft = differenceInHours(end, now);

  const isUrgent = daysLeft < 2;
  const display =
    hoursLeft <= 0
      ? "Expired"
      : hoursLeft < 24
        ? `${hoursLeft}h remaining`
        : `${daysLeft}d remaining`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
        isUrgent
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {display}
    </div>
  );
}

function PlanCard({
  plan,
  onSelect,
  isProcessing,
}: {
  plan: Plan;
  onSelect: (plan: Plan) => void;
  isProcessing: boolean;
}) {
  const Icon = planIcons[plan.name] || Zap;
  const features = plan.features.length
    ? plan.features
    : [
        `${plan.max_listings || 0} active listings`,
        `${plan.credits_per_month || 0} credits/month`,
        `${plan.max_auto_orders || 0} auto orders`,
      ];

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-lg border bg-card p-5 shadow-sm",
        plan.is_popular ? "border-primary shadow-soft-lg" : "border-border",
      )}
    >
      {plan.is_popular && (
        <div className="absolute right-4 top-4 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
          Popular
        </div>
      )}
      <div className="mb-4">
        <div className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-display text-base font-semibold text-foreground">{plan.display_name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-3xl font-bold text-foreground">${plan.price_monthly}</span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
        {plan.price_yearly > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">or ${plan.price_yearly}/yr (~20% off)</p>
        )}
      </div>
      <ul className="mb-4 space-y-2">
        {features.slice(0, 5).map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-success/10 text-success">
              <Check className="h-2.5 w-2.5" />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4 border-t border-border">
        <Button
          variant={plan.is_popular ? "default" : "outline"}
          className="w-full h-10"
          disabled={isProcessing || !plan.stripe_price_id_monthly}
          onClick={() => onSelect(plan)}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade"}
        </Button>
      </div>
    </article>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    planName,
    plan,
    subscribed,
    subscriptionEnd,
    access,
    trial,
    billingInterval,
    cancelAtPeriodEnd,
    isLoading,
    createCheckout,
    openCustomerPortal,
    checkSubscription,
  } = useSubscription();
  const { plans, isLoading: plansLoading } = usePlans();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const refreshCallback = useCallback(() => {
    checkSubscription();
  }, [checkSubscription]);

  useRealtimePlans(refreshCallback);
  useRealtimeUserPlan(user?.id, refreshCallback);

  // Redirect no-plan users to choose-plan
  if (!isLoading && access === "none") {
    navigate("/choose-plan", { replace: true });
    return null;
  }

  const handleUpgrade = async (upgradePlan: Plan) => {
    if (!upgradePlan.stripe_price_id_monthly) return;
    setProcessingPlanId(upgradePlan.id);
    try {
      const { url } = await createCheckout(upgradePlan.id, "monthly", undefined, upgradePlan.stripe_price_id_monthly);
      if (url) window.location.href = url;
    } finally {
      setProcessingPlanId(null);
    }
  };

  // Plans to show as upgrades: paid plans only, exclude current
  const currentPlanObj = plans.find((p) => p.name === planName);
  const upgradePlans = plans.filter(
    (p) => !p.is_trial && p.name !== planName && p.price_monthly > (currentPlanObj?.price_monthly ?? 0),
  );

  if (isLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const intervalLabel =
    billingInterval === "yearly" ? "Yearly" : billingInterval === "monthly" ? "Monthly" : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground text-sm">Manage your plan, usage, and payment method</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => checkSubscription(true)}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          {(subscribed || access === "trial") && (
            <Button onClick={() => openCustomerPortal()}>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          )}
        </div>
      </div>

      {/* Current plan card */}
      <Card
        className={cn(
          "border",
          access === "past_due" && "border-destructive/50 bg-destructive/5",
          access === "trial" && "border-amber-400/40 bg-amber-500/5",
          access === "active" && "border-primary/30 bg-primary/5",
          access === "trial_expired" && "border-border",
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{plan?.display_name ?? "No active plan"}</CardTitle>
                {access === "trial" && (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">
                    Trial
                  </Badge>
                )}
                {access === "active" && (
                  <Badge variant="secondary" className="bg-success/20 text-success border-0">
                    Active
                  </Badge>
                )}
                {access === "past_due" && (
                  <Badge variant="destructive">Payment overdue</Badge>
                )}
                {access === "trial_expired" && (
                  <Badge variant="secondary">Trial expired</Badge>
                )}
              </div>

              {/* Trial countdown */}
              {access === "trial" && trial?.trial_end && (
                <TrialCountdown trialEnd={trial.trial_end} />
              )}

              {/* Active subscription details */}
              {access === "active" && subscriptionEnd && (
                <CardDescription className="text-sm">
                  {cancelAtPeriodEnd ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Cancels on {format(new Date(subscriptionEnd), "MMMM d, yyyy")} — access until then
                    </span>
                  ) : (
                    <>
                      {intervalLabel && (
                        <span className="mr-2 text-muted-foreground">{intervalLabel} billing</span>
                      )}
                      Renews {format(new Date(subscriptionEnd), "MMMM d, yyyy")}
                    </>
                  )}
                </CardDescription>
              )}

              {/* Trial end date */}
              {access === "trial" && trial?.trial_end && (
                <CardDescription className="text-sm">
                  Trial ends {format(new Date(trial.trial_end), "MMMM d, yyyy")}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Past due warning */}
      {access === "past_due" && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Payment failed</p>
              <p className="text-sm text-muted-foreground">
                Your last payment could not be processed. Update your payment method to keep your account active.
              </p>
              <Button size="sm" variant="destructive" onClick={() => openCustomerPortal()}>
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial expired — push to upgrade */}
      {access === "trial_expired" && (
        <Card className="border-amber-400/40 bg-amber-500/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Your trial has ended</p>
              <p className="text-sm text-muted-foreground">
                Upgrade to a paid plan to continue accessing SellerSuit.
              </p>
              <Button size="sm" onClick={() => navigate("/choose-plan")}>
                Choose a Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel at period end notice */}
      {access === "active" && cancelAtPeriodEnd && subscriptionEnd && (
        <Card className="border-amber-400/40 bg-amber-500/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Subscription cancellation scheduled</p>
              <p className="text-sm text-muted-foreground">
                Your subscription will end on {format(new Date(subscriptionEnd), "MMMM d, yyyy")}. Use the billing
                portal to reactivate.
              </p>
              <Button size="sm" variant="outline" onClick={() => openCustomerPortal()}>
                Reactivate Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade options */}
      {upgradePlans.length > 0 && access !== "trial_expired" && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
            {access === "trial" ? "Upgrade after your trial" : "Available upgrades"}
          </h2>
          <div
            className={cn(
              "grid gap-4",
              upgradePlans.length === 1 ? "max-w-xs" : "sm:grid-cols-2 max-w-2xl",
            )}
          >
            {upgradePlans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onSelect={handleUpgrade}
                isProcessing={processingPlanId === p.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Help */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Need help?</CardTitle>
          <CardDescription>
            Questions about billing, refunds, or plan changes? Our team is happy to help.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate("/contact")}>
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
