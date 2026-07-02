import React from "react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { useEbayAdminOverview } from "./hooks/useEbayAdminOverview";

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

interface EbayRightColumnProps {
  globalStats?: {
    totalOrders: number;
    totalRevenue: number;
    ordersLast24h: number;
    ordersLast7d: number;
    uniqueUsersWithOrders: number;
    latestSyncedAt: string | null;
    syncFreshnessStatus: "healthy" | "stale" | "unknown";
  } | null;
  isLoading?: boolean;
}

export default function EbayRightColumn({ globalStats: propGlobalStats, isLoading: propIsLoading }: EbayRightColumnProps) {
  const { data: overviewData, isLoading: queryIsLoading } = useEbayAdminOverview();

  const globalStats = propGlobalStats !== undefined ? propGlobalStats : overviewData?.globalStats;
  const isLoading = propIsLoading !== undefined ? propIsLoading : queryIsLoading;

  return (
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* App Status Widget */}
      <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium" style={{ color: sb.ink, fontWeight: 500 }}>eBay App Status</CardTitle>
          <CardDescription style={{ fontSize: 12, color: sb.inkMute }}>Configuration status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: sb.inkMute }}>Status</span>
            <Badge style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6 }}>
              Active
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: sb.inkMute }}>Extension Sync</span>
            <span className="text-sm font-medium" style={{ color: sb.ink }}>Configured</span>
          </div>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
            <AlertCircle className="h-4 w-4" style={{ color: sb.primary }} />
            Admin Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div style={{ background: sb.canvasSoft, border: `1px solid ${sb.hairlineCool}`, borderRadius: 8 }} className="p-3">
            <p className="text-xs font-medium" style={{ color: sb.inkMute }}>
              Order analytics are aggregated securely via RPC.
            </p>
          </div>
          <div style={{ background: sb.canvasSoft, border: `1px solid ${sb.hairlineCool}`, borderRadius: 8 }} className="p-3">
            <p className="text-xs" style={{ color: sb.inkMute }}>
              User order data is not shown directly to preserve RLS privacy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Global Sync Health */}
      <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
            <Clock className="h-4 w-4" style={{ color: sb.inkMute }} />
            Global Sync Health
          </CardTitle>
          <CardDescription style={{ fontSize: 12, color: sb.inkMute }}>
            System-wide polling status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-3">
               <Skeleton className="h-8 w-full rounded" />
               <Skeleton className="h-4 w-3/4 rounded" />
             </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span style={{ color: sb.inkMute }}>Overall Health</span>
                {globalStats?.syncFreshnessStatus === 'healthy' ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1 px-1.5" style={{ borderRadius: 6 }}>
                     <CheckCircle2 className="h-3 w-3" /> Healthy
                  </Badge>
                ) : globalStats?.syncFreshnessStatus === 'stale' ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 gap-1 px-1.5" style={{ borderRadius: 6 }}>
                     <AlertCircle className="h-3 w-3" /> Stale
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 px-1.5" style={{ borderRadius: 6 }}>
                     <XCircle className="h-3 w-3" /> Unknown
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span style={{ fontSize: 11, color: sb.inkMute }} className="uppercase tracking-wider">Latest Synced Order At:</span>
                <span className="font-medium text-xs font-mono" style={{ color: sb.ink }}>
                  {globalStats?.latestSyncedAt 
                    ? new Date(globalStats.latestSyncedAt).toLocaleString() 
                    : 'No orders synced yet'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
