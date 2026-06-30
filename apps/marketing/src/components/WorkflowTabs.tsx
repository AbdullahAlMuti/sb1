import { useState } from "react";

const TABS = [
  {
    title: "Scrape",
    body: "One-click capture of titles, images, variants, and pricing from any supported supplier page.",
    icon: "🔍",
    demo: [
      { glyph: "📦", dot: "#e7eefb", text: "Opening Amazon product page…",          tag: "detecting" },
      { glyph: "🖼️", dot: "#e7f0e9", text: "Pulled 8 images · 4 variants · price",  tag: "scraped"   },
      { glyph: "✦",  dot: "#efe9fb", text: "Product ready for pricing",              tag: "done"      },
    ],
  },
  {
    title: "Price",
    body: "Set your margin with the profit engine — eBay fees, shipping, and supplier cost all factored in.",
    icon: "💰",
    demo: [
      { glyph: "🏷️", dot: "#f7e3dd", text: "Supplier cost: $18.00",               tag: "input"    },
      { glyph: "📊", dot: "#e7eefb", text: "eBay fees 13.25% + $5 shipping",       tag: "fees"     },
      { glyph: "✅", dot: "#e7f0e9", text: "Sell at $39 → $10.35 profit (26.5%)",  tag: "margin"   },
    ],
  },
  {
    title: "Upload",
    body: "Push the finished listing straight to your eBay account with a single click. SKUs auto-assigned.",
    icon: "🚀",
    demo: [
      { glyph: "🆔", dot: "#f0efec", text: "SKU generated: AMZ-B08N5WRWNW-BLK",    tag: "step 1" },
      { glyph: "📝", dot: "#e7eefb", text: "Title optimized · description written", tag: "step 2" },
      { glyph: "✅", dot: "#e7f0e9", text: "Listing live on eBay",                  tag: "live"   },
    ],
  },
  {
    title: "Bulk",
    body: "Queue dozens of products and publish them to eBay in the background — all while you sleep.",
    icon: "⚡",
    demo: [
      { glyph: "📋", dot: "#e7eefb", text: "48 products queued for upload",         tag: "queued"    },
      { glyph: "⚙️", dot: "#efe9fb", text: "Processing in background…",             tag: "running"   },
      { glyph: "🎯", dot: "#e7f0e9", text: "48/48 listings live on eBay",           tag: "complete"  },
    ],
  },
];

const WorkflowTabs = () => {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 26px 30px" }}>
      <h2
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontWeight: 600, fontSize: "clamp(36px, 4.5vw, 52px)",
          lineHeight: 1.05, letterSpacing: "-.02em",
          color: "#1f1d1a", margin: 0, textAlign: "center",
        }}
      >
        Keep listings running 24/7.
      </h2>

      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 46,
          alignItems: "center", marginTop: 54,
          background: "#faf9f7", border: "1px solid #eeede9",
          borderRadius: 20, padding: "46px",
        }}
        className="n-workflow-grid"
      >
        {/* Left: tab list */}
        <div>
          <a
            href="/how-it-works"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#cd7b4f", letterSpacing: ".02em", marginBottom: 20, textDecoration: "none" }}
          >
            HOW IT WORKS →
          </a>
          <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.01em", color: "#1f1d1a", margin: "0 0 28px" }}>
            Automate every step of the listing workflow.
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {TABS.map((t, i) => {
              const on = i === active;
              return (
                <button
                  key={t.title}
                  onClick={() => setActive(i)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 13, cursor: "pointer", width: "100%",
                    padding: "14px 15px", borderRadius: 13, textAlign: "left",
                    background: on ? "#fff" : "transparent",
                    border: on ? "1px solid #e6e4e0" : "1px solid transparent",
                    boxShadow: on ? "0 12px 26px -20px rgba(28,25,18,.4)" : "none",
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{t.icon}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 600, color: "#1f1d1a" }}>{t.title}</span>
                    <span style={{ fontSize: 13.5, color: "#6c6a63", lineHeight: 1.4 }}>{t.body}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: demo panel */}
        <div
          style={{
            background: "#fff", border: "1px solid #eeede9", borderRadius: 16,
            padding: 30, minHeight: 280,
            boxShadow: "0 30px 60px -44px rgba(28,25,18,.3)",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 16, borderBottom: "1px solid #f0efec" }}>
            <span style={{ fontSize: 28 }}>{tab.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#1f1d1a" }}>{tab.title} step</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 11, paddingTop: 18 }}>
            {tab.demo.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 11,
                  background: "#faf9f7", border: "1px solid #f0efec",
                  borderRadius: 10, padding: "12px 14px",
                }}
              >
                <span
                  style={{
                    width: 28, height: 28, flexShrink: 0, borderRadius: 7,
                    background: d.dot, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 14,
                  }}
                >
                  {d.glyph}
                </span>
                <span style={{ flex: 1, fontSize: 14, color: "#37352f" }}>{d.text}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#8e8b83", whiteSpace: "nowrap" }}>{d.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .n-workflow-grid { grid-template-columns: 1fr !important; padding: 24px !important; }
        }
      `}</style>
    </section>
  );
};

export default WorkflowTabs;
