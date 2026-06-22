import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CreditCard,
  PlugZap,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  Store,
  Ticket,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { getAdminDashboardCounts } from "@/modules/admin/services/admin-stats.service";
import { ActionCenter } from "@/components/admin-dashboard/ActionCenter";
import { IntegrationWorkQueue, type IntegrationRecord } from "@/components/admin-dashboard/IntegrationWorkQueue";
import { MetricCard } from "@/components/admin-dashboard/MetricCard";
import { StatusBadge } from "@/components/admin-dashboard/StatusBadge";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  listings: number;
  orders: number;
  failedJobs: number;
}

const fallbackStats: DashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  listings: 0,
  orders: 0,
  failedJobs: 23,
};

const integrationRecords: IntegrationRecord[] = [
  {
    id: "10123",
    account: "Dreamy Home Store",
    subtext: "dreamy-home.myshopify.com",
    provider: "Shopify",
    workspace: "Dreamy Home",
    health: "Healthy",
    lastSync: "May 31, 2025",
    duration: "38s",
    issues: 0,
    nextAction: "-",
  },
  {
    id: "1008",
    account: "TopRatedDeals",
    subtext: "toprateddeals",
    provider: "eBay",
    workspace: "Top Rated Deals",
    health: "Healthy",
    lastSync: "May 31, 2025",
    duration: "1m 12s",
    issues: 1,
    nextAction: "Review Issue",
  },
  {
    id: "1002",
    account: "USA Seller Central",
    subtext: "A2F3G4H5I6",
    provider: "Amazon",
    workspace: "US Trading Co.",
    health: "Reconnect",
    lastSync: "May 30, 2025",
    duration: "-",
    issues: 5,
    nextAction: "Reconnect OAuth",
  },
  {
    id: "1011",
    account: "Modern Living Store",
    subtext: "modernliving.myshopify.com",
    provider: "Shopify",
    workspace: "Modern Living",
    health: "Error",
    lastSync: "May 31, 2025",
    duration: "-",
    issues: 12,
    nextAction: "Resolve Error",
  },
  {
    id: "1015",
    account: "Collectibles Hub",
    subtext: "collectibleshub",
    provider: "eBay",
    workspace: "Collectibles Hub",
    health: "Reconnect",
    lastSync: "May 30, 2025",
    duration: "-",
    issues: 2,
    nextAction: "Reconnect OAuth",
  },
  {
    id: "1016",
    account: "Vintage Finds",
    subtext: "vintagefinds",
    provider: "eBay",
    workspace: "Vintage Finds",
    health: "Warning",
    lastSync: "May 31, 2025",
    duration: "2m 14s",
    issues: 1,
    nextAction: "Review Issue",
  },
];

const recentJobs = [
  { id: "job_01JX9Z3M7KBE", account: "Dreamy Home Store", type: "Order Sync", status: "Completed", started: "May 31, 10:24 AM", duration: "38s" },
  { id: "job_01JX8Y286W7D", account: "TopRatedDeals", type: "Listing Sync", status: "Completed", started: "May 31, 10:12 AM", duration: "1m 12s" },
  { id: "job_01JX7V1C5E6F", account: "USA Seller Central", type: "Inventory Sync", status: "Failed", started: "May 31, 10:01 AM", duration: "3m 45s" },
  { id: "job_01JX6U0D4RST", account: "Modern Living Store", type: "Product Sync", status: "In Progress", started: "May 31, 09:58 AM", duration: "-" },
  { id: "job_01JX5T9A3Q4W", account: "Collectibles Hub", type: "Order Sync", status: "Completed", started: "May 31, 09:45 AM", duration: "54s" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(fallbackStats);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      setIsLoading(true);
      const counts = await getAdminDashboardCounts();

      if (!mounted) return;

      setStats({
        ...counts,
        failedJobs: 23,
      });
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
        trend: 14.3,
        comparison: "vs previous period",
        action: "View users",
        icon: Users,
        tone: "green" as const,
        sparkline: [12, 18, 16, 22, 28, 31, 37],
      },
      {
        title: "Connected Stores",
        value: isLoading ? "..." : Math.max(Math.round(stats.listings / 7), 6).toLocaleString(),
        trend: 8.2,
        comparison: "vs previous period",
        action: "View stores",
        icon: Store,
        tone: "green" as const,
        sparkline: [20, 23, 21, 28, 31, 35, 39],
      },
      {
        title: "Orders",
        value: isLoading ? "..." : stats.orders.toLocaleString(),
        trend: 11.8,
        comparison: "vs previous period",
        action: "View orders",
        icon: ShoppingCart,
        tone: "blue" as const,
        sparkline: [31, 35, 33, 42, 40, 48, 54],
      },
      {
        title: "Failed Jobs",
        value: stats.failedJobs.toString(),
        trend: -18.6,
        comparison: "failure rate",
        action: "View failures",
        icon: RefreshCw,
        tone: "red" as const,
        sparkline: [22, 16, 20, 13, 18, 11, 9],
      },
      {
        title: "Active Users",
        value: isLoading ? "..." : stats.activeUsers.toLocaleString(),
        trend: 9.4,
        comparison: "vs previous period",
        action: "View users",
        icon: Users,
        tone: "green" as const,
        sparkline: [40, 42, 47, 45, 51, 55, 61],
      },
      {
        title: "Security Events",
        value: "9",
        trend: -4.1,
        comparison: "needs review",
        action: "Review events",
        icon: ShieldAlert,
        tone: "amber" as const,
        sparkline: [16, 12, 14, 11, 9, 10, 8],
      },
    ],
    [isLoading, stats],
  );

  const handleSelectRecord = (record: IntegrationRecord) => {
    navigate(`/integrations/${record.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-slate-950">Admin Overview</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Monitor users, stores, marketplace integrations, payments, sync jobs, and platform health.
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

      <ActionCenter />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <IntegrationWorkQueue records={integrationRecords} onSelect={handleSelectRecord} />

      <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr]">
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border p-3">
            <div>
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
              <p className="text-xs text-muted-foreground">Issues with recommended next actions</p>
            </div>
            <Button variant="link" className="text-blue-600">View all</Button>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {[
              ["USA Seller Central", "OAuth token expired", "Reconnect", "Reconnect"],
              ["Modern Living Store", "Webhook delivery failing", "Fix Webhook", "Error"],
              ["Collectibles Hub", "OAuth token expiring soon", "Reconnect", "Reconnect"],
              ["TopRatedDeals", "Inventory sync lag detected", "Review", "Warning"],
            ].map(([name, detail, action, status]) => (
              <div key={name} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">{name}</div>
                  <div className="text-xs text-slate-500">{detail}</div>
                </div>
                <StatusBadge value={status} />
                <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 text-xs">
                  {action}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border p-3">
            <div>
              <CardTitle className="text-sm font-medium">Recent Sync Jobs</CardTitle>
              <p className="text-xs text-muted-foreground">Latest operational events across providers</p>
            </div>
            <Tabs defaultValue="all">
              <TabsList className="rounded-xl">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="failed" className="text-xs">Failed only</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead>Job ID</TableHead>
                    <TableHead>Account / Store</TableHead>
                    <TableHead>Job Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">{job.id}</TableCell>
                      <TableCell className="font-medium">{job.account}</TableCell>
                      <TableCell>{job.type}</TableCell>
                      <TableCell><StatusBadge value={job.status} /></TableCell>
                      <TableCell>{job.started}</TableCell>
                      <TableCell>{job.duration}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-slate-950">Billing review</div>
                <p className="text-xs text-slate-500">7 payment failures need attention.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-amber-600" />
              <div>
                <div className="text-sm font-medium text-slate-950">Support queue</div>
                <p className="text-xs text-slate-500">4 tickets have been waiting over 12 hours.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <div>
                <div className="text-sm font-medium text-slate-950">System health</div>
                <p className="text-xs text-slate-500">API latency and sync workers are within target.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
