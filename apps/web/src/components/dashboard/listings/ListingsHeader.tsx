import { Package, Plus } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ListingsHeaderProps {
  timeBasedStats: {
    total: number;
    today: number;
    yesterday: number;
    last7Days: number;
    last30Days: number;
  };
  onNewListing: () => void;
}

export function ListingsHeader({ timeBasedStats, onNewListing }: ListingsHeaderProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm ring-1 ring-border/40">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground leading-tight">
              Listings
            </h2>
            <span className="hidden sm:inline-block h-5 w-px bg-border" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 shadow-[0_1px_0_hsl(var(--border))]">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground tabular-nums">{timeBasedStats.total}</span>
              <span className="text-xs text-muted-foreground">total</span>
              {timeBasedStats.today > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                >
                  +{timeBasedStats.today} today
                </Badge>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage your Amazon→eBay mappings and monitor sync status.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-2 sm:justify-end">
          <Button
            size="sm"
            className="shadow-sm h-9 px-4"
            onClick={onNewListing}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Listing
          </Button>
        </div>
      </div>
    </div>
  );
}
