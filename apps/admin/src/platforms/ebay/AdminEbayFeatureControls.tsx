import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Switch } from "@repo/ui/components/ui/switch";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2, Sparkles, User, Settings2, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";

/* ─── Supabase Design Tokens ─── */
const sb = {
  primary: "#3ecf8e",
  primaryDeep: "#24b47e",
  ink: "#171717",
  inkMute: "#707070",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  hairline: "#dfdfdf",
  hairlineCool: "#ededed",
  onPrimary: "#171717",
} as const;

export default function AdminEbayFeatureControls() {
  const queryClient = useQueryClient();
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const [selectedUserId, setSelectedUserId] = useState("");
  const [debouncedUserId, setDebouncedUserId] = useState("");

  const isValidUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUserId(selectedUserId);
    }, 500);
    return () => clearTimeout(handler);
  }, [selectedUserId]);

  // Fetch Global Controls
  const { data: globalFeatures, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ['ebay-admin-feature-controls-global'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_ebay_feature_controls_admin');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch User Overrides
  const { data: userOverrides, isLoading: isLoadingOverrides } = useQuery({
    queryKey: ['ebay-admin-feature-overrides', debouncedUserId],
    enabled: isValidUUID(debouncedUserId), 
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_user_feature_overrides_admin', {
        p_user_id: debouncedUserId
      });
      if (error) throw error;
      return data || [];
    }
  });

  // Global Mutation
  const updateGlobalMutation = useMutation({
    mutationFn: async ({ featureKey, enabled, reason }: { featureKey: string, enabled: boolean, reason: string }) => {
      if (!reason) throw new Error("A reason is required to change global features.");
      const { error } = await (supabase as any).rpc('update_ebay_global_feature_control', {
        p_feature_key: featureKey,
        p_enabled: enabled,
        p_reason: reason
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Global feature updated");
      queryClient.invalidateQueries({ queryKey: ['ebay-admin-feature-controls-global'] });
      setReasonMap({}); // clear reasons
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update feature");
    }
  });

  // User Mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ featureKey, enabled, reason, remove }: { featureKey: string, enabled: boolean, reason: string, remove?: boolean }) => {
      if (!isValidUUID(debouncedUserId)) throw new Error("Invalid User UUID format.");
      if (!reason) throw new Error("A reason is required for user overrides.");
      
      let error;
      if (remove) {
         ({ error } = await (supabase as any).rpc('remove_user_feature_override', {
          p_user_id: debouncedUserId,
          p_feature_key: featureKey,
          p_reason: reason
        }));
      } else {
         ({ error } = await (supabase as any).rpc('update_user_feature_override', {
          p_user_id: debouncedUserId,
          p_feature_key: featureKey,
          p_enabled: enabled,
          p_reason: reason
        }));
      }
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User override updated");
      queryClient.invalidateQueries({ queryKey: ['ebay-admin-feature-overrides', debouncedUserId] });
      setReasonMap({});
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user override");
    }
  });

  const handleGlobalToggle = (featureKey: string, currentEnabled: boolean) => {
    const reason = reasonMap[featureKey];
    if (!reason) {
      toast.error("Please enter a reason for this global change.");
      return;
    }
    if (currentEnabled && ['ebay_sync', 'ebay_orders', 'ebay_dashboard'].includes(featureKey)) {
      if (!window.confirm(`WARNING: Disabling ${featureKey} globally will block access/syncing for all users immediately. Are you sure?`)) return;
    }
    updateGlobalMutation.mutate({ featureKey, enabled: !currentEnabled, reason });
  };

  const handleUserToggle = (featureKey: string, enabled: boolean, remove: boolean = false) => {
    if (!isValidUUID(debouncedUserId)) {
      toast.error("Invalid User UUID format.");
      return;
    }
    const reason = reasonMap[`user_${featureKey}`];
    if (!reason) {
      toast.error("Please enter a reason for this user override.");
      return;
    }
    updateUserMutation.mutate({ featureKey, enabled, reason, remove });
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.42, color: sb.ink }} className="tracking-tight">
          Feature Controls
        </h2>
        <p style={{ fontSize: 13, color: sb.inkMute, lineHeight: 1.45 }} className="mt-1">
          Manage global feature flags and granular per-user overrides.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Global Controls */}
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12, overflow: "hidden" }}>
          <CardHeader style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${sb.hairlineCool}` }}>
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <Settings2 style={{ width: 16, height: 16, color: sb.primary }} />
              Global Access Rules
            </CardTitle>
            <CardDescription style={{ fontSize: 12, color: sb.inkMute }}>Default features enabled for all users.</CardDescription>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {isLoadingGlobal ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader style={{ background: sb.canvasSoft }}>
                  <TableRow style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                    <TableHead style={{ color: sb.ink, fontWeight: 500 }}>Feature Key</TableHead>
                    <TableHead className="w-[200px]" style={{ color: sb.ink, fontWeight: 500 }}>Reason for Change</TableHead>
                    <TableHead className="text-right" style={{ color: sb.ink, fontWeight: 500 }}>Global Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalFeatures?.map((f: any) => (
                    <TableRow key={f.feature_key} style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                      <TableCell style={{ fontWeight: 500, fontSize: 13, color: sb.ink }}>{f.feature_key}</TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Why..." 
                          className="h-8 text-xs" 
                          value={reasonMap[f.feature_key] || ""}
                          onChange={(e) => setReasonMap(p => ({...p, [f.feature_key]: e.target.value}))}
                          style={{ borderRadius: 6, borderColor: sb.hairline }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Switch 
                            checked={f.is_enabled}
                            onCheckedChange={() => handleGlobalToggle(f.feature_key, f.is_enabled)}
                            disabled={updateGlobalMutation.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Per-User Overrides */}
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12, overflow: "hidden" }}>
          <CardHeader style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${sb.hairlineCool}` }}>
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <User style={{ width: 16, height: 16, color: sb.primary }} />
              User-Specific Overrides
            </CardTitle>
            <CardDescription style={{ fontSize: 12, color: sb.inkMute }}>Force enable or disable a feature for a specific user ID.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4" style={{ padding: "24px 28px" }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter exact User UUID to manage overrides..."
                className="pl-9"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ borderRadius: 6, borderColor: sb.hairline }}
              />
            </div>

            {debouncedUserId.length > 5 && !isValidUUID(debouncedUserId) && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200" style={{ borderRadius: 6 }}>
                Invalid UUID format. Please paste a valid 36-character User ID.
              </div>
            )}

            {isValidUUID(debouncedUserId) ? (
              isLoadingOverrides || isLoadingGlobal ? (
                <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div style={{
                  background: sb.canvas,
                  border: `1px solid ${sb.hairline}`,
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  <Table>
                    <TableHeader style={{ background: sb.canvasSoft }}>
                      <TableRow style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                        <TableHead style={{ color: sb.ink, fontWeight: 500 }}>Feature</TableHead>
                        <TableHead style={{ color: sb.ink, fontWeight: 500 }}>Effective Access</TableHead>
                        <TableHead style={{ color: sb.ink, fontWeight: 500 }}>Reason</TableHead>
                        <TableHead className="text-right" style={{ color: sb.ink, fontWeight: 500 }}>Override</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalFeatures?.map((gf: any) => {
                        const override = userOverrides?.find((uo: any) => uo.feature_key === gf.feature_key);
                        const effectiveEnabled = override ? override.is_enabled : gf.is_enabled;
                        const reasonKey = `user_${gf.feature_key}`;

                        return (
                          <TableRow key={`user_${gf.feature_key}`} style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                            <TableCell style={{ fontWeight: 500, fontSize: 12, color: sb.ink }}>{gf.feature_key}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 items-start">
                                <Badge variant={effectiveEnabled ? 'default' : 'secondary'} className="mr-2" style={{ borderRadius: 6 }}>
                                  {effectiveEnabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                                {override && (
                                  <Badge variant="outline" className="text-[10px] h-5 border-emerald-200 text-emerald-600 bg-emerald-50" style={{ borderRadius: 6 }}>
                                    User Override
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input 
                                placeholder="Why..." 
                                className="h-7 text-[10px]" 
                                value={reasonMap[reasonKey] || ""}
                                onChange={(e) => setReasonMap(p => ({...p, [reasonKey]: e.target.value}))}
                                style={{ borderRadius: 6, borderColor: sb.hairline }}
                              />
                            </TableCell>
                            <TableCell className="text-right space-x-2 whitespace-nowrap">
                              {!override ? (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUserToggle(gf.feature_key, true)} style={{ borderRadius: 6, borderColor: sb.hairline }}>
                                    Force On
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-650 hover:text-red-700" onClick={() => handleUserToggle(gf.feature_key, false)} style={{ borderRadius: 6, borderColor: sb.hairline }}>
                                    Force Off
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleUserToggle(gf.feature_key, false, true)} style={{ borderRadius: 6 }}>
                                  Remove Override
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded border-dashed bg-muted/10" style={{ borderRadius: 8 }}>
                <AlertTriangle className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Search for a User UUID to view or apply specific feature overrides.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
