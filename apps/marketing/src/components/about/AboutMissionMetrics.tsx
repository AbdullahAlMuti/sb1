import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { aboutConfig } from "@/config/aboutConfig";

export const AboutMissionMetrics = () => {
  const { mission } = aboutConfig;

  return (
    <section className="py-20 sm:py-28 bg-[#faf9f7] dark:bg-slate-900/40 border-y border-border/50">
      <div className="container max-w-7xl px-4 mx-auto">
        {/* Two-Column Story */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{mission.eyebrow}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              {mission.heading}
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="lg:col-span-7 space-y-6 text-muted-foreground text-base sm:text-lg leading-relaxed font-normal"
          >
            {mission.story.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </motion.div>
        </div>

        {/* 4 Impact Metric Callouts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-10 border-t border-border/60">
          {mission.metrics.map((metric, idx) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.08 }}
              className="flex flex-col"
            >
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground">
                {metric.value}
              </span>
              <span className="mt-2 text-sm sm:text-base font-bold text-foreground">
                {metric.label}
              </span>
              {metric.description && (
                <span className="mt-1 text-xs text-muted-foreground leading-normal">
                  {metric.description}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
