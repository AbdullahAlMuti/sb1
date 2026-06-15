import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { siteConfig } from "@/config/siteConfig";
import { themeConfig } from "@/config/themeConfig";
import type { BillingInterval, PricingTier } from "@/config/types";
import { applySeasonalPricing, isCampaignActive } from "@/lib/seasonal";
import { CtaButton } from "@/components/primitives/CtaButton";
import { Reveal } from "@/components/primitives/Reveal";
import { track } from "@/lib/analytics";

const formatPrice = (n: number) =>
  Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;

const PricingSection = () => {
  const { pricing } = siteConfig;
  const campaign = themeConfig.seasonalCampaign;
  const campaignOn = isCampaignActive(campaign);
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const priceFor = (tier: PricingTier) => {
    if (tier.oneTime) {
      return { display: formatPrice(tier.priceMonthly), compareAt: null as string | null, suffix: tier.priceNote ?? "" };
    }
    const base = interval === "monthly" ? tier.priceMonthly : tier.priceYearly;
    const { final, compareAt } = tier.seasonalEligible
      ? applySeasonalPricing(base, campaign)
      : { final: base, compareAt: null };
    return {
      display: formatPrice(final),
      compareAt: compareAt !== null ? formatPrice(compareAt) : null,
      suffix: interval === "monthly" ? "/mo" : "/yr",
    };
  };

  const ctaFor = (tier: PricingTier) =>
    tier.oneTime ? tier.cta : { ...tier.cta, href: `${tier.cta.href}&interval=${interval}` };

  return (
    <section id="pricing" className="scroll-mt-24 border-b border-border bg-background py-20 sm:py-24">
      <div className="container px-4">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{pricing.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl text-balance">
            {pricing.heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{pricing.subheading}</p>

          {campaignOn && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm font-semibold text-success">
              <Sparkles className="h-4 w-4" />
              {campaign.label}: {campaign.discountPct}% off Starter &amp; Pro
            </div>
          )}
        </Reveal>

        {/* interval toggle */}
        <div className="mb-10 flex items-center justify-center">
          <div className="inline-flex rounded-full border border-border bg-secondary/60 p-1">
            {(["monthly", "yearly"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setInterval(opt);
                  track("pricing_interval_toggle", { interval: opt });
                }}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium capitalize transition-colors",
                  interval === opt ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt}
                {opt === "yearly" && <span className="ml-1.5 text-xs font-semibold text-success">save 20%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl items-stretch gap-4 md:grid-cols-3">
          {pricing.tiers.map((tier, index) => {
            const Icon = tier.icon;
            const price = priceFor(tier);
            const seasonalChip = campaignOn && tier.seasonalEligible && !tier.oneTime;

            return (
              <Reveal
                key={tier.slug}
                as="article"
                delay={index * 0.08}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
                  tier.highlighted ? "border-primary shadow-soft-lg md:-mt-3 md:mb-3" : "border-border",
                )}
              >
                {tier.badge && (
                  <div className="absolute right-5 top-5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                    {tier.badge}
                  </div>
                )}

                <div className="mb-5">
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">{tier.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>

                  <div className="mt-4 flex items-end gap-2">
                    {price.compareAt && (
                      <span className="mb-1 text-lg font-medium text-muted-foreground line-through">{price.compareAt}</span>
                    )}
                    <span className="font-display text-4xl font-bold text-foreground">{price.display}</span>
                    {price.suffix && <span className="mb-1 text-sm text-muted-foreground">{price.suffix}</span>}
                    {seasonalChip && (
                      <span className="mb-1.5 rounded-md bg-success/15 px-1.5 py-0.5 text-xs font-semibold text-success">
                        -{campaign.discountPct}%
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{tier.bestFor}</p>
                </div>

                <ul className="mb-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-foreground">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <CtaButton
                    cta={ctaFor(tier)}
                    variant={tier.highlighted ? "default" : "outline"}
                    size="lg"
                    className="w-full rounded-lg"
                    trackProps={{ plan: tier.slug, interval: tier.oneTime ? "one_time" : interval }}
                  />
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">{pricing.note}</p>
      </div>
    </section>
  );
};

export default PricingSection;
