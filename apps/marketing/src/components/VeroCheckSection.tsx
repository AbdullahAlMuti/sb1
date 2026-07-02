import { motion } from "framer-motion";

const VeroCheckSection = () => {
  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6, delay, ease: [0.19, 1, 0.22, 1] as const }
  });

  return (
    <section style={{ background: "#ffffff", borderBottom: "1px solid #efeeeb", overflow: "hidden" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 26px clamp(40px, 6vw, 90px)" }}>
        
        {/* Banner Grid Container */}
        <motion.div 
          {...fade(0)}
          className="vero-banner-container"
        >
          {/* Left Column: Text Content */}
          <div className="vero-text-col">
            <span className="vero-label">eBay Compliance</span>
            <h2 className="vero-heading">Avoid VeRO blocks. Protect your account.</h2>
            <p className="vero-subtext">
              SellerSuit screens every product title in under a second against eBay's Verified Rights Owner (VeRO) list. Flag trademark risks and block violations before they strike your store.
            </p>
            <div className="vero-action-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </div>

          {/* Right Column: Visual Showcase (Clay Background & Mockups) */}
          <div className="vero-visual-col">
            
            {/* Background Card 1 (Compliance Scanner status list) */}
            <div className="vero-mock-card vero-mock-card-back">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: 8, marginBottom: 10 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111827" }}>Compliance Scan</h4>
                  <span style={{ fontSize: 9, color: "#9ca3af" }}>Queue ID: #82049</span>
                </div>
                <span className="vero-scan-badge">Active</span>
              </div>
              
              {/* Scan Item Row 1 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="brand-dot brand-dot-red" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#374151" }}>Adidas Campus Sneakers</span>
                </div>
                <span className="brand-status-tag status-flagged">⚠️ Brand Flagged</span>
              </div>

              {/* Scan Item Row 2 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="brand-dot brand-dot-green" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#374151" }}>Generic Stainless Tumbler</span>
                </div>
                <span className="brand-status-tag status-safe">✓ Clean</span>
              </div>

              {/* Scan Item Row 3 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="brand-dot brand-dot-red" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#374151" }}>Sony WH-1000XM4 Headset</span>
                </div>
                <span className="brand-status-tag status-flagged">⚠️ Brand Flagged</span>
              </div>

              {/* Generated Image Preview */}
              <div style={{ width: "100%", height: 85, borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <img
                  src="/vero_compliance_scan.png"
                  alt="VeRO Scanner Mockup"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>

            {/* Foreground Card 2 (Overlapping Extension Block Alert) */}
            <div className="vero-mock-card vero-mock-card-front">
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ background: "#fee2e2", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#ef4444", fontSize: 12, fontWeight: "bold" }}>⚠️</span>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#b00020" }}>VeRO brand risk detected</h4>
                  <p style={{ margin: 0, fontSize: 9.5, color: "#555555", lineHeight: 1.35 }}>
                    Listing protected brands can get your eBay account suspended. Recommended: remove the brand from the title.
                  </p>
                </div>
              </div>
              
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8, display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <button className="vero-modal-btn btn-cancel">Cancel</button>
                <button className="vero-modal-btn btn-override">List anyway</button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>

      {/* Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .vero-banner-container {
          display: grid;
          grid-template-columns: 42% 58%;
          border: 1px solid #eeede9;
          border-radius: 20px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
        }
        .vero-text-col {
          padding: clamp(28px, 4.5vw, 50px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          background: #ffffff;
        }
        .vero-label {
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8c8980;
          margin-bottom: 12px;
        }
        .vero-heading {
          font-family: Inter, sans-serif;
          font-weight: 800;
          font-size: clamp(26px, 3vw, 34px);
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: #1f1d1a;
          margin: 0 0 14px 0;
        }
        .vero-subtext {
          font-family: Inter, sans-serif;
          font-size: 14.5px;
          line-height: 1.45;
          color: #5c5a54;
          margin: 0 0 20px 0;
        }
        .vero-action-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #1f1d1a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .vero-action-btn:hover {
          background: #10b981;
          transform: scale(1.05);
        }
        
        .vero-visual-col {
          background: #a77353; /* Muted clay/brown background matching screenshot */
          position: relative;
          min-height: 310px; /* Shorter visual column height */
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .vero-mock-card {
          background: #ffffff;
          border-radius: 10px;
          padding: 14px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.2);
          position: absolute;
          width: 250px;
        }
        .vero-mock-card-back {
          left: 20px;
          top: 15px;
          z-index: 1;
        }
        .vero-mock-card-front {
          right: 20px;
          bottom: 15px;
          z-index: 2;
        }
        
        .vero-scan-badge {
          font-size: 8.5px;
          font-weight: 700;
          color: #047857;
          background: #d1fae5;
          padding: 1.5px 5px;
          border-radius: 10px;
          text-transform: uppercase;
        }
        
        .brand-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }
        .brand-dot-red {
          background: #ef4444;
        }
        .brand-dot-green {
          background: #10b981;
        }
        
        .brand-status-tag {
          font-size: 8.5px;
          font-weight: 600;
          padding: 1.5px 5px;
          border-radius: 4px;
        }
        .status-flagged {
          background: #fee2e2;
          color: #ef4444;
        }
        .status-safe {
          background: #d1fae5;
          color: #059669;
        }
        
        .vero-modal-btn {
          font-family: Inter, sans-serif;
          font-size: 9.5px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .btn-cancel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          color: #374151;
        }
        .btn-cancel:hover {
          background: #f9fafb;
        }
        .btn-override {
          background: #b00020;
          border: none;
          color: #ffffff;
        }
        .btn-override:hover {
          background: #8e0018;
        }

        @media (max-width: 900px) {
          .vero-banner-container {
            grid-template-columns: 1fr;
          }
          .vero-visual-col {
            min-height: 280px;
          }
          .vero-mock-card-back {
            left: 5%;
            top: 15px;
            width: 44%;
          }
          .vero-mock-card-front {
            right: 5%;
            bottom: 15px;
            width: 44%;
          }
        }

        @media (max-width: 600px) {
          .vero-mock-card-back {
            left: 5%;
            top: 15px;
            width: 90%;
            position: relative;
            transform: none;
          }
          .vero-mock-card-front {
            right: 5%;
            bottom: auto;
            top: 10px;
            width: 90%;
            position: relative;
            transform: none;
          }
          .vero-visual-col {
            flex-direction: column;
            padding: 20px 0;
            min-height: auto;
            gap: 12px;
          }
        }
      `}} />
    </section>
  );
};

export default VeroCheckSection;
