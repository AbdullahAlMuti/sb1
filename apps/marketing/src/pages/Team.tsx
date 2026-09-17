import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Linkedin,
  Twitter,
  Github,
  MapPin,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useSeo } from "@/lib/useSeo";
import { teamConfig, type TeamDepartmentFilter } from "@/config/teamConfig";

export default function Team() {
  useSeo({
    title: "Meet Our Team | SellerSuit — Global Engineering & Leadership",
    description:
      "Meet the executive leaders, AI researchers, software architects, and operations specialists behind SellerSuit's marketplace automation platform.",
    canonical: "https://www.sellersuit.com/team",
  });

  const [activeDept, setActiveDept] = useState<TeamDepartmentFilter["id"]>("all");

  const filteredMembers = useMemo(() => {
    if (activeDept === "all") return teamConfig.members;
    return teamConfig.members.filter((m) => m.department === activeDept);
  }, [activeDept]);

  const getDeptCount = (deptId: TeamDepartmentFilter["id"]) => {
    if (deptId === "all") return teamConfig.members.length;
    return teamConfig.members.filter((m) => m.department === deptId).length;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1" style={{ overflowX: "hidden" }}>
        {/* Hero Section */}
        <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-24 border-b border-border/40 bg-gradient-to-b from-muted/30 via-background to-background">
          <div className="container max-w-7xl px-4 mx-auto">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-8"
            >
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              <Link to="/about" className="hover:text-foreground transition-colors">
                About Us
              </Link>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              <span className="text-foreground font-semibold">Team</span>
            </nav>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary mb-5">
                <Users className="w-3.5 h-3.5" />
                <span>{teamConfig.hero.eyebrow}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.08] mb-6">
                {teamConfig.hero.heading}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                {teamConfig.hero.subtitle}
              </p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-border/60">
              {teamConfig.hero.metrics.map((metric, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    {metric.value}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                    {metric.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Directory Section */}
        <section className="py-16 sm:py-24 bg-background">
          <div className="container max-w-7xl px-4 mx-auto">
            {/* Department Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-12 scrollbar-none">
              {teamConfig.departments.map((dept) => {
                const count = getDeptCount(dept.id);
                const isSelected = activeDept === dept.id;

                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setActiveDept(dept.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                      isSelected
                        ? "bg-foreground text-background shadow-soft-sm"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                    }`}
                  >
                    <span>{dept.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-background/20 text-background"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Team Members Grid */}
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8"
            >
              <AnimatePresence>
                {filteredMembers.map((member) => (
                  <motion.div
                    key={member.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft-sm hover:shadow-soft-md transition-shadow group"
                  >
                    {/* Member Image */}
                    <div className="rounded-xl overflow-hidden aspect-square border border-border/60 bg-muted relative mb-4">
                      <img
                        src={member.imageSrc}
                        alt={member.name}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-background/90 text-foreground backdrop-blur-sm shadow-xs border border-border/40">
                          {member.departmentLabel}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                          {member.name}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-primary font-medium mb-2.5">
                        {member.role}
                      </p>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                        <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                        <span>{member.location}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                        {member.bio}
                      </p>

                      {/* Social Links Footer */}
                      {member.socialLinks && (
                        <div className="flex items-center gap-3 pt-3 border-t border-border/50 text-muted-foreground">
                          {member.socialLinks.linkedin && (
                            <a
                              href={member.socialLinks.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors"
                              aria-label={`${member.name} LinkedIn`}
                            >
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                          {member.socialLinks.twitter && (
                            <a
                              href={member.socialLinks.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors"
                              aria-label={`${member.name} Twitter / X`}
                            >
                              <Twitter className="w-4 h-4" />
                            </a>
                          )}
                          {member.socialLinks.github && (
                            <a
                              href={member.socialLinks.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors"
                              aria-label={`${member.name} GitHub`}
                            >
                              <Github className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Careers / Contact Callout Banner */}
            <div className="mt-16 sm:mt-24 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-muted/40 to-background p-8 sm:p-12 text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{teamConfig.culture.eyebrow}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-4">
                {teamConfig.culture.heading}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                {teamConfig.culture.description}
              </p>
              <Link
                to={teamConfig.culture.ctaHref}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-soft-sm group"
              >
                <span>{teamConfig.culture.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
