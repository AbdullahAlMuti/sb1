import { motion } from "framer-motion";

const AgentCapabilitiesSection = () => {
  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.6, delay, ease: [0.19, 1, 0.22, 1] as const }
  });

  return (
    <section style={{ background: "#ffffff", borderTop: "1px solid #efeeeb", borderBottom: "1px solid #efeeeb", position: "relative" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "90px 26px" }}>
        
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

        {/* Two-Column Grid */}
        <div className="agent-cards-grid">
          
          {/* Left Card - Q&A Agents */}
          <motion.div
            {...fade(0.1)}
            className="agent-card"
            whileHover={{ y: -4, boxShadow: "0 16px 36px -12px rgba(28,25,18,.08)", opacity: 0.98 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              <h3 className="agent-card-title">Q&A Agents</h3>
              <p className="agent-card-subtitle">Ask, explore, and get structured answers instantly</p>
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

          {/* Right Card - Create Your Own Agents */}
          <motion.div
            {...fade(0.2)}
            className="agent-card"
            whileHover={{ y: -4, boxShadow: "0 16px 36px -12px rgba(28,25,18,.08)", opacity: 0.98 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              <h3 className="agent-card-title">Create Your Own Agents</h3>
              <p className="agent-card-subtitle">Build custom workflows tailored to your team</p>
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

        </div>
      </div>

      {/* Styled Responsive Classes */}
      <style dangerouslySetInnerHTML={{ __html: `
        .agent-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px;
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

        @media (max-width: 768px) {
          .agent-cards-grid {
            grid-template-columns: 1fr;
            gap: 20px;
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
        }
      `}} />
    </section>
  );
};

export default AgentCapabilitiesSection;
