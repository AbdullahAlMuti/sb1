import FAQSection from "@/components/FAQ";
import CTASection from "@/components/CTASection";
import { useSeo, SITE_URL } from "@/lib/useSeo";

export default function FAQPage() {
  useSeo({
    title: "FAQ | SellerSuit",
    description: "Frequently asked questions about SellerSuit, automated dropshipping, extension features, pricing, and eBay compliance.",
    canonical: `${SITE_URL}/faq`,
  });

  return (
    <div className="pt-24 flex-1">
      <FAQSection />
      <CTASection />
    </div>
  );
}
