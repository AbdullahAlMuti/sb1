import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Switch } from "@repo/ui/components/ui/switch";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2, Sparkles, User, Settings2, AlertTriangle, Search, ToggleLeft, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { EmptyState } from "@/modules/admin/components/EmptyState";
import {
  getGlobalFeatureControls,
  getUserFeatureOverrides,
  updateGlobalFeatureControl,
  updateUserFeatureOverride,
  removeUserFeatureOverride,
} from "@/modules/ebay/services/feature-flags.service";

export default function FeatureControlsTab() {
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
    queryFn: getGlobalFeatureControls,
  });

  // Fetch User Overrides
  const { data: userOverrides, isLoading: isLoadingOverrides } = useQuery({
    queryKey: ['ebay-admin-feature-overrides', debouncedUserId],
    enabled: isValidUUID(debouncedUserId),
    queryFn: () => getUserFeatureOverrides(debouncedUserId),
  });

  // Global Mutation
  const updateGlobalMutation = useMutation({
    mutationFn: async ({ featureKey, enabled, reason }: { featureKey: string, enabled: boolean, reason: string }) => {
      if (!reason) throw new Error("A reason is required to change global features.");
      await updateGlobalFeatureControl({ featureKey, enabled, reason });
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

      if (remove) {
        await removeUserFeatureOverride({ userId: debouncedUserId, featureKey, reason });
      } else {
        await updateUserFeatureOverride({ userId: debouncedUserId, featureKey, enabled, reason });
      }
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
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-bold tracking-tight text-foreground/90">
          Feature Controls
        </h2>
        <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
          Configure default access policies globally or apply precise feature flag overrides for individual users.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Global Controls */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/45 backdrop-blur-md p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-border/40 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border text-blue-500 bg-blue-500/10 border-blue-500/20">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground/90">Global Access Rules</h3>
              <p className="text-[10px] text-muted-foreground">Default features enabled for all active users.</p>
            </div>
          </div>

          {isLoadingGlobal ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-muted-foreground">Feature Key</TableHead>
                  <TableHead className="w-[180px] text-xs font-bold text-muted-foreground">Reason for Change</TableHead>
                  <TableHead className="text-right text-xs font-bold text-muted-foreground">Global Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {globalFeatures?.map((f: any) => (
                  <TableRow key={f.feature_key} className="hover:bg-muted/10 transition-colors duration-200">
                    <TableCell className="font-semibold text-xs py-3">{f.feature_key}</TableCell>
                    <TableCell className="py-3">
                      <Input 
                        placeholder="Why is this changing..." 
                        className="h-8 text-[10px] bg-card border-border/80 rounded-lg" 
                        value={reasonMap[f.feature_key] || ""}
                        onChange={(e) => setReasonMap(p => ({...p, [f.feature_key]: e.target.value}))}
                      />
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Switch 
                          checked={f.is_enabled}
                          onCheckedChange={() => handleGlobalToggle(f.feature_key, f.is_enabled)}
                          disabled={updateGlobalMutation.isPending}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Per-User Overrides */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/45 backdrop-blur-md p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-border/40">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground/90">User-Specific Overrides</h3>
              <p className="text-[10px] text-muted-foreground">Force enable or disable features for a specific user ID.</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Paste exact User UUID to lookup overrides..."
              className="pl-9.5 h-10 bg-card border-border/80 text-xs focus-visible:ring-blue-600 transition-all duration-300"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            />
          </div>

          {debouncedUserId.length > 5 && !isValidUUID(debouncedUserId) && (
            <div className="p-3 bg-rose-500/10 text-rose-600 text-xs font-semibold rounded-xl border border-rose-500/20">
              ⚠️ Invalid UUID format. Please paste a valid 36-character User ID.
            </div>
          )}

          {isValidUUID(debouncedUserId) ? (
            isLoadingOverrides || isLoadingGlobal ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
            ) : (
              <div className="rounded-xl border border-border/50 bg-card/20 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/15">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-bold text-muted-foreground">Feature</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Access State</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground">Reason</TableHead>
                      <TableHead className="text-right text-xs font-bold text-muted-foreground">Override Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalFeatures?.map((gf: any) => {
                      const override = userOverrides?.find((uo: any) => uo.feature_key === gf.feature_key);
                      const effectiveEnabled = override ? override.is_enabled : gf.is_enabled;
                      const reasonKey = `user_${gf.feature_key}`;

                      return (
                        <TableRow key={`user_${gf.feature_key}`} className="hover:bg-muted/10 transition-colors duration-200">
                          <TableCell className="font-semibold text-xs py-3">{gf.feature_key}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant={effectiveEnabled ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0.5">
                                {effectiveEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                              {override && (
                                <Badge variant="outline" className="text-[8px] h-4 border-emerald-500/20 text-emerald-600 bg-emerald-500/10 font-bold uppercase tracking-wider">
                                  User Specific
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Input 
                              placeholder="Reason..." 
                              className="h-8 text-[9px] bg-card border-border/80 rounded-lg min-w-[100px]" 
                              value={reasonMap[reasonKey] || ""}
                              onChange={(e) => setReasonMap(p => ({...p, [reasonKey]: e.target.value}))}
                            />
                          </TableCell>
                          <TableCell className="text-right py-3 space-x-1.5 whitespace-nowrap">
                            {!override ? (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border-emerald-500/20 text-emerald-600 transition-all duration-300" onClick={() => handleUserToggle(gf.feature_key, true)}>
                                  Enable
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500 hover:text-white border-rose-500/20 text-rose-600 transition-all duration-300" onClick={() => handleUserToggle(gf.feature_key, false)}>
                                  Disable
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-all duration-300" onClick={() => handleUserToggle(gf.feature_key, false, true)}>
                                Reset Policy
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
            <div className="flex flex-col items-center justify-center p-10 border border-dashed border-border/80 rounded-2xl text-center text-muted-foreground bg-card/20">
              <ToggleLeft className="h-10 w-10 mb-2 opacity-35" />
              <p className="text-xs font-semibold">Ready for User Override</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">Please lookup a valid user ID to change specific features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
