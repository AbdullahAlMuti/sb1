import WorkflowSection from "@/components/WorkflowSection";
import CTASection from "@/components/CTASection";
import { useSeo, SITE_URL } from "@/lib/useSeo";

export default function HowItWorks() {
  useSeo({
    title: "How It Works | SellerSuit",
    description: "Learn how SellerSuit automates your eBay dropshipping workflow in three simple steps: scrape, edit, and auto-upload.",
    canonical: `${SITE_URL}/how-it-works`,
  });

  return (
    <div className="pt-24 flex-1">
      <WorkflowSection />
      <CTASection />
    </div>
  );
}
