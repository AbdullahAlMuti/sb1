import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { siteConfig } from "@/config/siteConfig";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { CtaButton } from "@/components/primitives/CtaButton";
import ExtensionSimulator from "@/components/ExtensionSimulator";

const HeroSection = () => {
  const { hero } = siteConfig;
  const reduced = useReducedMotion();

  const fadeProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] as const },
      };

  return (
    <section className="relative overflow-hidden border-b border-border bg-hero-gradient pt-12 sm:pt-16">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.18]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="container relative px-4 pb-16 sm:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div {...fadeProps} className="max-w-2xl text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-success" />
              {hero.eyebrow}
            </div>

            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              {hero.titleLead} <span className="gradient-text">{hero.titleHighlight}</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {hero.subtitle}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <CtaButton cta={hero.primaryCta} size="xl" className="rounded-lg shadow-glow-primary">
                {hero.primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </CtaButton>
              <CtaButton cta={hero.secondaryCta} variant="outline" size="xl" className="rounded-lg" />
            </div>

            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              {hero.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="font-display text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div
            {...(reduced
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.96 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.6, delay: 0.1, ease: [0.19, 1, 0.22, 1] as const },
                })}
            className="relative w-full"
          >
            <ExtensionSimulator />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
