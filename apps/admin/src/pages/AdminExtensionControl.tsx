import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { ShieldCheck, Laptop, Settings2, Activity, Settings } from "lucide-react";
import { DeviceListTable } from "../components/extension-admin/DeviceListTable";
import { FeatureFlagsPanel } from "../components/extension-admin/FeatureFlagsPanel";
import { PageHeader } from "@/modules/admin/components/PageHeader";

export default function AdminExtensionControl() {
  const [activeTab, setActiveTab] = useState("devices");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Extension Control Plane"
        description="Monitor sessions, manage feature flags, and debug extension connections"
      />

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
