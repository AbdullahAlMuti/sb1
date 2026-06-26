/**
 * TrustBadges — eyebrow + H2 + paragraph (with optional inline link) + badge row.
 */
import { ShieldCheck, CreditCard, Database, Lock } from "lucide-react";
import type { HpTrust } from "@repo/types";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/primitives/Reveal";

interface TrustBadgesProps { trust: HpTrust }

const getBadgeIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("ebay")) return <ShieldCheck className="h-5 w-5 shrink-0 text-[#0064d2]" aria-hidden />;
  if (l.includes("stripe")) return <CreditCard className="h-5 w-5 shrink-0 text-[#635bff]" aria-hidden />;
  if (l.includes("supabase")) return <Database className="h-5 w-5 shrink-0 text-[#3ecf8e]" aria-hidden />;
  if (l.includes("ssl") || l.includes("encrypt")) return <Lock className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />;
  return <ShieldCheck className="h-5 w-5 shrink-0 text-success" aria-hidden />;
};

export function TrustBadges({ trust }: TrustBadgesProps) {
  // Split paragraph around the link placeholder text if a paragraphLink is provided
  const renderParagraph = () => {
    if (!trust.paragraphLink) return <p className="mt-4 text-base text-muted-foreground leading-7">{trust.paragraph}</p>;
    const parts = trust.paragraph.split(trust.paragraphLink.label);
    if (parts.length < 2) return <p className="mt-4 text-base text-muted-foreground leading-7">{trust.paragraph}</p>;
    return (
      <p className="mt-4 text-base text-muted-foreground leading-7">
        {parts[0]}
        <Link to={trust.paragraphLink.href} className="text-primary underline underline-offset-2 hover:text-primary/80">
          {trust.paragraphLink.label}
        </Link>
        {parts[1]}
      </p>
    );
  };

  return (
    <section className="border-b border-border bg-hero-gradient py-24 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />

      <div className="container relative px-4">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {trust.eyebrow}
          </p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl text-balance">
            {trust.heading}
          </h2>
          {renderParagraph()}
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {trust.badges.map((badge, i) => {
            const isEbay = badge.label.toLowerCase().includes("ebay");
            const isStripe = badge.label.toLowerCase().includes("stripe");
            const isSupabase = badge.label.toLowerCase().includes("supabase");
            const isSsl = badge.label.toLowerCase().includes("ssl") || badge.label.toLowerCase().includes("encrypt");
            
            // Highlight color based on type
            const glowClass = isEbay 
              ? "hover:border-[#0064d2]/30 hover:shadow-[#0064d2]/5" 
              : isStripe 
              ? "hover:border-[#635bff]/30 hover:shadow-[#635bff]/5" 
              : isSupabase 
              ? "hover:border-[#3ecf8e]/30 hover:shadow-[#3ecf8e]/5" 
              : "hover:border-amber-500/30 hover:shadow-amber-500/5";

            const borderHighlight = isEbay
              ? "border-[#0064d2]/10"
              : isStripe
              ? "border-[#635bff]/10"
              : isSupabase
              ? "border-[#3ecf8e]/10"
              : "border-amber-500/10";

            return (
              <Reveal key={i} delay={i * 0.08}
                className={`flex flex-col justify-between rounded-2xl border bg-card/45 backdrop-blur-md p-6 shadow-soft-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${borderHighlight} ${glowClass} relative overflow-hidden group`}
              >
                {/* Visual grid pattern back layer */}
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] opacity-30" />
                
                <div className="relative z-10 flex flex-col items-start gap-4">
                  <div className={`p-3 rounded-xl bg-background border ${borderHighlight} shadow-inner`}>
                    {getBadgeIcon(badge.label)}
                  </div>
                  <div>
                    <span className="block text-base font-bold text-foreground tracking-tight">{badge.label}</span>
                    {badge.description && (
                      <span className="block text-xs text-muted-foreground mt-2 leading-relaxed">{badge.description}</span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/40 text-[10px] text-muted-foreground font-semibold tracking-wider uppercase flex items-center gap-1.5 relative z-10 select-none">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    isEbay ? "bg-[#0064d2]" : isStripe ? "bg-[#635bff]" : isSupabase ? "bg-[#3ecf8e]" : "bg-amber-500"
                  } animate-pulse`} />
                  {isEbay ? "eBay OAuth 2.0 Partner" : isStripe ? "PCI-DSS Level 1 Secure" : isSupabase ? "RLS Vault Isolation" : "TLS 1.3 Encryption"}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default TrustBadges;
