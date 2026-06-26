import { X, Check, ArrowRight, AlertTriangle, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { Reveal } from "@/components/primitives/Reveal";


export default function ProblemComparison() {
  const { problemComparison } = siteConfig;
  const { manual, automated } = problemComparison;

  return (
    <section id="comparison" className="scroll-mt-24 border-b border-border bg-hero-gradient py-20 sm:py-28 relative overflow-hidden">
      {/* Background radial highlights */}
      <div aria-hidden className="pointer-events-none absolute -left-48 top-1/4 h-96 w-96 rounded-full bg-destructive/5 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-48 bottom-1/4 h-96 w-96 rounded-full bg-success/5 blur-3xl" />

      <div className="container relative px-4">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {problemComparison.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl text-balance">
            {problemComparison.heading}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {problemComparison.subheading}
          </p>
        </Reveal>

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2 lg:items-stretch">
          {/* Left Side: The Old Way (Manual) */}
          <Reveal 
            as="article" 
            delay={0.05} 
            className="flex flex-col justify-between rounded-2xl border border-destructive/20 bg-card/30 backdrop-blur-md p-6 shadow-soft-sm sm:p-8 hover:scale-[1.01] hover:border-destructive/30 hover:shadow-2xl hover:shadow-destructive/5 transition-all duration-300 relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {manual.title}
                </span>
                <span className="text-[10px] font-bold text-destructive/70 tracking-widest uppercase">18m / item</span>
              </div>
              
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {manual.description}
              </p>
              
              {/* Visual Pain Indicator */}
              <div className="mt-6 rounded-xl border border-destructive/10 bg-destructive/5 p-4 text-xs flex flex-col gap-2">
                <div className="flex justify-between items-center text-destructive font-bold">
                  <span>Sourcing Bottleneck</span>
                  <span>94% Manual Grind</span>
                </div>
                <div className="h-1.5 w-full bg-destructive/20 rounded-full overflow-hidden">
                  <div className="h-full w-[94%] bg-destructive rounded-full" />
                </div>
              </div>
              
              <ul className="mt-8 space-y-4">
                {manual.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-foreground/80">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                      <X className="h-3 w-3" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-8 pt-6 border-t border-destructive/10 text-xs text-muted-foreground flex items-center gap-2 relative z-10">
              <span className="font-bold text-destructive">Risk Vector:</span>
              <span>Suspension hazard via copy-paste supplier trademark errors.</span>
            </div>
          </Reveal>

          {/* Right Side: The New Way (SellerSuit) */}
          <Reveal 
            as="article" 
            delay={0.15} 
            className="flex flex-col justify-between rounded-2xl border border-success/30 bg-card/50 backdrop-blur-md p-6 shadow-soft-md sm:p-8 relative group overflow-hidden hover:scale-[1.01] hover:border-success/50 hover:shadow-2xl hover:shadow-success/5 transition-all duration-300"
          >
            {/* Ambient background glow inside card */}
            <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-success/10 blur-3xl pointer-events-none transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success shadow-sm">
                  <Zap className="h-3.5 w-3.5 text-success animate-pulse" />
                  {automated.title}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary tracking-widest uppercase">
                  <Sparkles className="h-2.5 w-2.5" />
                  18s / item
                </span>
              </div>
              
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {automated.description}
              </p>

              {/* Visual Performance Indicator */}
              <div className="mt-6 rounded-xl border border-success/10 bg-success/5 p-4 text-xs flex flex-col gap-2">
                <div className="flex justify-between items-center text-success font-bold">
                  <span>Policy Compliance Checked</span>
                  <span>100% Automated</span>
                </div>
                <div className="h-1.5 w-full bg-success/20 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-success rounded-full animate-pulse" />
                </div>
              </div>

              <ul className="mt-8 space-y-4">
                {automated.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/20 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className={idx === automated.items.length - 1 ? "font-semibold text-success flex items-center gap-1.5" : ""}>
                      {item}
                      {idx === automated.items.length - 1 && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-success animate-ping" />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-success/10 text-xs text-muted-foreground flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-success flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  VERO Shielded:
                </span>
                <span>Trademark filters run locally before eBay API submission.</span>
              </div>
              <a href="#pricing" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline hover:translate-x-0.5 transition-transform duration-300">
                Get started <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
