import * as React from "react";
import { ExternalLink, ChevronRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";
import type { ListingSource } from "@repo/config/listingSources";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: ListingSource[];
  onSelectSource: (source: ListingSource) => void;
  onManualCreate?: () => void;
  manualCreateLabel?: string;
  manualCreateDescription?: string;
};

export function NewListingSelectorDialog({
  open,
  onOpenChange,
  sources,
  onSelectSource,
  onManualCreate,
  manualCreateLabel = "Create inside app",
  manualCreateDescription = "Manually create a listing mapping (uses credits).",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Start a new listing</DialogTitle>
          <DialogDescription>
            Choose a platform to open in a new tab.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.map((source) => {
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => onSelectSource(source)}
                  className={cn(
                    "group relative w-full rounded-xl border border-border bg-card p-4 text-left",
                    "transition-all hover:bg-accent/30 hover:shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "rounded-lg border border-border bg-background p-2",
                      "transition-colors group-hover:bg-background",
                    )}>
                      {source.logoPath ? (
                        <img
                          src={source.logoPath}
                          alt={`${source.name} logo`}
                          className="h-5 w-5 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded bg-muted" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground truncate">{source.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground leading-snug">
                        {source.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {onManualCreate && (
            <div className="mt-1 rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{manualCreateLabel}</p>
                  <p className="text-xs text-muted-foreground">{manualCreateDescription}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={onManualCreate}
                >
                  Open form
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
