import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AgentCapabilitiesSection from "@/components/AgentCapabilitiesSection";
import VeroCheckSection from "@/components/VeroCheckSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useSeo } from "@/lib/useSeo";

const Index = () => {
  useSeo({
    title: "SellerSuit — List Winning Products to eBay in One Click",
    description: "SellerSuit scrapes product data from Amazon, Walmart, and AliExpress and auto-uploads optimized listings to eBay — with a SKU engine, profit calculator, bulk upload, and a live dashboard.",
    canonical: "https://www.sellersuit.com",
  });

  return (
    <div style={{ background: "#ffffff" }}>
      <Navbar />
      <main style={{ overflowX: "hidden" }}>
        <HeroSection />
        <AgentCapabilitiesSection />
        <VeroCheckSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
