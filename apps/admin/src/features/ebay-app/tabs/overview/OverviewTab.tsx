import React from "react";
import {
  ShoppingBag,
  Users,
  CreditCard,
  TrendingUp,
  Tags,
  PackageCheck,
  Settings2,
  Calendar,
} from "lucide-react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";

interface OverviewTabProps {
  overviewData: any;
  isLoading: boolean;
}

export default function OverviewTab({ overviewData, isLoading }: OverviewTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-4 w-96 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "System-Wide Orders",
      value: overviewData?.globalStats?.totalOrders?.toLocaleString() || "0",
      description: "Cumulative volume",
      subText: "Total orders tracked",
      icon: ShoppingBag,
      color: "emerald",
      gradient: "from-emerald-500/10 to-teal-500/5",
      iconColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "System-Wide Revenue",
      value: `$${overviewData?.globalStats?.totalRevenue?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) || '0.00'}`,
      description: "Gross merchandise value",
      subText: "Total revenue tracked",
      icon: CreditCard,
      color: "blue",
      gradient: "from-blue-500/10 to-indigo-500/5",
      iconColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Active Stores",
      value: overviewData?.globalStats?.uniqueUsersWithOrders?.toLocaleString() || "0",
      description: "Stores with transactions",
      subText: "Users with synced orders",
      icon: Users,
      color: "purple",
      gradient: "from-purple-500/10 to-violet-500/5",
      iconColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
    {
      title: "Last 24h Activity",
      value: overviewData?.globalStats?.ordersLast24h?.toLocaleString() || "0",
      description: "Recently synced orders",
      subText: "Orders synced recently",
      icon: TrendingUp,
      color: "orange",
      gradient: "from-orange-500/10 to-amber-500/5",
      iconColor: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    },
    {
      title: "Must Sell Items",
      value: overviewData?.mustSell || "0",
      description: "Curated push list items",
      subText: "Curated Items",
      icon: Tags,
      color: "amber",
      gradient: "from-amber-500/10 to-yellow-500/5",
      iconColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Profitable Products",
      value: overviewData?.profitable || "0",
      description: "Curated high-margin items",
      subText: "Curated Products",
      icon: PackageCheck,
      color: "teal",
      gradient: "from-teal-500/10 to-cyan-500/5",
      iconColor: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-bold tracking-tight text-foreground/90">
          eBay App Overview
        </h2>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          High-level statistics from your eBay Admin configuration and global system usage.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Render Metrics */}
        {metrics.map((m, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-border/100"
          >
            {/* Background Accent Glow */}
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${m.gradient} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {m.title}
                </span>
                <p className="text-2xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  {m.value}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${m.iconColor} shadow-inner transition-all duration-300 group-hover:scale-110`}>
                <m.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-border/40 flex flex-col gap-0.5">
              <p className="text-xs text-muted-foreground/80 font-medium">
                {m.description}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {m.subText}
              </p>
            </div>
          </div>
        ))}

        {/* Sync Status Card (Special Styling) */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-border/100">
          <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full ${overviewData?.syncEnabled ? 'bg-emerald-500/10' : 'bg-red-500/10'} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Sync Status
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`relative flex h-2.5 w-2.5 ${overviewData?.syncEnabled ? 'text-emerald-500' : 'text-red-500'}`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${overviewData?.syncEnabled ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${overviewData?.syncEnabled ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <p className="text-lg font-extrabold tracking-tight text-foreground">
                  {overviewData?.syncEnabled ? 'Active' : 'Disabled'}
                </p>
              </div>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${overviewData?.syncEnabled ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-red-500 bg-red-500/10 border-red-500/20'} shadow-inner transition-all duration-300 group-hover:scale-110`}>
              <Settings2 className="h-4.5 w-4.5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-medium">
              <Calendar className="h-3.5 w-3.5 opacity-80" />
              <span>{overviewData?.syncDays ? `${overviewData.syncDays} Days Range` : 'Not Configured'}</span>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              {overviewData?.updatedAt ? `Updated ${new Date(overviewData.updatedAt).toLocaleDateString()}` : 'No update logs'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
