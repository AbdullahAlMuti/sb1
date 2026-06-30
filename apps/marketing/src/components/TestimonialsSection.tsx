import { siteConfig } from "@/config/siteConfig";

const EXTRA_QUOTES = [
  { name: "Michael Chen",     text: "I used to spend my whole morning listing. Now I scrape, price, and upload 40 products before my coffee's cold." },
  { name: "Sarah Williams",   text: "The profit calculator stopped me from listing losers. I finally know my real margin before anything goes live." },
  { name: "David Rodriguez",  text: "Bulk upload and the live dashboard let us run client stores at a scale that wasn't possible by hand." },
  { name: "James Park",       text: "SellerSuit cut our listing time from 20 minutes to under a minute. The ROI was instant." },
  { name: "Lisa Torres",      text: "The SKU engine alone was worth it. Orders now map back to suppliers automatically — no more spreadsheets." },
  { name: "Alex Kim",         text: "I tried every eBay lister out there. SellerSuit is the only one that actually handles variants correctly." },
];

const TestimonialsSection = () => {
  const { testimonials } = siteConfig;
  const hero = testimonials.items[0];

  return (
    <section style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 26px 30px" }}>
      <h2
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontWeight: 600, fontSize: "clamp(32px, 4.5vw, 52px)",
          lineHeight: 1.05, letterSpacing: "-.02em",
          color: "#1f1d1a", margin: "0 0 46px", textAlign: "center",
        }}
      >
        Trusted by sellers that ship.
      </h2>

      {/* Hero dark testimonial */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#0a0913", borderRadius: 20, overflow: "hidden" }} className="n-testi-hero">
        <div style={{ padding: 48, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1e1c2e", border: "1px solid #2e2c42", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#c7c4d6" }}>
              {hero.avatar}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#c7c4d6" }}>{hero.name}</span>
          </div>
          <div>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 500, fontSize: "clamp(20px, 2.5vw, 30px)", lineHeight: 1.32, letterSpacing: "-.01em", color: "#fff", margin: "34px 0 26px" }}>
              "{hero.quote}"
            </p>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#7c79a0" }}>{hero.role}</span>
          </div>
        </div>
        <div style={{ background: "#11101d", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, padding: 40 }}>
          <span style={{ fontSize: 80, opacity: 0.6 }}>📦</span>
        </div>
      </div>

      {/* Quote cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 16 }}>
        {EXTRA_QUOTES.map((q) => (
          <div
            key={q.name}
            style={{
              background: "#faf9f7", border: "1px solid #eeede9", borderRadius: 16,
              padding: 26, minHeight: 160, display: "flex", flexDirection: "column",
              justifyContent: "space-between", cursor: "default",
              transition: "background .15s ease",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#f4f3f1")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#faf9f7")}
          >
            <p style={{ fontSize: 16, lineHeight: 1.42, color: "#1f1d1a", margin: 0, fontWeight: 500 }}>
              {q.text}
            </p>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#8e8b83", marginTop: 18 }}>{q.name} →</span>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .n-testi-hero { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
};

export default TestimonialsSection;
