import { forwardRef, useState } from "react";
import { Building2, Check, Crown, Loader2, Rocket, Zap } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { CheckoutDialog } from "./checkout/CheckoutDialog";
import { usePlans, type Plan } from "@repo/api-client/hooks/usePlans";
import { useNavigate, createSearchParams } from "react-router-dom";
import { cn } from "@repo/ui/lib/utils";

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Crown,
  starter: Zap,
  growth: Rocket,
  enterprise: Building2,
};

const PricingSection = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const { plans, isLoading } = usePlans();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const handlePlanSelect = (plan: Plan) => {
    localStorage.setItem("selectedPlanId", plan.id);
    localStorage.setItem("selectedPlanName", plan.name);
    localStorage.setItem("selectedPlan", plan.name);
    navigate(`/register?plan=${plan.name}`);
  };

  return (
    <section ref={ref} id="pricing" className="border-b border-border bg-background py-20 sm:py-24">
      <div className="container px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Pricing</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Plans that scale with listing volume.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Keep the pricing surface simple: credits, listings, automation, and order usage
            should be obvious before a seller upgrades.
          </p>
        </div>

        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-border bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto grid gap-4",
              plans.length <= 2
                ? "max-w-3xl md:grid-cols-2"
                : plans.length === 3
                  ? "max-w-5xl md:grid-cols-3"
                  : "max-w-6xl md:grid-cols-2 xl:grid-cols-4",
            )}
          >
            {plans.map((plan) => {
              const Icon = planIcons[plan.name] || Zap;
              const isFeatured = plan.is_popular || (plans.length <= 2 && plan.price_monthly > 0);
              const isPaid = plan.price_monthly > 0;
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
                    "relative flex flex-col rounded-lg border bg-card p-6 shadow-sm",
                    isFeatured ? "border-primary shadow-soft-lg" : "border-border",
                  )}
                >
                  {isFeatured && (
                    <div className="absolute right-4 top-4 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                      Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-foreground">{plan.display_name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-display text-4xl font-bold text-foreground">${plan.price_monthly}</span>
                      {isPaid && <span className="text-sm text-muted-foreground">/mo</span>}
                    </div>
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
                      variant={isFeatured ? "default" : "outline"}
                      className="h-11 w-full rounded-lg"
                      onClick={() => handlePlanSelect(plan)}
                    >
                      {isPaid ? "Upgrade" : "Start free"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
          Stripe checkout, plan limits, credit usage, and order limits are already represented
          in your project structure.
        </p>
      </div>
    </section>
  );
});

PricingSection.displayName = "PricingSection";

export default PricingSection;
