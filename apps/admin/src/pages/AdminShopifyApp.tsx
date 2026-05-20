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
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import PagesAndFeaturesControl from "./shopify-app/PagesAndFeaturesControl";
import ShopifyRightColumn from "./shopify-app/ShopifyRightColumn";
import ShopifyBottomStrip from "./shopify-app/ShopifyBottomStrip";

export default function AdminShopifyApp() {
  const [activeTab, setActiveTab] = useState("pages");

  const tabs = [
    { id: "pages", label: "Pages & Features", icon: LayoutTemplate },
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { id: "content", label: "Content Library", icon: Library },
    { id: "ai", label: "AI Copy Studio", icon: Sparkles },
    { id: "saved", label: "Saved Items", icon: Bookmark },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

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

      {/* Tabs List */}
      <div className="px-6 border-b border-border bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-12 w-full justify-start rounded-none border-b-0 bg-transparent p-0 gap-6 overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-3 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content Area Grid */}
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 items-start w-full max-w-none">
          {/* Left Col - Main Content */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-6 w-full min-w-0">
            {activeTab === "pages" ? (
              <>
                <PagesAndFeaturesControl />
                <ShopifyBottomStrip />
              </>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
                <p className="text-sm text-muted-foreground">
                  {tabs.find((t) => t.id === activeTab)?.label} configuration coming soon.
                </p>
              </div>
            )}
          </div>

          {/* Right Col - 1/4 */}
          <div className="xl:col-span-1">
            <ShopifyRightColumn />
          </div>
        </div>
      </div>
    </div>
  );
}
