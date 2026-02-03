import * as React from "react";

import { KeyValueGrid } from "@/components/dashboard/order-details/KeyValueGrid";
import { SectionShell } from "@/components/dashboard/order-details/SectionShell";
import { formatDate } from "@/components/dashboard/order-details/formatters";
import type { EbayOrderLike } from "@/components/dashboard/order-details/types";

export function TimelineSection(props: { order: EbayOrderLike }) {
  const o = props.order;
  return (
    <SectionShell title="Timeline">
      <div className="rounded-md border border-border bg-muted/30 p-1.5">
        <KeyValueGrid
          items={[
            { label: "Order date", value: formatDate(o.order_date) },
            { label: "Date sold", value: formatDate(o.date_sold) },
            { label: "Date paid", value: formatDate(o.date_paid) },
            { label: "Ship by", value: formatDate(o.ship_by_date) },
            { label: "Synced at", value: formatDate(o.synced_at) },
            { label: "Updated at", value: formatDate(o.updated_at || null) },
          ]}
        />
      </div>
    </SectionShell>
  );
}
