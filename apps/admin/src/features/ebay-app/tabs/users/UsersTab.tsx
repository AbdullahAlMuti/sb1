import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Badge } from "@repo/ui/components/ui/badge";
import { Search, Loader2, ArrowRight, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import UserDetail from "./UserDetail";

export default function UsersTab() {
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
    return <UserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-bold tracking-tight text-foreground/90">
          Users & Support Center
        </h2>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          Search and manage user eBay synchronization, API credentials, and credit limits.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search by name, email, or user ID..."
            className="pl-9.5 h-10 bg-card/50 border-border/80 text-sm focus-visible:ring-blue-600 transition-all duration-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="flex h-10 w-full sm:w-52 items-center justify-between rounded-xl border border-border/80 bg-card/50 px-3 py-2 text-xs font-semibold text-muted-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all duration-300 cursor-pointer"
          value={issueFilter}
          onChange={(e) => setIssueFilter(e.target.value)}
        >
          <option value="all">🔍 Show All Users</option>
          <option value="failed_sync">⚠️ Sync Failures Only</option>
          <option value="sync_disabled">⏸️ Paused Syncs</option>
          <option value="stale_sync">⏳ Stale Sync (&gt; 2 days)</option>
          <option value="low_credits">🪙 Low Credit Balance</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/45 backdrop-blur-md shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-bold tracking-wider text-muted-foreground py-4">User Details</TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-muted-foreground py-4">Status & Sync Health</TableHead>
              <TableHead className="text-right text-xs font-bold tracking-wider text-muted-foreground py-4">Total Orders</TableHead>
              <TableHead className="text-right text-xs font-bold tracking-wider text-muted-foreground py-4">Last 24h</TableHead>
              <TableHead className="text-xs font-bold tracking-wider text-muted-foreground py-4">Latest Connection</TableHead>
              <TableHead className="text-right text-xs font-bold tracking-wider text-muted-foreground py-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    <span className="text-xs text-muted-foreground">Hydrating active profiles...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <ShieldAlert className="h-10 w-10 mb-2 opacity-35 text-muted-foreground" />
                    <p className="text-sm font-semibold">No admin match</p>
                    <p className="text-xs text-muted-foreground/80">No active users match your query parameters.</p>
                  </div>
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
                <TableRow key={user.user_id} className="hover:bg-muted/10 transition-colors duration-200">
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground/90">{user.full_name || 'Anonymous User'}</span>
                      <span className="text-xs text-muted-foreground/80 mt-0.5">{user.email}</span>
                      <span className="text-[10px] text-muted-foreground/50 font-mono mt-1">{user.user_id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant={user.account_status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5 font-semibold uppercase">
                        {user.account_status}
                      </Badge>
                      {user.latest_sync_status?.includes('error') && (
                        <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold bg-rose-500/10 text-rose-600 border-rose-500/20">
                          Failed Sync
                        </Badge>
                      )}
                      {user.is_sync_enabled === false && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Paused
                        </Badge>
                      )}
                      {user.credits_remaining < 50 && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold bg-orange-500/10 text-orange-600 border-orange-500/20">
                          Low Credits ({user.credits_remaining})
                        </Badge>
                      )}
                      {user.latest_synced_at && ((new Date().getTime() - new Date(user.latest_synced_at).getTime()) / (1000 * 3600 * 24)) > 2 && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold bg-slate-500/10 text-slate-600 border-slate-500/20">
                          Stale
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm text-foreground/90 py-4">
                    {user.total_orders?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell className="text-right font-medium text-xs text-muted-foreground py-4">
                    {user.orders_last_24h?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-4">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 text-muted-foreground/60 animate-spin-hover" />
                      <span>
                        {user.latest_synced_at 
                          ? new Date(user.latest_synced_at).toLocaleString() 
                          : 'Never'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1.5 text-xs h-8 px-3 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-300 font-semibold"
                      onClick={() => setSelectedUserId(user.user_id)}
                    >
                      Inspect Profile <ArrowRight className="h-3.5 w-3.5" />
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
