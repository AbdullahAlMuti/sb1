import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HpFeatures } from "@repo/types";
import { Icon } from "./LucideResolver";
import { Reveal } from "@/components/primitives/Reveal";
import { cn } from "@repo/ui/lib/utils";

interface NumberedFeaturesProps { features: HpFeatures }

export function NumberedFeatures({ features }: NumberedFeaturesProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const activeBlock = features.blocks[activeIdx];

  return (
    <section className="border-b border-border py-24 bg-background relative overflow-hidden">
      {/* Background mesh glow */}
      <div aria-hidden className="pointer-events-none absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />

      <div className="container px-4">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {features.eyebrow}
          </p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl text-balance">
            {features.heading}
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-7">{features.intro}</p>
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center max-w-6xl mx-auto">
          {/* Left Column: Tab Selectors */}
          <div className="space-y-4">
            {features.blocks.map((block, idx) => {
              const active = idx === activeIdx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  className={cn(
                    "w-full text-left flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 relative group overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40",
                    active
                      ? "bg-card/75 border-primary/20 shadow-soft-md ring-1 ring-primary/10"
                      : "bg-transparent border-transparent hover:bg-card/35 hover:border-border/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                      active 
                        ? "bg-primary text-white shadow-glow-primary scale-110" 
                        : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}
                  >
                    {block.number}
                  </span>
                  <div>
                    <h3 className={cn(
                      "font-display text-lg font-bold transition-colors duration-300",
                      active ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                    )}>
                      {block.heading}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {block.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Tab Content Visualizer */}
          <div className="relative rounded-2xl border border-border bg-card/65 backdrop-blur-md p-6 shadow-soft-xl overflow-hidden min-h-[360px] flex flex-col justify-between">
            {/* Visual grid overlay */}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative z-10 space-y-6 flex-1 flex flex-col justify-between"
              >
                {/* Upper visual section */}
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 rounded bg-primary/10 px-2 py-0.5 text-[9px] font-extrabold text-primary tracking-widest uppercase">
                    Step {activeBlock.number} Visualizer
                  </span>
                  <h4 className="font-display text-xl font-bold text-foreground">
                    {activeBlock.heading}
                  </h4>
                  {activeBlock.bullets.length > 0 && (
                    <ul className="space-y-3 pt-2">
                      {activeBlock.bullets.map((bullet, bi) => (
                        <li key={bi} className="flex items-center gap-3 text-sm text-foreground/90">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                            <Icon name={bullet.icon} className="h-3.5 w-3.5" />
                          </span>
                          <span>{bullet.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Simulated interface mockup representation */}
                <div className="mt-6 pt-4 border-t border-border/40">
                  {activeBlock.imageSrc ? (
                    <img
                      src={activeBlock.imageSrc}
                      alt={activeBlock.imageAlt ?? activeBlock.heading}
                      className="w-full rounded-xl border border-border shadow-soft-sm object-cover aspect-[16/9]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-xl border border-border/80 bg-gradient-to-br from-card to-background relative overflow-hidden group shadow-inner">
                      {/* Ambient blur sphere */}
                      <div className="absolute -right-12 -bottom-12 h-24 w-24 rounded-full bg-primary/10 blur-xl animate-pulse" />
                      <div className="flex flex-col items-center gap-2">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <span className="font-display text-lg font-bold">{activeBlock.number}</span>
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Interactive State Active</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NumberedFeatures;
