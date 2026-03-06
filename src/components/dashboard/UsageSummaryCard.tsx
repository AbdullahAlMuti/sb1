import { Zap, Package, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { format } from 'date-fns';

interface UsageItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  current: number;
  limit: number;
  color: string;
}

function UsageItem({ icon: Icon, label, current, limit, color }: UsageItemProps) {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={isAtLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
            {current} / {limit}
          </span>
          {isAtLimit && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
          {isNearLimit && !isAtLimit && <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
        </div>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-amber-500' : ''}`} 
      />
    </div>
  );
}

export function UsageSummaryCard() {
  const navigate = useNavigate();
  const { limits, isLoading } = usePlanLimits();

  if (isLoading || !limits) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Usage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-2 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const renewalDate = limits.current_period_end 
    ? format(new Date(limits.current_period_end), 'MMM d, yyyy')
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Usage Summary
          </CardTitle>
          <Badge variant="outline" className="font-normal">
            {limits.plan_display_name}
          </Badge>
        </div>
        {renewalDate && (
          <p className="text-xs text-muted-foreground">
            Resets on {renewalDate}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageItem
          icon={Zap}
          label="AI Credits"
          current={limits.current_credits}
          limit={limits.credits_per_month}
          color="text-primary"
        />
        <UsageItem
          icon={Package}
          label="Active Listings"
          current={limits.listings_count}
          limit={limits.max_listings}
          color="text-emerald-500"
        />
        {(limits.current_credits <= 5 || 
          limits.listings_count >= limits.max_listings * 0.8) && (
          <Button 
            variant="outline" 
            className="w-full mt-2"
            onClick={() => navigate('/dashboard/subscription')}
          >
            Upgrade Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
