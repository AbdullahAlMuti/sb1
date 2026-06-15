import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricingSection from "@/components/PricingSection";
import CTASection from "@/components/CTASection";
import { useSeo, SITE_URL } from "@/lib/useSeo";

export default function Pricing() {
  useSeo({
    title: "Pricing Plans | SellerSuit",
    description: "Start dropshipping on eBay for just $1. Choose the plan that fits your business scale and active listings.",
    canonical: `${SITE_URL}/pricing`,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
