import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your dashboard at any time. Your plan stays active until the end of the billing period — no immediate cutoff, no cancellation fees.",
  },
  {
    q: "How does the $1 trial work?",
    a: "The trial is a one-time $1 payment that gives you 7 days of full access with 10 listings, 10 auto-orders, and 10 AI credits. You can only use it once per account.",
  },
  {
    q: "What happens when I hit my listing limit?",
    a: "New listing attempts are blocked and you'll see an upgrade prompt. Existing listings continue to sync normally — we never delete your live eBay listings.",
  },
  {
    q: "Can I switch between monthly and yearly billing?",
    a: "Yes. Switch at any time from your billing page. Switching to yearly charges the annual rate immediately and resets your billing period.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer pro-rated refunds within 7 days of charge for annual plans. Monthly plans are non-refundable. Contact support@sellersuit.com for assistance.",
  },
  {
    q: "Which eBay marketplaces are supported?",
    a: "SellerSuit supports eBay US primarily. Listing to UK, CA, AU, and DE marketplaces is possible but eBay compliance for non-US markets is the seller's responsibility.",
  },
];

export default function PricingFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mt-20">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground">
          Frequently asked questions
        </h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-lg border border-border bg-card">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-sm font-medium text-foreground">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    open === i && "rotate-180",
                  )}
                />
              </button>
              {open === i && (
                <div className="border-t border-border px-5 py-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
