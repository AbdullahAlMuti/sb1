import { X, Check, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { Reveal } from "@/components/primitives/Reveal";

export default function ProblemComparison() {
  const { problemComparison } = siteConfig;
  const { manual, automated } = problemComparison;

  return (
    <section id="comparison" className="scroll-mt-24 border-b border-border bg-background py-20 sm:py-24">
      <div className="container px-4">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {problemComparison.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl text-balance">
            {problemComparison.heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {problemComparison.subheading}
          </p>
        </Reveal>

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2 lg:items-stretch">
          {/* Left Side: The Old Way (Manual) */}
          <Reveal 
            as="article" 
            delay={0.05} 
            className="flex flex-col rounded-lg border border-destructive/20 bg-card p-6 shadow-sm sm:p-8"
          >
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
                <X className="h-3.5 w-3.5" />
                {manual.title}
              </span>
              <p className="mt-3 text-sm text-muted-foreground">
                {manual.description}
              </p>
              
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
            
            <div className="mt-8 border-t border-destructive/10 pt-5 text-xs text-muted-foreground flex items-center gap-2">
              <span className="font-bold text-destructive">Pain Point:</span>
              <span>Slow, repetitive task that leads to inventory drift.</span>
            </div>
          </Reveal>

          {/* Right Side: The New Way (SellerSuit) */}
          <Reveal 
            as="article" 
            delay={0.15} 
            className="relative flex flex-col overflow-hidden rounded-lg border border-primary/30 bg-card p-6 shadow-soft-lg sm:p-8"
          >
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
                <Check className="h-3.5 w-3.5" />
                {automated.title}
              </span>
              <p className="mt-3 text-sm text-muted-foreground">
                {automated.description}
              </p>

              <ul className="mt-8 space-y-4">
                {automated.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/20 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className={idx === automated.items.length - 1 ? "font-semibold text-success" : ""}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 border-t border-success/10 pt-5 text-xs text-muted-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-success">Outcome:</span>
                <span>Maximized listings, zero inventory leaks.</span>
              </div>
              <a href="#pricing" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                Get started <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
