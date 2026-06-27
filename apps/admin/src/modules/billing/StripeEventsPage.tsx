import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Webhook } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { DataTable, type Column } from "@/core/ui/DataTable";
import { list } from "@/core/data/resource";
import { keys } from "@/core/data/keys";

interface StripeEvent {
  id: string;
  type: string;
  processed_at: string;
}

/** Read-only Stripe webhook event log — debug "did this event process?". */
export default function StripeEventsPage() {
  const [q, setQ] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: keys.stripeEvents.list({}),
    queryFn: async () => {
      const { rows } = await list<StripeEvent>("stripe_events", {
        order: { column: "processed_at", ascending: false },
        page: 1,
        pageSize: 100,
      });
      return rows;
    },
  });

  const rows = (data ?? []).filter((e) => !q.trim() || e.type.toLowerCase().includes(q.toLowerCase()) || e.id.toLowerCase().includes(q.toLowerCase()));

  const columns: Column<StripeEvent>[] = [
    { id: "type", header: "Event", cell: (e) => <span className="font-medium text-slate-900">{e.type}</span> },
    { id: "id", header: "Stripe ID", cell: (e) => <span className="font-mono text-xs text-slate-500">{e.id}</span> },
    { id: "processed_at", header: "Processed", cell: (e) => format(new Date(e.processed_at), "MMM d, HH:mm:ss") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Stripe Events" description="Webhook events received and processed (idempotency log)." icon={Webhook} />
      <Card className="rounded-2xl border-slate-200">
        <CardContent className="space-y-4 p-4">
          <Input placeholder="Filter by type or ID…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-sm rounded-xl" />
          <DataTable<StripeEvent>
            columns={columns}
            rows={rows}
            rowKey={(e) => e.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            emptyTitle="No Stripe events"
          />
        </CardContent>
      </Card>
    </div>
  );
}
