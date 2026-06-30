import React from "react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { CreditCard, PackageCheck, ShoppingBag, Settings2, Tags, TrendingUp, Users } from "lucide-react";
import { useEbayAdminOverview } from "../hooks/useEbayAdminOverview";

export function EbayOverview() {
  const { data: overviewData, isLoading } = useEbayAdminOverview();


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">eBay App Overview</h2>
        <p className="text-sm text-muted-foreground">High-level statistics from your eBay Admin configuration and global system usage.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Global Analytics Cards from RPC */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <ShoppingBag className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">System-Wide Orders</span>
            </div>
            <div className="text-2xl font-bold">{overviewData?.globalStats?.totalOrders?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total orders synced</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">System-Wide Revenue</span>
            </div>
            <div className="text-2xl font-bold">
              ${overviewData?.globalStats?.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total revenue tracked</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Active Stores</span>
            </div>
            <div className="text-2xl font-bold">{overviewData?.globalStats?.uniqueUsersWithOrders?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Users with synced orders</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Last 24h Activity</span>
            </div>
            <div className="text-2xl font-bold">{overviewData?.globalStats?.ordersLast24h?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Orders synced recently</p>
          </div>

          {/* Content Library Stats */}

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Tags className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Must Sell</span>
            </div>
            <div className="text-2xl font-bold">{overviewData?.mustSell || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Curated Items</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <PackageCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Profitable Products</span>
            </div>
            <div className="text-2xl font-bold">{overviewData?.profitable || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Curated Products</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Settings2 className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Sync Status</span>
            </div>
            <div className="text-lg font-bold">{overviewData?.syncEnabled ? "Enabled" : "Disabled"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overviewData?.syncDays ? `${overviewData.syncDays} Days Range` : "Not Configured"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
