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
  Settings2,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';

import UsersTab from "./tabs/users/UsersTab";
import FeatureControlsTab from "./tabs/feature-controls/FeatureControlsTab";
import CreditsUsageTab from "./tabs/credits/CreditsUsageTab";
import AuditLogsTab from "./tabs/audit-logs/AuditLogsTab";
import SyncOrdersHealthTab from "./tabs/sync-health/SyncOrdersHealthTab";

import OverviewTab from "./tabs/overview/OverviewTab";
import ContentLibraryTab, { ContentView } from "./tabs/content/ContentLibraryTab";
import SettingsTab from "./tabs/settings/SettingsTab";
export default function EbayAppPage() {
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
      const [mustSellCount, profitableCount, settings, adminStats] = await Promise.all([
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
        mustSell: mustSellCount.count || 0,
        profitable: profitableCount.count || 0,
        syncEnabled: syncSettings?.enabled ?? false,
        syncDays: syncSettings?.daysToSync ?? 90,
        updatedAt: settings.data?.updated_at,
        globalStats: adminStats.data?.summary || null
      };
    }
  });

  const renderMainContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab overviewData={overviewData} isLoading={isLoadingOverview} />;
      case "content":
        return <ContentLibraryTab contentView={contentView} setContentView={setContentView} />;
      case "sync_health":
        return <SyncOrdersHealthTab overviewData={overviewData} />;
      case "users":
        return <UsersTab />;
      case "feature_controls":
        return <FeatureControlsTab />;
      case "credits":
        return <CreditsUsageTab />;
      case "audit_logs":
        return <AuditLogsTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card/65 backdrop-blur-md">
            <p className="text-sm text-muted-foreground">
              {tabs.find((t) => t.id === activeTab)?.label} configuration coming soon.
            </p>
          </div>
        );
    }
  };

  const getBreadcrumbLabel = () => {
    if (contentView === 'must-sell') return 'Must Sell Items';
    if (contentView === 'profitable-products') return 'Profitable Products';
    return '';
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card/90 via-card/50 to-background/30 shadow-xl backdrop-blur-lg transition-all duration-300">
      {/* Atmospheric SaaS Gradient Background Glows */}
      <div className="absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Header Panel */}
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between px-6 py-6 border-b border-border/50 bg-card/40 backdrop-blur-md gap-4 z-10">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10 hover:scale-105 transition-transform duration-300">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                eBay Command Hub
              </h1>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase animate-pulse"
              >
                Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Global control center for eBay dropship operations. Manage sync policies, curate content libraries, audit permissions, and monitor store health.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
          <Button variant="outline" className="h-9 px-4 text-xs font-semibold bg-card/60 border-border/80 hover:bg-muted/40 hover:text-foreground transition-all duration-300">
            <Download className="mr-2 h-3.5 w-3.5 opacity-80" /> Export Hub Metrics
          </Button>
          <Button className="h-9 px-4 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-blue-500/10 transition-all duration-300 hover:shadow-blue-500/20">
            <Settings className="mr-2 h-3.5 w-3.5 animate-spin-hover" /> Settings
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Panel */}
      <div className="relative px-6 border-b border-border/40 bg-card/10 backdrop-blur-md z-10 overflow-x-auto scrollbar-none">
        <Tabs value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'content') setContentView(null);
        }} className="w-full">
          <TabsList className="h-14 w-full justify-start rounded-none border-b-0 bg-transparent p-0 gap-6">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative h-14 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-3 font-semibold text-xs tracking-wide text-muted-foreground shadow-none transition-all duration-300 hover:text-foreground data-[state=active]:border-blue-600 data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <tab.icon className="mr-2 h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                {tab.label}
                {tab.id === 'content' && activeTab === 'content' && contentView && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-semibold">
                    {getBreadcrumbLabel()}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Panel Body container */}
      <div className="relative flex-1 p-6 md:p-8 z-10">
        <div className="w-full min-w-0 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
}
