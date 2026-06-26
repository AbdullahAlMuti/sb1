/**
 * Homepage — Bindplane-style layout.
 *
 * Content is fetched from the homepage-content Edge Function on mount,
 * with the compile-time fallback (siteConfig defaults) used immediately
 * while the fetch is in flight and on any network error. The page never
 * blanks — fallback content is visually identical to the old homepage.
 *
 * Section order follows the §1 spec:
 *  SeasonalBanner · MegaNav · HeroBlock · LogoMarquee · UseCasesGrid ·
 *  BenefitsGrid · NumberedFeatures · TrustBadges · MissionBlock ·
 *  CommunityLinks · FinalCtaBand · SiteFooter
 *
 * Existing components (HeroSection, TrustBar, FeaturesSection, etc.) are
 * preserved — they remain used by /features, /how-it-works, and other pages.
 */
import { useOutletContext } from "react-router-dom";
import { HeroBlock }        from "@/components/homepage/HeroBlock";
import { LogoMarquee }      from "@/components/homepage/LogoMarquee";
import ProblemComparison  from "@/components/ProblemComparison";
import { UseCasesGrid }     from "@/components/homepage/UseCasesGrid";
import { BenefitsGrid }     from "@/components/homepage/BenefitsGrid";
import ProfitCalculator     from "@/components/ProfitCalculator";
import { NumberedFeatures } from "@/components/homepage/NumberedFeatures";
import TestimonialsSection from "@/components/TestimonialsSection";
import { TrustBadges }      from "@/components/homepage/TrustBadges";
import { MissionBlock }     from "@/components/homepage/MissionBlock";
import { CommunityLinks }   from "@/components/homepage/CommunityLinks";
import { FinalCtaBand }     from "@/components/homepage/FinalCtaBand";
import { useSeo, SITE_URL, organizationJsonLd } from "@/lib/useSeo";
import type { HomepageContent } from "@repo/types";

const Index = () => {
  const { content } = useOutletContext<{ content: HomepageContent }>();

  // Managed <head> for the homepage so client-side navigation back to "/" keeps
  // the correct title/description (the static index.html only applies on first
  // server load). We inject only Organization structured data here — the static
  // index.html already ships a richer SoftwareApplication block (with rating),
  // so duplicating it at runtime would create conflicting structured data.
  // Description tracks the live (DB-or-fallback) hero copy.
  useSeo({
    title: "SellerSuit — List Winning Products to eBay in One Click",
    description: content.hero.subtitle,
    canonical: SITE_URL,
    jsonLd: [organizationJsonLd()],
  });

  return (
    <>
      {/* 1. Hero */}
      <HeroBlock hero={content.hero} />

      {/* 2. Logo cloud / marquee */}
      <LogoMarquee cloud={content.logo_cloud} />

      {/* 3. Side-by-side Manual vs Automated comparison */}
      <ProblemComparison />

      {/* 4. Use cases — 4-card grid */}
      <UseCasesGrid useCases={content.use_cases} />

      {/* 5. Benefits — 4-item icon grid */}
      <BenefitsGrid benefits={content.benefits} />

      {/* 6. Live Margin & Profit Calculator */}
      <ProfitCalculator />

      {/* 7. Numbered features — 3 alternating blocks */}
      <NumberedFeatures features={content.features} />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* 8. Trust / certifications */}
      <TrustBadges trust={content.trust} />

      {/* 9. Mission / technology */}
      <MissionBlock mission={content.mission} />

      {/* 10. Community link cards */}
      <CommunityLinks community={content.community} />

      {/* 11. Final CTA band */}
      <FinalCtaBand finalCta={content.final_cta} />
    </>
  );
};

export default Index;
