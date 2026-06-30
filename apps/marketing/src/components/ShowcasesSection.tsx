const SHOWCASES = [
  {
    badge: "Supplier Scraper",
    badgeIcon: "🔍",
    title: "One click. Complete product data.",
    body: "Open any Amazon or Walmart product page and SellerSuit captures the title, all images, every variant, and the current price in under a second — ready to list.",
    tint: "#f5f1fb",
    reverse: false,
    href: "/features",
  },
  {
    badge: "Profit Calculator",
    badgeIcon: "💰",
    title: "Know your margin before you list.",
    body: "Factor in supplier cost, eBay and payment fees, and shipping to set prices that actually protect your profit. The same math runs on every product, every time.",
    tint: "#eef3f6",
    reverse: true,
    href: "/calculator",
  },
  {
    badge: "Bulk Uploader",
    badgeIcon: "🚀",
    title: "List in bulk. Scale without limits.",
    body: "Queue dozens of products and publish them to eBay in the background through the same reliable pipeline — while you move on to sourcing the next batch.",
    tint: "#f6f1ee",
    reverse: false,
    href: "/features",
  },
];

const ShowcasesSection = () => (
  <>
    <section style={{ maxWidth: 1180, margin: "0 auto", padding: "70px 26px 20px" }}>
      <h2
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontWeight: 600, fontSize: "clamp(32px, 4.5vw, 52px)",
          lineHeight: 1.05, letterSpacing: "-.02em",
          color: "#1f1d1a", margin: 0, textAlign: "center",
        }}
      >
        Ask less of your time.<br />Get more from every listing.
      </h2>
    </section>

    <section style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 26px" }}>
      {SHOWCASES.map((sh) => (
        <div
          key={sh.badge}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 54,
            padding: "48px 0",
            flexDirection: sh.reverse ? "row-reverse" : "row",
            borderBottom: "1px solid #f0efec",
          }}
          className="n-showcase-row"
        >
          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: 13.5, fontWeight: 600, color: "#6c6a63",
                background: "#f4f3f1", border: "1px solid #eceae6",
                padding: "6px 12px", borderRadius: 999, marginBottom: 18,
              }}
            >
              <span style={{ fontSize: 16 }}>{sh.badgeIcon}</span> {sh.badge}
            </span>
            <h3
              style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontWeight: 600, fontSize: "clamp(26px, 3.2vw, 40px)",
                lineHeight: 1.08, letterSpacing: "-.018em",
                color: "#1f1d1a", margin: "0 0 16px", maxWidth: "18ch",
              }}
            >
              {sh.title}
            </h3>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: "#5c5a54", margin: "0 0 24px", maxWidth: "46ch" }}>
              {sh.body}
            </p>
            <a
              href={sh.href}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 15.5, fontWeight: 600, color: "#1f1d1a", borderBottom: "1.5px solid #1f1d1a", paddingBottom: 2, textDecoration: "none" }}
            >
              Learn more →
            </a>
          </div>

          {/* Visual placeholder */}
          <div
            style={{
              flex: "1.15", minWidth: 0,
              background: sh.tint, border: "1px solid #eeede9",
              borderRadius: 18, padding: 24, overflow: "hidden",
              minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%", background: "#fff", borderRadius: 12,
                padding: "28px 24px",
                boxShadow: "0 24px 50px -30px rgba(20,18,14,.4)",
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              <div style={{ fontSize: 40, textAlign: "center" }}>{sh.badgeIcon}</div>
              <div style={{ height: 10, background: "#f0efec", borderRadius: 5, width: "80%" }} />
              <div style={{ height: 10, background: "#f0efec", borderRadius: 5, width: "60%" }} />
              <div style={{ height: 10, background: "#f0efec", borderRadius: 5, width: "70%" }} />
              <div style={{ height: 10, background: "#f0efec", borderRadius: 5, width: "50%" }} />
            </div>
          </div>
        </div>
      ))}
    </section>

    <style>{`
      @media (max-width: 768px) {
        .n-showcase-row { flex-direction: column !important; gap: 24px !important; }
      }
    `}</style>
  </>
);

export default ShowcasesSection;
