import SeasonalBanner from "@/components/SeasonalBanner";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustBar from "@/components/TrustBar";
import ResearchSimulator from "@/components/ResearchSimulator";
import WorkflowSection from "@/components/WorkflowSection";
import ProblemComparison from "@/components/ProblemComparison";
import VisualPipeline from "@/components/VisualPipeline";
import FeaturesSection from "@/components/FeaturesSection";
import ProfitCalculator from "@/components/ProfitCalculator";
import PricingSection from "@/components/PricingSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQ from "@/components/FAQ";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SeasonalBanner />
      <Navbar />
      <main>
        <HeroSection />
        <TrustBar />
        <ResearchSimulator />
        <WorkflowSection />
        <ProblemComparison />
        <VisualPipeline />
        <FeaturesSection />
        <ProfitCalculator />
        <PricingSection />
        <TestimonialsSection />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
