import { useEffect, useMemo, useState } from "react";
import { PlugZap, ShoppingCart, Users, Package } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { getAdminDashboardCounts, type AdminDashboardCounts } from "@/modules/admin/services/admin-stats.service";
import { MetricCard } from "@/components/admin-dashboard/MetricCard";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardCounts>({
    totalUsers: 0,
    activeUsers: 0,
    listings: 0,
    orders: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      setIsLoading(true);
      const counts = await getAdminDashboardCounts();

      if (!mounted) return;

      setStats(counts);
      setIsLoading(false);
    }

    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(
    () => [
      {
        title: "Total Users",
        value: isLoading ? "..." : stats.totalUsers.toLocaleString(),
        trend: 0,
        comparison: "from database",
        action: "View users",
        icon: Users,
        tone: "green" as const,
        sparkline: [],
      },
      {
        title: "Active Users",
        value: isLoading ? "..." : stats.activeUsers.toLocaleString(),
        trend: 0,
        comparison: "from database",
        action: "View active users",
        icon: Users,
        tone: "green" as const,
        sparkline: [],
      },
      {
        title: "Total Listings",
        value: isLoading ? "..." : stats.listings.toLocaleString(),
        trend: 0,
        comparison: "from database",
        action: "View listings",
        icon: Package,
        tone: "blue" as const,
        sparkline: [],
      },
      {
        title: "Total Orders",
        value: isLoading ? "..." : stats.orders.toLocaleString(),
        trend: 0,
        comparison: "from database",
        action: "View orders",
        icon: ShoppingCart,
        tone: "blue" as const,
        sparkline: [],
      },
    ],
    [isLoading, stats],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-slate-950">Admin Overview</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Monitor users, listings, orders, and platform health.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200">
            Export report
          </Button>
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">
            <PlugZap className="mr-2 h-4 w-4" />
            Run health check
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>
    </div>
  );
}
