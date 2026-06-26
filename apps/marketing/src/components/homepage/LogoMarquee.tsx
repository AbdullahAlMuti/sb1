/**
 * LogoMarquee — horizontally scrolling strip of logos.
 * The list is duplicated for a seamless infinite scroll.
 * Pauses on hover/focus; respects prefers-reduced-motion.
 */
import type { HpLogoCloud } from "@repo/types";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Reveal } from "@/components/primitives/Reveal";

interface LogoMarqueeProps { cloud: HpLogoCloud }

export function LogoMarquee({ cloud }: LogoMarqueeProps) {
  const reduced = useReducedMotion();
  // Duplicate for seamless scroll
  const logos = [...cloud.logos, ...cloud.logos, ...cloud.logos, ...cloud.logos];

  return (
    <section className="border-b border-border bg-secondary/30 py-12">
      <div className="container px-4">
        <Reveal className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {cloud.heading}
          </p>
          {cloud.proof && (
            <p className="mt-1 text-sm text-muted-foreground">{cloud.proof}</p>
          )}
        </Reveal>
      </div>

      {/* Marquee track */}
      <div
        className="relative overflow-hidden"
        role="img"
        aria-label={`Logos: ${cloud.logos.map((l) => l.name).join(", ")}`}
      >
        {/* Fade edges */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-secondary/30 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-secondary/30 to-transparent" />

        <div
          className={[
            "flex gap-10 whitespace-nowrap",
            reduced ? "" : "animate-marquee hover:[animation-play-state:paused]",
          ].join(" ")}
        >
          {logos.map((logo, i) => (
            <div key={i} className="flex shrink-0 items-center gap-2.5 rounded-lg border border-border bg-card px-5 py-3 shadow-soft-sm">
              <img
                src={logo.src}
                alt={logo.name}
                className="h-6 w-6 object-contain"
                width={24}
                height={24}
                loading="lazy"
                decoding="async"
              />
              <span className="text-sm font-semibold text-foreground">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inject keyframe if not using Tailwind plugin */}
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 28s linear infinite;
        }
      `}</style>
    </section>
  );
}

export default LogoMarquee;
