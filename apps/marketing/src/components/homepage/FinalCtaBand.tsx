/**
 * FinalCtaBand — full-width H2 + optional subheading + two CTAs.
 */
import { ArrowRight } from "lucide-react";
import type { HpFinalCta } from "@repo/types";
import { HpCtaButton } from "./HpCtaButton";
import { Reveal } from "@/components/primitives/Reveal";

interface FinalCtaBandProps { finalCta: HpFinalCta }

export function FinalCtaBand({ finalCta }: FinalCtaBandProps) {
  return (
    <section className="border-b border-border bg-hero-gradient py-24">
      <div className="container px-4">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            {finalCta.heading}
          </h2>
          {finalCta.subheading && (
            <p className="mt-4 text-base leading-7 text-muted-foreground">{finalCta.subheading}</p>
          )}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <HpCtaButton cta={finalCta.primaryCta} size="xl" className="rounded-lg shadow-glow-primary">
              {finalCta.primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </HpCtaButton>
            <HpCtaButton cta={finalCta.secondaryCta} variant="outline" size="xl" className="rounded-lg" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default FinalCtaBand;
