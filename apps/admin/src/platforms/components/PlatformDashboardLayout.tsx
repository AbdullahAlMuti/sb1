import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Download, Settings } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { cn } from "@repo/ui/lib/utils";
import { PlatformDefinition } from "../types";

interface PlatformDashboardLayoutProps {
  platform: PlatformDefinition;
}

export function PlatformDashboardLayout({ platform }: PlatformDashboardLayoutProps) {
  const navigate = useNavigate();
  const params = useParams();
  const defaultTab = platform.tabs[0]?.id || "overview";

  // The tab lives in the URL splat (/<platform>-app/<tab>) so it is deep-linkable
  // and survives refresh / back-forward.
  const urlTab = (params["*"] || "").split("/")[0];
  const activeTab = platform.tabs.some((t) => t.id === urlTab) ? urlTab : defaultTab;
  const setActiveTab = (id: string) => navigate(`/${platform.id}-app/${id}`);

  const activeTabConfig = platform.tabs.find((t) => t.id === activeTab);
  const ActiveComponent = activeTabConfig?.component || (() => null);
  const PlatformIcon = platform.icon;

  return (
    <div className="flex h-full flex-col bg-muted/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg border", platform.colorTheme.iconBg, platform.colorTheme.iconText, platform.colorTheme.iconBorder)}>
            <PlatformIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{platform.name} App</h1>
              <Badge
                variant="outline"
                className={cn("px-1.5 py-0 text-[10px] hover:bg-transparent", platform.colorTheme.badgeBg, platform.colorTheme.badgeText, platform.colorTheme.badgeBorder)}
              >
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your {platform.name} integration, global sync settings, curated content, and extension health.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-9 text-xs font-medium bg-card">
            <Download className="mr-2 h-3.5 w-3.5" /> Export Report
          </Button>
          <Button className={cn("h-9 text-xs font-medium text-white border-transparent", platform.colorTheme.primaryButton)}>
            <Settings className="mr-2 h-3.5 w-3.5" /> {platform.name} App Settings
          </Button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="px-6 border-b border-border bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-12 w-full justify-start rounded-none border-b-0 bg-transparent p-0 gap-6 overflow-x-auto hide-scrollbar">
            {platform.tabs.map((tab) => (
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

      {/* Main Content & Sidebar Grid */}
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 items-start w-full max-w-none">
          {/* Left / Main Column */}
          <div className={cn("space-y-6 w-full min-w-0", platform.rightColumnComponent ? "lg:col-span-2 xl:col-span-3" : "lg:col-span-3 xl:col-span-4")}>
            <ActiveComponent />
          </div>

          {/* Right Sidebar Column */}
          {platform.rightColumnComponent && (
            <div className="xl:col-span-1 w-full">
              {React.createElement(platform.rightColumnComponent)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
