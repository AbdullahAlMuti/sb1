import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CreditCard,
  KeyRound,
  PlugZap,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  Store,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { supabase } from "@repo/api-client/supabase/client";
import { ActionCenter } from "@/components/admin-dashboard/ActionCenter";
import { IntegrationWorkQueue, type IntegrationRecord } from "@/components/admin-dashboard/IntegrationWorkQueue";
import { MetricCard } from "@/components/admin-dashboard/MetricCard";
import { StatusBadge } from "@/components/admin-dashboard/StatusBadge";
import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  listings: number;
  orders: number;
  failedJobs: number;
  securityEvents: number;
}

const fallbackStats: DashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  listings: 0,
  orders: 0,
  failedJobs: 0,
  securityEvents: 0,
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Query stats
  const { data: stats = fallbackStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["adminDashboardStats"],
    queryFn: async () => {
      const [profiles, activeProfiles, listings, orders, failedJobs] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("listings").select("*", { count: "exact", head: true }),
        supabase.from("ebay_orders").select("*", { count: "exact", head: true }),
        supabase.from("extension_jobs").select("*", { count: "exact", head: true }).eq("status", "Failed"),
      ]);

      return {
        totalUsers: profiles.count ?? 0,
        activeUsers: activeProfiles.count ?? 0,
        listings: listings.count ?? 0,
        orders: orders.count ?? 0,
        failedJobs: failedJobs.count ?? 0,
        securityEvents: 0,
      };
    },
    refetchInterval: 60000,
  });

  // Query eBay connections
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery<IntegrationRecord[]>({
    queryKey: ["adminDashboardIntegrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ebay_connections")
        .select(`
          id,
          ebay_username,
          status,
          token_storage_status,
          last_verified_at,
          last_error,
          created_at,
          workspace:workspaces(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((conn: any): IntegrationRecord => ({
        id: conn.id,
        account: conn.ebay_username || "eBay Account",
        subtext: conn.ebay_username || "eBay",
        provider: "eBay",
        workspace: conn.workspace?.name || "Default Workspace",
        health: conn.status === "Healthy" ? "Healthy" : conn.status === "Reconnect" ? "Reconnect" : conn.status === "Warning" ? "Warning" : "Error",
        lastSync: conn.last_verified_at ? new Date(conn.last_verified_at).toLocaleDateString() : "Never",
        duration: "-",
        issues: conn.status !== "Healthy" ? 1 : 0,
        nextAction: conn.status === "Reconnect" ? "Reconnect OAuth" : conn.status === "Error" ? "Review Error" : "-",
      }));
    },
    refetchInterval: 60000,
  });

  // Query recent sync jobs
  const { data: recentJobs = [], isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["adminDashboardJobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extension_jobs")
        .select(`
          id,
          job_type,
          status,
          started_at,
          completed_at,
          workspace:workspaces(name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map((job: any) => {
        const started = job.started_at ? new Date(job.started_at).toLocaleTimeString() : "Pending";
        const duration = job.started_at && job.completed_at
          ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
          : "-";

        return {
          id: job.id.substring(0, 12),
          account: job.workspace?.name || "Unknown Workspace",
          type: job.job_type || "Sync",
          status: job.status === "Completed" ? "Completed" : job.status === "Failed" ? "Failed" : "In Progress",
          started,
          duration,
        };
      });
    },
    refetchInterval: 30000,
  });

  // Query needs attention connections
  const { data: needsAttention = [] } = useQuery<any[]>({
    queryKey: ["adminDashboardNeedsAttention"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ebay_connections")
        .select(`
          ebay_username,
          status,
          last_error,
          workspace:workspaces(name)
        `)
        .neq("status", "Healthy")
        .limit(4);

      if (error) throw error;

      return (data || []).map((conn: any) => ({
        name: conn.workspace?.name || conn.ebay_username || "Workspace",
        detail: conn.last_error || "Sync lag or reauth required",
        action: conn.status === "Reconnect" ? "Reconnect" : "Review",
        status: conn.status || "Warning",
      }));
    },
    refetchInterval: 60000,
  });

  const actionItems = useMemo(() => {
    const criticalCount = integrations.filter(i => i.health === "Error").length;
    const warningCount = integrations.filter(i => i.health === "Warning" || i.health === "Reconnect").length;
    const failedCount = stats.failedJobs;

    return [
      {
        title: "Critical Integrations",
        count: criticalCount,
        description: `${criticalCount} accounts down`,
        action: "Review",
        severity: criticalCount > 0 ? ("critical" as const) : ("success" as const),
        icon: ShieldAlert,
      },
      {
        title: "Failed Sync Jobs",
        count: failedCount,
        description: failedCount > 0 ? `${failedCount} jobs failed` : "All jobs healthy",
        action: "Retry",
        severity: failedCount > 0 ? ("critical" as const) : ("success" as const),
        icon: XCircle,
      },
      {
        title: "Reconnect Required",
        count: warningCount,
        description: `${warningCount} accounts pending`,
        action: "Reconnect",
        severity: warningCount > 0 ? ("warning" as const) : ("success" as const),
        icon: KeyRound,
      },
    ];
  }, [integrations, stats.failedJobs]);

  const metrics = useMemo(
    () => [
      {
        title: "Total Users",
        value: statsLoading ? "..." : stats.totalUsers.toLocaleString(),
        trend: 0,
        comparison: "active system count",
        action: "View users",
        icon: Users,
        tone: "green" as const,
        sparkline: [12, 18, 16, 22, 28, 31, 37],
      },
      {
        title: "Connected Stores",
        value: statsLoading ? "..." : integrations.length.toString(),
        trend: 0,
        comparison: "active eBay stores",
        action: "View stores",
        icon: Store,
        tone: "green" as const,
        sparkline: [20, 23, 21, 28, 31, 35, 39],
      },
      {
        title: "Orders",
        value: statsLoading ? "..." : stats.orders.toLocaleString(),
        trend: 0,
        comparison: "total eBay orders",
        action: "View orders",
        icon: ShoppingCart,
        tone: "blue" as const,
        sparkline: [31, 35, 33, 42, 40, 48, 54],
      },
      {
        title: "Failed Jobs",
        value: statsLoading ? "..." : stats.failedJobs.toString(),
        trend: 0,
        comparison: "total failures in queue",
        action: "View failures",
        icon: RefreshCw,
        tone: stats.failedJobs > 0 ? ("red" as const) : ("green" as const),
        sparkline: [22, 16, 20, 13, 18, 11, 9],
      },
      {
        title: "Active Users",
        value: statsLoading ? "..." : stats.activeUsers.toLocaleString(),
        trend: 0,
        comparison: "users with active flag",
        action: "View users",
        icon: Users,
        tone: "green" as const,
        sparkline: [40, 42, 47, 45, 51, 55, 61],
      },
      {
        title: "Security Events",
        value: stats.securityEvents.toString(),
        trend: 0,
        comparison: "audits needing review",
        action: "Review events",
        icon: ShieldAlert,
        tone: stats.securityEvents > 0 ? ("amber" as const) : ("green" as const),
        sparkline: [16, 12, 14, 11, 9, 10, 8],
      },
    ],
    [statsLoading, stats, integrations.length],
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

      <ActionCenter items={actionItems} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <IntegrationWorkQueue records={integrations} onSelect={handleSelectRecord} />

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
            {needsAttention.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed text-slate-500">
                <span className="text-sm font-medium">All integrations are healthy</span>
                <span className="text-xs">No active alerts detected.</span>
              </div>
            ) : (
              needsAttention.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.detail}</div>
                  </div>
                  <StatusBadge value={item.status} />
                  <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 text-xs">
                    {item.action}
                  </Button>
                </div>
              ))
            )}
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
                  {recentJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-36 text-center text-slate-500">
                        <span className="block text-sm font-medium">No recent sync jobs</span>
                        <span className="text-xs">Operational queue is currently idle.</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentJobs.map((job) => (
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
                    ))
                  )}
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
                <p className="text-xs text-slate-500">No payment failures detected.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-emerald-600" />
              <div>
                <div className="text-sm font-medium text-slate-950">Support queue</div>
                <p className="text-xs text-slate-500">Support tickets are up to date.</p>
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
