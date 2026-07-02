import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { toast } from 'sonner';

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

interface CreditAdjustmentModalProps {
  userId: string;
  currentBalance: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CreditAdjustmentModal({ userId, currentBalance, trigger, onSuccess }: CreditAdjustmentModalProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>('grant');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const queryClient = useQueryClient();

  const numAmount = parseInt(amount || '0', 10);
  const isSubtract = type === 'revoke' || type === 'correction';
  const displayAmount = isSubtract ? -Math.abs(numAmount) : Math.abs(numAmount);
  const projectedBalance = currentBalance + (isNaN(displayAmount) ? 0 : displayAmount);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!amount || isNaN(displayAmount) || displayAmount === 0) throw new Error("Invalid amount");
      if (!reason.trim()) throw new Error("A reason is required");
      if (projectedBalance < 0) throw new Error("Cannot result in negative balance");

      const { data, error } = await (supabase as any).rpc('adjust_user_credits_admin', {
        p_user_id: userId,
        p_amount: displayAmount,
        p_adjustment_type: type,
        p_reason: reason
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Credits successfully adjusted");
      setOpen(false);
      setAmount('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['ebay-admin-credits'] });
      queryClient.invalidateQueries({ queryKey: ['ebay-admin-user-profile'] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to adjust credits");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}>
            Adjust Credits
          </Button>
        )}
      </DialogTrigger>
      <DialogContent style={{ borderRadius: 12, borderColor: sb.hairline }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 18, fontWeight: 500, color: sb.ink }}>Manual Credit Adjustment</DialogTitle>
          <DialogDescription style={{ fontSize: 13, color: sb.inkMute }}>
            Grant or revoke credits for this user. This action is audited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label style={{ fontSize: 14, fontWeight: 500, color: sb.ink }}>Adjustment Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger style={{ borderRadius: 6, borderColor: sb.hairline }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: 6 }}>
                <SelectItem value="grant">Grant (Add)</SelectItem>
                <SelectItem value="goodwill">Goodwill (Add)</SelectItem>
                <SelectItem value="refund">Refund (Add)</SelectItem>
                <SelectItem value="revoke">Revoke (Subtract)</SelectItem>
                <SelectItem value="correction">Correction (Subtract)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label style={{ fontSize: 14, fontWeight: 500, color: sb.ink }}>Amount</Label>
            <Input 
              type="number" 
              placeholder="e.g. 50" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={1}
              style={{ borderRadius: 6, borderColor: sb.hairline }}
            />
          </div>

          <div className="space-y-2">
            <Label style={{ fontSize: 14, fontWeight: 500, color: sb.ink }}>Reason (Required)</Label>
            <Input 
              placeholder="Reason for audit log..." 
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ borderRadius: 6, borderColor: sb.hairline }}
            />
          </div>

          <div className="p-3 flex justify-between items-center text-sm border" style={{ background: sb.canvasSoft, borderColor: sb.hairline, borderRadius: 8 }}>
            <span style={{ color: sb.inkMute }}>Projected Balance:</span>
            <span className="font-mono font-medium" style={{ color: projectedBalance < 0 ? '#ff2201' : sb.ink }}>
              {currentBalance} → {projectedBalance}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}>Cancel</Button>
          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending || projectedBalance < 0 || !reason.trim() || !amount}
            style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6 }}
          >
            {mutation.isPending ? "Applying..." : "Confirm Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
