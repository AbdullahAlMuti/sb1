import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { toast } from 'sonner';

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
  const adjustedAmount = (type === 'revoke' || type === 'correction' && numAmount > 0 && currentBalance - numAmount >= 0) 
                         ? (type === 'revoke' ? -Math.abs(numAmount) : -Math.abs(numAmount)) // default correction to negative unless specified?
                         : (type === 'revoke' ? -Math.abs(numAmount) : Math.abs(numAmount));

  // Let's refine correction: if type is revoke, make amount negative. If grant/refund/goodwill, make positive.
  const finalAmount = type === 'revoke' ? -Math.abs(numAmount) : Math.abs(numAmount);
  // Actually, correction could be positive or negative. We'll enforce the admin to type a negative sign if they want negative for correction, OR we simplify:
  // Grant, Goodwill, Refund = Add.
  // Revoke = Subtract.
  // Correction = Subtract. (or allow negative input?) Let's explicitly do Add/Subtract based on type.
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
        {trigger || <Button variant="outline" size="sm">Adjust Credits</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Credit Adjustment</DialogTitle>
          <DialogDescription>
            Grant or revoke credits for this user. This action is audited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grant">Grant (Add)</SelectItem>
                <SelectItem value="goodwill">Goodwill (Add)</SelectItem>
                <SelectItem value="refund">Refund (Add)</SelectItem>
                <SelectItem value="revoke">Revoke (Subtract)</SelectItem>
                <SelectItem value="correction">Correction (Subtract)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input 
              type="number" 
              placeholder="e.g. 50" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Reason (Required)</Label>
            <Input 
              placeholder="Reason for audit log..." 
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div className="bg-muted/30 p-3 rounded-lg border text-sm flex justify-between items-center">
            <span className="text-muted-foreground">Projected Balance:</span>
            <span className={`font-mono font-medium ${projectedBalance < 0 ? 'text-red-500' : ''}`}>
              {currentBalance} → {projectedBalance}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => mutation.mutate()} 
            disabled={mutation.isPending || projectedBalance < 0 || !reason.trim() || !amount}
          >
            {mutation.isPending ? "Applying..." : "Confirm Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
