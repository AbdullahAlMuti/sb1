import * as React from "react";

import { SectionShell } from "@/components/dashboard/order-details/SectionShell";
import type { EbayOrderLike } from "@/components/dashboard/order-details/types";

export function ShippingAddressSection(props: { order: EbayOrderLike }) {
  const o = props.order;
  const ship = (o.shipping_address || {}) as any;

  return (
    <SectionShell title="Shipping">
      <div className="rounded-md border border-border bg-muted/30 p-1.5 text-[11px]">
        <div className="font-medium">{ship?.name || o.buyer_name || "—"}</div>
        <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
          {ship?.address1 ? <div>{ship.address1}</div> : null}
          {ship?.address2 ? <div>{ship.address2}</div> : null}
          <div>{[ship?.city, ship?.state, ship?.postal_code].filter(Boolean).join(", ") || "—"}</div>
          <div>{ship?.country || "—"}</div>
        </div>
      </div>
    </SectionShell>
  );
}
