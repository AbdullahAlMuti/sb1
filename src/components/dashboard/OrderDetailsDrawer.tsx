import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { getStatusBadgeVariant } from "@/components/dashboard/order-details/formatters";
import { LineItemsSection } from "@/components/dashboard/order-details/sections/LineItemsSection";
import { CustomerSection } from "@/components/dashboard/order-details/sections/CustomerSection";
import { OrderSummarySection } from "@/components/dashboard/order-details/sections/OrderSummarySection";
import { PaymentSection } from "@/components/dashboard/order-details/sections/PaymentSection";
import { ShippingAddressSection } from "@/components/dashboard/order-details/sections/ShippingAddressSection";
import { TimelineSection } from "@/components/dashboard/order-details/sections/TimelineSection";
import type { EbayOrderLike, LineItemLike } from "@/components/dashboard/order-details/types";
import { cn } from "@/lib/utils";

export function OrderDetailsDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: EbayOrderLike | null;
}) {
  const order = props.order;

  const lineItems: LineItemLike[] = Array.isArray(order?.line_items) ? (order!.line_items as any) : [];

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-lg",
          "bg-background",
          "shadow-xl",
          "p-3 sm:p-4",
        )}
      >
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Order</div>
              <a
                href={`https://www.ebay.com/mesh/ord/details?mode=SH&orderid=${encodeURIComponent(order?.ebay_order_id || '')}&source=Orders&ru=https%3A%2F%2Fwww.ebay.com%2Fsh%2Ford`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {(order as any)?.sales_record_number || order?.ebay_order_id || "—"}
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  const url = `https://www.ebay.com/mesh/ord/details?mode=SH&srn=${(order as any)?.sales_record_number || ""}&orderid=${encodeURIComponent(order?.ebay_order_id || '')}&source=Orders&ru=https%3A%2F%2Fwww.ebay.com%2Fsh%2Ford`;
                  window.open(url, '_blank');
                }}
                aria-label={`Order ${order?.ebay_order_id}`}
              >
                Order
              </button>
              <Badge
                variant={getStatusBadgeVariant(order?.order_status || null)}
                className="shrink-0 rounded-full"
              >
                {(order?.order_status || "unknown").toString().toUpperCase()}
              </Badge>
            </div>
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            Details, shipping, contact and fees.
          </SheetDescription>
        </SheetHeader>

        {!order ? (
          <div className="py-6 text-sm text-muted-foreground">Select an order to view details.</div>
        ) : (
          <div className="mt-3 space-y-2">
            <OrderSummarySection order={order} />
            <CustomerSection order={order} />
            <ShippingAddressSection order={order} />
            <LineItemsSection lineItems={lineItems} orderId={order.id} />
            <PaymentSection order={order} />
            <TimelineSection order={order} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
