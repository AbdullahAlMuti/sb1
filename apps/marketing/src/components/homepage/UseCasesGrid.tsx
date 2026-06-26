/**
 * UseCasesGrid — eyebrow + H2 + intro, then a 4-card grid.
 * Each card: icon, heading, description.
 */
import type { HpUseCases } from "@repo/types";
import { Icon } from "./LucideResolver";
import { Reveal } from "@/components/primitives/Reveal";

interface UseCasesGridProps { useCases: HpUseCases }

export function UseCasesGrid({ useCases }: UseCasesGridProps) {
  return (
    <section className="border-b border-border py-20">
      <div className="container px-4">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {useCases.eyebrow}
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            {useCases.heading}
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-7">{useCases.intro}</p>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.cards.map((card, i) => (
            <Reveal key={i} delay={i * 0.07}
              className="rounded-xl border border-border bg-card p-6 shadow-soft-sm transition-shadow hover:shadow-soft-md">
              {card.icon && (
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name={card.icon} className="h-5 w-5" />
                </span>
              )}
              {card.imageSrc && (
                <img src={card.imageSrc} alt={card.imageAlt ?? card.heading}
                  className="mb-4 h-32 w-full rounded-lg object-cover" loading="lazy" decoding="async" />
              )}
              <h3 className="font-display text-base font-semibold text-foreground">{card.heading}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default UseCasesGrid;
