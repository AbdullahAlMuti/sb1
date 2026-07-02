import React from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Badge } from "@repo/ui/components/ui/badge";
import { Settings2, Sparkles, AlertCircle, ShoppingCart, Activity, RefreshCcw } from "lucide-react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { useEbayAdminOverview } from "./hooks/useEbayAdminOverview";

/* ─── Supabase Design Tokens ─── */
const sb = {
  primary: "#3ecf8e",
  primaryDeep: "#24b47e",
  ink: "#171717",
  inkMute: "#707070",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  hairline: "#dfdfdf",
  hairlineCool: "#ededed",
  onPrimary: "#171717",
} as const;

export default function AdminEbaySyncHealth({ overviewData: propOverviewData }: { overviewData?: any }) {
  const { data: queryOverviewData } = useEbayAdminOverview();
  const overviewData = propOverviewData !== undefined ? propOverviewData : queryOverviewData;

  const { data: errorStats, isLoading: isLoadingErrors } = useQuery({
    queryKey: ['ebay-admin-sync-errors'],
    queryFn: async () => {
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
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.42, color: sb.ink }} className="tracking-tight">
          Sync & Orders Health
        </h2>
        <p style={{ fontSize: 13, color: sb.inkMute, lineHeight: 1.45 }} className="mt-1">
          Monitor the background extension syncing architecture.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <Settings2 style={{ width: 16, height: 16, color: sb.primary }} />
              Sync Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: sb.inkMute }}>Status</span>
              <Badge variant={overviewData?.syncEnabled ? "default" : "secondary"} style={{ borderRadius: 6 }}>
                {overviewData?.syncEnabled ? 'Active' : 'Paused'}
              </Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: sb.inkMute }}>Data Range</span>
              <span style={{ color: sb.ink, fontWeight: 500 }}>{overviewData?.syncDays ? `Past ${overviewData.syncDays} Days` : 'Not configured'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: sb.inkMute }}>Architecture</span>
              <span style={{ color: sb.ink, fontWeight: 500 }} className="text-xs">Extension-based Polling</span>
            </div>
          </CardContent>
        </Card>

        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <Activity style={{ width: 16, height: 16, color: sb.primary }} />
              Latest System-Wide Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingErrors ? <Skeleton className="h-12 w-full" /> : errorStats?.[0] ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={errorStats[0].status === 'success' ? 'outline' : 'destructive'} className={errorStats[0].status === 'success' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''} style={{ borderRadius: 6 }}>
                    {errorStats[0].status}
                  </Badge>
                  <span style={{ fontSize: 11, color: sb.inkMute }}>{new Date(errorStats[0].created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: sb.ink }} className="mt-2 truncate">User: {errorStats[0].profiles?.email || errorStats[0].user_id}</div>
                {errorStats[0].error_category && <div style={{ fontSize: 12, color: '#ff2201' }} className="capitalize font-medium">Error: {errorStats[0].error_category.replace('_', ' ')}</div>}
              </div>
            ) : <div className="text-sm" style={{ color: sb.inkMute }}>No recent logs found.</div>}
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/10" style={{ borderRadius: 12 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-850" style={{ fontWeight: 500 }}>
              <Sparkles className="h-4 w-4" />
              Architecture Notice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-orange-800 leading-relaxed">
            <p>User order data relies on the <strong>SellerSuit Extension</strong> running securely in the user's browser to fetch data from eBay.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#ff2201' }} />
              Recent Sync Errors (Last 100 Logs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingErrors ? <Skeleton className="h-32 w-full" /> : Object.keys(errorCounts).length === 0 ? (
              <div className="text-center py-6 text-sm" style={{ color: sb.inkMute }}>No recent errors found! System is healthy.</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(errorCounts).map(([cat, count]) => (
                  <div key={cat} className="space-y-1 border-b border-border pb-3 last:border-0 last:pb-0" style={{ borderColor: sb.hairlineCool }}>
                    <div className="flex justify-between items-center">
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#ff2201' }} className="capitalize">{cat.replace('_', ' ')}</span>
                      <Badge variant="secondary" style={{ borderRadius: 6 }}>{count} occurrences</Badge>
                    </div>
                    <p style={{ fontSize: 12, color: sb.inkMute }}>{EXPLANATIONS[cat] || EXPLANATIONS['unknown']}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <RefreshCcw style={{ width: 16, height: 16, color: sb.primary }} />
              Stale Sync Users (&gt; 2 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStale ? <Skeleton className="h-32 w-full" /> : staleUsers?.length === 0 ? (
              <div className="text-center py-6 text-sm" style={{ color: sb.inkMute }}>No stale users found.</div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {staleUsers?.map((u: any) => (
                  <div key={u.user_id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0 last:pb-0" style={{ borderColor: sb.hairlineCool }}>
                    <div className="truncate pr-4 flex flex-col">
                      <span style={{ fontWeight: 500, color: sb.ink }}>{u.full_name || 'Unknown'}</span>
                      <span style={{ fontSize: 12, color: sb.inkMute }}>{u.email}</span>
                    </div>
                    <span style={{ fontSize: 12, color: sb.inkMute }} className="whitespace-nowrap">
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
