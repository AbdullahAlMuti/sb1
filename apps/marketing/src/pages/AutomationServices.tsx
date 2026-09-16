import Navbar from "@/components/Navbar";
import AutomationServicesSection from "@/components/AutomationServicesSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useSeo } from "@/lib/useSeo";

const AutomationServices = () => {
  useSeo({
    title: "AI Automation Services — N8n Workflows, Hermes Agents & OpenClaw Pipelines | SellerSuit",
    description: "Explore enterprise AI automation services: custom N8n multi-step workflows, Hermes autonomous agents, OpenClaw scrapers, and automated multi-agent pipelines.",
    canonical: "https://www.sellersuit.com/automation-services",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1" style={{ overflowX: "hidden" }}>
        <AutomationServicesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default AutomationServices;
