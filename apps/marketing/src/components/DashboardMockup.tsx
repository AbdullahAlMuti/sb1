import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  delay = 0,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delay?: number;
}) {
  const count = useMotionValue(0);
  const display = useTransform(count, (v) => {
    const n =
      decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString();
    return `${prefix}${n}${suffix}`;
  });

  useEffect(() => {
    const ctrl = animate(count, target, {
      duration: 1.5,
      delay,
      ease: "easeOut",
    });
    return ctrl.stop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <motion.span>{display}</motion.span>;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const stats = [
  { label: "Total Revenue", prefix: "$", target: 12840, decimals: 0, suffix: "", change: "+18.2%", up: true, sub: "Trending up this month" },
  { label: "Active Listings", prefix: "", target: 1247, decimals: 0, suffix: "", change: "+94", up: true, sub: "New listings this week" },
  { label: "Orders Synced", prefix: "", target: 389, decimals: 0, suffix: "", change: "+12.8%", up: true, sub: "Strong fulfilment rate" },
  { label: "Avg. Profit", prefix: "", target: 22.4, decimals: 1, suffix: "%", change: "+4.1%", up: true, sub: "Meets growth projections" },
];

const navItems = [
  { label: "Dashboard", active: true },
  { label: "Listings", active: false },
  { label: "Orders", active: false },
  { label: "Analytics", active: false },
  { label: "Settings", active: false },
];

const docItems = [{ label: "All Listings" }, { label: "Reports" }, { label: "Bulk Lister" }];

const tableRows = [
  { title: "Nike Air Max 270", type: "Amazon", status: "Live", target: 38, limit: 40, reviewer: "Auto-synced" },
  { title: "Sony WH-1000XM5", type: "Walmart", status: "Live", target: 19, limit: 20, reviewer: "Auto-synced" },
  { title: "Instant Pot Duo 7-in-1", type: "Amazon", status: "Pending", target: 10, limit: 15, reviewer: "Needs review" },
  { title: "Apple AirPods Pro", type: "Amazon", status: "Live", target: 27, limit: 30, reviewer: "Auto-synced" },
  { title: "Dyson V15 Detect", type: "Walmart", status: "Draft", target: 0, limit: 10, reviewer: "Not started" },
];

// ── Animated area chart ───────────────────────────────────────────────────────
const AreaChart = () => {
  const pts1 = [18, 24, 20, 30, 26, 38, 32, 45, 40, 52, 44, 58, 50, 62, 55, 70, 64, 72, 68, 75];
  const pts2 = [10, 14, 12, 18, 15, 22, 18, 28, 24, 32, 28, 36, 30, 40, 35, 45, 40, 48, 44, 50];
  const W = 600;
  const H = 80;
  const MAX = 80;

  const toStroke = (pts: number[]) => {
    const step = W / (pts.length - 1);
    return pts
      .map((v, i) => `${i === 0 ? "M" : "L"}${i * step},${H - (v / MAX) * H}`)
      .join(" ");
  };

  const toArea = (pts: number[]) =>
    `${toStroke(pts)} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* fills fade in */}
      <motion.path
        d={toArea(pts1)}
        fill="url(#g1)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.0 }}
      />
      <motion.path
        d={toArea(pts2)}
        fill="url(#g2)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      />

      {/* strokes draw left-to-right */}
      <motion.path
        d={toStroke(pts2)}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.7, ease: "easeInOut" }}
      />
      <motion.path
        d={toStroke(pts1)}
        fill="none"
        stroke="#6366f1"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.6, ease: "easeInOut" }}
      />
    </svg>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const color =
    status === "Live"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Pending"
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium ${color}`}>
      {status === "Live" && (
        <motion.span
          className="h-1 w-1 rounded-full bg-emerald-500 inline-block"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {status}
    </span>
  );
};

// ── Dashboard mockup ──────────────────────────────────────────────────────────
const DashboardMockup = () => (
  <div
    className="relative w-full rounded-xl border border-gray-200 bg-white shadow-[0_32px_80px_rgba(0,0,0,0.12)] overflow-hidden select-none pointer-events-none"
    style={{ aspectRatio: "16/9" }}
  >
    {/* Browser chrome */}
    <div className="flex h-5 items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3">
      <span className="h-2 w-2 rounded-full bg-red-400" />
      <span className="h-2 w-2 rounded-full bg-amber-400" />
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <div className="mx-auto w-40 rounded bg-gray-200 h-2.5" />
    </div>

    <div className="flex h-[calc(100%-20px)]">
      {/* ── Sidebar ── */}
      <div className="flex w-[13%] flex-shrink-0 flex-col bg-gray-950 text-white px-2 py-2 text-[8px]">
        <div className="mb-3 flex items-center gap-1 font-semibold text-[9px] text-white">
          <div className="h-4 w-4 rounded bg-indigo-500 flex items-center justify-center text-[6px] font-bold text-white">
            S
          </div>
          SellerSuit
        </div>

        <button className="mb-2 rounded bg-indigo-600 px-2 py-1 text-[7px] font-semibold text-white text-left">
          + Quick List
        </button>

        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <div
              key={item.label}
              className={`rounded px-1.5 py-1 text-[7.5px] ${
                item.active ? "bg-gray-800 text-white" : "text-gray-400"
              }`}
            >
              {item.label}
            </div>
          ))}
        </nav>

        <div className="mt-3 border-t border-gray-800 pt-2">
          <div className="mb-1 text-[6.5px] font-semibold uppercase tracking-wide text-gray-500">Docs</div>
          {docItems.map((d) => (
            <div key={d.label} className="py-0.5 text-[7px] text-gray-400">
              {d.label}
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-gray-800 pt-2 text-[6.5px] text-gray-500">
          <div className="py-0.5">⚙ Settings</div>
          <div className="py-0.5">? Help</div>
          <div className="mt-1 flex items-center gap-1">
            <div className="h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center text-[5px] font-bold text-white">
              M
            </div>
            <span className="text-gray-400">Muti</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-3 py-1.5">
          <span className="text-[8px] font-semibold text-gray-700">Dashboard</span>
          <div className="flex items-center gap-2 text-[7px] text-gray-400">
            <span className="flex items-center gap-0.5">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              eBay Connected
            </span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5">Export</span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-2 flex flex-col gap-2">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-1.5">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="rounded-lg border border-gray-100 bg-white p-2 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="text-[7px] text-gray-500">{s.label}</div>
                  <span className="text-[6.5px] font-medium text-emerald-600">
                    ↑ {s.change}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] font-bold text-gray-900">
                  <Counter
                    target={s.target}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    decimals={s.decimals}
                    delay={0.2 + i * 0.1}
                  />
                </div>
                <div className="mt-0.5 text-[6px] text-gray-400">{s.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.35 }}
            className="rounded-lg border border-gray-100 bg-white p-2 shadow-sm"
          >
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="text-[8px] font-semibold text-gray-800">Listing Activity</div>
                <div className="text-[6.5px] text-gray-400">Total for the last 3 months</div>
              </div>
              <div className="flex gap-1">
                {["3 months", "30 days", "7 days"].map((l, i) => (
                  <span
                    key={l}
                    className={`rounded px-1.5 py-0.5 text-[6px] ${
                      i === 0 ? "bg-gray-900 text-white" : "text-gray-400"
                    }`}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <div className="h-14 w-full">
              <AreaChart />
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.45 }}
            className="rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden flex-1"
          >
            {/* Tabs */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-3 pt-1.5 pb-0">
              {["All Listings", "Live", "Pending", "Drafts"].map((t, i) => (
                <span
                  key={t}
                  className={`pb-1 text-[6.5px] font-medium ${
                    i === 0
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-400"
                  }`}
                >
                  {t}
                </span>
              ))}
              <div className="ml-auto flex gap-1 pb-1">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[6px] text-gray-500">Filter</span>
                <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[6px] text-white">+ Add</span>
              </div>
            </div>

            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_0.8fr_0.6fr_0.6fr_1fr] gap-2 px-3 py-1 text-[6.5px] font-semibold uppercase tracking-wide text-gray-400">
              <span>Product</span>
              <span>Source</span>
              <span>Status</span>
              <span>Sales</span>
              <span>Stock</span>
              <span>Sync</span>
            </div>

            {/* Rows — staggered */}
            {tableRows.map((row, i) => (
              <motion.div
                key={row.title}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: 0.7 + i * 0.07 }}
                className="grid grid-cols-[2fr_1fr_0.8fr_0.6fr_0.6fr_1fr] gap-2 border-t border-gray-50 px-3 py-1 text-[7px]"
              >
                <span className="truncate font-medium text-gray-800">{row.title}</span>
                <span className="text-gray-500">{row.type}</span>
                <span>
                  <StatusBadge status={row.status} />
                </span>
                <span className="text-gray-700">{row.target}</span>
                <span className="text-gray-700">{row.limit}</span>
                <span className="truncate text-gray-400">{row.reviewer}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  </div>
);

export default DashboardMockup;
