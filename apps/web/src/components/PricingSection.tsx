import { forwardRef, useState } from "react";
import { Check, X, Clock, Crown, Rocket, Zap, Sparkles } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { CheckoutDialog } from "./checkout/CheckoutDialog";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { usePlans, type Plan } from "@repo/api-client/hooks/usePlans";
import { useSubscription } from "@repo/auth/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { cn } from "@repo/ui/lib/utils";
import ComparisonTable from "./ComparisonTable";
import PricingFAQ from "./PricingFAQ";
import TrustSection from "./TrustSection";

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trial: Clock,
  starter: Zap,
  pro: Crown,
  growth: Rocket,
  enterprise: Sparkles,
};

type BillingInterval = "monthly" | "yearly";

// --- Skeleton ---

function PlanCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm animate-pulse">
      <div className="mb-6">
        <div className="mb-4 h-10 w-10 rounded-md bg-muted" />
        <div className="h-6 w-28 rounded bg-muted" />
        <div className="mt-2 h-4 w-44 rounded bg-muted" />
        <div className="mt-4 h-10 w-24 rounded bg-muted" />
      </div>
      <div className="mb-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-muted" />
            <div className="h-4 flex-1 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="mt-auto border-t border-border pt-5">
        <div className="h-11 w-full rounded-lg bg-muted" />
      </div>
    </div>
  );
}

// --- Plan card ---

interface PlanCardProps {
  plan: Plan;
  billingInterval: BillingInterval;
  isCurrentPlan: boolean;
  trialUsed: boolean;
  onSelect: (plan: Plan) => void;
}

function PlanCard({ plan, billingInterval, isCurrentPlan, trialUsed, onSelect }: PlanCardProps) {
  const Icon = PLAN_ICONS[plan.slug ?? plan.name.toLowerCase()] ?? Zap;
  const isFeatured = plan.is_recommended || plan.is_popular;
  const isTrialPlan = Boolean(plan.is_trial);
  const trialDays = plan.trial_duration_days || 7;

  const displayPrice = isTrialPlan
    ? 1
    : billingInterval === "yearly" && plan.price_yearly > 0
      ? plan.price_yearly / 12
      : plan.price_monthly;

  const highlightedFeatures = plan.plan_features.filter(f => f.is_highlighted).slice(0, 5);
  const fallbackFeatures = plan.plan_features.slice(0, 5);
  const featuresToShow = highlightedFeatures.length ? highlightedFeatures : fallbackFeatures;

  const ctaLabel = isCurrentPlan
    ? "Current plan"
    : trialUsed
      ? "Trial used"
      : plan.cta_text || (isTrialPlan ? "Start $1 Trial" : "Get Started");

  const badge = isCurrentPlan
    ? { label: "Current", className: "bg-success text-primary-foreground" }
    : plan.badge_text && !trialUsed
      ? { label: plan.badge_text, className: isFeatured ? "bg-primary text-primary-foreground" : "bg-amber-500/20 text-amber-600 dark:text-amber-400" }
      : null;

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
        isFeatured ? "border-primary shadow-soft-lg" : "border-border",
        isCurrentPlan && "ring-2 ring-success/60",
        isTrialPlan && !isCurrentPlan && "border-dashed border-muted-foreground/40",
      )}
    >
      {badge && (
        <div className={cn("absolute right-4 top-4 rounded-md px-2.5 py-1 text-xs font-semibold", badge.className)}>
          {badge.label}
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground">
          {plan.display_name || plan.name}
        </h3>
        {plan.short_description && (
          <p className="mt-1 text-sm text-muted-foreground leading-snug">
            {plan.short_description}
          </p>
        )}
        {plan.best_for && (
          <p className="mt-1 text-xs font-medium text-muted-foreground/70">
            Best for: {plan.best_for}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold text-foreground">
            ${isTrialPlan
              ? "1"
              : displayPrice % 1 === 0
                ? displayPrice
                : displayPrice.toFixed(2)}
          </span>
          {isTrialPlan ? (
            <span className="text-sm text-muted-foreground">/ {trialDays} days</span>
          ) : (
            <span className="text-sm text-muted-foreground">/mo</span>
          )}
        </div>
        {!isTrialPlan && billingInterval === "yearly" && plan.price_yearly > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Billed ${plan.price_yearly}/yr
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="mb-6 space-y-2.5">
        {featuresToShow.map(f => (
          <li key={f.id} className="flex items-start gap-3 text-sm">
            {f.included ? (
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                <Check className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground/50">
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <span className={cn("leading-snug", f.included ? "text-foreground" : "text-muted-foreground/60")}>
              {f.display_value && f.display_value !== "✓" && f.display_value !== "✗"
                ? `${f.title}: ${f.display_value}`
                : f.title}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-auto border-t border-border pt-5">
        <Button
          variant={isFeatured ? "default" : "outline"}
          className={cn(
            "h-11 w-full rounded-lg",
            isTrialPlan && !isCurrentPlan && !trialUsed &&
              "border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20",
          )}
          disabled={isCurrentPlan || trialUsed}
          onClick={() => onSelect(plan)}
        >
          {ctaLabel}
        </Button>
      </div>
    </article>
  );
}

// --- Main section ---

const PricingSection = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createCheckout, planName: currentPlanName, access } = useSubscription();
  const { plans, isLoading } = usePlans();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");

  const hasYearlyPlans = plans.some(p => !p.is_trial && p.price_yearly > 0);
  const publicPlans = plans.filter(p => !p.is_trial || p.is_active);

  const handlePlanSelect = (plan: Plan) => {
    if (!user) {
      localStorage.setItem("selectedPlanId", plan.id);
      localStorage.setItem("selectedPlanName", plan.name);
      localStorage.setItem("selectedPlan", plan.name);
      navigate("/register", { state: { selectedPlan: plan.name } });
      return;
    }

    const hasPriceConfigured = plan.is_trial
      ? Boolean(plan.stripe_price_id_one_time)
      : Boolean(plan.stripe_price_id_monthly);

    if (hasPriceConfigured) {
      setSelectedPlan(plan);
      setCheckoutDialogOpen(true);
      return;
    }

    navigate("/dashboard/settings");
  };

  const handleCheckout = async (couponCode?: string) => {
    if (!selectedPlan) return;

    const priceId = selectedPlan.is_trial
      ? (selectedPlan.stripe_price_id_one_time ?? undefined)
      : billingInterval === "yearly"
        ? (selectedPlan.stripe_price_id_yearly ?? undefined)
        : (selectedPlan.stripe_price_id_monthly ?? undefined);

    if (!priceId) return;

    const { url } = await createCheckout(
      selectedPlan.id,
      selectedPlan.is_trial ? "monthly" : billingInterval,
      selectedPlan.is_trial ? undefined : couponCode,
      priceId,
    );
    if (url) window.location.href = url;
  };

  const gridCols = cn(
    "mx-auto grid gap-4",
    publicPlans.length <= 2
      ? "max-w-3xl md:grid-cols-2"
      : publicPlans.length === 3
        ? "max-w-5xl md:grid-cols-3"
        : "max-w-6xl md:grid-cols-2 xl:grid-cols-4",
  );

  return (
    <section ref={ref} id="pricing" className="border-b border-border bg-background py-20 sm:py-24">
      <div className="container px-4">

        {/* Hero */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Plans that scale with your eBay store.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Start with a $1 trial. Upgrade as you grow. Every plan includes real automation,
            AI-powered tools, and direct eBay listing — no free tier, no compromises.
          </p>
        </div>

        {/* Monthly / Yearly toggle */}
        {hasYearlyPlans && (
          <div className="mb-10 flex items-center justify-center gap-3">
            <span className={cn("text-sm font-medium", billingInterval === "monthly" ? "text-foreground" : "text-muted-foreground")}>
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={billingInterval === "yearly"}
              onClick={() => setBillingInterval(billingInterval === "monthly" ? "yearly" : "monthly")}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                billingInterval === "yearly" ? "bg-primary" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform",
                  billingInterval === "yearly" ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
            <span className={cn("flex items-center gap-1.5 text-sm font-medium", billingInterval === "yearly" ? "text-foreground" : "text-muted-foreground")}>
              Yearly
              <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-xs font-semibold text-success">
                Save ~20%
              </span>
            </span>
          </div>
        )}

        {/* Plan cards */}
        {isLoading ? (
          <div className={gridCols}>
            {[...Array(3)].map((_, i) => <PlanCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className={gridCols}>
            {publicPlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingInterval={billingInterval}
                isCurrentPlan={currentPlanName === plan.name && Boolean(user)}
                trialUsed={
                  Boolean(plan.is_trial) && Boolean(user) &&
                  (access === "trial" || access === "trial_expired")
                }
                onSelect={handlePlanSelect}
              />
            ))}
          </div>
        )}

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
          All plans include Stripe-secured checkout. Upgrade, downgrade, or cancel anytime.
        </p>

        {/* Feature comparison table */}
        {!isLoading && <ComparisonTable plans={publicPlans} />}

        {/* FAQ */}
        <PricingFAQ />

        {/* Trust / security */}
        <TrustSection />

      </div>

      <CheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        plan={selectedPlan}
        billingInterval={selectedPlan?.is_trial ? "monthly" : billingInterval}
        onCheckout={handleCheckout}
      />
    </section>
  );
});

PricingSection.displayName = "PricingSection";

export default PricingSection;
