import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { DataTable, type Column } from "@/core/ui/DataTable";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { useAdminMutation } from "@/core/data/mutate";
import { list, invokeFn } from "@/core/data/resource";
import { keys } from "@/core/data/keys";

interface SubRow {
  id: string;
  status: string;
  email: string | null;
  full_name: string | null;
  plan_display_name: string | null;
  current_period_end: string | null;
  credits_used: number;
}

export default function AdminSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: keys.subscriptions.list({}),
    queryFn: async () => {
      const { rows } = await list<any>("user_plans", {
        select: "id, status, current_period_end, credits_used, profiles:user_id (email, full_name), plans:plan_id (display_name)",
        order: { column: "created_at", ascending: false },
        page: 1,
        pageSize: 500,
      });
      return rows.map((r) => ({
        id: r.id,
        status: r.status ?? "unknown",
        email: r.profiles?.email ?? null,
        full_name: r.profiles?.full_name ?? null,
        plan_display_name: r.plans?.display_name ?? null,
        current_period_end: r.current_period_end,
        credits_used: r.credits_used ?? 0,
      })) as SubRow[];
    },
  });

  const reconcile = useAdminMutation<void, unknown>(() => invokeFn("reconcile-subscriptions"), {
    invalidate: [keys.subscriptions.all],
    successMessage: "Reconciliation triggered",
  });

  const statuses = useMemo(() => ["all", ...Array.from(new Set(data.map((r) => r.status)))], [data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    data.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [data]);

  const rows = data.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (!search.trim() ||
        r.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.plan_display_name?.toLowerCase().includes(search.toLowerCase())),
  );

  const columns: Column<SubRow>[] = [
    {
      id: "customer",
      header: "Customer",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{r.full_name || "Unknown"}</p>
          <p className="truncate text-xs text-slate-500">{r.email}</p>
        </div>
      ),
    },
    { id: "plan", header: "Plan", cell: (r) => r.plan_display_name ?? "—" },
    { id: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { id: "period_end", header: "Renews / ends", cell: (r) => (r.current_period_end ? format(new Date(r.current_period_end), "MMM d, yyyy") : "—") },
    { id: "credits_used", header: "Credits used", cell: (r) => r.credits_used.toLocaleString() },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Subscriptions"
        description="Active plan instances (user_plans) reconciled with Stripe."
        icon={CreditCard}
        actions={
          <Button variant="outline" className="rounded-xl" onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${reconcile.isPending ? "animate-spin" : ""}`} />
            Reconcile with Stripe
          </Button>
        }
      />

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search customer or plan…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 max-w-sm rounded-xl" />
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((s) => (
                <Button key={s} variant={status === s ? "default" : "outline"} size="sm" className="capitalize" onClick={() => setStatus(s)}>
                  {s} {s !== "all" && `(${counts[s] ?? 0})`}
                </Button>
              ))}
            </div>
          </div>
          <DataTable<SubRow> columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyTitle="No subscriptions" />
        </CardContent>
      </Card>
    </div>
  );
}
