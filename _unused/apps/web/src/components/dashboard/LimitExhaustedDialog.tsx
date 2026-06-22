import { AlertTriangle, Zap, Package, ShoppingCart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Progress } from '@repo/ui/components/ui/progress';
import { usePlans } from '@repo/api-client/hooks/usePlans';
import { usePlanLimits, LimitCheckResult } from '@repo/auth/hooks/usePlanLimits';

interface LimitExhaustedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitCheck: LimitCheckResult;
}

const limitTypeConfig = {
  credits: {
    icon: Zap,
    title: 'Credits Exhausted',
    description: 'You have run out of AI credits for this billing period.',
    upgradeText: 'Upgrade for more credits',
  },
  listings: {
    icon: Package,
    title: 'Listing Limit Reached',
    description: 'You have reached the maximum number of active listings for your plan.',
    upgradeText: 'Upgrade for more listings',
  },
  orders: {
    icon: ShoppingCart,
    title: 'Order Limit Reached',
    description: 'You have reached the maximum number of auto orders for this billing period.',
    upgradeText: 'Upgrade for more orders',
  },
};

export function LimitExhaustedDialog({
  open,
  onOpenChange,
  limitCheck,
}: LimitExhaustedDialogProps) {
  const navigate = useNavigate();
  const { plans } = usePlans();
  const { limits } = usePlanLimits();

  const config = limitTypeConfig[limitCheck.limitType];
  const Icon = config.icon;

  // Find next tier plan
  const currentPlanName = limits?.plan_name || 'none';
  const sortedPlans = [...plans].sort((a, b) => a.price_monthly - b.price_monthly);
  const currentPlanIndex = sortedPlans.findIndex((p) => p.name === currentPlanName);
  const nextPlan = sortedPlans[currentPlanIndex + 1];

  const usagePercent = limitCheck.limit > 0 ? (limitCheck.current / limitCheck.limit) * 100 : 100;

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/dashboard/subscription');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl">{config.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {limitCheck.reason || config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Usage Visualization */}
        <div className="my-4 space-y-3 rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium capitalize">{limitCheck.limitType}</span>
            </div>
            <span className="text-muted-foreground">
              {limitCheck.current} / {limitCheck.limit}
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {usagePercent >= 100 ? 'Limit reached' : `${Math.round(100 - usagePercent)}% remaining`}
          </p>
        </div>

        {/* Next Plan Suggestion */}
        {nextPlan && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-primary">{nextPlan.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  {limitCheck.limitType === 'credits' && `${nextPlan.credits_per_month} credits/month`}
                  {limitCheck.limitType === 'listings' && `${nextPlan.max_listings} listings`}
                  {limitCheck.limitType === 'orders' && `${nextPlan.max_auto_orders} orders/month`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">${nextPlan.price_monthly}</p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleUpgrade} className="w-full gap-2">
            {config.upgradeText}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <AlertDialogCancel asChild>
            <Button variant="ghost" className="w-full">
              Maybe Later
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
