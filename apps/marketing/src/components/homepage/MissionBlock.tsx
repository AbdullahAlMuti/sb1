/**
 * MissionBlock — eyebrow + H2 + paragraph + single CTA.
 */
import type { HpMission } from "@repo/types";
import { HpCtaButton } from "./HpCtaButton";
import { Reveal } from "@/components/primitives/Reveal";
import { ArrowRight } from "lucide-react";

interface MissionBlockProps { mission: HpMission }

export function MissionBlock({ mission }: MissionBlockProps) {
  return (
    <section className="border-b border-border py-20">
      <div className="container px-4">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {mission.eyebrow}
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            {mission.heading}
          </h2>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            {mission.paragraph}
          </p>
          <div className="mt-8">
            <HpCtaButton cta={mission.cta} variant="outline" size="lg" className="rounded-lg">
              {mission.cta.label}
              <ArrowRight className="h-4 w-4" />
            </HpCtaButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default MissionBlock;
