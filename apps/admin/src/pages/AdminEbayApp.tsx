import React, { useState } from "react";
import {
  ShoppingBag,
  Settings,
  Download,
  LayoutDashboard,
  Users,
  CreditCard,
  Library,
  Sparkles,
  Bookmark,
  BarChart3,
  Settings2,
  Tags,
  ShoppingCart,
  TrendingUp,
  PackageCheck
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";

import EbayRightColumn from "./ebay-app/EbayRightColumn";
import AdminEbayUsers from "./ebay-app/AdminEbayUsers";
import AdminEbayFeatureControls from "./ebay-app/AdminEbayFeatureControls";
import AdminEbayCreditsUsage from "./ebay-app/AdminEbayCreditsUsage";
import AdminEbayAuditLogs from "./ebay-app/AdminEbayAuditLogs";
import AdminEbaySyncHealth from "./ebay-app/AdminEbaySyncHealth";
import { EbaySyncSettings } from "../components/dashboard/EbaySyncSettings";

// Import existing standalone pages as components
import AdminBestSelling from "./AdminBestSelling";
import AdminMustSell from "./AdminMustSell";
import AdminProfitableProducts from "./AdminProfitableProducts";

type ContentView = 'best-selling' | 'must-sell' | 'profitable-products' | null;

export default function AdminEbayApp() {
  const [activeTab, setActiveTab] = useState("overview");
  const [contentView, setContentView] = useState<ContentView>(null);

  const tabs = [
    { id: "overview",      label: "Overview",           icon: LayoutDashboard },
    { id: "users",         label: "Users",              icon: Users           },
    { id: "content",       label: "Content Library",    icon: Library         },
    { id: "sync_health",   label: "Sync & Orders Health",icon: ShoppingCart    },
    { id: "feature_controls", label: "Feature Controls",icon: Sparkles        },
    { id: "credits",       label: "Credits & Usage",    icon: CreditCard      },
    { id: "audit_logs",    label: "Audit Logs",         icon: Bookmark        },
    { id: "settings",      label: "Settings",           icon: Settings2       },
  ];

  // Fetch safe admin data for Overview
  const { data: overviewData, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['ebay-admin-overview'],
    queryFn: async () => {
      // Fetch counts safely (no user order data, just admin curated lists)
      const [bestSellingCount, mustSellCount, profitableCount, settings, adminStats] = await Promise.all([
        (supabase as any).from('best_selling_items').select('*', { count: 'exact', head: true }),
        (supabase as any).from('must_sell_items').select('*', { count: 'exact', head: true }),
        (supabase as any).from('profitable_products').select('*', { count: 'exact', head: true }),
        (supabase as any).from('admin_settings').select('*').eq('key', 'ebay_sync_settings').single(),
        (supabase as any).rpc('get_ebay_admin_stats')
      ]);

      let syncSettings = null;
      if (settings.data?.value) {
        syncSettings = typeof settings.data.value === 'string' ? JSON.parse(settings.data.value) : settings.data.value;
      }

      return {
        bestSelling: bestSellingCount.count || 0,
        mustSell: mustSellCount.count || 0,
        profitable: profitableCount.count || 0,
        syncEnabled: syncSettings?.enabled ?? false,
        syncDays: syncSettings?.daysToSync ?? 90,
        updatedAt: settings.data?.updated_at,
        globalStats: adminStats.data?.summary || null
      };
    }
  });

  const renderContentLibrary = () => {
    if (contentView) {
      let ActiveComponent = null;
      let title = "";
      let description = "";

      if (contentView === 'best-selling') {
        ActiveComponent = AdminBestSelling;
        title = "Best Selling Items";
        description = "Manage the 500 best selling eBay items shown to users";
      } else if (contentView === 'must-sell') {
        ActiveComponent = AdminMustSell;
        title = "Must Sell Items";
        description = "Manage trending eBay products for users. Drag to reorder.";
      } else if (contentView === 'profitable-products') {
        ActiveComponent = AdminProfitableProducts;
        title = "Profitable Products";
        description = "Manage high-margin products. Drag to reorder.";
      }

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 border-b border-border pb-4">
            <Button variant="ghost" size="icon" onClick={() => setContentView(null)} className="h-8 w-8 shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <div className="pt-2">
            {ActiveComponent && <ActiveComponent hideHeader={true} />}
          </div>
        </div>
      );
    }

    // Default content library landing
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Content Library</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage all dynamic eBay content shown on the user dashboard.
          </p>
        </div>
        {/* Content type cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => setContentView('best-selling')}
            className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-colors text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0 group-hover:bg-blue-100 transition-colors">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Best Selling Items</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Manage the top 500 best selling eBay items
              </p>
            </div>
          </button>

          <button
            onClick={() => setContentView('must-sell')}
            className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-colors text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 shrink-0 group-hover:bg-orange-100 transition-colors">
              <Tags className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Must Sell Items</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Manage priority items pushed to users
              </p>
            </div>
          </button>

          <button
            onClick={() => setContentView('profitable-products')}
            className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-colors text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0 group-hover:bg-emerald-100 transition-colors">
              <PackageCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Profitable Products</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Manage product intelligence and dropship tracking
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">eBay App Overview</h2>
              <p className="text-sm text-muted-foreground">High-level statistics from your eBay Admin configuration and global system usage.</p>
            </div>
            
            {isLoadingOverview ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
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
                  <div className="text-2xl font-bold">${overviewData?.globalStats?.totalRevenue?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</div>
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
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Best Selling</span>
                  </div>
                  <div className="text-2xl font-bold">{overviewData?.bestSelling || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Curated Items</p>
                </div>

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
                  <div className="text-lg font-bold">
                    {overviewData?.syncEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overviewData?.syncDays ? `${overviewData.syncDays} Days Range` : 'Not Configured'}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      case "content":
        return renderContentLibrary();
      case "sync_health":
        return <AdminEbaySyncHealth overviewData={overviewData} />;
      case "users":
        return <AdminEbayUsers />;
      case "feature_controls":
        return <AdminEbayFeatureControls />;
      case "credits":
        return <AdminEbayCreditsUsage />;
      case "audit_logs":
        return <AdminEbayAuditLogs />;
      case "settings":
        return (
            <div className="max-w-2xl">
                <EbaySyncSettings />
            </div>
        );
      default:
        return (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
            <p className="text-sm text-muted-foreground">
              {tabs.find((t) => t.id === activeTab)?.label} configuration coming soon.
            </p>
          </div>
        );
    }
  };

  const getBreadcrumbLabel = () => {
      if (contentView === 'best-selling') return 'Best Selling Items';
      if (contentView === 'must-sell') return 'Must Sell Items';
      if (contentView === 'profitable-products') return 'Profitable Products';
      return '';
  };

  return (
    <div className="flex h-full flex-col bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">eBay App</h1>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-600 hover:bg-blue-50 border-blue-200 px-1.5 py-0 text-[10px]"
              >
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your eBay integration, global sync settings, curated content, and extension health.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-9 text-xs font-medium bg-card">
            <Download className="mr-2 h-3.5 w-3.5" /> Export Report
          </Button>
          <Button className="h-9 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white border-transparent">
            <Settings className="mr-2 h-3.5 w-3.5" /> eBay App Settings
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-border bg-card">
        <Tabs value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab);
          // Reset content view when leaving content tab
          if (tab !== 'content') setContentView(null);
        }} className="w-full">
          <TabsList className="h-12 w-full justify-start rounded-none border-b-0 bg-transparent p-0 gap-6 overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-3 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
                {/* Breadcrumb for content library sub-views */}
                {tab.id === 'content' && activeTab === 'content' && contentView && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                    / {getBreadcrumbLabel()}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 items-start w-full max-w-none">
          {/* Left Col */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-6 w-full min-w-0">
            {renderMainContent()}
          </div>
          {/* Right Col */}
          <div className="xl:col-span-1">
            <EbayRightColumn globalStats={overviewData?.globalStats} isLoading={isLoadingOverview} />
          </div>
        </div>
      </div>
    </div>
  );
}
