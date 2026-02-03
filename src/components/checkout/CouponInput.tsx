import { useState } from 'react';
import { Ticket, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CouponData {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  maxDiscountAmount: number | null;
}

interface CouponInputProps {
  planId: string;
  orderAmount: number;
  onCouponApplied: (coupon: CouponData | null) => void;
  appliedCoupon: CouponData | null;
}

export function CouponInput({ planId, orderAmount, onCouponApplied, appliedCoupon }: CouponInputProps) {
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('validate-coupon', {
        body: {
          code: couponCode.trim(),
          planId,
          orderAmount
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (result.valid) {
        onCouponApplied(result.coupon);
        setCouponCode('');
        toast({
          title: "Coupon Applied!",
          description: `${result.coupon.discountType === 'percentage' 
            ? `${result.coupon.discountValue}% discount` 
            : `$${result.coupon.discountValue} off`} applied successfully`,
        });
      } else {
        setError(result.error || 'Invalid coupon code');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate coupon');
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    onCouponApplied(null);
    toast({
      title: "Coupon Removed",
      description: "The coupon has been removed from your order",
    });
  };

  if (appliedCoupon) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-green-500">Coupon Applied</p>
              <p className="text-sm text-muted-foreground">
                <code className="bg-muted px-1.5 py-0.5 rounded">{appliedCoupon.code}</code>
                {' '}-{' '}
                {appliedCoupon.discountType === 'percentage' 
                  ? `${appliedCoupon.discountValue}% off` 
                  : `$${appliedCoupon.discountValue} off`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={removeCoupon}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 pt-3 border-t border-green-500/20">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-green-500 font-medium">-${appliedCoupon.discountAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Have a coupon code?</span>
      </div>
      
      <div className="flex gap-2">
        <Input
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => {
            setCouponCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              validateCoupon();
            }
          }}
          className="uppercase"
          disabled={isValidating}
        />
        <Button 
          onClick={validateCoupon} 
          disabled={isValidating || !couponCode.trim()}
          variant="outline"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
