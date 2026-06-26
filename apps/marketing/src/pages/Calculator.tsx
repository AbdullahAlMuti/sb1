import ProfitCalculator from "@/components/ProfitCalculator";
import CTASection from "@/components/CTASection";
import { useSeo, SITE_URL } from "@/lib/useSeo";

export default function Calculator() {
  useSeo({
    title: "Profit Calculator | SellerSuit",
    description: "Use our eBay dropshipping profit calculator to estimate your margins, fees, ROI, and final pricing before you list.",
    canonical: `${SITE_URL}/calculator`,
  });

  return (
    <div className="pt-24 flex-1">
      <ProfitCalculator />
      <CTASection />
    </div>
  );
}
