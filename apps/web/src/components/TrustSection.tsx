import { Shield, CreditCard, Lock, RefreshCw } from "lucide-react";

const bullets = [
  { icon: Shield, text: "Stripe-secured checkout — your card data never touches our servers" },
  { icon: Lock, text: "SOC 2 compliant infrastructure via Supabase" },
  { icon: CreditCard, text: "Cancel anytime — no lock-in, pro-rated refunds on request" },
  { icon: RefreshCw, text: "Upgrade or downgrade instantly, effective immediately" },
];

export default function TrustSection() {
  return (
    <div className="mt-16 rounded-xl border border-border bg-muted/30 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Security &amp; Trust
          </h3>
        </div>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          SellerSuit has no free plan. Every account requires a paid subscription or active $1
          trial. This keeps our infrastructure focused on real sellers and our support team
          responsive.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {bullets.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
