import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// Double chevron pointing right, exactly matching the user's uploaded image
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7 4 15 12 7 20"></polyline>
    <polyline points="13 4 21 12 13 20"></polyline>
  </svg>
);

// Double chevron pointing down
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 12 15 20 7"></polyline>
    <polyline points="4 13 12 21 20 13"></polyline>
  </svg>
);

const AgentCapabilitiesSection = () => {
  const [coords, setCoords] = useState<{
    c1: { x: number; y: number; w: number; h: number };
    c2: { x: number; y: number; w: number; h: number };
    c3: { x: number; y: number; w: number; h: number };
    c4: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card4Ref = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (
      !containerRef.current ||
      !card1Ref.current ||
      !card2Ref.current ||
      !card3Ref.current ||
      !card4Ref.current
    )
      return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const r1 = card1Ref.current.getBoundingClientRect();
    const r2 = card2Ref.current.getBoundingClientRect();
    const r3 = card3Ref.current.getBoundingClientRect();
    const r4 = card4Ref.current.getBoundingClientRect();

    setCoords({
      c1: {
        x: r1.left - containerRect.left,
        y: r1.top - containerRect.top,
        w: r1.width,
        h: r1.height
      },
      c2: {
        x: r2.left - containerRect.left,
        y: r2.top - containerRect.top,
        w: r2.width,
        h: r2.height
      },
      c3: {
        x: r3.left - containerRect.left,
        y: r3.top - containerRect.top,
        w: r3.width,
        h: r3.height
      },
      c4: {
        x: r4.left - containerRect.left,
        y: r4.top - containerRect.top,
        w: r4.width,
        h: r4.height
      }
    });
  };

  useEffect(() => {
    updateCoords();
    window.addEventListener("resize", updateCoords);
    
    // Setup ResizeObservers on all individual elements to track height shifts
    const observer = new ResizeObserver(updateCoords);
    if (card1Ref.current) observer.observe(card1Ref.current);
    if (card2Ref.current) observer.observe(card2Ref.current);
    if (card3Ref.current) observer.observe(card3Ref.current);
    if (card4Ref.current) observer.observe(card4Ref.current);
    if (containerRef.current) observer.observe(containerRef.current);

    // Fallbacks
    const timer1 = setTimeout(updateCoords, 200);
    const timer2 = setTimeout(updateCoords, 600);
    const timer3 = setTimeout(updateCoords, 1500);

    return () => {
      window.removeEventListener("resize", updateCoords);
      observer.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6, delay, ease: [0.19, 1, 0.22, 1] as const }
  });

  let d1 = "";
  let d2 = "";
  let d3 = "";
  let mid1 = { x: 0, y: 0 };
  let mid3 = { x: 0, y: 0 };
  let entry3 = { x: 0, y: 0 };
  let isDesktopMode = false;

  if (coords) {
    const isDesktop = Math.abs(coords.c1.y - coords.c2.y) < 50;
    isDesktopMode = isDesktop;
    entry3 = { x: coords.c3.x + coords.c3.w / 2, y: coords.c3.y };

    if (isDesktop) {
      // Card 1 to 2
      const start1 = { x: coords.c1.x + coords.c1.w + 6, y: coords.c1.y + coords.c1.h / 2 };
      const end1 = { x: coords.c2.x - 14, y: coords.c2.y + coords.c2.h / 2 };
      d1 = `M ${start1.x} ${start1.y} L ${end1.x} ${end1.y}`;
      mid1 = { x: (start1.x + end1.x) / 2, y: (start1.y + end1.y) / 2 };

      // Card 3 to 4
      const start3 = { x: coords.c3.x + coords.c3.w + 6, y: coords.c3.y + coords.c3.h / 2 };
      const end3 = { x: coords.c4.x - 14, y: coords.c4.y + coords.c4.h / 2 };
      d3 = `M ${start3.x} ${start3.y} L ${end3.x} ${end3.y}`;
      mid3 = { x: (start3.x + end3.x) / 2, y: (start3.y + end3.y) / 2 };

      // Card 2 to 3 S-Curve (Full beautiful curve line, enters card 3 top)
      const start2 = { x: coords.c2.x + coords.c2.w / 2, y: coords.c2.y + coords.c2.h + 6 };
      const end2 = { x: coords.c3.x + coords.c3.w / 2, y: coords.c3.y }; // Connect directly to top edge
      const midY = (start2.y + end2.y) / 2;
      d2 = `M ${start2.x} ${start2.y} 
            C ${start2.x} ${midY}, ${start2.x - 15} ${midY}, ${start2.x - 30} ${midY} 
            L ${end2.x + 30} ${midY} 
            C ${end2.x + 15} ${midY}, ${end2.x} ${midY}, ${end2.x} ${end2.y}`;
    } else {
      // Mobile: straight vertical lines
      const end1 = { x: coords.c1.x + coords.c1.w / 2, y: coords.c1.y + coords.c1.h + 6 };
      const start2 = { x: coords.c2.x + coords.c2.w / 2, y: coords.c2.y - 14 };
      d1 = `M ${end1.x} ${end1.y} L ${start2.x} ${start2.y}`;
      mid1 = { x: (end1.x + start2.x) / 2, y: (end1.y + start2.y) / 2 };

      const end2 = { x: coords.c2.x + coords.c2.w / 2, y: coords.c2.y + coords.c2.h + 6 };
      const start3 = { x: coords.c3.x + coords.c3.w / 2, y: coords.c3.y };
      d2 = `M ${end2.x} ${end2.y} L ${start3.x} ${start3.y}`;

      const end3 = { x: coords.c3.x + coords.c3.w / 2, y: coords.c3.y + coords.c3.h + 6 };
      const start4 = { x: coords.c4.x + coords.c4.w / 2, y: coords.c4.y - 14 };
      d3 = `M ${end3.x} ${end3.y} L ${start4.x} ${start4.y}`;
      mid3 = { x: (end3.x + start4.x) / 2, y: (end3.y + start4.y) / 2 };
    }
  }

  return (
    <section style={{ background: "#ffffff", borderTop: "1px solid #efeeeb", position: "relative" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(40px, 6vw, 90px) 26px" }}>
        
        {/* Section Heading */}
        <motion.div {...fade(0)} style={{ textAlign: "center", marginBottom: 54 }}>
          <h2
            style={{
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(32px, 4.5vw, 48px)",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#1f1d1a",
              margin: 0,
            }}
          >
            Keep work moving 24/7.
          </h2>
        </motion.div>

        {/* Grid wrapper */}
        <div className="agent-cards-grid" ref={containerRef} style={{ position: "relative" }}>
          
          {/* Animated Connecting Lines Overlay */}
          {coords && (
            <>
              {/* SVG Dashed Paths */}
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 10 }}>
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#10b981" />
                  </marker>
                </defs>
                {/* Clean full solid lines instead of animated dashes.
                    Path d2 from 2 to 3 does NOT use markerEnd, replaced by floating ChevronDown badge at card top. */}
                <path d={d1} fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow)" />
                <path d={d2} fill="none" stroke="#10b981" strokeWidth="3" />
                <path d={d3} fill="none" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow)" />
              </svg>

              {/* Floating Double Chevron Badges (High Z-Index, Centered on Paths, Static/Non-animated) */}
              <div className="chevron-flow-badge" style={{ left: mid1.x - 16, top: mid1.y - 16 }}>
                {isDesktopMode ? <ChevronRight /> : <ChevronDown />}
              </div>
              <div className="chevron-flow-badge" style={{ left: entry3.x - 16, top: entry3.y - 16 }}>
                <ChevronDown />
              </div>
              <div className="chevron-flow-badge" style={{ left: mid3.x - 16, top: mid3.y - 16 }}>
                {isDesktopMode ? <ChevronRight /> : <ChevronDown />}
              </div>
            </>
          )}

          {/* Card 1 - Q&A Agents */}
          <motion.div
            ref={card1Ref}
            {...fade(0.1)}
            className="agent-card"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ zIndex: 2 }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="card-number-badge">1</span>
                  <h3 className="agent-card-title">Q&A Agents</h3>
                </div>
                <p className="agent-card-subtitle">Ask, explore, and get structured answers instantly</p>
              </div>
              <div className="arrow-circle-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
            
            <div className="agent-media-container">
              <video
                loop
                muted
                autoPlay
                playsInline
                preload="metadata"
                poster="https://images.ctfassets.net/spoqsaf9291f/5Isk6wP7mwgbI1uuPOXCDT/9971afbbf0f81172ac8c0af85bb1877c/web-qa-agent-4x3_final.jpg"
                src="https://videos.ctfassets.net/spoqsaf9291f/NbFul3fpx8iFqd92FdjZb/2a0b3f2e96fdcd6623bf0f97064bfc1c/web-qa-agent-4x3_final.mp4"
                className="agent-video"
              />
            </div>
          </motion.div>

          {/* Card 2 - Create Your Own Agents */}
          <motion.div
            ref={card2Ref}
            {...fade(0.2)}
            className="agent-card"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ zIndex: 2 }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="card-number-badge">2</span>
                  <h3 className="agent-card-title">Create Your Own Agents</h3>
                </div>
                <p className="agent-card-subtitle">Build custom workflows tailored to your team</p>
              </div>
              <div className="arrow-circle-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
            
            <div className="agent-media-container">
              <video
                loop
                muted
                autoPlay
                playsInline
                preload="metadata"
                poster="https://images.ctfassets.net/spoqsaf9291f/15uVF5m1kQriPMlHagIwWY/8aa8519f91779b95d414502d04e29f5f/web-create-your-own-4x3_final.jpg"
                src="https://videos.ctfassets.net/spoqsaf9291f/1OLb7tmvBV87BCaVvTUhsO/bf8b7aa035add8cb4482c840342aa2f6/web-create-your-own-4x3_final.mp4"
                className="agent-video"
              />
            </div>
          </motion.div>

          {/* Card 3 - Docs */}
          <motion.div
            ref={card3Ref}
            {...fade(0.3)}
            className="agent-card"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ zIndex: 2 }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="card-number-badge">3</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#cd7b4f", letterSpacing: ".02em" }}>Docs</span>
                </div>
                <h3 className="agent-card-title" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.015em", color: "#1f1d1a", margin: 0 }}>
                  Simple and powerful.
                </h3>
              </div>
              <div className="arrow-circle-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
            
            {/* Visual content container */}
            <div style={{ background: "#1b927d", borderRadius: 12, height: 350, position: "relative", overflow: "hidden", border: "1px solid #167a68", marginTop: "auto" }}>
              {/* Back Card (H1 Planning) */}
              <div className="docs-mock-card docs-mock-card-back">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ background: "#e0f2fe", width: 24, height: 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 13 }}>📖</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>H1 Planning</h4>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <span className="mock-badge">👤 Laura Oritz</span>
                  <span className="mock-badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>Draft</span>
                  <span className="mock-badge" style={{ background: "#fce7f3", color: "#9d174d" }}>RFC</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>Overview</div>
                <p style={{ margin: 0, fontSize: 10, color: "#6b7280", lineHeight: 1.4 }}>
                  In H1, the Acquisition & Growth team will focus on driving activation and self-serve revenue by improving onboarding flows...
                </p>
                <div style={{ marginTop: 8, fontSize: 10, color: "#6b7280" }}>
                  1. Increase qualified traffic<br />
                  2. Improve activation benchmarks
                </div>
              </div>

              {/* Front Card (Help Center Revamp) */}
              <div className="docs-mock-card docs-mock-card-front">
                <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#111827" }}>Help Center Revamp</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                  <span className="mock-badge">👥 DRI: Emily Yang +1</span>
                  <span className="mock-badge" style={{ background: "#fef3c7", color: "#b45309" }}>In progress</span>
                </div>
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 6 }}>
                    <div className="mock-avatar">E</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#374151" }}>Laura Oritz <span style={{ fontWeight: 400, color: "#9ca3af" }}>Just now</span></div>
                      <div style={{ fontSize: 9, color: "#4b5563", lineHeight: 1.35 }}>Can you check these dates? @Emily</div>
                    </div>
                  </div>
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, padding: "4px 8px", fontSize: 9, color: "#9ca3af" }}>
                    Add a comment...
                  </div>
                </div>

                {/* Calendar element */}
                <div style={{ marginTop: 10, borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#374151" }}>June 2026</span>
                    <span style={{ fontSize: 8, color: "#9ca3af" }}>Mon - Thu</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, background: "#f9fafb", padding: 2, borderRadius: 4 }}>
                    {[1, 2, 3, 4].map(day => (
                      <div key={day} style={{ height: 18, background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#9ca3af", position: "relative" }}>
                        {day}
                        {day === 1 && (
                          <div style={{ position: "absolute", bottom: 1, left: 1, right: 1, height: 4, background: "#fef3c7", borderRadius: 1, display: "flex", alignItems: "center", paddingLeft: 1 }}>
                            <div style={{ width: 2, height: 2, borderRadius: "50%", background: "#b45309" }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#fef8e7", border: "1px solid #fdf0cd", borderRadius: 4, padding: "4px 6px", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#d97706" }} />
                    <span style={{ fontSize: 8, fontWeight: 600, color: "#b45309" }}>Concepting: Emily Yang</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 4 - Knowledge Base */}
          <motion.div
            ref={card4Ref}
            {...fade(0.4)}
            className="agent-card"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ zIndex: 2 }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="card-number-badge">4</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#cd7b4f", letterSpacing: ".02em" }}>Knowledge Base</span>
                </div>
                <h3 className="agent-card-title" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.015em", color: "#1f1d1a", margin: 0 }}>
                  One source of truth for teams and agents.
                </h3>
              </div>
              <div className="arrow-circle-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
            
            {/* Visual content container */}
            <div style={{ background: "#4292f7", borderRadius: 12, height: 350, padding: "20px 24px 0", display: "flex", flexDirection: "column", border: "1px solid #2f81e5", marginTop: "auto" }}>
              <div className="kb-mock-card">
                {/* Space Shuttle Launch Banner */}
                <div style={{ height: 100, width: "100%", overflow: "hidden", position: "relative" }}>
                  <img
                    src="/shuttle_launch.png"
                    alt="Space Shuttle Launch"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{ position: "absolute", bottom: 8, left: 12, background: "rgba(255,255,255,0.9)", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, color: "#111827" }}>
                    🚀 Launch
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: 14 }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#111827" }}>Company HQ</h4>
                  
                  {/* Purple Welcome Banner */}
                  <div style={{ background: "#f3e8ff", border: "1px solid #e9d5ff", borderRadius: 6, padding: "8px 10px", display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 12 }}>📋</span>
                    <p style={{ margin: 0, fontSize: 9, color: "#6b21a8", lineHeight: 1.35, fontWeight: 500 }}>
                      Welcome to the home for company-wide info — strategy and goals, how we work day-to-day, and resources to support your growth.
                    </p>
                  </div>

                  {/* Two columns */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", marginBottom: 6, borderBottom: "1px solid #f3f4f6", paddingBottom: 2 }}>Company</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div className="kb-link-item">📅 Meetings</div>
                        <div className="kb-link-item">📄 Docs</div>
                        <div className="kb-link-item">🎯 Projects</div>
                        <div className="kb-link-item">✅ Tasks</div>
                        <div className="kb-link-item">👥 Teams & Org Chart</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#374151", marginBottom: 6, borderBottom: "1px solid #f3f4f6", paddingBottom: 2 }}>People Resources</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div className="kb-link-item">🌴 Company Holidays</div>
                        <div className="kb-link-item">🌐 Relocation Guidelines</div>
                        <div className="kb-link-item">💼 Vendor Review</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Styled Responsive Classes */}
      <style dangerouslySetInnerHTML={{ __html: `
        .agent-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 60px 28px;
        }
        .agent-card {
          background: #ffffff;
          border: 1px solid #eeede9;
          border-radius: 16px;
          padding: 32px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px -4px rgba(28,25,18,.04);
          overflow: hidden;
        }
        .agent-card-title {
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          font-weight: 700;
          font-size: 22px;
          color: #1f1d1a;
          margin: 0;
        }
        .agent-card-subtitle {
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: 15.5px;
          line-height: 1.4;
          color: #5c5a54;
          margin: 0;
        }
        .agent-media-container {
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #eeede9;
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          margin-top: auto;
        }
        .agent-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .arrow-circle-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1f1d1a;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }
        .agent-card:hover .arrow-circle-btn {
          background: #10b981;
        }
        .docs-mock-card {
          background: #ffffff;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
          border: 1px solid #f0efec;
        }
        .docs-mock-card-back {
          position: absolute;
          left: 20px;
          bottom: -20px;
          width: 240px;
          opacity: 0.9;
        }
        .docs-mock-card-front {
          position: absolute;
          right: 20px;
          top: 20px;
          width: 240px;
          z-index: 10;
        }
        .mock-badge {
          display: inline-flex;
          align-items: center;
          font-size: 8px;
          font-weight: 600;
          color: #4b5563;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .mock-avatar {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #d1fae5;
          color: #065f46;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 700;
        }
        .kb-mock-card {
          background: #ffffff;
          border-radius: 8px 8px 0 0;
          box-shadow: 0 4px 14px rgba(0,0,0,0.06);
          border: 1px solid #f0efec;
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .kb-link-item {
          font-size: 9px;
          font-weight: 600;
          color: #4b5563;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        .kb-link-item:hover {
          color: #2563eb;
        }
        
        .card-number-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1.5px solid #10b981;
          color: #10b981;
          font-size: 11px;
          font-weight: 700;
          font-family: Inter, sans-serif;
        }
        
        .chevron-flow-badge {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 12;
          pointer-events: none;
          transform-origin: center;
        }

        @media (max-width: 768px) {
          .agent-cards-grid {
            grid-template-columns: 1fr;
            gap: 50px;
          }
          .agent-card {
            padding: 24px;
          }
          .agent-card-title {
            font-size: 20px;
          }
          .agent-card-subtitle {
            font-size: 14.5px;
          }
          .docs-mock-card-back {
            left: 10px;
            width: 200px;
          }
          .docs-mock-card-front {
            right: 10px;
            width: 200px;
          }
        }
      `}} />
    </section>
  );
};

export default AgentCapabilitiesSection;
