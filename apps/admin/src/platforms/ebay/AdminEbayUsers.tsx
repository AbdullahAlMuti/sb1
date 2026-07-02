import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Badge } from "@repo/ui/components/ui/badge";
import { Search, Loader2, ArrowRight } from "lucide-react";
import AdminEbayUserDetail from "./AdminEbayUserDetail";

/* ─── Supabase Design Tokens ─── */
const sb = {
  primary: "#3ecf8e",
  ink: "#171717",
  inkMute: "#707070",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  hairline: "#dfdfdf",
  hairlineCool: "#ededed",
  onPrimary: "#171717",
} as const;

export default function AdminEbayUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [issueFilter, setIssueFilter] = useState<string>("all");

  // Simple debounce
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['ebay-admin-users', debouncedQuery],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('search_ebay_users_admin', {
        search_query: debouncedQuery,
        status_filter: 'all',
        limit_val: 50,
        offset_val: 0
      });

      if (error) throw error;
      return data || [];
    }
  });

  if (selectedUserId) {
    return <AdminEbayUserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.42, color: sb.ink }} className="tracking-tight">
          Users & Support Center
        </h2>
        <p style={{ fontSize: 13, color: sb.inkMute, lineHeight: 1.45 }} className="mt-1">
          Search and manage user eBay synchronization and credits.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or user ID..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: 6, borderColor: sb.hairline }}
          />
        </div>
        <select 
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background max-w-[200px]"
          value={issueFilter}
          onChange={(e) => setIssueFilter(e.target.value)}
          style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}
        >
          <option value="all">All Users</option>
          <option value="failed_sync">Failed Sync</option>
          <option value="sync_disabled">Sync Disabled</option>
          <option value="stale_sync">Stale Sync (&gt;2 days)</option>
          <option value="low_credits">Low Credits (&lt;50)</option>
        </select>
      </div>

      <div style={{
        background: sb.canvas,
        border: `1px solid ${sb.hairline}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      }}>
        <Table>
          <TableHeader style={{ background: sb.canvasSoft }}>
            <TableRow style={{ borderBottom: `1px solid ${sb.hairline}` }}>
              <TableHead style={{ color: sb.ink, fontWeight: 500 }}>User</TableHead>
              <TableHead style={{ color: sb.ink, fontWeight: 500 }}>Account Status</TableHead>
              <TableHead className="text-right" style={{ color: sb.ink, fontWeight: 500 }}>Total Orders</TableHead>
              <TableHead className="text-right" style={{ color: sb.ink, fontWeight: 500 }}>Last 24h</TableHead>
              <TableHead style={{ color: sb.ink, fontWeight: 500 }}>Latest Sync</TableHead>
              <TableHead className="text-right" style={{ color: sb.ink, fontWeight: 500 }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: sb.primary }} />
                </TableCell>
              </TableRow>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center" style={{ color: sb.inkMute }}>
                  No users found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              users?.filter((u: any) => {
                if (issueFilter === 'all') return true;
                if (issueFilter === 'failed_sync') return u.latest_sync_status?.includes('error');
                if (issueFilter === 'sync_disabled') return u.is_sync_enabled === false;
                if (issueFilter === 'low_credits') return u.credits_remaining < 50;
                if (issueFilter === 'stale_sync') {
                  if (!u.latest_synced_at) return true;
                  const daysOld = (new Date().getTime() - new Date(u.latest_synced_at).getTime()) / (1000 * 3600 * 24);
                  return daysOld > 2;
                }
                return true;
              }).map((user: any) => (
                <TableRow key={user.user_id} style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                  <TableCell>
                    <div style={{ fontWeight: 500, fontSize: 14, color: sb.ink }}>{user.full_name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: sb.inkMute }}>{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      {user.account_status === 'active' ? (
                        <Badge style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6 }}>
                          active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" style={{ borderRadius: 6 }}>
                          {user.account_status}
                        </Badge>
                      )}
                      {user.latest_sync_status?.includes('error') && (
                        <Badge variant="destructive" className="text-[10px] h-4" style={{ borderRadius: 6 }}>
                          Failed Sync
                        </Badge>
                      )}
                      {user.is_sync_enabled === false && (
                        <Badge variant="secondary" className="text-[10px] h-4 bg-amber-50 text-amber-800 border border-amber-200" style={{ borderRadius: 6 }}>
                          Sync Disabled
                        </Badge>
                      )}
                      {user.credits_remaining < 50 && (
                        <Badge variant="outline" className="text-[10px] h-4 text-orange-600 border-orange-200 bg-orange-50" style={{ borderRadius: 6 }}>
                          Low Credits
                        </Badge>
                      )}
                      {user.latest_synced_at && ((new Date().getTime() - new Date(user.latest_synced_at).getTime()) / (1000 * 3600 * 24)) > 2 && (
                        <Badge variant="outline" className="text-[10px] h-4 text-slate-500" style={{ borderRadius: 6 }}>
                          Stale Sync
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right" style={{ fontWeight: 500, color: sb.ink }}>
                    {user.total_orders?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell className="text-right" style={{ color: sb.inkMute }}>
                    {user.orders_last_24h?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell style={{ color: sb.inkMute, fontSize: 12 }}>
                    {user.latest_synced_at 
                      ? new Date(user.latest_synced_at).toLocaleString() 
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2 text-xs h-8"
                      onClick={() => setSelectedUserId(user.user_id)}
                      style={{ borderRadius: 6, color: sb.ink }}
                    >
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
