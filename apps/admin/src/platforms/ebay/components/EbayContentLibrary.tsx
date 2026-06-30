import { useState } from "react";
import { ChevronLeft, PackageCheck, Tags } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

// Curated catalog managers, rendered from the shared entity engine.
import {
  AdminMustSellPage as AdminMustSell,
  AdminProfitableProductsPage as AdminProfitableProducts,
} from "@/modules/catalog";

type ContentView = "must-sell" | "profitable-products" | null;

export function EbayContentLibrary() {
  const [contentView, setContentView] = useState<ContentView>(null);

  if (contentView) {
    let ActiveComponent = null;
    let title = "";
    let description = "";

    if (contentView === "must-sell") {
      ActiveComponent = AdminMustSell;
      title = "Must Sell Items";
      description = "Manage trending eBay products for users. Drag to reorder.";
    } else if (contentView === "profitable-products") {
      ActiveComponent = AdminProfitableProducts;
      title = "Profitable Products";
      description = "Manage high-margin products. Drag to reorder.";
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <Button variant="ghost" size="icon" onClick={() => setContentView(null)} className="h-8 w-8 shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="pt-2">
          {ActiveComponent && <ActiveComponent hideHeader={true} />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Content Library</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage all dynamic eBay content shown on the user dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <button
          onClick={() => setContentView("must-sell")}
          className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-colors text-left group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 shrink-0 group-hover:bg-orange-100 transition-colors">
            <Tags className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Must Sell Items</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Manage priority items pushed to users</p>
          </div>
        </button>

        <button
          onClick={() => setContentView("profitable-products")}
          className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/20 transition-colors text-left group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0 group-hover:bg-emerald-100 transition-colors">
            <PackageCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Profitable Products</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Manage product intelligence and dropship tracking</p>
          </div>
        </button>
      </div>
    </div>
  );
}
