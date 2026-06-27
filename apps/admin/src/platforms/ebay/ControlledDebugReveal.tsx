import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { toast } from 'sonner';
import { ShieldAlert, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ControlledDebugRevealProps {
  userId: string;
}

export function ControlledDebugReveal({ userId }: ControlledDebugRevealProps) {
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [revealedData, setRevealedData] = useState<any>(null);
  const queryClient = useQueryClient();

  const revealMutation = useMutation({
    mutationFn: async () => {
      if (!orderId.trim()) throw new Error("Order ID is required");
      if (!reason.trim()) throw new Error("A reason is required for audit logging");

      const { data, error } = await (supabase as any).rpc('get_sensitive_order_debug_data', {
        p_user_id: userId,
        p_order_id: orderId.trim(),
        p_reason: reason.trim()
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setRevealedData(data);
      toast.success("Sensitive data revealed. Event logged.");
      // Invalidate audit logs so the new event appears in the Recent Actions panel
      queryClient.invalidateQueries({ queryKey: ['ebay-admin-user-audit', userId] });
      queryClient.invalidateQueries({ queryKey: ['ebay-admin-audit-logs'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reveal data");
      setRevealedData(null);
    }
  });

  const handleClear = () => {
    setRevealedData(null);
    setOrderId('');
    setReason('');
  };

  return (
    <Card className="border-red-200 bg-red-50/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-red-700">
          <ShieldAlert className="h-4 w-4" />
          Controlled Debug Reveal
        </CardTitle>
        <CardDescription>
          Sensitive buyer data and raw sync payloads are hidden by default. Revealing this data requires a reason and is permanently recorded in the Audit Logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!revealedData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order-id">eBay Order ID or Internal ID</Label>
                <Input 
                  id="order-id" 
                  placeholder="e.g. 12-34567-89012" 
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reveal-reason">Reason (Required)</Label>
                <Input 
                  id="reveal-reason" 
                  placeholder="e.g. Investigating missing shipping address..." 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => revealMutation.mutate()}
              disabled={!orderId.trim() || !reason.trim() || revealMutation.isPending}
              className="w-full sm:w-auto gap-2"
            >
              {revealMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {revealMutation.isPending ? "Revealing..." : "Reveal Debug Data"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center bg-red-100 p-2 text-xs text-red-800 rounded border border-red-200 font-medium">
              <span>⚠️ Sensitive Data Exposed - Do not copy to unauthorized channels.</span>
              <Button variant="ghost" size="sm" className="h-6 text-red-800 hover:text-red-900 hover:bg-red-200" onClick={handleClear}>
                <EyeOff className="h-3 w-3 mr-1" /> Hide Data
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Buyer Details</h4>
                <div className="bg-white p-3 rounded border font-mono text-xs space-y-1">
                  <div><span className="text-muted-foreground w-16 inline-block">Name:</span> {revealedData.buyer?.name || 'N/A'}</div>
                  <div><span className="text-muted-foreground w-16 inline-block">User:</span> {revealedData.buyer?.username || 'N/A'}</div>
                  <div><span className="text-muted-foreground w-16 inline-block">Email:</span> {revealedData.buyer?.email || 'N/A'}</div>
                  <div><span className="text-muted-foreground w-16 inline-block">Zip:</span> {revealedData.buyer?.zip || 'N/A'}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Shipping Details</h4>
                <div className="bg-white p-3 rounded border font-mono text-xs overflow-x-auto">
                  <pre>{JSON.stringify(revealedData.shipping?.address || {}, null, 2)}</pre>
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Raw Line Items Payload</h4>
                <div className="bg-slate-900 text-slate-50 p-3 rounded border font-mono text-xs overflow-x-auto max-h-60">
                  <pre>{JSON.stringify(revealedData.debug?.line_items || [], null, 2)}</pre>
                </div>
              </div>

              {revealedData.debug?.sync_error && (
                <div className="space-y-2 lg:col-span-2">
                  <h4 className="font-semibold text-red-500 text-xs uppercase tracking-wider">Captured Sync Error</h4>
                  <div className="bg-red-950 text-red-200 p-3 rounded border border-red-900 font-mono text-xs overflow-x-auto">
                    <div>{revealedData.debug.sync_error}</div>
                    {revealedData.debug.sync_metadata && (
                      <pre className="mt-2 text-[10px] opacity-70">{JSON.stringify(revealedData.debug.sync_metadata, null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
