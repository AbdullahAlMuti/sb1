import React, { useState } from "react";
import { Button } from "@repo/ui/components/ui/button";
import { ArrowLeft, User, Mail, CreditCard, Activity, Box, ShoppingCart, RefreshCcw, Shield, AlertCircle, Copy, CheckCircle2, XCircle, Info, Coins } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { CreditAdjustmentModal } from "./CreditAdjustmentModal";
import { ControlledDebugReveal } from "./ControlledDebugReveal";
import { AdminActionsPanel } from "./AdminActionsPanel";

interface AdminEbayUserDetailProps {
  userId: string;
  onBack: () => void;
}

export default function AdminEbayUserDetail({ userId, onBack }: AdminEbayUserDetailProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['ebay-admin-user-profile', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_ebay_user_admin_summary', {
        target_user_id: userId
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
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Button>
        <div className="h-32 w-full bg-slate-100 animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-100 animate-pulse rounded-xl" />
          <div className="h-64 bg-slate-100 animate-pulse rounded-xl" />
          <div className="h-64 bg-slate-100 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  const syncLogs = timeline?.filter((t: any) => t.event_type === 'sync_log') || [];
  const latestSyncLog = syncLogs[0];
  const lastSuccessSync = syncLogs.find((t: any) => t.description?.includes('success') || t.metadata?.status === 'success');
  const lastFailedSync = syncLogs.find((t: any) => t.description?.includes('error') || t.metadata?.status === 'error');
  
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{profile?.full_name || 'Unknown User'}</h2>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={profile?.account_status === 'active' ? 'default' : 'secondary'}>
            {profile?.account_status || 'active'}
          </Badge>
          <Button variant="outline" size="sm" className="gap-2 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700">
             <Shield className="h-4 w-4" /> 
             Admin Actions
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Problem Summary & Actions */}
        <Card className={`border-l-4 ${problemStatus === 'error' ? 'border-l-red-500 bg-red-50/20' : problemStatus === 'warning' ? 'border-l-yellow-500 bg-yellow-50/20' : 'border-l-emerald-500 bg-emerald-50/20'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {problemStatus === 'error' ? <XCircle className="h-4 w-4 text-red-500" /> : problemStatus === 'warning' ? <AlertCircle className="h-4 w-4 text-yellow-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              Problem Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="font-medium">{problemSummary}</div>
            
            <div className="space-y-1 mt-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Suggested Admin Action</span>
              <p className="text-slate-700 bg-white p-3 rounded border shadow-sm">{suggestedAction}</p>
            </div>

            <div className="space-y-1 mt-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">One-Click Support Message</span>
              <div className="flex gap-2 items-start mt-1">
                <p className="flex-1 text-slate-700 bg-white p-3 rounded border shadow-sm italic text-xs">{supportMessage}</p>
                <Button variant="outline" size="icon" onClick={handleCopySupportMessage} title="Copy Message">
                  <Copy className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Account Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Account Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3"/> Email</span>
              <span className="font-medium truncate max-w-[150px]">{profile?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><CreditCard className="h-3 w-3"/> Credits</span>
              <span className="font-medium">{profile?.credits || 0} remaining</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Activity className="h-3 w-3"/> Member Since</span>
              <span className="font-medium">{new Date(profile?.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Box className="h-3 w-3"/> Modules</span>
              <span className="font-medium text-emerald-600">All Enabled</span>
            </div>
          </CardContent>
        </Card>

        {/* eBay Sync Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-emerald-500" />
              eBay Sync Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">Total Orders</span>
              <span className="font-bold">{profile?.total_orders?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">Last 24h Orders</span>
              <span className="font-bold text-emerald-600">{profile?.orders_last_24h?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">Sync Status</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Enabled</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">Extension</span>
              <span className="font-medium text-emerald-600 text-xs">Connected</span>
            </div>
          </CardContent>
        </Card>

        {/* Credit Snapshot */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              Credits & Usage
            </CardTitle>
            <CreditAdjustmentModal 
              userId={userId} 
              currentBalance={creditsData?.current_credits || profile?.credits || 0}
              onSuccess={() => {
                // optionally toast or rely on query invalidate
              }}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{creditsData?.current_credits || profile?.credits || 0}</p>
                  <Badge variant="outline" className="h-5 text-[10px]">{creditsData?.total_used || 0} Used</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Adjustments</p>
                <p className="text-xl font-semibold text-muted-foreground">{creditsData?.total_adjusted || 0}</p>
              </div>
            </div>

            {creditsData?.recent_transactions?.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border mt-4">
                <div className="font-medium text-xs text-muted-foreground">Recent Transactions</div>
                {creditsData.recent_transactions.slice(0, 3).map((tx: any, i: number) => (
                   <div key={i} className="flex justify-between items-center text-xs py-1">
                     <span className="capitalize">{tx.transaction_type}</span>
                     <span className={`font-mono ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                       {tx.amount > 0 ? '+' : ''}{tx.amount}
                     </span>
                   </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Access Summary */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Box className="h-4 w-4 text-purple-500" />
              Feature Access
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
              // Note: Routing to Feature Controls tab is handled by parent,
              // for now we just show a toast or we could accept a callback.
              // toast.info("Navigate to the Feature Controls tab to manage this.");
            }}>
              Manage
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="font-medium text-xs text-muted-foreground mb-2">Effective Access</div>
              {globalFeatures?.map((gf: any) => {
                 const override = userOverrides?.find((uo: any) => uo.feature_key === gf.feature_key);
                 const effectiveEnabled = override ? override.is_enabled : gf.is_enabled;
                 
                 return (
                   <div key={gf.feature_key} className="flex justify-between items-center py-1 border-b border-border last:border-0">
                     <span className="text-xs">{gf.feature_key.replace('ebay_', '').replace(/_/g, ' ')}</span>
                     <div className="flex items-center gap-2">
                       {override && (
                         <Badge variant="outline" className="text-[9px] h-4 border-emerald-200 text-emerald-600 bg-emerald-50 px-1">
                           Override
                         </Badge>
                       )}
                       <Badge variant={effectiveEnabled ? 'default' : 'secondary'} className="text-[10px] h-4 px-1">
                         {effectiveEnabled ? 'On' : 'Off'}
                       </Badge>
                     </div>
                   </div>
                 );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Diagnostics & Support */}
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-4 w-4" />
              Support Timeline
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-orange-700 hover:text-orange-800 hover:bg-orange-100">
              Add Note
            </Button>
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
                   const dotInner = isError ? 'bg-red-600' : isSuccess ? 'bg-emerald-600' : isWarning ? 'bg-yellow-600' : 'bg-slate-600';
                   const borderCol = isError ? 'border-red-100' : isSuccess ? 'border-emerald-100' : isWarning ? 'border-yellow-100' : 'border-slate-100';

                   return (
                     <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                       <div className={`flex items-center justify-center w-5 h-5 rounded-full border border-white ${dotBg} shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-[3px] md:mx-auto`}>
                          <div className={`w-1.5 h-1.5 ${dotInner} rounded-full`}></div>
                       </div>
                       <div className={`w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border ${borderCol} bg-white shadow-sm`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs capitalize flex items-center gap-1">
                              {event.event_type.replace('_', ' ')}
                              {isError && <Badge variant="destructive" className="h-4 text-[9px] px-1 ml-1">Failed</Badge>}
                              {isSuccess && <Badge variant="outline" className="h-4 text-[9px] px-1 ml-1 border-emerald-200 text-emerald-600 bg-emerald-50">Success</Badge>}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{new Date(event.event_date).toLocaleString()}</span>
                          </div>
                          <p className={`text-xs leading-snug ${isError ? 'text-red-700 font-medium' : 'text-muted-foreground'}`}>
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

        {/* Sensitive Data Reveal */}
        <ControlledDebugReveal userId={userId} />

        {/* Advanced Admin Actions */}
        <AdminActionsPanel userId={userId} />

        {/* Recent Admin Actions */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-slate-500" />
              Recent Admin Actions
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
              // Usually would route to audit_logs tab, or pass a prop callback
              toast.info("View full Audit Logs in the global tab.");
            }}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!auditLogs || auditLogs.length === 0) ? (
              <div className="text-center py-4 text-xs text-muted-foreground">No recent admin actions recorded.</div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log: any) => (
                  <div key={log.log_id} className="flex flex-col gap-1 border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate" title={log.reason}>{log.reason}</span>
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
