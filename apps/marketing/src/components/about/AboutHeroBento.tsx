import { motion } from "framer-motion";
import { aboutConfig } from "@/config/aboutConfig";

export const AboutHeroBento = () => {
  const { hero } = aboutConfig;

  return (
    <section className="pt-20 pb-16 sm:pt-24 sm:pb-20 overflow-hidden">
      <div className="container max-w-7xl px-4 mx-auto">
        {/* Header Titles */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08] text-balance"
          >
            {hero.headline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
            className="mt-6 text-base sm:text-lg lg:text-xl text-muted-foreground font-normal leading-relaxed text-balance"
          >
            {hero.subtitle}
          </motion.p>
        </div>

        {/* Bento Image & Stat Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Tall Column: Portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="md:col-span-4 rounded-3xl overflow-hidden shadow-soft-xl border border-border/50 aspect-[3/4] md:aspect-auto md:h-full min-h-[380px] sm:min-h-[460px] relative group"
          >
            <img
              src={hero.bentoImages.portrait}
              alt="SellerSuit Engineer in Studio"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 pointer-events-none" />
          </motion.div>

          {/* Center Column: Orange Stat Card + Collab Photo */}
          <div className="md:col-span-4 flex flex-col gap-4 sm:gap-6">
            {/* Top Stat Card (Orange) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="rounded-3xl p-8 bg-gradient-to-br from-[#ea580c] to-[#f97316] text-white shadow-soft-xl flex flex-col justify-center min-h-[160px] sm:min-h-[190px]"
            >
              <span className="text-4xl sm:text-6xl font-black tracking-tight leading-none">
                {hero.statCards.topStat.value}
              </span>
              <span className="mt-3 text-sm sm:text-base font-semibold text-white/90">
                {hero.statCards.topStat.label}
              </span>
            </motion.div>

            {/* Bottom Photo (Team Collab) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.25 }}
              className="rounded-3xl overflow-hidden shadow-soft-xl border border-border/50 flex-1 min-h-[200px] sm:min-h-[240px] relative group"
            >
              <img
                src={hero.bentoImages.collab}
                alt="SellerSuit Team Collaboration"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </motion.div>
          </div>

          {/* Right Column: Workspace Photo + Dark Stat Card */}
          <div className="md:col-span-4 flex flex-col gap-4 sm:gap-6">
            {/* Top Photo (Workspace) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="rounded-3xl overflow-hidden shadow-soft-xl border border-border/50 flex-1 min-h-[200px] sm:min-h-[240px] relative group"
            >
              <img
                src={hero.bentoImages.workspace}
                alt="Engineering Workspace"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </motion.div>

            {/* Bottom Stat Card (Dark) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.35 }}
              className="rounded-3xl p-8 bg-slate-900 dark:bg-slate-950 text-white shadow-soft-xl flex flex-col justify-center min-h-[160px] sm:min-h-[190px] border border-white/10"
            >
              <span className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white">
                {hero.statCards.bottomStat.value}
              </span>
              <span className="mt-3 text-sm sm:text-base font-semibold text-slate-300">
                {hero.statCards.bottomStat.label}
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
