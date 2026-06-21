import { useNavigate } from 'react-router-dom';
import { 
  Crown, 
  Zap, 
  Rocket, 
  Building2, 
  Sparkles,
  ArrowRight,
  CreditCard,
  Settings,
  RefreshCw,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { usePlans } from '@repo/api-client/hooks/usePlans';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { cn } from '@repo/ui/lib/utils';

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Crown,
  starter: Zap,
  growth: Rocket,
  enterprise: Building2,
};

interface PlanOverviewProps {
  creditsRemaining: number;
  creditsMax: number;
}

export function PlanOverview({ creditsRemaining, creditsMax }: PlanOverviewProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { 
    planName, 
    subscribed, 
    subscriptionEnd, 
    isLoading, 
    openCustomerPortal,
    checkSubscription 
  } = useSubscription();
  const { plans, isLoading: plansLoading, getPlanByName } = usePlans();

  const currentPlan = getPlanByName(planName);
  const PlanIcon = planIcons[planName] || Crown;
  
  const creditsUsed = creditsMax - creditsRemaining;
  const creditsPercent = Math.min((creditsRemaining / creditsMax) * 100, 100);
  const usedPercent = Math.min((creditsUsed / creditsMax) * 100, 100);

  // Get next tier info for upgrade prompt
  const getNextTier = () => {
    if (!currentPlan || plans.length === 0) return null;
    
    const sortedPlans = [...plans].sort((a, b) => a.price_monthly - b.price_monthly);
    const currentIndex = sortedPlans.findIndex(p => p.name === planName);
    const nextPlan = sortedPlans[currentIndex + 1];
    
    if (nextPlan) {
      return {
        name: nextPlan.display_name,
        credits: nextPlan.credits_per_month > 9000 ? 'Unlimited' : nextPlan.credits_per_month,
        price: nextPlan.price_monthly
      };
    }
    return null;
  };

  const nextTier = getNextTier();

  if (plansLoading || !currentPlan) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header with Plan Info */}
      <div className="p-5 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              subscribed ? "bg-primary/10" : "bg-secondary"
            )}>
              <PlanIcon className={cn(
                "h-5 w-5",
                subscribed ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                {currentPlan.display_name} Plan
                {subscribed && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {subscribed && subscriptionEnd 
                  ? `Renews ${new Date(subscriptionEnd).toLocaleDateString()}`
                  : 'Free tier'
                }
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => checkSubscription()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Credits Section */}
      <div className="p-5 space-y-4">
        {/* Credits Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Credits Remaining</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-display font-semibold text-foreground">
                {creditsRemaining}
              </span>
              <span className="text-sm text-muted-foreground">
                / {creditsMax === 9999 ? '∞' : creditsMax}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Credits Used</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-display font-semibold text-foreground">
                {creditsUsed}
              </span>
              <span className="text-sm text-muted-foreground">
                this period
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                creditsPercent > 50 ? "bg-primary" : 
                creditsPercent > 20 ? "bg-amber-500" : "bg-destructive"
              )}
              style={{ width: `${creditsPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(usedPercent)}% used</span>
            <span>{Math.round(creditsPercent)}% remaining</span>
          </div>
        </div>

      </div>

      {/* Upgrade Prompt or Management Options */}
      <div className="p-4 bg-secondary/30 border-t border-border">
        {!subscribed && nextTier ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">
                Upgrade to <strong>{nextTier.name}</strong> for {nextTier.credits} credits
              </span>
            </div>
            <Button 
              size="sm" 
              onClick={() => navigate('/dashboard/subscription')}
              className="h-8"
            >
              ${nextTier.price}/mo
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        ) : subscribed && nextTier ? (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => openCustomerPortal()}
              className="flex-1 h-9"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard/subscription')}
              className="h-9"
            >
              <Settings className="h-4 w-4 mr-2" />
              View Plans
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => openCustomerPortal()}
              className="flex-1 h-9"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          </div>
        )}
      </div>

      {/* Low-credit notification handled globally (DashboardLayout) */}
    </div>
  );
}
