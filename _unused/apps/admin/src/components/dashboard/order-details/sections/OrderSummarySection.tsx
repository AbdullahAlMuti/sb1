import * as React from "react";

import { KeyValueGrid } from "@/components/dashboard/order-details/KeyValueGrid";
import { SectionShell } from "@/components/dashboard/order-details/SectionShell";
import { formatDate, formatMoney } from "@/components/dashboard/order-details/formatters";
import type { EbayOrderLike } from "@/components/dashboard/order-details/types";

export function OrderSummarySection(props: { order: EbayOrderLike }) {
  const o = props.order;
  return (
    <SectionShell title="Summary">
      <KeyValueGrid
        items={[
          { label: "Created", value: formatDate(o.created_at) },
          { label: "Order date", value: formatDate(o.order_date) },
          { label: "Ship by", value: formatDate(o.ship_by_date) },
          {
            label: "Total",
            value: <span className="font-semibold">{formatMoney(o.total_amount, o.currency || "USD")}</span>,
          },
        ]}
      />
    </SectionShell>
  );
}
