import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { ShieldCheck, Laptop, Settings2, Activity, Settings } from "lucide-react";
import { DeviceListTable } from "../components/extension-admin/DeviceListTable";
import { FeatureFlagsPanel } from "../components/extension-admin/FeatureFlagsPanel";

export default function AdminExtensionControl() {
  const [activeTab, setActiveTab] = useState("devices");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Extension Control Plane</h1>
          <p className="text-muted-foreground">Monitor sessions, manage feature flags, and debug extension connections</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="devices" className="gap-2">
            <Laptop className="h-4 w-4" />
            Devices & Sessions
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2" disabled>
            <Activity className="h-4 w-4" />
            Logs & Errors
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2" disabled>
            <Settings className="h-4 w-4" />
            Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="mt-0 space-y-4">
          <DeviceListTable />
        </TabsContent>

        <TabsContent value="flags" className="mt-0 space-y-4">
          <FeatureFlagsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
