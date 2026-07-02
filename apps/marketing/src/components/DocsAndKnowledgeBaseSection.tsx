import { motion } from "framer-motion";

const DocsAndKnowledgeBaseSection = () => {
  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6, delay, ease: [0.19, 1, 0.22, 1] as const }
  });

  return (
    <section style={{ background: "#ffffff", borderBottom: "1px solid #efeeeb", position: "relative" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(40px, 6vw, 80px) 26px" }}>
        
        {/* Two-Column Grid */}
        <div className="docs-kb-grid">
          
          {/* Left Card - Docs */}
          <motion.div
            {...fade(0.1)}
            className="docs-kb-card"
            whileHover={{ y: -4, boxShadow: "0 16px 36px -12px rgba(28,25,18,.08)", opacity: 0.99 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#cd7b4f", letterSpacing: ".02em" }}>Docs</span>
                <h3 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.015em", color: "#1f1d1a", margin: 0 }}>
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
            <div style={{ background: "#1b927d", borderRadius: 12, height: 350, position: "relative", overflow: "hidden", border: "1px solid #167a68" }}>
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
                      <div style={{ fontSize: 9, color: "#4b5563", lineHeight: 1.3 }}>Can you check these dates? @Emily</div>
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

          {/* Right Card - Knowledge Base */}
          <motion.div
            {...fade(0.2)}
            className="docs-kb-card"
            whileHover={{ y: -4, boxShadow: "0 16px 36px -12px rgba(28,25,18,.08)", opacity: 0.99 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#cd7b4f", letterSpacing: ".02em" }}>Knowledge Base</span>
                <h3 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.015em", color: "#1f1d1a", margin: 0 }}>
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
            <div style={{ background: "#4292f7", borderRadius: 12, height: 350, padding: "20px 24px 0", display: "flex", flexDirection: "column", border: "1px solid #2f81e5" }}>
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
        .docs-kb-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px;
        }
        .docs-kb-card {
          background: #ffffff;
          border: 1px solid #eeede9;
          border-radius: 16px;
          padding: 32px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px -4px rgba(28,25,18,.04);
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
        .docs-kb-card:hover .arrow-circle-btn {
          background: #cd7b4f;
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

        @media (max-width: 768px) {
          .docs-kb-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .docs-kb-card {
            padding: 24px;
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
      ` }} />
    </section>
  );
};

export default DocsAndKnowledgeBaseSection;
