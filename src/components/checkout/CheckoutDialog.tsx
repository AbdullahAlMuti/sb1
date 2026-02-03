import { useState } from 'react';
import { Loader2, Shield, Zap, Rocket, Building2, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CouponInput } from './CouponInput';
import { Plan } from '@/hooks/usePlans';

interface CouponData {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  maxDiscountAmount: number | null;
}

export interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
  onCheckout: (couponCode?: string) => Promise<void>;
}

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Crown,
  starter: Zap,
  growth: Rocket,
  enterprise: Building2,
};

export function CheckoutDialog({ open, onOpenChange, plan, onCheckout }: CheckoutDialogProps) {
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!plan) return null;

  const Icon = planIcons[plan.name] || Zap;
  const originalPrice = plan.price_monthly;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      await onCheckout(appliedCoupon?.code);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setAppliedCoupon(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Complete Your Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Summary */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{plan.display_name} Plan</h3>
                <p className="text-sm text-muted-foreground">Monthly subscription</p>
              </div>
            </div>
            
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {plan.features.slice(0, 3).map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Coupon Input */}
          <CouponInput
            planId={plan.id}
            orderAmount={originalPrice}
            onCouponApplied={setAppliedCoupon}
            appliedCoupon={appliedCoupon}
          />

          <Separator />

          {/* Order Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${originalPrice.toFixed(2)}/mo</span>
            </div>
            
            {appliedCoupon && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Discount ({appliedCoupon.discountType === 'percentage' 
                    ? `${appliedCoupon.discountValue}%` 
                    : `$${appliedCoupon.discountValue}`})
                </span>
                <span className="text-green-500">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-semibold">
              <span className="text-foreground">Total</span>
              <div className="text-right">
                <span className="text-foreground">${finalPrice.toFixed(2)}/mo</span>
                {appliedCoupon && (
                  <p className="text-xs text-muted-foreground font-normal">
                    First month only, then ${originalPrice.toFixed(2)}/mo
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <Button 
            onClick={handleCheckout} 
            disabled={isProcessing}
            className="w-full h-12 text-base"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Proceed to Payment
              </>
            )}
          </Button>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
