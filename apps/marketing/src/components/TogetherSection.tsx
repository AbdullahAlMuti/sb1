const CARDS = [
  {
    badge: "Chrome Extension",
    title: "Scrape, price, and upload — right from the product page.",
    tint: "#f6f1ee",
    icon: "🔌",
    href: "https://chromewebstore.google.com/detail/sellersuit",
  },
  {
    badge: "Live Dashboard",
    title: "One source of truth for listings, orders, and revenue.",
    tint: "#eef3f6",
    icon: "📊",
    href: "/how-it-works",
  },
  {
    badge: "AI Tools",
    title: "AI-written titles and descriptions that convert.",
    tint: "#f5f1fb",
    icon: "✨",
    href: "/features",
  },
];

const TogetherSection = () => (
  <section style={{ background: "#faf9f7", borderTop: "1px solid #eeede9", borderBottom: "1px solid #eeede9", marginTop: 40 }}>
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "90px 26px" }}>
      <h2
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontWeight: 600, fontSize: "clamp(32px, 4.5vw, 52px)",
          lineHeight: 1.05, letterSpacing: "-.02em",
          color: "#1f1d1a", margin: "0 0 50px", textAlign: "center",
        }}
      >
        Your complete toolkit, in one place.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 22 }}>
        {CARDS.map((card) => (
          <a
            key={card.badge}
            href={card.href}
            style={{
              background: "#fff", border: "1px solid #eeede9", borderRadius: 18,
              overflow: "hidden", display: "flex", flexDirection: "column",
              textDecoration: "none",
              transition: "transform .18s ease, box-shadow .18s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 30px 60px -36px rgba(20,18,14,.4)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            <div style={{ padding: "26px 26px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cd7b4f", letterSpacing: ".02em" }}>{card.badge}</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em", color: "#1f1d1a", margin: "10px 0 0", lineHeight: 1.25 }}>
                {card.title} <span style={{ color: "#b3b0a9", fontWeight: 500 }}>→</span>
              </h3>
            </div>
            <div style={{ marginTop: 22, background: card.tint, borderTop: "1px solid #f0efec", padding: "28px 26px", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 64 }}>{card.icon}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default TogetherSection;
