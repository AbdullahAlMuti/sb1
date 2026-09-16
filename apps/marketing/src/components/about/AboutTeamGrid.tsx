import { motion } from "framer-motion";
import { Linkedin, Twitter, Github } from "lucide-react";
import { aboutConfig } from "@/config/aboutConfig";

export const AboutTeamGrid = () => {
  const { team } = aboutConfig;

  return (
    <section className="py-24 sm:py-32 bg-background">
      <div className="container max-w-7xl px-4 mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary mb-4">
            <span>{team.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.12]">
            {team.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {team.subtitle}
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8">
          {team.members.map((member, idx) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.07 }}
              className="flex flex-col group"
            >
              {/* Photo */}
              <div className="rounded-2xl overflow-hidden aspect-square border border-border/80 shadow-soft-sm relative mb-4 bg-muted">
                <img
                  src={member.imageSrc}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>

              {/* Name & Title */}
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                {member.name}
              </h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {member.role}
              </p>

              {/* Social Links */}
              {member.socialLinks && (
                <div className="flex items-center gap-2.5 mt-3 text-muted-foreground">
                  {member.socialLinks.linkedin && (
                    <a
                      href={member.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {member.socialLinks.twitter && (
                    <a
                      href={member.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {member.socialLinks.github && (
                    <a
                      href={member.socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                      aria-label="GitHub"
                    >
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
