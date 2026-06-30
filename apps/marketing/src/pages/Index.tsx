import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ShowcasesSection from "@/components/ShowcasesSection";
import AgentCapabilitiesSection from "@/components/AgentCapabilitiesSection";
import TogetherSection from "@/components/TogetherSection";
import StatsMarquee from "@/components/StatsMarquee";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => (
  <div style={{ background: "#ffffff", overflowX: "hidden" }}>
    <Navbar />
    <main>
      <HeroSection />
      <ShowcasesSection />
      <AgentCapabilitiesSection />
      <TogetherSection />
      <StatsMarquee />
      <CTASection />
    </main>
    <Footer />
  </div>
);

export default Index;
