import Navbar from "@/components/Navbar";
import { AboutHeroBento } from "@/components/about/AboutHeroBento";
import { AboutMissionMetrics } from "@/components/about/AboutMissionMetrics";
import { AboutCoreValues } from "@/components/about/AboutCoreValues";
import { AboutFounderWord } from "@/components/about/AboutFounderWord";
import { AboutTeamGrid } from "@/components/about/AboutTeamGrid";
import { AboutTestimonials } from "@/components/about/AboutTestimonials";
import { AboutOffices } from "@/components/about/AboutOffices";
import Footer from "@/components/Footer";
import { useSeo } from "@/lib/useSeo";

export default function About() {
  useSeo({
    title: "About Us | SellerSuit — Next-Gen Marketplace Automation",
    description: "Learn about SellerSuit's mission, team, and technology powering thousands of high-velocity eBay sellers and e-commerce enterprises worldwide.",
    canonical: "https://www.sellersuit.com/about",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1" style={{ overflowX: "hidden" }}>
        <AboutHeroBento />
        <AboutMissionMetrics />
        <AboutCoreValues />
        <AboutFounderWord />
        <AboutTeamGrid />
        <AboutTestimonials />
        <AboutOffices />
      </main>
      <Footer />
    </div>
  );
}
