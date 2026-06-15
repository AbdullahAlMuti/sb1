import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
