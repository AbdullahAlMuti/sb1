import * as React from "react";
import { Mail, User } from "lucide-react";

import { Button } from "@repo/ui/components/ui/button";
import { SectionShell } from "@/components/dashboard/order-details/SectionShell";
import { WhatsAppLogo } from "@/components/dashboard/order-details/WhatsAppLogo";
import { normalizeWhatsAppPhone } from "@/components/dashboard/order-details/formatters";
import type { EbayOrderLike } from "@/components/dashboard/order-details/types";
import { buildWhatsAppLink } from "@repo/utils/whatsapp";
import { cn } from "@repo/ui/lib/utils";

export function CustomerSection(props: { order: EbayOrderLike }) {
  const o = props.order;
  const ship = (o.shipping_address || {}) as any;
  const shippingPhoneRaw = typeof ship?.phone === "string" ? ship.phone : "";
  const shippingPhoneDigits = normalizeWhatsAppPhone(shippingPhoneRaw);

  const whatsappHref = shippingPhoneDigits
    ? buildWhatsAppLink({
        phone_number: shippingPhoneDigits,
       message: `Hi ${ship?.name || o.buyer_name || ""}. Regarding order ${(o as any).sales_record_number || o.ebay_order_id}.`,
      })
    : null;

  return (
    <SectionShell title="Customer">
      <div className="grid grid-cols-1 gap-1.5">
        <div className="rounded-md border border-border bg-muted/30 p-1.5">
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{o.buyer_name || ship?.name || o.buyer_username || "—"}</span>
          </div>
          {o.buyer_username ? (
            <div className="mt-0.5 truncate text-[10px] text-muted-foreground">@{o.buyer_username}</div>
          ) : null}
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-1.5">
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {o.buyer_email ? (
              <a href={`mailto:${o.buyer_email}`} className="truncate text-primary hover:underline">
                {o.buyer_email}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-medium">
                {/* Requested: WhatsApp icon instead of phone icon */}
                <WhatsAppLogo className="h-4 w-4 text-muted-foreground" />
                {shippingPhoneRaw ? (
                  <a href={`tel:${shippingPhoneDigits || shippingPhoneRaw}`} className="truncate text-primary hover:underline">
                    {shippingPhoneRaw}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              {!whatsappHref && shippingPhoneRaw ? (
                <div className="mt-0.5 text-[10px] text-muted-foreground">Needs country code for WhatsApp.</div>
              ) : null}
            </div>

            <Button
              type="button"
              size="icon"
              disabled={!whatsappHref}
              aria-label="Chat on WhatsApp"
              className={cn("h-7 w-7 rounded-md bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90", !whatsappHref && "opacity-60")}
              asChild={Boolean(whatsappHref)}
            >
              {whatsappHref ? (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppLogo className="h-4 w-4" />
                </a>
              ) : (
                <span>
                  <WhatsAppLogo className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
