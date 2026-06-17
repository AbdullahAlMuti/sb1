import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { DataTable, type Column } from "@/core/ui/DataTable";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { RevealValue } from "@/core/ui/RevealValue";
import { list } from "@/core/data/resource";
import { keys } from "@/core/data/keys";

interface SessionRow {
  id: string;
  email: string | null;
  status: string;
  stripe_checkout_session_id: string | null;
  plan_display_name: string | null;
  created_at: string;
}

export default function AdminCheckoutSessionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: keys.checkoutSessions.list({}),
    queryFn: async () => {
      const { rows } = await list<any>("checkout_sessions", {
        select: "id, email, status, stripe_checkout_session_id, created_at, plans:selected_plan_id (display_name)",
        order: { column: "created_at", ascending: false },
        page: 1,
        pageSize: 500,
      });
      return rows.map((r) => ({
        id: r.id,
        email: r.email,
        status: r.status ?? "pending",
        stripe_checkout_session_id: r.stripe_checkout_session_id,
        plan_display_name: r.plans?.display_name ?? null,
        created_at: r.created_at,
      })) as SessionRow[];
    },
  });

  const statuses = useMemo(() => ["all", ...Array.from(new Set(data.map((r) => r.status)))], [data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    data.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [data]);

  const rows = data.filter(
    (r) => (status === "all" || r.status === status) && (!search.trim() || r.email?.toLowerCase().includes(search.toLowerCase()) || r.plan_display_name?.toLowerCase().includes(search.toLowerCase())),
  );

  const columns: Column<SessionRow>[] = [
    { id: "email", header: "Email", cell: (r) => <RevealValue value={r.email} kind="checkout_email" subjectId={r.id} /> },
    { id: "plan", header: "Plan", cell: (r) => r.plan_display_name ?? "—" },
    { id: "status", header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
    { id: "stripe_id", header: "Stripe Session", cell: (r) => (r.stripe_checkout_session_id ? <span className="font-mono text-xs text-slate-500">{r.stripe_checkout_session_id.slice(0, 22)}…</span> : "—") },
    { id: "created_at", header: "Created", cell: (r) => format(new Date(r.created_at), "MMM d, HH:mm") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Checkout Sessions" description="Audit trail for every Stripe checkout attempt." icon={ShoppingCart} />
      <Card className="rounded-2xl border-slate-200">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search email or plan…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 max-w-sm rounded-xl" />
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((s) => (
                <Button key={s} variant={status === s ? "default" : "outline"} size="sm" className="capitalize" onClick={() => setStatus(s)}>
                  {s} {s !== "all" && `(${counts[s] ?? 0})`}
                </Button>
              ))}
            </div>
          </div>
          <DataTable<SessionRow> columns={columns} rows={rows} rowKey={(r) => r.id} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyTitle="No checkout sessions" />
        </CardContent>
      </Card>
    </div>
  );
}
