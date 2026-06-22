import * as React from "react";

import { Separator } from "@repo/ui/components/ui/separator";
import { SectionShell } from "@/components/dashboard/order-details/SectionShell";
import { formatMoney } from "@/components/dashboard/order-details/formatters";
import type { EbayOrderLike } from "@/components/dashboard/order-details/types";

function Row(props: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] text-muted-foreground">{props.label}</span>
      <span className={props.strong ? "text-[11px] font-semibold tabular-nums" : "text-[11px] font-medium tabular-nums"}>
        {props.value}
      </span>
    </div>
  );
}

export function PaymentSection(props: { order: EbayOrderLike }) {
  const o = props.order;
  const c = o.currency || "USD";
  return (
    <SectionShell title="Payment">
      <div className="rounded-md border border-border bg-muted/30 p-1.5">
        <div className="space-y-1">
          <Row label="Subtotal" value={formatMoney(o.subtotal, c)} />
          <Row label="Transaction" value={formatMoney(o.total_amount, c)} />
          <Row label="Shipping cost" value={formatMoney(o.shipping_cost, c)} />
          <Row label="Net Profit" value={formatMoney(o.add_fee, c)} strong />
          <Separator className="my-1.5" />

        </div>
      </div>
    </SectionShell>
  );
}
