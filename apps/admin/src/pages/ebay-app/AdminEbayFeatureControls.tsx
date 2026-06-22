import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/ui/table";
import { Switch } from "@repo/ui/components/ui/switch";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2, Sparkles, User, Settings2, AlertTriangle, Search } from "lucide-react";
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
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Feature Controls</h2>
        <p className="text-sm text-muted-foreground">Manage global feature flags and granular per-user overrides.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Global Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-blue-500" />
              Global Access Rules
            </CardTitle>
            <CardDescription>Default features enabled for all users.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGlobal ? (
              <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature Key</TableHead>
                    <TableHead className="w-[200px]">Reason for Change</TableHead>
                    <TableHead className="text-right">Global Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalFeatures?.map((f: any) => (
                    <TableRow key={f.feature_key}>
                      <TableCell className="font-medium text-sm">{f.feature_key}</TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Why..." 
                          className="h-8 text-xs" 
                          value={reasonMap[f.feature_key] || ""}
                          onChange={(e) => setReasonMap(p => ({...p, [f.feature_key]: e.target.value}))}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-500" />
              User-Specific Overrides
            </CardTitle>
            <CardDescription>Force enable or disable a feature for a specific user ID.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter exact User UUID to manage overrides..."
                className="pl-9"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              />
            </div>

            {debouncedUserId.length > 5 && !isValidUUID(debouncedUserId) && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200">
                Invalid UUID format. Please paste a valid 36-character User ID.
              </div>
            )}

            {isValidUUID(debouncedUserId) ? (
              isLoadingOverrides || isLoadingGlobal ? (
                <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="rounded border bg-muted/20">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead>Effective Access</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Override</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalFeatures?.map((gf: any) => {
                        const override = userOverrides?.find((uo: any) => uo.feature_key === gf.feature_key);
                        const effectiveEnabled = override ? override.is_enabled : gf.is_enabled;
                        const reasonKey = `user_${gf.feature_key}`;

                        return (
                          <TableRow key={`user_${gf.feature_key}`}>
                            <TableCell className="font-medium text-xs">{gf.feature_key}</TableCell>
                            <TableCell>
                              <Badge variant={effectiveEnabled ? 'default' : 'secondary'} className="mr-2">
                                {effectiveEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                              {override && (
                                <Badge variant="outline" className="text-[10px] h-5 border-emerald-200 text-emerald-600 bg-emerald-50">
                                  User Override
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input 
                                placeholder="Why..." 
                                className="h-7 text-[10px]" 
                                value={reasonMap[reasonKey] || ""}
                                onChange={(e) => setReasonMap(p => ({...p, [reasonKey]: e.target.value}))}
                              />
                            </TableCell>
                            <TableCell className="text-right space-x-2 whitespace-nowrap">
                              {!override ? (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUserToggle(gf.feature_key, true)}>
                                    Force On
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleUserToggle(gf.feature_key, false)}>
                                    Force Off
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleUserToggle(gf.feature_key, false, true)}>
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
              <EmptyState
                icon={AlertTriangle}
                title="No user selected"
                description="Search for a User UUID to view or apply specific feature overrides."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
