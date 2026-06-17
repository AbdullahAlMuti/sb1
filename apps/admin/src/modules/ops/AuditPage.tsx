import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { DataTable, type Column } from "@/core/ui/DataTable";
import { list } from "@/core/data/resource";
import { keys } from "@/core/data/keys";

interface AuditRow {
  id: string;
  action: string;
  entity_type: string | null;
  admin_id: string;
  target_user_id: string | null;
  reason: string | null;
  created_at: string;
}

/** Searchable, immutable audit log viewer over admin_audit_logs. */
export default function AuditPage() {
  const [q, setQ] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: keys.audit.list({ view: "all" }),
    queryFn: async () => {
      const { rows } = await list<AuditRow>("admin_audit_logs", {
        select: "id, action, entity_type, admin_id, target_user_id, reason, created_at",
        order: { column: "created_at", ascending: false },
        page: 1,
        pageSize: 200,
      });
      return rows;
    },
  });

  const rows = (data ?? []).filter(
    (r) => !q.trim() || r.action.toLowerCase().includes(q.toLowerCase()) || (r.entity_type ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const columns: Column<AuditRow>[] = [
    { id: "action", header: "Action", cell: (r) => <span className="font-medium text-slate-900">{r.action.replace(/_/g, " ").toLowerCase()}</span> },
    { id: "entity_type", header: "Entity", cell: (r) => r.entity_type ?? "—" },
    { id: "reason", header: "Reason", cell: (r) => (r.reason ? <span className="line-clamp-1 max-w-[260px] text-xs text-slate-600">{r.reason}</span> : <span className="text-slate-400">—</span>) },
    { id: "created_at", header: "When", cell: (r) => format(new Date(r.created_at), "MMM d, HH:mm") },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" description="Immutable record of every administrative action." icon={ClipboardList} />
      <Card className="rounded-2xl border-slate-200">
        <CardContent className="space-y-4 p-4">
          <Input placeholder="Filter by action or entity…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-sm rounded-xl" />
          <DataTable<AuditRow>
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            emptyTitle="No audit entries"
          />
        </CardContent>
      </Card>
    </div>
  );
}
