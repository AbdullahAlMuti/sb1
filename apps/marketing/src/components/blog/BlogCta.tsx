import { CtaButton } from "@/components/primitives/CtaButton";
import { siteConfig } from "@/config/siteConfig";

/**
 * In-content / end-of-article conversion band. Mirrors AutoDS's "Try for $1"
 * pattern — every article funnels to the primary CTA.
 */
export default function BlogCta({ compact = false }: { compact?: boolean }) {
  const cta = siteConfig.hero.primaryCta;
  return (
    <div
      className={`not-prose my-8 rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 ${
        compact ? "p-5" : "p-7"
      }`}
    >
      <p className="font-display text-lg font-bold">
        Start listing winning products to eBay in one click
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        SellerSuit scrapes supplier data and builds optimized eBay listings for you.
      </p>
      <div className="mt-4">
        <CtaButton cta={cta} trackProps={{ placement: "blog" }} />
      </div>
    </div>
  );
}
