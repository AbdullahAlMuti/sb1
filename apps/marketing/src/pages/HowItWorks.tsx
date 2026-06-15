import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <WorkflowSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
