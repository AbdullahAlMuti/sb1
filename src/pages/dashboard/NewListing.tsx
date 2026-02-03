import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LISTING_SOURCES, type ListingSource } from "@/config/listingSources";

export default function NewListing() {
  const navigate = useNavigate();

  const sources = useMemo(() => LISTING_SOURCES, []);

  const openSourceInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSelectSource = (source: ListingSource) => {
    openSourceInNewTab(source.homepageUrl);
  };

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => navigate("/dashboard/listings")}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to listings</span>
            </Button>
            <h1 className="text-lg font-semibold text-foreground truncate">New Listing</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose a marketplace to open in a new tab.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => navigate("/dashboard/listings", { state: { openManualCreate: true } })}
        >
          Create inside app
        </Button>
      </header>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sources.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => handleSelectSource(source)}
              className={cn(
                "group relative w-full overflow-hidden rounded-xl border border-border bg-card p-4 text-left",
                "transition-all hover:bg-accent/30 hover:shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    {source.logoPath ? (
                      <img
                        src={source.logoPath}
                        alt={`${source.name} logo`}
                        className="h-7 w-20 object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-7 w-20 rounded bg-muted" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{source.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {source.description}
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>
            </button>
          ))}
        </div>
      </Card>
    </main>
  );
}
