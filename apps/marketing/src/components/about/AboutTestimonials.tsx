import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { aboutConfig } from "@/config/aboutConfig";

export const AboutTestimonials = () => {
  const { testimonials } = aboutConfig;

  return (
    <section className="py-24 sm:py-32 bg-[#faf9f7] dark:bg-slate-900/40 border-t border-border/50">
      <div className="container max-w-7xl px-4 mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary mb-4">
            <span>{testimonials.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.12]">
            {testimonials.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {testimonials.subtitle}
          </p>
        </div>

        {/* 3x3 Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.08 }}
              className="rounded-3xl p-7 bg-card border border-border/80 shadow-soft-md flex flex-col justify-between"
            >
              {/* Stars */}
              <div className="flex items-center gap-1 text-amber-500 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-500" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm sm:text-base text-foreground leading-relaxed font-normal mb-6 flex-1">
                "{item.quote}"
              </p>

              {/* Author Info */}
              <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                {item.avatarSrc && (
                  <img
                    src={item.avatarSrc}
                    alt={item.author}
                    className="w-10 h-10 rounded-full object-cover border border-border"
                  />
                )}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">{item.author}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {item.role}, {item.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
