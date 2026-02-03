import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PriceUpdateIndicatorProps {
  currentPrice: number | null;
  lastUpdated: string | null;
}

export default function PriceUpdateIndicator({ 
  currentPrice, 
  lastUpdated 
}: PriceUpdateIndicatorProps) {
  const isRecentlyUpdated = () => {
    if (!lastUpdated) return false;
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    return diffHours < 1; // Updated within the last hour
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const date = new Date(lastUpdated);
    return date.toLocaleString();
  };

  // If no price, show dash
  if (currentPrice === null || currentPrice === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  // If no lastUpdated, just show the price without tooltip
  if (!lastUpdated) {
    return (
      <span className="text-foreground font-medium">
        ${currentPrice.toFixed(2)}
      </span>
    );
  }

  const recentlyUpdated = isRecentlyUpdated();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <span className="text-foreground font-medium">
              ${currentPrice?.toFixed(2) ?? '—'}
            </span>
            {recentlyUpdated && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-1 py-0 bg-blue-500/10 text-blue-400 border-blue-500/30"
              >
                Updated
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Price last updated: {formatLastUpdated()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
