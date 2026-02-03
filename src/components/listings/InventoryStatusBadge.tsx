import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InventoryStatusBadgeProps {
  stockStatus: string | null;
  stockQuantity: number | null;
  lastUpdated: string | null;
}

export default function InventoryStatusBadge({ 
  stockStatus, 
  stockQuantity, 
  lastUpdated 
}: InventoryStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (stockStatus) {
      case 'in_stock':
        return {
          label: `In Stock: ${stockQuantity ?? '?'}`,
          className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          icon: Package,
        };
      case 'low_stock':
        return {
          label: `Low Stock: ${stockQuantity ?? '?'}`,
          className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          icon: AlertTriangle,
        };
      case 'out_of_stock':
        return {
          label: 'Out of Stock',
          className: 'bg-destructive/20 text-destructive border-destructive/30',
          icon: XCircle,
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-muted text-muted-foreground border-muted',
          icon: HelpCircle,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never synced';
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.className} cursor-help flex items-center gap-1`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Last updated: {formatLastUpdated()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
