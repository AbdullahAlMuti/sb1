import * as React from "react";

import { SectionShell } from "@/components/dashboard/order-details/SectionShell";
import type { LineItemLike } from "@/components/dashboard/order-details/types";

export function LineItemsSection(props: { lineItems: LineItemLike[]; orderId: string }) {
  const { lineItems } = props;

  return (
    <SectionShell title={`Items (${lineItems.length || 0})`}>
      {lineItems.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">No line items found.</div>
      ) : (
        <div className="space-y-1">
          {lineItems.map((li, idx) => {
            const title = typeof li?.title === "string" ? li.title : "—";
            const sku = typeof li?.sku === "string" ? li.sku : "";
            const itemNumber = typeof li?.item_number === "string" ? li.item_number : "";
            const qty = typeof li?.quantity === "number" ? li.quantity : 1;
            return (
              <div key={`${props.orderId}-li-${idx}`} className="rounded-md border border-border bg-muted/30 p-1.5">
                <div className="text-[11px] font-medium leading-snug line-clamp-2">{title}</div>
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                  <div>Qty: {qty}</div>
                  {sku ? <div className="truncate">SKU: {sku}</div> : <div />}
                  {itemNumber ? <div className="truncate">Item #: {itemNumber}</div> : <div />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}
