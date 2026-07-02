import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AgentCapabilitiesSection from "@/components/AgentCapabilitiesSection";
import VeroCheckSection from "@/components/VeroCheckSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => (
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

export default Index;
