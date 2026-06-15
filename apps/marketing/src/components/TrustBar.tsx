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

            <div className="flex w-max gap-16 animate-marquee">
              {trustBar.logos.map((logo, idx) => (
                <div key={`${logo.name}-1-${idx}`} className="flex items-center gap-2 shrink-0">
                  <img
                    src={logo.src}
                    alt={`${logo.name} logo`}
                    width={24}
                    height={24}
                    loading="lazy"
                    className="h-6 w-6 object-contain opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                  />
                  <span className="text-sm font-semibold text-muted-foreground">{logo.name}</span>
                </div>
              ))}
              {trustBar.logos.map((logo, idx) => (
                <div key={`${logo.name}-2-${idx}`} className="flex items-center gap-2 shrink-0">
                  <img
                    src={logo.src}
                    alt={`${logo.name} logo`}
                    width={24}
                    height={24}
                    loading="lazy"
                    className="h-6 w-6 object-contain opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                  />
                  <span className="text-sm font-semibold text-muted-foreground">{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default TrustBar;
