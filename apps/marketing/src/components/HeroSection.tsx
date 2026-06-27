import { useState, useEffect, useRef } from "react";
import { ArrowRight, Chrome } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { siteConfig } from "@/config/siteConfig";
import { useReducedMotion } from "@/lib/useReducedMotion";
import DashboardMockup from "@/components/DashboardMockup";

const ROTATING_WORDS = ["one click.", "30 seconds.", "one workflow.", "auto-pilot."];

const HeroSection = () => {
  const { hero } = siteConfig;
  const reduced = useReducedMotion();
  const [wordIndex, setWordIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const yTransform = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const scaleTransform = useTransform(scrollYProgress, [0, 1], [0.96, 1.04]);

  const y = reduced ? 0 : yTransform;
  const scale = reduced ? 1 : scaleTransform;

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => {
      setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
    }, 2200);
    return () => clearInterval(t);
  }, [reduced]);

  const fadeUp = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.19, 1, 0.22, 1] as const },
        };

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-[#f7f8fa] pt-20 pb-0">
      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.45,
        }}
      />
      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f7f8fa] to-transparent"
      />

      <div className="relative container mx-auto flex flex-col items-center px-4 text-center">
        {/* ── Announcement badge ── */}
        <motion.div {...fadeUp(0)} className="mb-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 shadow-sm">
            <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              NEW
            </span>
            {hero.eyebrow}
            <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          </span>
        </motion.div>

        {/* ── Headline ── */}
        <motion.h1
          {...fadeUp(0.08)}
          className="max-w-3xl text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-[4.25rem] leading-[1.1]"
        >
          List winning products
          <br />
          to eBay in{" "}
          {/* Rotating word */}
          <span className="relative inline-block min-w-[9rem] text-left align-bottom">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                initial={reduced ? {} : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? {} : { opacity: 0, y: -14 }}
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="absolute left-0 text-gray-400"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
            {/* invisible spacer keeps line height stable */}
            <span aria-hidden className="invisible">
              {ROTATING_WORDS.reduce((a, b) => (a.length >= b.length ? a : b))}
            </span>
          </span>
        </motion.h1>

        {/* ── Subtitle ── */}
        <motion.p
          {...fadeUp(0.16)}
          className="mt-5 max-w-xl text-base leading-7 text-gray-500 sm:text-lg"
        >
          {hero.subtitle}
        </motion.p>

        {/* ── CTAs ── */}
        <motion.div
          {...fadeUp(0.24)}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <a
            href={hero.secondaryCta.href}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            {hero.secondaryCta.label}
          </a>
          <a
            href={hero.primaryCta.href}
            target={hero.primaryCta.external ? "_blank" : undefined}
            rel={hero.primaryCta.external ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
          >
            <Chrome className="h-4 w-4" />
            {hero.primaryCta.label}
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>

        {/* ── Dashboard mockup ── */}
        <motion.div
          {...(reduced
            ? {}
            : {
                initial: { opacity: 0, y: 40, scale: 0.97 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: {
                  duration: 0.75,
                  delay: 0.35,
                  ease: [0.19, 1, 0.22, 1] as const,
                },
              })}
          className="mt-14 w-full max-w-5xl"
        >
          <motion.div style={{ y, scale }} className="w-full">
            <DashboardMockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
