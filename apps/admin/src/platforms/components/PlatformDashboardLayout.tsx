import React from "react";
import { useNavigate, useParams } from "react-router-dom";
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

  return (
    <div className="flex h-full flex-col bg-muted/20">
      {/* Tabs Selector */}
      <div className="px-6 border-b border-border bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-12 w-full justify-start rounded-none border-b-0 bg-transparent p-0 gap-6 overflow-x-auto hide-scrollbar">
            {platform.tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-3 font-medium text-muted-foreground shadow-none transition-none",
                  platform.id === 'ebay' 
                    ? "data-[state=active]:border-[#3ecf8e] data-[state=active]:text-[#171717]" 
                    : "data-[state=active]:border-primary data-[state=active]:text-foreground"
                )}
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
