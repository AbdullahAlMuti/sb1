import Navbar from "@/components/Navbar";
import OurServicesSection from "@/components/OurServicesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useSeo } from "@/lib/useSeo";

const Services = () => {
  useSeo({
    title: "Our Services — Full-Service Digital Agency & Enterprise Engineering",
    description:
      "Explore SellerSuit's 11 enterprise capabilities: BRANDING, UI/UX, ML & AI DEVELOPMENT, PAYMENT SOLUTION, ECOMMERCE DEVELOPMENT, and more.",
    canonical: "https://www.sellersuit.com/services",
  });

  return (
    <div className="min-h-screen bg-[#ffffff] dark:bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-1" style={{ overflowX: "hidden" }}>
        <OurServicesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Services;
