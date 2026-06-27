import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Gauge, ListChecks, Loader2, Plug } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { MetricCard } from "@/components/admin-dashboard/MetricCard";
import { PageHeader } from "@/core/ui/PageHeader";
import { StateLayout } from "@/core/ui/StateLayout";
import { count, list } from "@/core/data/resource";

interface ExtError {
  id: string;
  error_class: string;
  message: string | null;
  created_at: string;
}

/** Real system-health snapshot: queue depth, error rates, rate-limit pressure. */
export default function SystemHealthPage() {
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const stats = useQuery({
    queryKey: ["system-health", "stats"],
    queryFn: async () => {
      const [queued, running, extErrors24h, syncErrors24h, rateBuckets] = await Promise.all([
        count("background_jobs", { status: "queued" }).catch(() => 0),
        count("background_jobs", { status: "running" }).catch(() => 0),
        count("extension_error_logs", undefined, { column: "created_at", value: since24h }).catch(() => 0),
        count("ebay_sync_logs", { status: "error" }, { column: "created_at", value: since24h }).catch(() => 0),
        count("function_rate_limits", undefined, { column: "window_start", value: since24h }).catch(() => 0),
      ]);
      return { queued, running, extErrors24h, syncErrors24h, rateBuckets };
    },
  });

  const errors = useQuery({
    queryKey: ["system-health", "recent-errors"],
    queryFn: async () => {
      const { rows } = await list<ExtError>("extension_error_logs", {
        select: "id, error_class, message, created_at",
        order: { column: "created_at", ascending: false },
        page: 1,
        pageSize: 15,
      });
      return rows;
    },
  });

  const d = stats.data;
  const metrics = [
    { title: "Queued Jobs", value: d?.queued, icon: ListChecks, tone: "amber" as const },
    { title: "Running Jobs", value: d?.running, icon: Loader2, tone: "blue" as const },
    { title: "Extension Errors (24h)", value: d?.extErrors24h, icon: Plug, tone: "red" as const },
    { title: "Sync Errors (24h)", value: d?.syncErrors24h, icon: AlertTriangle, tone: "red" as const },
    { title: "Rate-limit Buckets (24h)", value: d?.rateBuckets, icon: Gauge, tone: "blue" as const },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="System Health" description="Queue depth, error rates, and rate-limit pressure." icon={Activity} />

      <StateLayout
        isLoading={stats.isLoading}
        isError={stats.isError}
        onRetry={() => stats.refetch()}
        loading={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map((m) => <div key={m.title} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div>}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((m) => (
            <MetricCard key={m.title} title={m.title} value={(m.value ?? 0).toLocaleString()} icon={m.icon} tone={m.tone} />
          ))}
        </div>
      </StateLayout>

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold text-slate-900">Recent extension errors</p>
          <StateLayout
            isLoading={errors.isLoading}
            isError={errors.isError}
            isEmpty={(errors.data ?? []).length === 0}
            onRetry={() => errors.refetch()}
            emptyTitle="No recent errors"
          >
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {(errors.data ?? []).map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="font-medium text-red-600">{e.error_class}</span>
                    {e.message && <p className="truncate text-slate-500">{e.message}</p>}
                  </div>
                  <span className="whitespace-nowrap text-slate-400">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          </StateLayout>
        </CardContent>
      </Card>
    </div>
  );
}
