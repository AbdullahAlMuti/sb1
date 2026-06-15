import { ArrowRight, Rocket } from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { CtaButton } from "@/components/primitives/CtaButton";
import { Reveal } from "@/components/primitives/Reveal";

/** Final call-to-action. */
const CTASection = () => {
  const { finalCta } = siteConfig;

  return (
    <section className="bg-background py-20 sm:py-24">
      <div className="container px-4">
        <Reveal className="relative overflow-hidden rounded-3xl border border-border bg-cta-gradient p-8 text-center shadow-soft-xl sm:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="relative">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white">
              <Rocket className="h-4 w-4" />
              {finalCta.eyebrow}
            </p>
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl text-balance">
              {finalCta.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/85">{finalCta.subheading}</p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <CtaButton cta={finalCta.primaryCta} variant="glass" size="xl" className="rounded-lg">
                {finalCta.primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </CtaButton>
              <CtaButton
                cta={finalCta.secondaryCta}
                size="xl"
                className="rounded-lg bg-white/10 text-white hover:bg-white/20"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default CTASection;
