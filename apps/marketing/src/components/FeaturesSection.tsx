import { siteConfig } from "@/config/siteConfig";
import { Reveal } from "@/components/primitives/Reveal";

/** Feature grid — the six core features, icons + scroll-reveal. */
const FeaturesSection = () => {
  const { features } = siteConfig;

  return (
    <section id="features" className="scroll-mt-24 border-b border-border bg-background py-20 sm:py-24">
      <div className="container px-4">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{features.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl text-balance">
            {features.heading}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{features.subheading}</p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal
                key={feature.title}
                as="article"
                delay={(index % 3) * 0.08}
                className="group rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft-lg"
              >
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-[#f6f5f4] text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
