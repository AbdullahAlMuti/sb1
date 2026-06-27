import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { format } from "date-fns";
import { PageHeader } from "@/core/ui/PageHeader";
import { DataTable, type Column } from "@/core/ui/DataTable";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { useUsers, type AdminUserRow } from "./useUsers";
import { UserDetail } from "./UserDetail";

const PAGE_SIZE = 20;
const STATUS_FILTERS = ["all", "active", "suspended"];

/**
 * User-360 list. Search + status + pagination are server-side (via
 * `search_ebay_users_admin`), so the page count and filtered rows always agree —
 * the old client-side pagination/percentage bug is gone. Row click opens the
 * full 360 detail with all operator actions.
 */
export default function UsersPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(userId ?? null);

  // Debounce the search box; reset to page 1 on any filter change.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, refetch } = useUsers({ search, status, page, pageSize: PAGE_SIZE });
  const rows = data?.rows ?? [];

  const columns: Column<AdminUserRow>[] = useMemo(
    () => [
      {
        id: "email",
        header: "Customer",
        cell: (r) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{r.full_name || "Unknown"}</p>
            <p className="truncate text-xs text-slate-500">{r.email}</p>
          </div>
        ),
      },
      { id: "account_status", header: "Status", cell: (r) => <StatusBadge value={r.account_status || "active"} /> },
      { id: "credits_remaining", header: "Credits", cell: (r) => r.credits_remaining.toLocaleString() },
      { id: "total_orders", header: "Orders", cell: (r) => r.total_orders.toLocaleString() },
      {
        id: "latest_synced_at",
        header: "Last sync",
        cell: (r) => (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">
              {r.latest_synced_at ? format(new Date(r.latest_synced_at), "dd MMM yyyy") : "Never"}
            </span>
            {r.latest_sync_status && <StatusBadge value={r.latest_sync_status} />}
          </div>
        ),
      },
    ],
    [],
  );

  const openUser = (id: string) => {
    setSelected(id);
    navigate(`/users/${id}`, { replace: false });
  };
  const closeUser = () => {
    setSelected(null);
    navigate("/users", { replace: false });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Users" description="Look up any account and run support actions." icon={Users} />

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search email, name, or ID…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-9 rounded-xl pl-9"
              />
            </div>
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <Button
                  key={s}
                  variant={status === s ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <DataTable<AdminUserRow>
            columns={columns}
            rows={rows}
            rowKey={(r) => r.user_id}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            onRowClick={(r) => openUser(r.user_id)}
            emptyTitle="No users match"
          />

          {/* Server pagination has no total; offer prev/next on the current window. */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-slate-500">Page {page}</span>
            <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" disabled={!data?.hasNext} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <UserDetail userId={selected} open={!!selected} onOpenChange={(o) => !o && closeUser()} />
    </div>
  );
}
