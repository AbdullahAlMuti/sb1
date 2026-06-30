import { siteConfig } from "@/config/siteConfig";

const CTASection = () => {
  const { finalCta } = siteConfig;

  return (
    <section style={{ maxWidth: 1180, margin: "0 auto", padding: "104px 26px", textAlign: "center" }}>
      <h2
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontWeight: 600, fontSize: "clamp(36px, 5vw, 62px)",
          lineHeight: 1.04, letterSpacing: "-.022em",
          color: "#1f1d1a", margin: "0 auto", maxWidth: "18ch",
        }}
      >
        The eBay toolkit that works for you.
      </h2>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 34 }}>
        <a
          href={finalCta.primaryCta.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 16, fontWeight: 600, color: "#fff", background: "#1f1d1a",
            padding: "14px 26px", borderRadius: 11, textDecoration: "none",
            transition: "background .15s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#34322d")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#1f1d1a")}
        >
          {finalCta.primaryCta.label}
        </a>
        <a
          href="/pricing"
          style={{
            fontSize: 16, fontWeight: 600, color: "#1f1d1a", background: "#fff",
            border: "1px solid #e1e0dc", padding: "14px 24px", borderRadius: 11,
            textDecoration: "none", transition: "background .15s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#f1f0ee")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#fff")}
        >
          Compare plans
        </a>
      </div>
    </section>
  );
};

export default CTASection;
