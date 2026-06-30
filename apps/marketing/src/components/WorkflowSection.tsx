import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { Reveal } from "@/components/primitives/Reveal";

/** "How it works" — three steps: Scrape → Edit & price → Auto-upload. */
const WorkflowSection = () => {
  const { howItWorks } = siteConfig;

  return (
    <section id="how-it-works" className="scroll-mt-24 border-b border-border bg-card py-20 sm:py-24">
      <div className="container px-4">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{howItWorks.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl text-balance">
            {howItWorks.heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{howItWorks.subheading}</p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-3">
          {howItWorks.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} as="article" delay={index * 0.1} className="relative">
                <div className="h-full rounded-lg border border-border bg-background p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-primary shadow-soft-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-3xl font-bold text-muted-foreground/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
                {index < howItWorks.steps.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-border md:block" />
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
