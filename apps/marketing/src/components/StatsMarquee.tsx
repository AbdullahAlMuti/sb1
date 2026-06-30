const STATS = [
  "50,000+ active resellers",
  "200+ listings per hour",
  "#1 eBay automation tool",
  "Amazon · Walmart · AliExpress supported",
  "$1 trial — no commitment",
  "Under 30 seconds per listing",
  "Bulk upload to eBay in the background",
];

const LOOP = [...STATS, ...STATS];

const StatsMarquee = () => (
  <section
    style={{
      borderTop: "1px solid #eeede9", borderBottom: "1px solid #eeede9",
      marginTop: 70, padding: "30px 0", overflow: "hidden",
    }}
  >
    <div
      style={{ display: "flex", width: "max-content" }}
      className="n-marquee-track"
    >
      {LOOP.map((st, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex", alignItems: "center",
            fontSize: 21, fontWeight: 600, letterSpacing: "-.01em",
            color: "#1f1d1a", padding: "0 38px", whiteSpace: "nowrap",
          }}
        >
          {st}
          <span style={{ color: "#d6d3cc", marginLeft: 38 }}>✦</span>
        </span>
      ))}
    </div>

    <style>{`
      @keyframes nmarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .n-marquee-track { animation: nmarquee 38s linear infinite; }
    `}</style>
  </section>
);

export default StatsMarquee;
