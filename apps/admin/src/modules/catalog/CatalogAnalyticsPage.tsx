import { useMemo } from "react";
import { format } from "date-fns";
import { AlertTriangle, Archive, BarChart3, Boxes, Flame, Package, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { MetricCard } from "@/components/admin-dashboard/MetricCard";
import { PageHeader } from "@/core/ui/PageHeader";
import { StateLayout } from "@/core/ui/StateLayout";
import { useCatalogSnapshot, useMetricsTrend, useSuppliers } from "./api";
import { effectivePrice, formatMoney, profitPerUnit } from "./lib";

/**
 * Catalog analytics: every figure is computed from live rows (products +
 * scores + daily metrics) at render time — no stored aggregates to drift and
 * no fabricated numbers. Forecasts are labelled as run-rate projections.
 */
export default function CatalogAnalyticsPage() {
  const snapshot = useCatalogSnapshot();
  const trend = useMetricsTrend(60);
  const { data: suppliers } = useSuppliers();

  const stats = useMemo(() => {
    const rows = snapshot.data ?? [];
    const withProfit = rows.map((p) => ({ p, unit: profitPerUnit(p) }));

    const mustSell = rows.filter((p) => p.is_must_sell).length;
    const clearance = rows.filter((p) => p.status === "clearance").length;
    const lowStockProfitable = withProfit.filter(
      ({ p, unit }) => unit != null && unit > 0 && p.stock <= p.low_stock_threshold,
    ).length;
    const overstock = rows.filter((p) => {
      const s = p.product_scores;
      return s?.overstock_score != null && s.overstock_score >= 0.9;
    }).length;

    const totalPotentialProfit = withProfit.reduce(
      (sum, { p, unit }) => sum + (unit != null ? unit * p.stock : 0),
      0,
    );
    const totalStockValue = rows.reduce((sum, p) => sum + Number(p.product_scores?.stock_value ?? 0), 0);

    const byGroup = (getLabel: (p: (typeof rows)[number]) => string) => {
      const acc = new Map<string, number>();
      for (const { p, unit } of withProfit) {
        if (unit == null) continue;
        acc.set(getLabel(p), (acc.get(getLabel(p)) ?? 0) + unit * p.stock);
      }
      return [...acc.entries()]
        .map(([name, profit]) => ({ name, profit: Number(profit.toFixed(2)) }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);
    };

    const supplierNames = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

    const topProducts = rows
      .filter((p) => p.product_scores)
      .sort((a, b) => (b.product_scores!.final_score ?? 0) - (a.product_scores!.final_score ?? 0))
      .slice(0, 10)
      .map((p) => ({
        name: p.title.length > 28 ? p.title.slice(0, 28) + "…" : p.title,
        score: Math.round((p.product_scores!.final_score ?? 0) * 100),
      }));

    return {
      total: rows.length,
      mustSell,
      clearance,
      lowStockProfitable,
      overstock,
      totalPotentialProfit,
      totalStockValue,
      categoryProfit: byGroup((p) => p.category?.trim() || "Unassigned"),
      supplierProfit: byGroup((p) => (p.supplier_id ? (supplierNames.get(p.supplier_id) ?? "Unknown") : "Unassigned")),
      topProducts,
    };
  }, [snapshot.data, suppliers]);

  const forecast = useMemo(() => {
    const days = trend.data ?? [];
    if (days.length === 0) return null;
    const recent = days.slice(-28);
    const observedDays = recent.length;
    const revenue = recent.reduce((s, d) => s + d.revenue, 0);
    const units = recent.reduce((s, d) => s + d.units_sold, 0);
    if (revenue === 0 && units === 0) return null;
    // Profit run-rate uses the catalog's average observed margin where cost data exists.
    const rows = snapshot.data ?? [];
    const margins = rows
      .map((p) => {
        const unit = profitPerUnit(p);
        const price = effectivePrice(p.price, p.discount_price, p.discount);
        return unit != null && price > 0 ? unit / price : null;
      })
      .filter((m): m is number => m != null);
    const avgMargin = margins.length ? margins.reduce((s, m) => s + m, 0) / margins.length : null;
    return {
      observedDays,
      revenue30: (revenue / observedDays) * 30,
      units30: Math.round((units / observedDays) * 30),
      profit30: avgMargin != null ? (revenue / observedDays) * 30 * avgMargin : null,
    };
  }, [trend.data, snapshot.data]);

  const metrics = [
    { title: "Products", value: stats.total.toLocaleString(), icon: Package, tone: "blue" as const },
    { title: "Must-Sell", value: stats.mustSell.toLocaleString(), icon: Flame, tone: "amber" as const },
    { title: "Low-Stock Profitable", value: stats.lowStockProfitable.toLocaleString(), icon: AlertTriangle, tone: "red" as const, comparison: "profitable & at/below threshold" },
    { title: "Overstock (top decile stock-days)", value: stats.overstock.toLocaleString(), icon: Boxes, tone: "amber" as const },
    { title: "Clearance", value: stats.clearance.toLocaleString(), icon: Archive, tone: "blue" as const },
    { title: "Potential Profit (stock × unit)", value: formatMoney(stats.totalPotentialProfit), icon: TrendingUp, tone: "green" as const },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catalog Analytics"
        description="Profitability, demand, and stock health computed live from catalog data and daily metrics."
        icon={BarChart3}
      />

      <StateLayout
        isLoading={snapshot.isLoading}
        isError={snapshot.isError}
        onRetry={() => snapshot.refetch()}
        loading={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((m) => (
              <div key={m.title} className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((m) => (
            <MetricCard key={m.title} title={m.title} value={m.value} icon={m.icon} tone={m.tone} comparison={m.comparison} />
          ))}
        </div>
      </StateLayout>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Performance trend (60 days)"
          description={
            forecast
              ? `30-day run-rate: ${formatMoney(forecast.revenue30)} revenue · ~${forecast.units30} units` +
                (forecast.profit30 != null ? ` · ≈${formatMoney(forecast.profit30)} profit (avg-margin projection)` : "") +
                ` — from ${forecast.observedDays} observed days`
              : "No sales/traffic recorded yet — the trend fills in as metrics arrive."
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="metric_date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d: string) => format(new Date(d), "MMM d")}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="units_sold" stroke="#f59e0b" strokeWidth={2} dot={false} name="Units" />
              <Line type="monotone" dataKey="views" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="Views" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top products by score" description="Engine final score (0–100), current run.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Potential profit by category" description="Unit profit × stock, grouped by category.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.categoryProfit}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="profit" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Potential profit by supplier" description="Unit profit × stock, grouped by supplier.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.supplierProfit}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="profit" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
