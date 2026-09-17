import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Linkedin, Twitter, Github, ArrowRight } from "lucide-react";
import { aboutConfig } from "@/config/aboutConfig";

export const AboutTeamGrid = () => {
  const { team } = aboutConfig;
  const displayedMembers = team.members.slice(0, 4);

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

        {/* Team Grid - 4 pictures simultaneously in a single row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {displayedMembers.map((member, idx) => (
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

        {/* Action Button: See All */}
        <div className="mt-12 sm:mt-16 text-center">
          <Link
            to="/team"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 shadow-soft-sm hover:shadow-soft-md group"
          >
            <span>See All</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
