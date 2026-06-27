import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { list } from "@/core/data/resource";
import { keys } from "@/core/data/keys";
import { StateLayout } from "./StateLayout";

interface AuditRow {
  id: string;
  action: string;
  admin_id: string;
  target_user_id: string | null;
  reason: string | null;
  created_at: string;
}

/**
 * Immutable audit feed for one entity (or target user). Reused in detail views
 * so every record shows who changed what and why.
 */
export function AuditTrailList({
  entityType,
  entityId,
  targetUserId,
  limit = 20,
}: {
  entityType?: string;
  entityId?: string;
  targetUserId?: string;
  limit?: number;
}) {
  const filters: Record<string, string> = {};
  if (entityType) filters.entity_type = entityType;
  if (entityId) filters.entity_id = entityId;
  if (targetUserId) filters.target_user_id = targetUserId;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: keys.audit.list({ entityType, entityId, targetUserId, limit }),
    queryFn: async () => {
      const { rows } = await list<AuditRow>("admin_audit_logs", {
        select: "id, action, admin_id, target_user_id, reason, created_at",
        filters,
        order: { column: "created_at", ascending: false },
        page: 1,
        pageSize: limit,
      });
      return rows;
    },
  });

  const rows = data ?? [];

  return (
    <StateLayout
      isLoading={isLoading}
      isError={isError}
      isEmpty={rows.length === 0}
      onRetry={() => refetch()}
      emptyTitle="No audit entries"
      loading={<div className="h-16 animate-pulse rounded-lg bg-slate-100" />}
    >
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
            <div className="min-w-0">
              <span className="font-medium text-slate-800">{r.action.replace(/_/g, " ").toLowerCase()}</span>
              {r.reason && <p className="truncate text-slate-500">{r.reason}</p>}
            </div>
            <span className="whitespace-nowrap text-slate-400">
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
            </span>
          </li>
        ))}
      </ul>
    </StateLayout>
  );
}
