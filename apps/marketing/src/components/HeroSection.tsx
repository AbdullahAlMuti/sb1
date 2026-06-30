import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { siteConfig, ACTIVE_SCROLLING_LOGOS } from "@/config/siteConfig";
import { useReducedMotion } from "@/lib/useReducedMotion";


// --- Custom Line-Art Inline SVG Avatars (Notion style) ---

const Avatar1 = () => (
  <svg viewBox="0 0 100 100" fill="none" stroke="#1f1d1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
    {/* Head outline */}
    <path d="M50 82c16.5 0 28-11.5 28-28s-11.5-26-28-26-28 9.5-28 26 11.5 28 28 28z" fill="#ffffff" />
    {/* Hair back */}
    <path d="M22 54c0-20 8-24 28-24s28 4 28 24" fill="none" strokeWidth="3.5" />
    {/* Eyebrows */}
    <path d="M38 46c3-1 7-1 9 1M62 46c-3-1-7-1-9 1" />
    {/* Eyes */}
    <circle cx="42" cy="51" r="2" fill="#1f1d1a" stroke="none" />
    <circle cx="58" cy="51" r="2" fill="#1f1d1a" stroke="none" />
    {/* Nose */}
    <path d="M50 50v5c0 1 1 2 2 2" />
    {/* Mouth */}
    <path d="M43 62c2.5 3 11.5 3 14 0" fill="none" />
  </svg>
);

const Avatar2 = () => (
  <svg viewBox="0 0 100 100" fill="none" stroke="#1f1d1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
    {/* Head outline */}
    <path d="M50 80c15 0 26-11 26-26s-11-24-26-24-26 9-26 24 11 26 26 26z" fill="#ffffff" />
    {/* Hair */}
    <path d="M24 50c-2-8-1-16 6-20 6-3 28-5 36 2 4 4 10 10 10 18" fill="none" strokeWidth="3.5" />
    {/* Glasses */}
    <circle cx="39" cy="48" r="7" fill="none" />
    <circle cx="61" cy="48" r="7" fill="none" />
    <path d="M46 48h8" />
    {/* Eyes inside glasses */}
    <circle cx="39" cy="48" r="1.5" fill="#1f1d1a" stroke="none" />
    <circle cx="61" cy="48" r="1.5" fill="#1f1d1a" stroke="none" />
    {/* Nose */}
    <path d="M50 51v4" />
    {/* Mouth */}
    <path d="M42 63c2 2 14 2 16 0" fill="none" />
  </svg>
);

// Supplier import parcel symbol (Soft Coral Background)
const Avatar3 = () => (
  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "52%", height: "52%" }}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  </div>
);

// Shopping / Sourcing Cart symbol (Soft Yellow Background)
const Avatar4 = () => (
  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "52%", height: "52%" }}>
      <circle cx="9" cy="21" r="1" fill="#d97706" />
      <circle cx="20" cy="21" r="1" fill="#d97706" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  </div>
);

const Avatar5 = () => (
  <svg viewBox="0 0 100 100" fill="none" stroke="#1f1d1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
    {/* Head outline */}
    <path d="M50 78c14 0 25-10 25-24s-11-23-25-23-25 9-25 23 11 24 25 24z" fill="#ffffff" />
    {/* Curly hair outline */}
    <path d="M26 38c-3-2-7 1-7 5s4 7 7 5M25 48c-4 0-6 5-4 8s6 1 4-8M75 38c3-2 7 1 7 5s-4 7-7 5M75 48c4 0 6 5 4 8s-6 1-4-8M32 29c-1-4 4-7 8-5s2 6-8 5M68 29c1-4-4-7-8-5s-2 6 8 5" fill="#ffffff" strokeWidth="2.5" />
    {/* Face details */}
    <circle cx="43" cy="49" r="2" fill="#1f1d1a" stroke="none" />
    <circle cx="57" cy="49" r="2" fill="#1f1d1a" stroke="none" />
    <path d="M50 49v4c0 0.5 0.5 1 1 1" />
    {/* Smile */}
    <path d="M42 59q8 4 16 0" fill="none" />
  </svg>
);

// Listing / Price Tag symbol (Soft Blue Background)
const Avatar6 = () => (
  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "52%", height: "52%" }}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1" fill="#2563eb" />
    </svg>
  </div>
);

const Avatar7 = () => (
  <svg viewBox="0 0 100 100" fill="none" stroke="#1f1d1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
    {/* Head outline */}
    <path d="M50 82c15.5 0 27-11 27-26s-11.5-24-27-24-27 9-27 24 11.5 26 27 26z" fill="#ffffff" />
    {/* Hair/Beanie Hat */}
    <path d="M24 48c0-12 10-18 26-18s26 6 26 18H24z" fill="#1f1d1a" strokeWidth="2.5" />
    {/* Beard */}
    <path d="M30 55c0 14 8 23 20 23s20-9 20-23c0-1.5-1-2.5-3-2.5H33c-2 0-3 1-3 2.5z" fill="#f4f4f5" />
    {/* Eyes */}
    <circle cx="41" cy="46" r="2" fill="#1f1d1a" stroke="none" />
    <circle cx="59" cy="46" r="2" fill="#1f1d1a" stroke="none" />
    {/* Nose */}
    <path d="M50 46v5" />
    {/* Mouth */}
    <path d="M44 60q6 3 12 0" fill="none" />
  </svg>
);

const AVATARS = [
  { src: "/logos/amazon-icon.svg", name: "Amazon", border: "2px solid #ff9900", z: 10 },
  { src: "/logos/walmart-spark.svg", name: "Walmart", border: "2px solid #0071dc", z: 9 },
  { src: "/logos/ebay.svg", name: "eBay", border: "2px solid #e53238", z: 8 },
  { src: "/logos/aliexpress.svg", name: "AliExpress", border: "2px solid #e62e04", z: 7 },
  { src: "/logos/etsy.svg", name: "Etsy", border: "2px solid #d5641c", z: 6 },
  { src: "/logos/tiktok.svg", name: "TikTok", border: "2px solid #000000", z: 5 },
  { src: "/logos/Mercari.jpeg", name: "Mercari", border: "2px solid #00a2e5", z: 4 },
  { src: "/logos/cjdropshipping.ico", name: "CJ Dropshipping", border: "2px solid #ff5500", z: 3 },
  { src: "/logos/temu.svg", name: "Temu", border: "2px solid #fb7701", z: 2 },
  { src: "/logos/alibaba.svg", name: "Alibaba", border: "2px solid #ff6a00", z: 1 },
];

const WORDS = ["think", "research", "list", "ship", "build"];

const THEMES: Record<string, { bg: string; dot: string; text: string }> = {
  think: { bg: "#eae6f9", dot: "#6941c6", text: "#6941c6" },
  research: { bg: "#dbeafe", dot: "#2563eb", text: "#1e40af" },
  list: { bg: "#fef3c7", dot: "#d97706", text: "#b45309" },
  ship: { bg: "#fee2e2", dot: "#dc2626", text: "#b91c1c" },
  build: { bg: "#dcfce7", dot: "#16a34a", text: "#15803d" },
};

const HeroSection = () => {
  const { hero } = siteConfig;
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Typewriter rotater logic
  const [wordIndex, setWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentWord = WORDS[wordIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentText((prev) => prev.slice(0, -1));
      }, 35); // Fast deleting
    } else {
      timer = setTimeout(() => {
        setCurrentText((prev) => currentWord.slice(0, prev.length + 1));
      }, 75); // Fast typing
    }

    if (!isDeleting && currentText === currentWord) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 1400); // 1.4s pause when word is fully typed
    }

    if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % WORDS.length);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, wordIndex]);

  const currentTheme = THEMES[WORDS[wordIndex]] || THEMES.think;

  const scrollingLogos = [
    ...ACTIVE_SCROLLING_LOGOS,
    ...ACTIVE_SCROLLING_LOGOS,
    ...ACTIVE_SCROLLING_LOGOS,
    ...ACTIVE_SCROLLING_LOGOS,
  ];

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const yRaw  = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const scRaw = useTransform(scrollYProgress, [0, 1], [0.97, 1.03]);
  const y     = reduced ? 0 : yRaw;
  const scale = reduced ? 1 : scRaw;

  const fade = (delay = 0) =>
    reduced
      ? {}
      : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.19, 1, 0.22, 1] as const } };

  return (
    <div style={{ background: "#ffffff", borderBottom: "1px solid #efeeeb", position: "relative", overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blink-cursor {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .typewriter-cursor {
          animation: blink-cursor 0.8s infinite step-end;
        }
        @keyframes scroll-track {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .scroll-track-inner {
          display: inline-flex;
          gap: 80px;
          animation: scroll-track 30s linear infinite;
        }
        .scroll-track-inner:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Hero text */}
      <section
        ref={containerRef}
        style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "80px 26px 26px", textAlign: "center", zIndex: 2 }}
      >
        {/* Overlapping illustrative avatar group */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: {
              transition: {
                staggerChildren: 0.05,
              }
            }
          }}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 28,
            paddingLeft: 10,
          }}
        >
          {AVATARS.map((av, index) => (
            <motion.div
              key={index}
              variants={{
                initial: { opacity: 0, scale: 0.3, y: 15 },
                animate: { 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 18,
                  }
                }
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#ffffff",
                border: av.border,
                marginLeft: index === 0 ? 0 : -10,
                zIndex: av.z,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 12px -3px rgba(28,25,18,.08)",
                overflow: "hidden",
              }}
              whileHover={{
                scale: 1.18,
                y: -6,
                zIndex: 100,
                boxShadow: "0 12px 20px -8px rgba(28,25,18,.15)",
              }}
              transition={{
                type: "spring",
                stiffness: 600,
                damping: 28,
                mass: 0.5
              }}
            >
              <img
                src={av.src}
                alt={`${av.name} logo`}
                title={av.name}
                style={{
                  width: "70%",
                  height: "70%",
                  objectFit: "contain",
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        <motion.h1
          {...fade(0)}
          style={{
            position: "relative", zIndex: 3,
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 800,
            fontSize: "clamp(38px, 5.5vw, 76px)",
            lineHeight: 1.2,
            letterSpacing: "-0.035em",
            color: "#1f1d1a",
            margin: "0 auto",
            maxWidth: "24ch",
          }}
        >
          <span style={{ display: "block" }}>Where teams and agents</span>
          <span style={{ display: "block", marginTop: "0.15em" }}>
            <span style={{ display: "inline-block" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.22em",
                  padding: "0.08em 0.5em 0.05em",
                  background: currentTheme.bg,
                  border: `2.5px solid ${currentTheme.dot}`,
                  borderRadius: "9999px",
                  color: currentTheme.text,
                  fontSize: "0.95em",
                  transform: "translateY(-0.06em)",
                  whiteSpace: "nowrap",
                  verticalAlign: "middle",
                  transition: "all 0.4s ease-in-out",
                }}
              >
                <span
                  style={{
                    width: "0.28em",
                    height: "0.28em",
                    borderRadius: "50%",
                    background: currentTheme.dot,
                    display: "inline-block",
                    transition: "background-color 0.4s ease-in-out",
                  }}
                />
                {currentText}
                <span
                  className="typewriter-cursor"
                  style={{
                    marginLeft: "1px",
                    fontWeight: "300",
                    opacity: 0.8,
                  }}
                >
                  |
                </span>
              </span>
            </span>{" "}
            together.
          </span>
        </motion.h1>



        <motion.div
          {...fade(0.2)}
          style={{ position: "relative", zIndex: 3, display: "flex", gap: 12, justifyContent: "center", marginTop: 34, flexWrap: "wrap" }}
        >
          <a
            href={hero.primaryCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="n-cta-dark"
            style={{ fontSize: 16, fontWeight: 600, color: "#fff", background: "#1f1d1a", padding: "13px 24px", borderRadius: 11, textDecoration: "none", transition: "background .15s" }}
          >
            {hero.primaryCta.label}
          </a>
          <a
            href={hero.secondaryCta.href}
            className="n-cta-ghost"
            style={{ fontSize: 16, fontWeight: 600, color: "#1f1d1a", background: "#fff", border: "1px solid #e1e0dc", padding: "13px 22px", borderRadius: 11, textDecoration: "none", transition: "background .15s" }}
          >
            {hero.secondaryCta.label}
          </a>
        </motion.div>
      </section>

      {/* Mockup */}
      <section style={{ position: "relative", zIndex: 2, maxWidth: 1180, margin: "0 auto", padding: "40px 26px 4px" }}>
        <motion.div
          {...(reduced ? {} : { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.75, delay: 0.35, ease: [0.19, 1, 0.22, 1] as const } })}
          style={{ y, scale }}
        >
          <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid #eeede9", boxShadow: "0 40px 80px -48px rgba(28,25,18,.32)" }}>
            <video
              loop
              muted
              autoPlay
              playsInline
              preload="metadata"
              src="https://videos.ctfassets.net/spoqsaf9291f/1EL7UZIXfcqngxsNSbL8tR/291f61f56f29dd8e788deaec8561d882/web-homepage-hero-1920x1200_final.mp4"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </motion.div>
      </section>

      {/* Trust strip */}
      <section style={{ position: "relative", zIndex: 2, maxWidth: 1180, margin: "0 auto", padding: "64px 26px 88px", textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#8e8b83", margin: "0 0 36px", letterSpacing: "-0.01em" }}>
          Trusted by 50,000+ eBay resellers worldwide
        </p>
        
        <div style={{ position: "relative", overflow: "hidden", padding: "16px 0" }}>
          {/* Edge gradients for soft fade */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 100, background: "linear-gradient(to right, #ffffff, rgba(255,255,255,0))", zIndex: 2, pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 100, background: "linear-gradient(to left, #ffffff, rgba(255,255,255,0))", zIndex: 2, pointerEvents: "none" }} />

          <div className="scroll-track-inner" style={{ alignItems: "center" }}>
            {scrollingLogos.map((lg, i) => (
              <img
                key={i}
                src={lg.src}
                alt={`${lg.name} logo`}
                title={lg.name}
                style={{
                  height: "42px",
                  width: "auto",
                  objectFit: "contain",
                  opacity: 0.95,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
