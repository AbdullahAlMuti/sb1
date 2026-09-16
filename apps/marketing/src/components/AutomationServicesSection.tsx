import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { AutomationWorkflowItem } from "@/config/types";
import { track } from "@/lib/analytics";
import { cn } from "@repo/ui/lib/utils";

export const AutomationServicesSection = () => {
  const config = siteConfig.automationServices;
  const eyebrow = config?.eyebrow || "Automate Everything";
  const heading = config?.heading || "AI where your team works.";
  const subheading =
    config?.subheading ||
    "Eliminate repetitive manual tasks with custom enterprise automation pipelines, autonomous agent decision engines, and resilient data extractors engineered to scale.";
  const items = config?.items ?? [];

  const handleCtaClick = (item: AutomationWorkflowItem, e: React.MouseEvent<HTMLAnchorElement>) => {
    track("click_automation_cta", { automation: item.id, title: item.title });
    const target = document.getElementById("cta-section") || document.getElementById("contact");
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="automation-services-section" className="relative py-24 sm:py-32 bg-background overflow-hidden">
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-10 w-[500px] h-[400px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative px-4 max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* Editorial Section Header                                                  */}
        {/* ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
          className="text-center max-w-3xl mx-auto mb-20 sm:mb-28"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{eyebrow}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08] text-balance">
            {heading}
          </h2>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground font-normal leading-relaxed text-balance">
            {subheading}
          </p>
        </motion.div>

        {/* ========================================================================= */}
        {/* Alternating Split Rows for Each Workflow Capability                       */}
        {/* ========================================================================= */}
        <div className="space-y-24 sm:space-y-32 lg:space-y-40">
          {items.map((item, index) => {
            const isEven = index % 2 === 0;

            return (
              <motion.div
                key={item.id}
                id={`workflow-${item.id}`}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
                className={cn(
                  "flex flex-col gap-10 sm:gap-14 lg:gap-16 items-center",
                  isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                )}
              >
                {/* ----------------------------------------------------------------- */}
                {/* Video Column with Simulated macOS / Browser Frame                 */}
                {/* ----------------------------------------------------------------- */}
                <div className="w-full lg:w-1/2 flex-1 relative group">
                  {/* Subtle accent color aura backdrop */}
                  <div
                    className="absolute -inset-2 rounded-3xl opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-35 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${item.accentColor} 0%, transparent 70%)`,
                    }}
                  />

                  {/* Device Container Card */}
                  <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-slate-900 shadow-2xl transition-all duration-300 group-hover:border-slate-700">
                    {/* macOS / Terminal Top Window Bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-white/10 backdrop-blur-md">
                      {/* Window Traffic Lights */}
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
                        <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
                        <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
                      </div>

                      {/* Simulated Engine Protocol Address Bar */}
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-slate-400 max-w-[200px] sm:max-w-xs truncate">
                        <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">engine://{item.id}</span>
                      </div>

                      {/* Active Status Badge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="hidden sm:inline">Active Loop</span>
                      </div>
                    </div>

                    {/* HTML5 Looping Video Component */}
                    <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-slate-950 overflow-hidden">
                      <video
                        src={item.videoSrc}
                        poster={item.posterSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        aria-label={`Demo video: ${item.title}`}
                        title={item.title}
                        className="w-full h-full object-cover rounded-b-xl"
                      />
                      {/* Inner frame shadow/highlight */}
                      <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10" />
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------------------- */}
                {/* Narrative & Capabilities Card Column                              */}
                {/* ----------------------------------------------------------------- */}
                <div className="w-full lg:w-1/2 flex-1 flex flex-col justify-center">
                  {/* Category Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm"
                      style={{
                        borderColor: `${item.accentColor}40`,
                        backgroundColor: `${item.accentColor}12`,
                        color: item.accentColor,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: item.accentColor }}
                      />
                      {item.badge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                    {item.title}
                  </h3>

                  {/* Tagline */}
                  <p
                    className="mt-2 text-sm sm:text-base font-semibold"
                    style={{ color: item.accentColor }}
                  >
                    {item.tagline}
                  </p>

                  {/* Description */}
                  <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>

                  {/* 4 Capability Pills Grid */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {item.capabilities.map((capability, capIdx) => (
                      <div
                        key={capIdx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs transition-colors hover:border-border"
                      >
                        <CheckCircle2
                          className="w-4 h-4 mt-0.5 shrink-0"
                          style={{ color: item.accentColor }}
                        />
                        <span className="text-xs sm:text-sm font-medium text-foreground/90 leading-snug">
                          {capability}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Action Button */}
                  <div className="mt-8 flex items-center gap-4">
                    <a
                      href="#cta-section"
                      onClick={(e) => handleCtaClick(item, e)}
                      className="group/cta inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-xs sm:text-sm font-bold shadow-md transition-all duration-200 hover:bg-foreground/90 hover:shadow-lg active:scale-[0.98] cursor-pointer"
                    >
                      <span>{item.ctaText || "Request Custom Automation →"}</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/cta:translate-x-1" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AutomationServicesSection;
