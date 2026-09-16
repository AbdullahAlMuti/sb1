import { useState } from "react";
import {
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Sparkles,
  X,
  Palette,
  Layout,
  Cpu,
  CreditCard,
  ShoppingBag,
  BarChart3,
  Store,
  Smartphone,
  Boxes,
  Cloud,
} from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { ServiceItem } from "@/config/types";
import { track } from "@/lib/analytics";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/ui/button";

const iconMap: Record<string, React.ReactNode> = {
  Palette: <Palette className="w-5 h-5" />,
  Layout: <Layout className="w-5 h-5" />,
  Cpu: <Cpu className="w-5 h-5" />,
  CreditCard: <CreditCard className="w-5 h-5" />,
  ShoppingBag: <ShoppingBag className="w-5 h-5" />,
  BarChart3: <BarChart3 className="w-5 h-5" />,
  Store: <Store className="w-5 h-5" />,
  CheckCircle2: <CheckCircle2 className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
  Boxes: <Boxes className="w-5 h-5" />,
  Cloud: <Cloud className="w-5 h-5" />,
};

// 3D-styled geometric SVG mockups for each service card background
const ServiceMockupArt = ({ serviceId }: { serviceId: string }) => {
  switch (serviceId) {
    case "branding":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <svg className="w-full h-full object-cover" viewBox="0 0 800 500" fill="none">
            <rect x="350" y="80" width="360" height="240" rx="16" transform="rotate(-12 350 80)" fill="#fb923c" fillOpacity="0.4" />
            <rect x="420" y="140" width="320" height="200" rx="16" transform="rotate(-6 420 140)" fill="#f97316" fillOpacity="0.5" />
            <circle cx="280" cy="180" r="48" fill="#fdba74" fillOpacity="0.6" />
            <rect x="180" y="260" width="220" height="120" rx="12" transform="rotate(8 180 260)" fill="#ffedd5" fillOpacity="0.7" />
          </svg>
        </div>
      );
    case "uiux":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <svg className="w-full h-full object-cover" viewBox="0 0 800 500" fill="none">
            <rect x="400" y="60" width="340" height="220" rx="20" fill="#38bdf8" fillOpacity="0.4" />
            <rect x="250" y="140" width="280" height="200" rx="16" transform="rotate(10 250 140)" fill="#0ea5e9" fillOpacity="0.5" />
            <rect x="440" y="200" width="220" height="140" rx="12" fill="#bae6fd" fillOpacity="0.6" />
          </svg>
        </div>
      );
    case "ml-ai":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <svg className="w-full h-full object-cover" viewBox="0 0 800 500" fill="none">
            <circle cx="550" cy="220" r="160" fill="#a855f7" fillOpacity="0.3" />
            <polygon points="450,120 620,100 680,240 520,280" fill="#c084fc" fillOpacity="0.4" />
            <circle cx="340" cy="180" r="70" fill="#e9d5ff" fillOpacity="0.5" />
          </svg>
        </div>
      );
    case "payment-solution":
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <svg className="w-full h-full object-cover" viewBox="0 0 800 500" fill="none">
            <rect x="420" y="90" width="320" height="190" rx="16" transform="rotate(-8 420 90)" fill="#34d399" fillOpacity="0.4" />
            <rect x="360" y="160" width="300" height="180" rx="16" transform="rotate(4 360 160)" fill="#10b981" fillOpacity="0.5" />
            <circle cx="260" cy="220" r="54" fill="#a7f3d0" fillOpacity="0.6" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <svg className="w-full h-full object-cover" viewBox="0 0 800 500" fill="none">
            <rect x="450" y="80" width="300" height="240" rx="20" transform="rotate(-5 450 80)" fill="currentColor" fillOpacity="0.25" />
            <circle cx="320" cy="200" r="80" fill="currentColor" fillOpacity="0.2" />
          </svg>
        </div>
      );
  }
};

export const OurServicesSection = () => {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const services = siteConfig.services || [];

  const categories = ["ALL", ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  const filteredServices =
    activeCategory === "ALL"
      ? services
      : services.filter((s) => s.category === activeCategory);

  const handleOpenDetail = (service: ServiceItem) => {
    track("view_service_detail", { service: service.title });
    setSelectedService(service);
  };

  const handleScrollToNext = (index: number) => {
    const nextService = services[index + 1] || services[0];
    const element = document.getElementById(`service-${nextService.id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section id="our-services-section" className="relative py-24 bg-[#faf9f6] dark:bg-slate-950 overflow-hidden">
      <div className="container px-4 max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* Editorial Split Hero Header (Matching Reference Design)                  */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16 pb-12 border-b border-slate-200/80 dark:border-slate-800">
          {/* Left: Giant Display Heading with Geometric Ligatures */}
          <div className="max-w-xl">
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.05]">
              <span className="inline-block relative">
                ӨurCompany
              </span>
              <br />
              <span>Service!</span>
            </h2>
          </div>

          {/* Center: Minimalist floating pill divider */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-6 h-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
          </div>

          {/* Right: Editorial Agency Statement */}
          <div className="max-w-md lg:text-left">
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              We are a full-service digital agency that builds immersive user experience.
              Our team creates an exceptional visualization and thought-out functionality.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> 11 Enterprise Capabilities
              </span>
            </div>
          </div>
        </div>

        {/* Category Jump Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat || "ALL")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer",
                activeCategory === cat
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white border border-slate-200/60 dark:border-slate-800"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* Stacked Full-Bleed Showcase Cards (Directly Inspired by Reference)        */}
        {/* ========================================================================= */}
        <div className="space-y-10">
          {filteredServices.map((service, index) => (
            <div
              key={service.id}
              id={`service-${service.id}`}
              className={cn(
                "group relative w-full min-h-[380px] sm:min-h-[440px] md:min-h-[500px] rounded-3xl overflow-hidden shadow-xl border border-black/10 dark:border-white/10 transition-all duration-300 hover:shadow-2xl hover:scale-[1.008]",
                "bg-slate-900"
              )}
            >
              {/* Realistic High-Definition Backdrop Image with Hover Zoom */}
              {service.previewImage ? (
                <img
                  src={service.previewImage}
                  alt={service.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <ServiceMockupArt serviceId={service.id} />
              )}

              {/* Dynamic Contrast & Gradient Tint Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25 pointer-events-none" />
              <div
                className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none transition-opacity duration-300 group-hover:opacity-40"
                style={{ backgroundColor: service.accentColor }}
              />

              {/* Floating Top Bar with Category & Floating Arrow Button */}
              <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md text-white backdrop-blur-md"
                    style={{ backgroundColor: service.accentColor }}
                  >
                    {iconMap[service.iconName] || <Sparkles className="w-5 h-5" />}
                  </span>
                  <span className="text-xs font-bold tracking-wider uppercase text-white/90 backdrop-blur-md bg-black/40 px-3 py-1 rounded-full border border-white/15">
                    {service.category || "Service"}
                  </span>
                </div>

                {/* Floating circular arrow action button (matching reference) */}
                <button
                  type="button"
                  onClick={() => handleOpenDetail(service)}
                  aria-label={`View ${service.title} details`}
                  className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl transition-all duration-300 hover:scale-110 hover:bg-white hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                >
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Floating Circular 'Scroll Down for more details' badge (Reference Replica) */}
              <div className="absolute top-1/2 right-8 -translate-y-1/2 hidden md:flex items-center justify-center z-20">
                <button
                  type="button"
                  onClick={() => handleScrollToNext(index)}
                  className="relative group/badge flex h-24 w-24 items-center justify-center rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white shadow-2xl transition-transform hover:scale-105 cursor-pointer"
                >
                  {/* Subtle rotating helper border */}
                  <div className="absolute inset-1 rounded-full border border-dashed border-white/30 animate-[spin_12s_linear_infinite]" />
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <ArrowDown className="w-5 h-5 text-orange-400 group-hover/badge:translate-y-1 transition-transform" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-white/90 mt-1 leading-tight">
                      Scroll Down
                    </span>
                  </div>
                </button>
              </div>

              {/* Bottom Card Content: ALL-CAPS Headline + Deliverable Pills */}
              <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-10 right-6 z-20 max-w-3xl">
                {/* STRICTLY ALL CAPITALS */}
                <h3 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                  {service.title}
                </h3>

                <p className="mt-2 text-sm sm:text-base text-white/80 font-medium max-w-xl line-clamp-2 drop-shadow-sm">
                  {service.description}
                </p>

                {/* Deliverables tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {service.deliverables.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white border border-white/10"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(service)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 text-xs sm:text-sm font-bold shadow-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Explore Capabilities
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Interactive Detail Modal / Slide-over                                    */}
      {/* ========================================================================= */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8"
            role="dialog"
            aria-modal="true"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedService(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-2 rounded-full text-white bg-black/60 hover:bg-black/80 backdrop-blur-md transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Image Banner */}
            {selectedService.previewImage && (
              <div className="relative w-full h-48 sm:h-56 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-6 overflow-hidden bg-slate-950">
                <img
                  src={selectedService.previewImage}
                  alt={selectedService.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-black/40" />
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ backgroundColor: selectedService.accentColor }}
              >
                {iconMap[selectedService.iconName] || <Sparkles className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {selectedService.category || "Service"}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
                  {selectedService.title}
                </h3>
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
              {selectedService.description}
            </p>

            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3">
                Key Deliverables & Specifications
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedService.deliverables.map((deliv) => (
                  <div
                    key={deliv}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{deliv}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Custom contracts & enterprise SLA available
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setSelectedService(null)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <Button
                  asChild
                  className="w-full sm:w-auto bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 font-bold"
                >
                  <a
                    href="#contact"
                    onClick={() => {
                      setSelectedService(null);
                      const el = document.getElementById("cta-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Request a Proposal →
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OurServicesSection;
