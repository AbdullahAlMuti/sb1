import React, { useState } from "react";
import { Button } from "@repo/ui/components/ui/button";
import { ArrowLeft, User, Mail, CreditCard, Activity, Box, ShoppingCart, RefreshCcw, Shield, AlertCircle, Copy, CheckCircle2, XCircle, Info, Coins } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { toast } from "sonner";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { CreditAdjustmentModal } from "./CreditAdjustmentModal";
import { AdminActionsPanel } from "./AdminActionsPanel";

/* ─── Supabase Design Tokens ─── */
const sb = {
  primary: "#3ecf8e",
  primaryDeep: "#24b47e",
  ink: "#171717",
  inkMute: "#707070",
  inkFaint: "#b2b2b2",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  canvasNight: "#1c1c1c",
  hairline: "#dfdfdf",
  hairlineCool: "#ededed",
  onPrimary: "#171717",
  onDark: "#ffffff",
} as const;

interface AdminEbayUserDetailProps {
  userId: string;
  onBack: () => void;
}

export default function AdminEbayUserDetail({ userId, onBack }: AdminEbayUserDetailProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['ebay-admin-user-profile', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_ebay_user_dashboard_stats_admin', {
        p_user_id: userId
      });

      if (error) throw error;
      return data || null;
    }
  });

  const { data: timeline, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['ebay-admin-user-timeline', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_ebay_user_support_timeline', {
        target_user_id: userId
      });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: globalFeatures } = useQuery({
    queryKey: ['ebay-admin-feature-controls-global'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_ebay_feature_controls_admin');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: userOverrides } = useQuery({
    queryKey: ['ebay-admin-feature-overrides', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_user_feature_overrides_admin', {
        p_user_id: userId
      });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: creditsData } = useQuery({
    queryKey: ['ebay-admin-credits-detail', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_user_credits_admin', {
        target_user_id: userId
      });
      if (error) throw error;
      return data || null;
    }
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['ebay-admin-user-audit', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('search_admin_audit_logs', {
        search_query: userId, // Search by target user ID
        action_filter: 'all',
        limit_val: 5
      });
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        <Button variant="ghost" onClick={onBack} className="mb-4" style={{ borderRadius: 6, color: sb.ink }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Button>
        <div className="h-32 w-full animate-pulse rounded-xl" style={{ background: sb.canvasSoft, border: `1px solid ${sb.hairline}` }} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-64 animate-pulse rounded-xl" style={{ background: sb.canvasSoft, border: `1px solid ${sb.hairline}` }} />
          <div className="h-64 animate-pulse rounded-xl" style={{ background: sb.canvasSoft, border: `1px solid ${sb.hairline}` }} />
          <div className="h-64 animate-pulse rounded-xl" style={{ background: sb.canvasSoft, border: `1px solid ${sb.hairline}` }} />
        </div>
      </div>
    );
  }

  const syncLogs = timeline?.filter((t: any) => t.event_type === 'sync_log') || [];
  const latestSyncLog = syncLogs[0];
  
  const isSyncDisabled = userOverrides?.find((uo: any) => uo.feature_key === 'ebay_sync')?.is_enabled === false ||
    (!userOverrides?.find((uo: any) => uo.feature_key === 'ebay_sync') && globalFeatures?.find((gf: any) => gf.feature_key === 'ebay_sync')?.is_enabled === false);

  const creditsRemaining = creditsData?.current_credits || profile?.credits || 0;
  const isLowCredits = creditsRemaining < 50;

  // Derive suggested action
  let suggestedAction = "No immediate action required.";
  let problemSummary = "System appears healthy.";
  let supportMessage = "Your eBay sync appears to be functioning normally.";
  let problemStatus = "healthy";

  if (isSyncDisabled) {
    problemSummary = "Sync is disabled via Feature Controls.";
    suggestedAction = "Enable sync in Feature Access or explain to the user why it is disabled.";
    supportMessage = "Your eBay sync is currently disabled. Please contact support if you think this is unexpected.";
    problemStatus = "warning";
  } else if (latestSyncLog && (latestSyncLog.description?.includes('error') || latestSyncLog.description?.includes('warning'))) {
    problemSummary = `Sync failing: ${latestSyncLog.description.split(':')[0]}`;
    problemStatus = "error";
    
    if (latestSyncLog.description.includes('ebay_session')) {
      suggestedAction = "Ask user to log into eBay Seller Hub, then request resync.";
      supportMessage = "Please open eBay Seller Hub in your browser and make sure you are logged in, then click Sync Now again.";
    } else if (latestSyncLog.description.includes('csrf_token')) {
      suggestedAction = "Ask user to refresh eBay session, then request resync.";
      supportMessage = "Please open eBay Seller Hub and refresh the page to clear a stale session, then click Sync Now again.";
    } else if (latestSyncLog.description.includes('csv_parser')) {
      suggestedAction = "Review parser error and latest CSV headers.";
      supportMessage = "We are investigating an issue with the eBay data format. We will update you shortly.";
    } else if (latestSyncLog.description.includes('backend_sync') || latestSyncLog.description.includes('database')) {
      suggestedAction = "Check backend logs and retry sync.";
      supportMessage = "We experienced a temporary server error. We've initiated a fresh sync for your account.";
    } else if (latestSyncLog.description.includes('extension_dependency')) {
      suggestedAction = "Ask user to re-login to the extension.";
      supportMessage = "Please open the extension popup and ensure you are fully logged in, then click Sync Now.";
    } else {
      suggestedAction = "Investigate error category and request resync if transient.";
      supportMessage = "We noticed an issue with your latest sync. Please try clicking Sync Now from the extension.";
    }
  } else if (isLowCredits) {
    problemSummary = "User has low credits.";
    suggestedAction = "Review credits and adjust if appropriate.";
    supportMessage = "It looks like you are running low on credits. Please consider upgrading your plan or contact us for assistance.";
    problemStatus = "warning";
  }

  const handleCopySupportMessage = () => {
    navigator.clipboard.writeText(supportMessage);
    toast.success("Support message copied to clipboard");
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} style={{ borderRadius: 6, color: sb.ink }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.42, color: sb.ink }} className="tracking-tight">{profile?.full_name || 'Unknown User'}</h2>
            <p style={{ fontSize: 13, color: sb.inkMute }}>{profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile?.is_active ? (
            <Badge style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6 }}>
              active
            </Badge>
          ) : (
            <Badge variant="secondary" style={{ borderRadius: 6 }}>
              suspended
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Problem Summary & Actions */}
        <Card
          style={{
            background: sb.canvas,
            border: `1px solid ${sb.hairline}`,
            borderLeft: `4px solid ${problemStatus === 'error' ? '#ff2201' : problemStatus === 'warning' ? '#ffdb13' : sb.primary}`,
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              {problemStatus === 'error' ? <XCircle className="h-4 w-4 text-red-500" /> : problemStatus === 'warning' ? <AlertCircle className="h-4 w-4 text-yellow-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              Problem Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div style={{ fontWeight: 600, color: sb.ink }}>{problemSummary}</div>
            
            <div className="space-y-1 mt-4">
              <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="uppercase tracking-wider">Suggested Admin Action</span>
              <p style={{ background: sb.canvasSoft, border: `1px solid ${sb.hairlineCool}`, borderRadius: 6 }} className="p-3 text-slate-700 font-medium">{suggestedAction}</p>
            </div>

            <div className="space-y-1 mt-4">
              <span style={{ fontSize: 11, fontWeight: 600, color: sb.inkMute }} className="uppercase tracking-wider">One-Click Support Message</span>
              <div className="flex gap-2 items-start mt-1">
                <p style={{ background: sb.canvasSoft, border: `1px solid ${sb.hairlineCool}`, borderRadius: 6 }} className="flex-1 p-3 text-slate-700 italic text-xs">{supportMessage}</p>
                <Button variant="outline" size="icon" onClick={handleCopySupportMessage} title="Copy Message" style={{ borderRadius: 6, borderColor: sb.hairline }}>
                  <Copy className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Account Snapshot */}
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <User style={{ width: 16, height: 16, color: sb.primary }} />
              Account Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span style={{ color: sb.inkMute }} className="flex items-center gap-2"><Mail className="h-3 w-3"/> Email</span>
              <span style={{ color: sb.ink, fontWeight: 500 }} className="truncate max-w-[150px]">{profile?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: sb.inkMute }} className="flex items-center gap-2"><CreditCard className="h-3 w-3"/> Credits</span>
              <span style={{ color: sb.ink, fontWeight: 500 }}>{profile?.credits || 0} remaining</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: sb.inkMute }} className="flex items-center gap-2"><Activity className="h-3 w-3"/> Member Since</span>
              <span style={{ color: sb.ink, fontWeight: 500 }}>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: sb.inkMute }} className="flex items-center gap-2"><Box className="h-3 w-3"/> Modules</span>
              <span style={{ color: sb.primaryDeep, fontWeight: 500 }}>All Enabled</span>
            </div>
          </CardContent>
        </Card>

        {/* eBay Sync Snapshot */}
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <RefreshCcw style={{ width: 16, height: 16, color: sb.primary }} />
              eBay Sync Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span style={{ color: sb.inkMute }}>Total Orders</span>
              <span style={{ color: sb.ink, fontWeight: 600 }}>{profile?.total_orders?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: sb.inkMute }}>Active Listings</span>
              <span style={{ color: sb.primaryDeep, fontWeight: 600 }}>{profile?.active_listings?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: sb.inkMute }}>Sync Config</span>
              <Badge variant={profile?.is_sync_enabled ? 'default' : 'secondary'} style={{ borderRadius: 6 }}>
                {profile?.is_sync_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: sb.inkMute }}>Last Sync Status</span>
              <span className="font-semibold text-xs capitalize" style={{ color: profile?.sync_status === 'success' ? sb.primaryDeep : profile?.sync_status === 'error' ? '#ff2201' : '#ffdb13' }}>
                {profile?.sync_status || 'pending'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Credit Snapshot */}
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <Coins style={{ width: 16, height: 16, color: "#ffdb13" }} />
              Credits & Usage
            </CardTitle>
            <CreditAdjustmentModal 
              userId={userId} 
              currentBalance={creditsData?.current_credits || profile?.credits || 0}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p style={{ fontSize: 11, color: sb.inkMute }} className="uppercase tracking-wider">Current Balance</p>
                <div className="flex items-center gap-2">
                  <p style={{ fontSize: 24, fontWeight: 600, color: sb.ink, margin: 0 }}>{creditsData?.current_credits || profile?.credits || 0}</p>
                  <Badge variant="outline" className="h-5 text-[10px]" style={{ borderRadius: 6 }}>{creditsData?.total_used || 0} Used</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p style={{ fontSize: 11, color: sb.inkMute }} className="uppercase tracking-wider">Total Adjustments</p>
                <p style={{ fontSize: 20, fontWeight: 600, color: sb.inkMute, margin: 0 }}>{creditsData?.total_adjusted || 0}</p>
              </div>
            </div>

            {creditsData?.recent_transactions?.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border mt-4">
                <div className="font-semibold text-[11px] uppercase tracking-wider" style={{ color: sb.inkMute }}>Recent Transactions</div>
                {creditsData.recent_transactions.slice(0, 3).map((tx: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs py-1">
                    <span className="capitalize" style={{ color: sb.ink }}>{tx.transaction_type}</span>
                    <span className="font-mono font-medium" style={{ color: tx.amount > 0 ? sb.primaryDeep : '#ff2201' }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Access Summary */}
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <Box style={{ width: 16, height: 16, color: "#644fc1" }} />
              Feature Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="font-semibold text-[11px] uppercase tracking-wider mb-2" style={{ color: sb.inkMute }}>Effective Access</div>
              {globalFeatures?.map((gf: any) => {
                const override = userOverrides?.find((uo: any) => uo.feature_key === gf.feature_key);
                const effectiveEnabled = override ? override.is_enabled : gf.is_enabled;
                 
                return (
                  <div key={gf.feature_key} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                    <span style={{ fontSize: 13, color: sb.ink }}>{gf.feature_key.replace('ebay_', '').replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      {override && (
                        <Badge variant="outline" className="text-[9px] h-4 border-emerald-200 text-emerald-600 bg-emerald-50 px-1" style={{ borderRadius: 6 }}>
                          Override
                        </Badge>
                      )}
                      <Badge variant={effectiveEnabled ? 'default' : 'secondary'} className="text-[10px] h-4 px-1" style={{ borderRadius: 6 }}>
                        {effectiveEnabled ? 'On' : 'Off'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Diagnostics & Support Timeline */}
        <Card className="border-orange-200 bg-orange-50/10" style={{ borderRadius: 12 }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700" style={{ fontWeight: 500 }}>
              <AlertCircle className="h-4 w-4" />
              Support Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingTimeline ? (
              <Skeleton className="h-24 w-full rounded" />
            ) : timeline?.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No support events or sync logs found.
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-orange-200 before:to-transparent">
                {timeline?.map((event: any, i: number) => {
                  const isError = event.description?.toLowerCase().includes('error');
                  const isSuccess = event.description?.toLowerCase().includes('success');
                  const isWarning = event.description?.toLowerCase().includes('warning');
                  
                  const dotBg = isError ? 'bg-red-200 text-red-600' : isSuccess ? 'bg-emerald-200 text-emerald-600' : isWarning ? 'bg-yellow-200 text-yellow-600' : 'bg-slate-200 text-slate-600';
                  const dotInner = isError ? 'bg-red-600' : isSuccess ? 'bg-[#3ecf8e]' : isWarning ? 'bg-yellow-600' : 'bg-slate-600';
                  const borderCol = isError ? 'border-red-100' : isSuccess ? 'border-emerald-100' : isWarning ? 'border-yellow-100' : 'border-slate-100';

                  return (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-5 h-5 rounded-full border border-white ${dotBg} shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-[3px] md:mx-auto`}>
                        <div className={`w-1.5 h-1.5 ${dotInner} rounded-full`}></div>
                      </div>
                      <div className={`w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border ${borderCol} bg-white shadow-sm`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs capitalize flex items-center gap-1" style={{ color: sb.ink }}>
                            {event.event_type.replace('_', ' ')}
                            {isError && <Badge variant="destructive" className="h-4 text-[9px] px-1 ml-1" style={{ borderRadius: 6 }}>Failed</Badge>}
                            {isSuccess && <Badge variant="outline" className="h-4 text-[9px] px-1 ml-1 border-emerald-200 text-emerald-600 bg-emerald-50" style={{ borderRadius: 6 }}>Success</Badge>}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{new Date(event.event_date).toLocaleString()}</span>
                        </div>
                        <p className={`text-xs leading-snug ${isError ? 'text-red-700 font-medium' : 'text-slate-500'}`}>
                          {event.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced Admin Actions */}
        <AdminActionsPanel userId={userId} />

        {/* Recent Admin Actions */}
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: sb.ink, fontWeight: 500 }}>
              <AlertCircle className="h-4 w-4 text-slate-500" />
              Recent Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!auditLogs || auditLogs.length === 0) ? (
              <div className="text-center py-4 text-xs text-muted-foreground">No recent admin actions recorded.</div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log: any) => (
                  <div key={log.log_id} className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 last:pb-0" style={{ borderColor: sb.hairlineCool }}>
                    <div className="flex justify-between items-start">
                      <span style={{ fontSize: 13, fontWeight: 500, color: sb.ink }} className="capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className="text-xs truncate" style={{ color: sb.inkMute }} title={log.reason}>{log.reason}</span>
                    <span className="text-[10px] text-muted-foreground">By: {log.admin_email || log.admin_id}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
