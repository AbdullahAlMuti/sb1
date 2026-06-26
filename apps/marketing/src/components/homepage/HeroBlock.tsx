/**
 * HeroBlock — eyebrow, H1 (lead + gradient highlight), subtitle, two CTAs,
 * stats row, and optional large dashboard/product screenshot.
 */
import { lazy, Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { HpHero } from "@repo/types";
import { HpCtaButton } from "./HpCtaButton";
import { useReducedMotion } from "@/lib/useReducedMotion";

// The simulator is a ~360-line interactive demo. The hero text + CTAs (the LCP
// content) render eagerly; the demo loads in its own chunk behind a sized
// skeleton so it never blocks first paint or shifts layout.
const ExtensionSimulator = lazy(() => import("@/components/ExtensionSimulator"));

interface HeroBlockProps { hero: HpHero }

export function HeroBlock({ hero }: HeroBlockProps) {
  const reduced = useReducedMotion();

  const fadeIn = reduced
    ? {}
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] as const } };

  const fadeScale = reduced
    ? {}
    : { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.6, delay: 0.1, ease: [0.19, 1, 0.22, 1] as const } };

  return (
    <section className="relative overflow-hidden border-b border-border bg-hero-gradient pt-12 sm:pt-16">
      {/* Grid pattern */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.18]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

      <div className="container relative px-4 pb-16 sm:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Text column */}
          <motion.div {...fadeIn} className="min-w-0 max-w-2xl text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm sm:text-sm">
              <span aria-hidden className="h-2 w-2 rounded-full bg-success" />
              {hero.eyebrow}
            </div>

            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              {hero.titleLead}{" "}
              <span className="gradient-text">{hero.titleHighlight}</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {hero.subtitle}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <HpCtaButton cta={hero.primaryCta} size="xl" className="rounded-lg shadow-glow-primary">
                {hero.primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </HpCtaButton>
              <HpCtaButton cta={hero.secondaryCta} variant="outline" size="xl" className="rounded-lg" />
            </div>

            {/* Low-Friction Microcopy Row */}
            <div className="mt-3 text-xs text-muted-foreground select-none">
              No Credit Card Required · Setup in 90 Seconds · eBay Policy Compliant
            </div>

            {/* Trust Badges directly under the microcopy */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4 select-none">
              <div className="flex flex-col gap-1">
                <span className="text-xl font-extrabold text-foreground flex items-center gap-1">
                  5.0 ★
                  <span className="flex text-amber-500 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className="h-2.5 w-2.5 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </span>
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Chrome Store</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xl font-extrabold text-foreground">50,000+</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Active Sellers</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xl font-extrabold text-foreground flex items-center gap-1">
                  100% Safe
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">VERO Shield Scan</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xl font-extrabold text-foreground">Encrypted</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">No Passwords Saved</span>
              </div>
            </div>
          </motion.div>

          {/* Visual column: mock browser window container */}
          <motion.div {...fadeScale} className="relative w-full min-w-0">
            <div className="relative w-full rounded-2xl border border-border bg-card shadow-soft-xl overflow-hidden">
              {/* Browser Window Title Bar */}
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3 select-none">
                {/* Window control dots */}
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                  <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                </div>
                {/* Address bar showing source supplier page */}
                <div className="mx-auto flex h-6 w-[60%] items-center justify-center rounded bg-background border border-border px-4 text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                  aliexpress.com/item/1005001234.html
                </div>
                {/* Alignment spacer */}
                <div className="w-12" />
              </div>
              
              {/* Browser Window Body */}
              <div className="relative bg-background">
                {hero.heroImageSrc ? (
                  <img
                    src={hero.heroImageSrc}
                    alt={hero.heroImageAlt ?? ""}
                    className="w-full"
                    decoding="async"
                  />
                ) : (
                  <Suspense
                    fallback={
                      <div className="aspect-[4/3] w-full animate-pulse bg-card/60" />
                    }
                  >
                    <ExtensionSimulator />
                  </Suspense>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default HeroBlock;
