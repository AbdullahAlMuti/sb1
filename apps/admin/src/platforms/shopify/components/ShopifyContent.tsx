import React, { useState } from "react";
import { ChevronLeft, Paintbrush } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import StoreDesignsManager from "../StoreDesignsManager";

export function ShopifyContent() {
  const [showDesigns, setShowDesigns] = useState(false);

  if (showDesigns) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <Button variant="ghost" size="icon" onClick={() => setShowDesigns(false)} className="h-8 w-8 shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Store Designs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage, publish, and configure store design templates</p>
          </div>
        </div>
        <div className="pt-2">
          <StoreDesignsManager />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Content Library</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage all dynamic content shown on the Shopify user dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => setShowDesigns(true)}
          className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-colors text-left group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 shrink-0 group-hover:bg-violet-100 transition-colors">
            <Paintbrush className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Store Designs</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Manage, publish, and configure store design templates
            </p>
          </div>
        </button>

        {/* Placeholder cards for future content types */}
        {[
          { label: "Winning Products", desc: "Curated winning product library", icon: "🏆" },
          { label: "Ad Library", desc: "Winning ad creatives and hooks", icon: "📢" },
          { label: "AI Prompts", desc: "AI Copy Studio prompt templates", icon: "✨" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card opacity-50 cursor-not-allowed">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground text-base shrink-0">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
              <span className="inline-block mt-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Coming soon
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
