import { motion } from "framer-motion";
import { MapPin, Mail } from "lucide-react";
import { aboutConfig } from "@/config/aboutConfig";

export const AboutOffices = () => {
  const { offices } = aboutConfig;

  return (
    <section className="py-24 sm:py-32 bg-background">
      <div className="container max-w-7xl px-4 mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary mb-4">
            <span>{offices.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.12]">
            {offices.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {offices.subtitle}
          </p>
        </div>

        {/* 2 Location Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {offices.locations.map((loc, idx) => (
            <motion.div
              key={loc.country}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.12 }}
              className="rounded-3xl overflow-hidden border border-border/80 bg-card shadow-soft-lg flex flex-col group"
            >
              {/* City Photo */}
              <div className="aspect-[16/10] overflow-hidden relative">
                <img
                  src={loc.imageSrc}
                  alt={loc.city}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5">
                  <span>{loc.flag}</span>
                  <span>{loc.country}</span>
                </div>
              </div>

              {/* Location Details */}
              <div className="p-6 sm:p-8 flex flex-col flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  {loc.label}
                </span>
                <h3 className="text-2xl font-extrabold text-foreground mb-3">{loc.city}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-1" />
                  <span>{loc.address}</span>
                </p>

                {loc.email && (
                  <div className="pt-4 border-t border-border/50 flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`mailto:${loc.email}`} className="hover:text-primary transition-colors">
                      {loc.email}
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
