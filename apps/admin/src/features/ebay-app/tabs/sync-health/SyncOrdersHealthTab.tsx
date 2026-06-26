import React from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Badge } from "@repo/ui/components/ui/badge";
import { Settings2, Sparkles, AlertCircle, ShoppingCart, Activity, RefreshCcw } from "lucide-react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";

export default function SyncOrdersHealthTab({ overviewData }: { overviewData: any }) {
  const { data: errorStats, isLoading: isLoadingErrors } = useQuery({
    queryKey: ['ebay-admin-sync-errors'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('search_admin_audit_logs', { search_query: '', action_filter: 'all', limit_val: 1 });
      // We will actually just query ebay_sync_logs directly since Admin has RLS access
      const { data: logs, error: logsError } = await (supabase as any)
        .from('ebay_sync_logs')
        .select('error_category, status, created_at, user_id, profiles(email)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (logsError) throw logsError;
      return logs || [];
    }
  });

  const { data: staleUsers, isLoading: isLoadingStale } = useQuery({
    queryKey: ['ebay-admin-stale-users'],
    queryFn: async () => {
      // Find users whose latest sync was > 2 days ago
      const { data, error } = await (supabase as any).rpc('search_ebay_users_admin', {
        search_query: '',
        status_filter: 'all',
        limit_val: 20,
        offset_val: 0
      });
      if (error) throw error;
      return (data || []).filter((u: any) => {
        if (!u.latest_synced_at) return true;
        const days = (new Date().getTime() - new Date(u.latest_synced_at).getTime()) / (1000 * 3600 * 24);
        return days > 2;
      });
    }
  });

  const recentFailures = errorStats?.filter((l: any) => l.status === 'error').slice(0, 5) || [];
  const latestSync = errorStats?.[0];

  // Group errors by category
  const errorCounts: Record<string, number> = {};
  errorStats?.filter((l: any) => l.status === 'error').forEach((l: any) => {
    const cat = l.error_category || 'unknown';
    errorCounts[cat] = (errorCounts[cat] || 0) + 1;
  });

  const EXPLANATIONS: Record<string, string> = {
    'ebay_session': 'User needs to log back into eBay Seller Hub to refresh cookies.',
    'csrf_token': 'CSRF token stale. User should refresh the eBay page.',
    'extension_dependency': 'Missing extension token or permissions. User must re-authenticate the extension.',
    'csv_download': 'eBay CSV endpoint failed to return data. Could be an eBay outage.',
    'csv_parser': 'Headers in the eBay CSV have changed or are invalid.',
    'backend_sync': 'Edge function rejected the payload (e.g. malformed JSON).',
    'database': 'Database failed to upsert the orders (e.g. timeout or constraint error).',
    'unknown': 'Unclassified error. Needs engineering review.'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-bold tracking-tight text-foreground/90">
          Sync & Orders Health
        </h2>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          Monitor the background extension syncing architecture, transaction pipeline, and recent error traces.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sync Configuration Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/85 to-card/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-border/100">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sync Policy</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border text-blue-500 bg-blue-500/10 border-blue-500/20`}>
              <Settings2 className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={overviewData?.syncEnabled ? "default" : "secondary"} className="text-[10px] font-bold px-2 py-0.5 uppercase">
                {overviewData?.syncEnabled ? 'Active' : 'Paused'}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Data Range</span>
              <span className="font-bold text-foreground/80">{overviewData?.syncDays ? `Past ${overviewData.syncDays} Days` : 'Not configured'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Architecture</span>
              <span className="font-mono text-[10px] text-blue-600 bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">Polling-v3</span>
            </div>
          </div>
        </div>

        {/* Latest System-wide Sync Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/85 to-card/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-border/100">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Synced</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border text-emerald-500 bg-emerald-500/10 border-emerald-500/20`}>
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-2 mt-4 text-xs">
            {isLoadingErrors ? (
              <Skeleton className="h-12 w-full rounded-lg" />
            ) : latestSync ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Badge variant={latestSync.status === 'success' ? 'outline' : 'destructive'} className={latestSync.status === 'success' ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/10 text-[10px] px-2 py-0.5 font-bold uppercase' : 'text-[10px] px-2 py-0.5 font-bold uppercase'}>
                    {latestSync.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground/80 font-mono">{new Date(latestSync.created_at).toLocaleString()}</span>
                </div>
                <div className="font-bold text-foreground/80 truncate mt-1">User: {latestSync.profiles?.email || latestSync.user_id}</div>
                {latestSync.error_category && (
                  <div className="text-[10px] text-rose-600 font-semibold bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10 capitalize">
                    Reason: {latestSync.error_category.replace('_', ' ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground italic">No sync logs parsed yet.</div>
            )}
          </div>
        </div>

        {/* Architecture Notice Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/2 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-amber-500/30">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none animate-pulse" />
          <div className="flex items-center gap-2 pb-3 border-b border-amber-500/20">
            <Sparkles className="h-4.5 w-4.5 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Architecture Core</span>
          </div>
          <p className="text-xs text-amber-800/80 dark:text-amber-400/85 mt-4 leading-relaxed font-medium">
            SaaS order mapping is purely client-driven. It relies on the <strong>SellerSuit Chrome Extension</strong> running securely inside active users' browser sessions to fetch live listings and push updates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sync Errors */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/45 backdrop-blur-md p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-rose-500" />
              <span className="text-sm font-bold tracking-tight text-foreground/90">Sync Exceptions Breakdown</span>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-muted/60">Last 100 Logs</Badge>
          </div>

          {isLoadingErrors ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : Object.keys(errorCounts).length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground/80 italic">
              No recent exceptions caught. Pipeline is running healthily.
            </div>
          ) : (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {Object.entries(errorCounts).map(([cat, count]) => (
                <div key={cat} className="space-y-2 border-b border-border/40 pb-3 last:border-0 last:pb-0 transition-all duration-200 hover:bg-muted/5 p-2 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 capitalize">
                      {cat.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-bold">{count} Logs</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium pl-1">
                    {EXPLANATIONS[cat] || EXPLANATIONS['unknown']}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stale Sync Users */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/45 backdrop-blur-md p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-4">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4.5 w-4.5 text-muted-foreground" />
              <span className="text-sm font-bold tracking-tight text-foreground/90">Stale Store Connections</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/5 text-amber-600 border-amber-500/10">&gt; 2 Days Inactive</Badge>
          </div>

          {isLoadingStale ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : staleUsers?.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground/80 italic">
              All active stores are connected and syncing on schedule.
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {staleUsers?.map((u: any) => (
                <div key={u.user_id} className="flex justify-between items-center text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0 p-2 hover:bg-muted/5 rounded-xl transition-all duration-200">
                  <div className="truncate pr-4 flex flex-col gap-0.5">
                    <span className="font-bold text-foreground/80">{u.full_name || 'Anonymous User'}</span>
                    <span className="text-[10px] text-muted-foreground/70">{u.email}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border">
                    {u.latest_synced_at ? new Date(u.latest_synced_at).toLocaleDateString() : 'Never Synced'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
