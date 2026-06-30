import { motion } from "framer-motion";
import { siteConfig } from "@/config/siteConfig";
import { Reveal } from "@/components/primitives/Reveal";
import { 
  Database, 
  Cpu, 
  ShoppingBag, 
  CheckCircle 
} from "lucide-react";

export default function VisualPipeline() {
  const { visualPipeline } = siteConfig;

  // Keyframe animation values
  const floatTransition = {
    duration: 2.5,
    repeat: Infinity,
    ease: "linear"
  } as const;

  return (
    <section id="pipeline" className="scroll-mt-24 border-b border-border bg-card py-20 sm:py-24 overflow-hidden">
      <div className="container px-4">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {visualPipeline.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl text-balance">
            {visualPipeline.heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {visualPipeline.subheading}
          </p>
        </Reveal>

        {/* Pipeline Diagram */}
        <div className="mx-auto max-w-5xl relative">
          
          {/* Connecting tracks background (visible on desktop) */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-border/40 -translate-y-1/2 hidden md:block z-0" />

          <div className="grid gap-8 md:grid-cols-5 items-center relative z-10">
            
            {/* Step 1: Suppliers Inputs */}
            <div className="md:col-span-1 flex flex-col gap-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 text-center md:text-left">
                Supplier Source
              </div>
              {[
                { name: "Amazon", color: "border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40" },
                { name: "Walmart", color: "border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40" }
              ].map((s) => (
                <Reveal 
                  key={s.name} 
                  as="div" 
                  className={`flex items-center gap-3 rounded-lg border p-3.5 bg-background shadow-sm transition-all hover:-translate-y-0.5 ${s.color}`}
                >
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="font-display text-xs font-semibold text-foreground">{s.name}</span>
                </Reveal>
              ))}
            </div>

            {/* Connecting Line with flowing pulses 1 (Desktop) */}
            <div className="hidden md:block md:col-span-1 relative h-20">
              <svg className="w-full h-full" viewBox="0 0 100 80" fill="none">
                <path d="M0 40 H100" stroke="currentColor" strokeWidth="1.5" className="text-border" strokeDasharray="4 4" />
                
                {/* Floating data pulses */}
                <motion.circle
                  cx="0" cy="40" r="3.5"
                  className="fill-primary"
                  animate={{ x: [0, 100] }}
                  transition={{ ...floatTransition, delay: 0 }}
                />
                <motion.circle
                  cx="0" cy="40" r="3.5"
                  className="fill-success"
                  animate={{ x: [0, 100] }}
                  transition={{ ...floatTransition, delay: 0.8 }}
                />
                <motion.circle
                  cx="0" cy="40" r="3.5"
                  className="fill-amber-500"
                  animate={{ x: [0, 100] }}
                  transition={{ ...floatTransition, delay: 1.6 }}
                />
              </svg>
              <div className="absolute top-[8px] left-1/2 -translate-x-1/2 text-[9px] font-bold text-muted-foreground bg-card px-1.5 py-0.5 rounded border border-border/40 select-none">
                Raw Data
              </div>
            </div>

            {/* Step 2: The Core Engine (SellerSuit Processing) */}
            <div className="md:col-span-1 flex flex-col items-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4 text-center">
                SellerSuit Engine
              </div>
              <Reveal as="div" className="relative group">
                <div className="relative h-24 w-24 rounded-full bg-background border-2 border-border shadow-soft-lg flex flex-col items-center justify-center p-3 text-center">
                  <Cpu className="h-6 w-6 text-primary mb-1 animate-pulse" />
                  <span className="text-[10px] font-extrabold text-foreground tracking-tight">OPTIMIZING</span>
                  <div className="mt-0.5 flex gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-primary animate-bounce delay-75" />
                    <span className="h-1 w-1 rounded-full bg-success animate-bounce delay-150" />
                    <span className="h-1 w-1 rounded-full bg-amber-500 animate-bounce delay-300" />
                  </div>
                </div>
              </Reveal>

              {/* Live engine state tags */}
              <div className="mt-5 flex flex-wrap justify-center gap-1.5 max-w-[150px]">
                {["Auto-SKU", "Margin Lock", "SEO Titles"].map((t) => (
                  <span key={t} className="rounded bg-card border border-border/60 px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground tracking-wide">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Connecting Line with flowing pulses 2 (Desktop) */}
            <div className="hidden md:block md:col-span-1 relative h-20">
              <svg className="w-full h-full" viewBox="0 0 100 80" fill="none">
                <path d="M0 40 H100" stroke="currentColor" strokeWidth="1.5" className="text-border" strokeDasharray="4 4" />
                
                {/* Floating listed assets pulses */}
                <motion.circle
                  cx="0" cy="40" r="3.5"
                  className="fill-success"
                  animate={{ x: [0, 100] }}
                  transition={{ ...floatTransition, delay: 0.3 }}
                />
                <motion.circle
                  cx="0" cy="40" r="3.5"
                  className="fill-primary"
                  animate={{ x: [0, 100] }}
                  transition={{ ...floatTransition, delay: 1.1 }}
                />
                <motion.circle
                  cx="0" cy="40" r="3.5"
                  className="fill-success"
                  animate={{ x: [0, 100] }}
                  transition={{ ...floatTransition, delay: 1.9 }}
                />
              </svg>
              <div className="absolute top-[8px] left-1/2 -translate-x-1/2 text-[9px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded border border-success/30 select-none">
                SKU + Price
              </div>
            </div>

            {/* Step 3: Destination (Active eBay Listing) */}
            <div className="md:col-span-1 flex flex-col">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 text-center md:text-left">
                eBay Marketplace
              </div>
              <Reveal 
                as="div" 
                delay={0.2} 
                className="rounded-lg border border-primary/30 bg-background p-3.5 shadow-soft-lg flex flex-col justify-between hover:border-primary/50 transition-all relative overflow-hidden"
              >
                {/* Visual indicator of active synced state */}
                <div className="absolute top-0 right-0 left-0 h-[2.5px] bg-primary" />

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[9px] font-bold text-foreground">eBay Listing</span>
                  </div>
                  <span className="rounded-full bg-success/15 px-1 text-[8px] font-bold text-success flex items-center gap-0.5">
                    <CheckCircle className="h-2 w-2" />
                    Synced
                  </span>
                </div>

                <div className="font-mono text-[9px] text-muted-foreground mb-2 truncate">
                  SKU: SLR-AMZ-B08G
                </div>

                <div className="flex justify-between items-baseline border-t border-border/40 pt-2 mt-1">
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Price</span>
                  <span className="text-xs font-bold text-foreground">$130.25</span>
                </div>
              </Reveal>
            </div>

          </div>
        </div>

        {/* Metric proofs */}
        <div className="mt-16 mx-auto max-w-4xl grid gap-4 sm:grid-cols-3 text-center">
          {[
            { metric: "1-Click", label: "Scrape and parse metadata" },
            { metric: "100%", label: "Pricing & Fee computation" },
            { metric: "Real-Time", label: "Order & Inventory Sync" }
          ].map((stat, idx) => (
            <Reveal 
              key={stat.metric} 
              as="div" 
              delay={idx * 0.08}
              className="rounded-lg border border-border/50 bg-background p-4 shadow-sm"
            >
              <div className="font-display text-xl font-bold text-primary">{stat.metric}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
