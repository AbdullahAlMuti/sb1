import React, { useState } from "react";
import {
  ShoppingBag,
  Settings,
  Download,
  LayoutTemplate,
  LayoutDashboard,
  Users,
  CreditCard,
  Library,
  Sparkles,
  Bookmark,
  BarChart3,
  Settings2,
  Paintbrush,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import PagesAndFeaturesControl from "./shopify-app/PagesAndFeaturesControl";
import ShopifyRightColumn from "./shopify-app/ShopifyRightColumn";
import ShopifyBottomStrip from "./shopify-app/ShopifyBottomStrip";
import StoreDesignsManager from "./shopify-app/StoreDesignsManager";

type ContentView = 'store-designs' | null;

export default function AdminShopifyApp() {
  const [activeTab, setActiveTab] = useState("pages");
  // Used to navigate from Pages & Features "Manage Content" action
  const [contentView, setContentView] = useState<ContentView>(null);

  const tabs = [
    { id: "pages",         label: "Pages & Features",  icon: LayoutTemplate  },
    { id: "overview",      label: "Overview",           icon: LayoutDashboard },
    { id: "users",         label: "Users",              icon: Users           },
    { id: "subscriptions", label: "Subscriptions",      icon: CreditCard      },
    { id: "content",       label: "Content Library",    icon: Library         },
    { id: "ai",            label: "AI Copy Studio",     icon: Sparkles        },
    { id: "saved",         label: "Saved Items",        icon: Bookmark        },
    { id: "analytics",     label: "Analytics",          icon: BarChart3       },
    { id: "settings",      label: "Settings",           icon: Settings2       },
  ];

  const handleManageContent = (pageKey: string) => {
    if (pageKey === 'store-designs') {
      setActiveTab('content');
      setContentView('store-designs');
    }
  };

  const renderContentLibrary = () => {
    if (contentView === 'store-designs') {
      return <StoreDesignsManager />;
    }
    // Default content library landing
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Content Library</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage all dynamic content shown on the Shopify user dashboard.
          </p>
        </div>
        {/* Content type cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => setContentView('store-designs')}
            className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-colors text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 shrink-0 group-hover:bg-violet-100 transition-colors">
              <Paintbrush className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Store Designs</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Manage, publish, and configure store design templates
              </p>
            </div>
          </button>

          {/* Placeholder cards for future content types */}
          {[
            { label: "Winning Products", desc: "Curated winning product library", icon: "🏆" },
            { label: "Ad Library",       desc: "Winning ad creatives and hooks",  icon: "📢" },
            { label: "AI Prompts",       desc: "AI Copy Studio prompt templates", icon: "✨" },
          ].map(item => (
            <div
              key={item.label}
              className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card opacity-50 cursor-not-allowed"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground text-base shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                <span className="inline-block mt-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Coming soon
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case "pages":
        return (
          <>
            <PagesAndFeaturesControl onManageContent={handleManageContent} />
            <ShopifyBottomStrip />
          </>
        );
      case "content":
        return renderContentLibrary();
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

  return (
    <div className="flex h-full flex-col bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Shopify App</h1>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-emerald-200 px-1.5 py-0 text-[10px]"
              >
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your Shopify dashboard pages, users, features, content and app settings.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-9 text-xs font-medium bg-card">
            <Download className="mr-2 h-3.5 w-3.5" /> Export Report
          </Button>
          <Button className="h-9 text-xs font-medium">
            <Settings className="mr-2 h-3.5 w-3.5" /> Shopify App Settings
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
                {/* Breadcrumb for store-designs sub-view */}
                {tab.id === 'content' && activeTab === 'content' && contentView === 'store-designs' && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                    / Store Designs
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
            <ShopifyRightColumn />
          </div>
        </div>
      </div>
    </div>
  );
}
