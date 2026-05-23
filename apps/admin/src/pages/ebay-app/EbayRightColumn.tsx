import React from "react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";

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

export default function EbayRightColumn({ globalStats, isLoading }: EbayRightColumnProps) {
  return (
    <div className="space-y-6">
      {/* App Status Widget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">eBay App Status</CardTitle>
          <CardDescription>Configuration status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
              Active
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Extension Sync</span>
            <span className="text-sm font-medium">Configured</span>
          </div>
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            Admin Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-xs text-blue-800">
              Order analytics are aggregated securely via RPC.
            </p>
          </div>
          <div className="rounded-lg border border-muted bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              User order data is not shown directly to preserve RLS privacy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Global Sync Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Global Sync Health
          </CardTitle>
          <CardDescription className="text-xs">
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
                <span className="text-muted-foreground">Overall Health</span>
                {globalStats?.syncFreshnessStatus === 'healthy' ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1 px-1.5">
                     <CheckCircle2 className="h-3 w-3" /> Healthy
                  </Badge>
                ) : globalStats?.syncFreshnessStatus === 'stale' ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 gap-1 px-1.5">
                     <AlertCircle className="h-3 w-3" /> Stale
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 px-1.5">
                     <XCircle className="h-3 w-3" /> Unknown
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Latest Synced Order At:</span>
                <span className="font-medium text-xs">
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
