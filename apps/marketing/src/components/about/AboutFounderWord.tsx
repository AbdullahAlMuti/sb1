import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { aboutConfig } from "@/config/aboutConfig";

export const AboutFounderWord = () => {
  const { founder } = aboutConfig;

  return (
    <section className="py-20 sm:py-28 bg-[#faf9f7] dark:bg-slate-900/40 border-y border-border/50">
      <div className="container max-w-7xl px-4 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Narrative */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary">
              <Quote className="w-3.5 h-3.5" />
              <span>{founder.eyebrow}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.15]">
              {founder.heading}
            </h2>

            <div className="space-y-4 text-muted-foreground text-base sm:text-lg leading-relaxed font-normal">
              {founder.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* Signature & Author Details */}
            <div className="pt-6 border-t border-border/60 flex flex-col gap-1">
              <span className="font-serif italic text-2xl text-foreground font-medium">
                {founder.signatureText}
              </span>
              <span className="text-sm font-bold text-foreground">{founder.founderName}</span>
              <span className="text-xs text-muted-foreground">{founder.founderRole}</span>
            </div>
          </motion.div>

          {/* Right Founder Desk Photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 relative group"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-border/80 aspect-[4/3] relative">
              <img
                src={founder.founderImage}
                alt={founder.founderName}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/10 pointer-events-none rounded-3xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
