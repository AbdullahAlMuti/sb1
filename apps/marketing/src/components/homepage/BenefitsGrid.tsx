/**
 * BenefitsGrid — eyebrow + H2 + intro, then 4 icon-and-label items.
 */
import type { HpBenefits } from "@repo/types";
import { Icon } from "./LucideResolver";
import { Reveal } from "@/components/primitives/Reveal";

interface BenefitsGridProps { benefits: HpBenefits }

export function BenefitsGrid({ benefits }: BenefitsGridProps) {
  return (
    <section className="border-b border-border bg-secondary/20 py-20">
      <div className="container px-4">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {benefits.eyebrow}
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            {benefits.heading}
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-7">{benefits.intro}</p>
        </Reveal>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.items.map((item, i) => (
            <Reveal key={i} delay={i * 0.06} className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={item.icon} className="h-6 w-6" />
              </span>
              <h3 className="font-display text-base font-semibold text-foreground">{item.label}</h3>
              {item.description && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BenefitsGrid;
