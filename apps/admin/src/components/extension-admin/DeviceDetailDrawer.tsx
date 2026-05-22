import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { toast } from "sonner";
import { ShieldAlert, Laptop, Activity, Key, Loader2, StopCircle } from "lucide-react";
import { supabase } from "@repo/api-client/supabase/client";

interface DeviceDetailDrawerProps {
  deviceId: string | null;
  onClose: () => void;
  onRevoked: () => void;
}

export function DeviceDetailDrawer({ deviceId, onClose, onRevoked }: DeviceDetailDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // Fetch device details when drawer opens
  const fetchDetails = async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const { data: resData, error } = await supabase.functions.invoke("extension-admin-device-detail", {
        body: { deviceId },
      });
      if (error) throw error;
      if (resData.success) {
        setData(resData.data);
      } else {
        throw new Error(resData.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch device details");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when deviceId changes
  if (deviceId && !data && !loading) {
    fetchDetails();
  }

  const handleRevoke = async () => {
    if (!deviceId || !confirm("Are you sure you want to revoke this device? This will log out the user immediately.")) return;
    setRevoking(true);
    try {
      const { data: resData, error } = await supabase.functions.invoke("extension-device-revoke", {
        body: { deviceId, reason: "admin_revoked" },
      });
      if (error) throw error;
      if (resData.success) {
        toast.success("Device revoked successfully");
        onRevoked();
        onClose();
      } else {
        throw new Error(resData.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke device");
    } finally {
      setRevoking(false);
    }
  };

  const device = data?.device;
  const sessions = data?.sessions || [];
  const activityLogs = data?.activityLogs || [];
  const auditLogs = data?.auditLogs || [];

  return (
    <Sheet open={!!deviceId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Laptop className="h-5 w-5" />
            Device Details
          </SheetTitle>
          <SheetDescription>
            {deviceId}
          </SheetDescription>
        </SheetHeader>

        {loading || !device ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="py-4 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">{device.userEmail}</h3>
                <p className="text-sm text-muted-foreground">Workspace: {device.workspaceName}</p>
              </div>
              <div className="flex gap-2">
                {device.status === "active" && (
                  <Button variant="destructive" size="sm" onClick={handleRevoke} disabled={revoking}>
                    {revoking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <StopCircle className="h-4 w-4 mr-2" />}
                    Revoke Device
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <div>
                  <Badge variant={device.status === "active" ? "default" : "secondary"}>
                    {device.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Version</span>
                <p className="text-sm font-medium">{device.extensionVersion || "Unknown"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Created</span>
                <p className="text-sm font-medium">{format(new Date(device.createdAt), "MMM d, yyyy")}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Last Seen</span>
                <p className="text-sm font-medium">{device.lastSeenAt ? format(new Date(device.lastSeenAt), "MMM d, HH:mm") : "Never"}</p>
              </div>
            </div>

            <Tabs defaultValue="sessions" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start border-b rounded-none pb-0 h-auto bg-transparent">
                <TabsTrigger value="sessions" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Sessions ({sessions.length})
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Activity Logs ({activityLogs.length})
                </TabsTrigger>
                <TabsTrigger value="audit" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Audit ({auditLogs.length})
                </TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1 py-4">
                <TabsContent value="sessions" className="mt-0 space-y-4">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No sessions found.</p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((s: any) => (
                        <div key={s.id} className="p-3 rounded-lg border text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium flex items-center gap-2">
                              <Key className="h-4 w-4" />
                              {s.id.slice(0, 8)}...
                            </span>
                            <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                          </div>
                          <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                            <div>Created: {format(new Date(s.created_at), "MMM d, HH:mm")}</div>
                            <div>Last Seen: {s.last_seen_at ? format(new Date(s.last_seen_at), "MMM d, HH:mm") : "Never"}</div>
                            <div>IP: {s.ip_address || "N/A"}</div>
                            {s.revoked_at && <div className="text-red-500">Revoked: {format(new Date(s.revoked_at), "MMM d, HH:mm")}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="mt-0 space-y-4">
                  {activityLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                  ) : (
                    <div className="space-y-3">
                      {activityLogs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border text-sm">
                          <Activity className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{log.event_type}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "MMM d, HH:mm")}</span>
                            </div>
                            <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="audit" className="mt-0 space-y-4">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No audit logs found.</p>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border text-sm bg-muted/50">
                          <ShieldAlert className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{log.action}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), "MMM d, HH:mm")}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">By: {log.actorEmail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
