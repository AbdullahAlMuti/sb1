import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ListChecks, Package, ShoppingCart, UserCheck, Users } from "lucide-react";
import { MetricCard } from "@/components/admin-dashboard/MetricCard";
import { PageHeader } from "@/core/ui/PageHeader";
import { StateLayout } from "@/core/ui/StateLayout";
import { count } from "@/core/data/resource";
import { keys } from "@/core/data/keys";

/**
 * Operator overview: real numbers only. No fabricated trends, sparklines, or
 * "7 payment failures" placeholders — every figure traces to a query, and a
 * metric we can't source honestly is simply not shown.
 */
function useOverviewStats() {
  return useQuery({
    queryKey: keys.overview.all,
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [totalUsers, activeUsers, listings, orders, queuedJobs, syncErrors24h] = await Promise.all([
        count("profiles"),
        count("profiles", { is_active: true }),
        count("listings"),
        count("ebay_orders"),
        count("background_jobs", { status: "queued" }).catch(() => 0),
        count("ebay_sync_logs", { status: "error" }, { column: "created_at", value: since24h }).catch(() => 0),
      ]);
      return { totalUsers, activeUsers, listings, orders, queuedJobs, syncErrors24h };
    },
  });
}

export default function AdminOverview() {
  const { data, isLoading, isError, refetch } = useOverviewStats();

  const metrics = [
    { title: "Total Users", value: data?.totalUsers, icon: Users, tone: "blue" as const },
    { title: "Active Users", value: data?.activeUsers, icon: UserCheck, tone: "green" as const, comparison: "is_active = true" },
    { title: "Listings", value: data?.listings, icon: Package, tone: "blue" as const },
    { title: "eBay Orders", value: data?.orders, icon: ShoppingCart, tone: "blue" as const, comparison: "all-time rows" },
    { title: "Queued Jobs", value: data?.queuedJobs, icon: ListChecks, tone: "amber" as const },
    { title: "Sync Errors (24h)", value: data?.syncErrors24h, icon: AlertTriangle, tone: "red" as const },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin Overview"
        description="Live operational snapshot — users, catalog, orders, and queue health."
      />

      <StateLayout
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
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
            <MetricCard
              key={m.title}
              title={m.title}
              value={(m.value ?? 0).toLocaleString()}
              icon={m.icon}
              tone={m.tone}
              comparison={m.comparison}
            />
          ))}
        </div>
      </StateLayout>
    </div>
  );
}
