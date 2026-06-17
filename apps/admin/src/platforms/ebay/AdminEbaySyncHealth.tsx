import React from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Badge } from "@repo/ui/components/ui/badge";
import { Settings2, Sparkles, AlertCircle, ShoppingCart, Activity, RefreshCcw } from "lucide-react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { useEbayAdminOverview } from "./hooks/useEbayAdminOverview";

export default function AdminEbaySyncHealth({ overviewData: propOverviewData }: { overviewData?: any }) {
  const { data: queryOverviewData } = useEbayAdminOverview();
  const overviewData = propOverviewData !== undefined ? propOverviewData : queryOverviewData;

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
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Sync & Orders Health</h2>
        <p className="text-sm text-muted-foreground">Monitor the background extension syncing architecture.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-blue-500" />
              Sync Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={overviewData?.syncEnabled ? "default" : "secondary"}>
                {overviewData?.syncEnabled ? 'Active' : 'Paused'}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Data Range</span>
              <span className="font-medium">{overviewData?.syncDays ? `Past ${overviewData.syncDays} Days` : 'Not configured'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Architecture</span>
              <span className="font-medium text-xs">Extension-based Polling</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Latest System-Wide Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingErrors ? <Skeleton className="h-12 w-full" /> : latestSync ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={latestSync.status === 'success' ? 'outline' : 'destructive'} className={latestSync.status === 'success' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''}>
                    {latestSync.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(latestSync.created_at).toLocaleString()}</span>
                </div>
                <div className="text-sm font-medium mt-2 truncate">User: {latestSync.profiles?.email || latestSync.user_id}</div>
                {latestSync.error_category && <div className="text-xs text-red-600 capitalize">Error: {latestSync.error_category.replace('_', ' ')}</div>}
              </div>
            ) : <div className="text-sm text-muted-foreground">No recent logs found.</div>}
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-800">
              <Sparkles className="h-4 w-4" />
              Architecture Notice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-orange-700/90 leading-relaxed">
            <p>User order data relies on the <strong>SellerSuit Extension</strong> running securely in the user's browser to fetch data from eBay.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Recent Sync Errors (Last 100 Logs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingErrors ? <Skeleton className="h-32 w-full" /> : Object.keys(errorCounts).length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">No recent errors found! System is healthy.</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(errorCounts).map(([cat, count]) => (
                  <div key={cat} className="space-y-1 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-red-600 capitalize">{cat.replace('_', ' ')}</span>
                      <Badge variant="secondary">{count} occurrences</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{EXPLANATIONS[cat] || EXPLANATIONS['unknown']}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-slate-500" />
              Stale Sync Users (&gt; 2 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStale ? <Skeleton className="h-32 w-full" /> : staleUsers?.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">No stale users found.</div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {staleUsers?.map((u: any) => (
                  <div key={u.user_id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="truncate pr-4 flex flex-col">
                      <span className="font-medium">{u.full_name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {u.latest_synced_at ? new Date(u.latest_synced_at).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
