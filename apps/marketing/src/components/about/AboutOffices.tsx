import { motion } from "framer-motion";
import { Mail, Phone, MapPin } from "lucide-react";
import { aboutConfig } from "@/config/aboutConfig";

/**
 * Line-art SVG illustration of the Bangladesh / Dhaka architectural skyline:
 * Features National Parliament (Jatiyo Sangsad Bhaban) geometry, Lalbagh / Mosque domes,
 * minarets, national monument spire, and riverfront water waves.
 */
const BangladeshSkylineSvg = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 240 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Sun / Moon circle */}
    <circle
      cx="185"
      cy="28"
      r="7"
      stroke="currentColor"
      strokeWidth="1"
      strokeDasharray="2 2"
      opacity="0.35"
    />

    {/* Background distant buildings */}
    <path
      d="M20 90 V65 H35 V90 M40 90 V50 H55 V90 M165 90 V45 H180 V90 M185 90 V55 H200 V90 M205 90 V68 H220 V90"
      stroke="currentColor"
      strokeWidth="0.8"
      opacity="0.2"
    />

    {/* Lalbagh / Mosque Minaret Left */}
    <path d="M45 90 V55 L48 45 L51 55 V90" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    <circle cx="48" cy="43" r="1.5" stroke="currentColor" strokeWidth="1" opacity="0.8" />

    {/* Main Mosque Dome */}
    <path
      d="M60 90 V68 Q80 42 100 68 V90"
      stroke="currentColor"
      strokeWidth="1.4"
      opacity="0.75"
    />
    {/* Dome Finial & Crescent */}
    <path d="M80 50 V40 M78 40 Q80 37 82 40" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
    {/* Dome Inner Arches */}
    <path d="M72 90 V76 Q80 70 88 76 V90" stroke="currentColor" strokeWidth="1" opacity="0.5" />

    {/* Jatiyo Sangsad Bhaban (National Parliament) Geometry */}
    <path d="M102 90 V48 H148 V90" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
    {/* Triangular and Circular Cutouts */}
    <path d="M112 72 L125 54 L138 72 Z" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    <circle cx="125" cy="80" r="4.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <path d="M106 90 V60 H112 M138 60 H144 V90" stroke="currentColor" strokeWidth="1" opacity="0.4" />

    {/* Right Minaret */}
    <path d="M152 90 V52 L155 42 L158 52 V90" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    <circle cx="155" cy="40" r="1.5" stroke="currentColor" strokeWidth="1" opacity="0.8" />

    {/* Historic Fort Archway */}
    <path
      d="M162 90 V60 H178 V90 M166 90 V70 Q170 65 174 70 V90"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />

    {/* Horizon line */}
    <line x1="10" y1="90" x2="230" y2="90" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />

    {/* Riverfront water waves (Buriganga / coastal lines) */}
    <path d="M15 96 H225" stroke="currentColor" strokeWidth="1" strokeDasharray="14 6" opacity="0.6" />
    <path d="M25 102 H215" stroke="currentColor" strokeWidth="0.9" strokeDasharray="10 8" opacity="0.45" />
    <path d="M35 108 H205" stroke="currentColor" strokeWidth="0.8" strokeDasharray="16 10" opacity="0.3" />
    <path d="M50 114 H190" stroke="currentColor" strokeWidth="0.7" strokeDasharray="8 6" opacity="0.2" />
  </svg>
);

/**
 * Line-art SVG illustration of the USA / New York skyline:
 * Features suspension bridge towers and cables, the Statue of Liberty silhouette with raised torch,
 * and iconic Manhattan skyscraper spires.
 */
const UsaSkylineSvg = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 240 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Suspension Bridge (Left) */}
    <path
      d="M22 90 V40 H34 V90 M26 52 H30 M26 66 H30 M26 78 H30"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />
    {/* Main Cable */}
    <path d="M10 58 Q28 44 48 68 T90 90" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
    {/* Suspenders */}
    <path d="M18 56 V90 M28 48 V90 M38 58 V90 M46 66 V90" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    <line x1="10" y1="76" x2="60" y2="76" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />

    {/* Statue of Liberty (Center) */}
    {/* Pedestal */}
    <path d="M96 90 L100 74 H114 L118 90 Z" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
    <path d="M102 74 V66 H112 V74" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
    {/* Robed Figure */}
    <path d="M104 66 L105 48 H111 L112 66" stroke="currentColor" strokeWidth="1.3" opacity="0.8" />
    {/* Head & Crown */}
    <circle cx="108" cy="42" r="3.5" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
    <path d="M104 39 L102 36 M106 38 L105 34 M108 38 L108 33 M110 38 L111 34 M112 39 L114 36" stroke="currentColor" strokeWidth="1" opacity="0.8" />
    {/* Left Arm with Tablet */}
    <path d="M104 52 L99 55 V60 H103" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    {/* Right Arm Raised with Torch */}
    <path d="M112 50 L118 36 V28" stroke="currentColor" strokeWidth="1.3" opacity="0.85" />
    {/* Torch Flame */}
    <path d="M116 28 H120 M117 28 Q118 22 121 24 Q119 20 118 18 Q116 22 117 28" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />

    {/* Manhattan High-Rises & Skyscrapers (Right) */}
    <path d="M130 90 V46 H144 V90" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    <path d="M134 46 V90 M140 46 V90" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />

    {/* Empire State Building Silhouette */}
    <path
      d="M148 90 V48 H152 V36 H155 V26 H157 V14 L158 8 L159 14 V26 H161 V36 H164 V48 H168 V90"
      stroke="currentColor"
      strokeWidth="1.4"
      opacity="0.85"
    />
    <line x1="158" y1="8" x2="158" y2="4" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
    <path d="M152 60 H164 M152 72 H164 M152 82 H164" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />

    {/* Chrysler Art Deco Spire */}
    <path
      d="M172 90 V50 H175 L180 32 L185 50 H188 V90"
      stroke="currentColor"
      strokeWidth="1.3"
      opacity="0.75"
    />
    <line x1="180" y1="32" x2="180" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.8" />
    <path d="M176 44 Q180 40 184 44" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />

    {/* Modern High-Rises */}
    <path d="M192 90 V40 L204 48 V90" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    <path d="M208 90 V58 H222 V90" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />

    {/* Horizon Ground Line */}
    <line x1="10" y1="90" x2="230" y2="90" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />

    {/* Water reflection lines */}
    <path d="M15 96 H225" stroke="currentColor" strokeWidth="1" strokeDasharray="14 6" opacity="0.55" />
    <path d="M25 102 H215" stroke="currentColor" strokeWidth="0.9" strokeDasharray="10 8" opacity="0.4" />
    <path d="M35 108 H205" stroke="currentColor" strokeWidth="0.8" strokeDasharray="16 10" opacity="0.25" />
  </svg>
);

export const AboutOffices = () => {
  const { offices } = aboutConfig;

  return (
    <section className="py-20 sm:py-28 bg-[#08182b] text-white border-y border-slate-800/80 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-7xl px-4 mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/25 text-xs font-bold tracking-wide uppercase text-sky-400 mb-4">
            <MapPin className="w-3.5 h-3.5" />
            <span>{offices.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.12]">
            {offices.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            {offices.subtitle}
          </p>
        </div>

        {/* Global Addresses with Skyline Illustrations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {offices.locations.map((loc, idx) => {
            const isBangladesh = loc.country.toLowerCase().includes("bangladesh");

            return (
              <motion.div
                key={loc.country}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-7 p-7 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-500/30 transition-all duration-300 shadow-xl group"
              >
                {/* Line-Art Vector Skyline Illustration */}
                <div className="w-40 sm:w-44 shrink-0 flex items-center justify-center text-sky-300/70 group-hover:text-sky-300 transition-colors duration-300 pt-1">
                  {isBangladesh ? (
                    <BangladeshSkylineSvg className="w-full h-auto" />
                  ) : (
                    <UsaSkylineSvg className="w-full h-auto" />
                  )}
                </div>

                {/* Office Details */}
                <div className="flex flex-col flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {loc.country}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/20">
                      {loc.flag} {loc.city}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal mb-3.5 max-w-md">
                    {loc.address}
                  </p>

                  <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10 text-xs sm:text-sm">
                    {loc.email && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-sky-400 font-medium">
                        <Mail className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <a
                          href={`mailto:${loc.email}`}
                          className="hover:text-sky-300 hover:underline transition-colors"
                        >
                          {loc.email}
                        </a>
                      </div>
                    )}
                    {loc.phone && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-400 font-normal">
                        <Phone className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <a
                          href={`tel:${loc.phone.replace(/[\s-]/g, "")}`}
                          className="hover:text-slate-200 transition-colors"
                        >
                          {loc.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
