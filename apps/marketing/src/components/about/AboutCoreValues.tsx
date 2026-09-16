import { motion } from "framer-motion";
import { Users, Zap, Cpu, ShieldCheck } from "lucide-react";
import { aboutConfig } from "@/config/aboutConfig";

const ICONS_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Zap,
  Cpu,
  ShieldCheck,
};

export const AboutCoreValues = () => {
  const { coreValues } = aboutConfig;

  return (
    <section className="py-24 sm:py-32 bg-background">
      <div className="container max-w-7xl px-4 mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary mb-4">
            <span>{coreValues.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.12]">
            {coreValues.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {coreValues.subtitle}
          </p>
        </div>

        {/* 4 Core Value Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {coreValues.values.map((val, idx) => {
            const IconComponent = ICONS_MAP[val.iconName] || Zap;

            return (
              <motion.div
                key={val.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="rounded-3xl p-8 bg-card border border-border/80 shadow-soft-md hover:shadow-soft-xl hover:border-primary/40 transition-all duration-300 flex flex-col group"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `${val.accentColor}15`,
                    color: val.accentColor,
                  }}
                >
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{val.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground font-normal">
                  {val.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
