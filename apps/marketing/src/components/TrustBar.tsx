import { siteConfig } from "@/config/siteConfig";
import { Reveal } from "@/components/primitives/Reveal";

const TrustBar = () => {
  const { trustBar } = siteConfig;

  return (
    <section className="border-b border-border bg-background py-10">
      <div className="container px-4">
        <Reveal className="flex flex-col items-center gap-6">
          <p className="text-center text-sm font-medium text-muted-foreground">
            {trustBar.heading} · <span className="font-semibold text-foreground">{trustBar.proof}</span>
          </p>
          <div className="relative w-full overflow-hidden py-2">
            <div className="absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />

            <div className="flex w-max gap-20 animate-marquee items-center">
              {trustBar.logos.map((logo, idx) => (
                <img
                  key={`${logo.name}-1-${idx}`}
                  src={logo.src}
                  alt={`${logo.name} logo`}
                  title={logo.name}
                  loading="lazy"
                  className="h-10 w-auto object-contain opacity-90 transition-all hover:opacity-100 shrink-0"
                />
              ))}
              {trustBar.logos.map((logo, idx) => (
                <img
                  key={`${logo.name}-2-${idx}`}
                  src={logo.src}
                  alt={`${logo.name} logo`}
                  title={logo.name}
                  loading="lazy"
                  className="h-10 w-auto object-contain opacity-90 transition-all hover:opacity-100 shrink-0"
                />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default TrustBar;
