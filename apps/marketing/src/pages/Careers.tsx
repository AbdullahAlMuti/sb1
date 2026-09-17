import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  MapPin,
  Clock,
  Coins,
  Search,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Banknote,
  Cpu,
  TrendingUp,
  Laptop,
  Coffee,
  BookOpen,
  ArrowRight,
  Building2,
  CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useSeo } from "@/lib/useSeo";
import {
  careersConfig,
  type JobDepartment,
  type JobPosition,
} from "@/config/careersConfig";

const BENEFIT_ICONS: Record<string, React.ElementType> = {
  Banknote,
  Cpu,
  TrendingUp,
  Laptop,
  Coffee,
  BookOpen,
};

export default function Careers() {
  useSeo({
    title: "Careers & Current Job Openings | SellerSuit — Join Our AI & Engineering Teams",
    description:
      "Explore 20+ open engineering, AI automation, product design, and growth positions at SellerSuit. Transparent BDT salary scales, modern AI stack, and high-impact work.",
    canonical: "https://www.sellersuit.com/careers",
  });

  const [activeDept, setActiveDept] = useState<"all" | JobDepartment>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPositions = useMemo(() => {
    return careersConfig.positions.filter((position) => {
      const matchesDept =
        activeDept === "all" || position.department === activeDept;

      if (!matchesDept) return false;

      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      const titleMatch = position.title.toLowerCase().includes(query);
      const techMatch = position.techTags.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      const descMatch = position.description.toLowerCase().includes(query);
      const deptMatch = position.departmentLabel.toLowerCase().includes(query);

      return titleMatch || techMatch || descMatch || deptMatch;
    });
  }, [activeDept, searchQuery]);

  const getDeptCount = (deptId: "all" | JobDepartment) => {
    if (deptId === "all") return careersConfig.positions.length;
    return careersConfig.positions.filter((p) => p.department === deptId).length;
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
              <span className="text-foreground font-semibold">Careers</span>
            </nav>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary mb-5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{careersConfig.hero.eyebrow}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.08] mb-6">
                {careersConfig.hero.heading}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                {careersConfig.hero.subtitle}
              </p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-border/60">
              {careersConfig.hero.stats.map((stat, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Job Openings Directory */}
        <section id="openings" className="py-16 sm:py-24 bg-background">
          <div className="container max-w-7xl px-4 mx-auto">
            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              {/* Department Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {careersConfig.filterDepartments.map((dept) => {
                  const count = getDeptCount(dept.id);
                  const isSelected = activeDept === dept.id;

                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setActiveDept(dept.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                        isSelected
                          ? "bg-foreground text-background shadow-soft-sm"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                      }`}
                    >
                      <span>{dept.label}</span>
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded-full ${
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

              {/* Search Box */}
              <div className="relative min-w-[260px] md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search role or tech stack..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-full text-xs sm:text-sm bg-muted/50 border border-border/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-6 px-1">
              <span>
                Showing <strong className="text-foreground">{filteredPositions.length}</strong>{" "}
                positions
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-primary hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>

            {/* Job Cards Grid */}
            {filteredPositions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center my-8">
                <p className="text-base font-semibold text-foreground">
                  No matching positions found
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-4">
                  Try adjusting your search query or selecting a different department.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDept("all");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6"
              >
                <AnimatePresence>
                  {filteredPositions.map((job) => (
                    <motion.div
                      key={job.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft-sm hover:shadow-soft-md hover:border-primary/40 transition-all duration-300"
                    >
                      <div>
                        {/* Header: Title & Department */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {job.departmentLabel}
                              </span>
                              {job.featured && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Sparkles className="w-3 h-3" />
                                  <span>Urgent</span>
                                </span>
                              )}
                            </div>
                            <a
                              href={job.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block focus:outline-none"
                            >
                              <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                                {job.title}
                              </h3>
                            </a>
                          </div>
                        </div>

                        {/* Metadata Row: Arrangement, Experience & Salary */}
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground my-3 pb-3 border-b border-border/60">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span>{job.workArrangement}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3.5 h-3.5 opacity-70" />
                            <span>{job.experience}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                            <Coins className="w-3.5 h-3.5" />
                            <span>{job.salaryRange}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                          {job.description}
                        </p>

                        {/* Tech Stack Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {job.techTags.map((tech) => (
                            <span
                              key={tech}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/80 text-foreground border border-border/50"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 opacity-70" />
                          <span>{job.location}</span>
                        </div>

                        <a
                          href={job.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 shadow-soft-sm group/btn"
                        >
                          <span>Apply</span>
                          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </section>

        {/* Benefits & Perks Section */}
        <section className="py-16 sm:py-24 bg-muted/20 border-y border-border/50">
          <div className="container max-w-7xl px-4 mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold tracking-wide uppercase text-primary mb-4">
                <span>{careersConfig.benefits.eyebrow}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-[1.12]">
                {careersConfig.benefits.heading}
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                {careersConfig.benefits.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {careersConfig.benefits.items.map((benefit, idx) => {
                const IconComponent = BENEFIT_ICONS[benefit.icon] || CheckCircle2;
                return (
                  <div
                    key={idx}
                    className="flex flex-col p-6 rounded-2xl bg-card border border-border/70 shadow-soft-sm hover:shadow-soft-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Spontaneous Open Application Banner */}
        <section className="py-16 sm:py-24 bg-background">
          <div className="container max-w-4xl px-4 mx-auto">
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] via-muted/30 to-background p-8 sm:p-12 text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{careersConfig.generalApplication.eyebrow}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-4">
                {careersConfig.generalApplication.heading}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                {careersConfig.generalApplication.description}
              </p>
              <a
                href={careersConfig.generalApplication.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-soft-sm group"
              >
                <span>{careersConfig.generalApplication.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>

        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
