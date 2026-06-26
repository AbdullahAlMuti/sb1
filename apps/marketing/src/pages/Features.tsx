import FeaturesSection from "@/components/FeaturesSection";
import CTASection from "@/components/CTASection";
import { useSeo, SITE_URL } from "@/lib/useSeo";

export default function Features() {
  useSeo({
    title: "Features | SellerSuit",
    description: "Explore the complete arbitrage workflow in one extension: supplier scraper, SKU engine, profit calculator, bulk upload, and live dashboard.",
    canonical: `${SITE_URL}/features`,
  });

  return (
    <div className="pt-24 flex-1">
      <FeaturesSection />
      <CTASection />
    </div>
  );
}
