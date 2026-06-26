/**
 * SiteFooter — logo, 4-column link groups, trust-badge list, social icon row,
 * and copyright line. Fully driven by HpFooter content.
 */
import { Link } from "react-router-dom";
import SellerSuitLogo from "@repo/ui/brand/SellerSuitLogo";
import { ShieldCheck } from "lucide-react";
import type { HpFooter } from "@repo/types";
import { Icon } from "./LucideResolver";

interface SiteFooterProps { footer: HpFooter }

function isExternal(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function SiteFooter({ footer }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-secondary/35 pt-14 pb-8">
      <div className="container px-4">
        {/* Top grid: brand + columns */}
        <div className="grid gap-8 md:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <SellerSuitLogo size="sm" />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{footer.tagline}</p>

            {/* Social icons */}
            {footer.social.length > 0 && (
              <div className="mt-5 flex items-center gap-3">
                {footer.social.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Icon name={s.icon} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {footer.columns.map((col) => (
              <div key={col.title}>
                <h4 className="mb-3 text-sm font-semibold text-foreground">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {isExternal(link.href) ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar: badges + copyright */}
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Trust badges */}
          {footer.badges.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {footer.badges.map((badge) => {
                const inner = (
                  <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden />
                    {badge.label}
                  </span>
                );
                if (badge.href) {
                  return isExternal(badge.href) ? (
                    <a key={badge.label} href={badge.href} target="_blank" rel="noopener noreferrer">{inner}</a>
                  ) : (
                    <Link key={badge.label} to={badge.href}>{inner}</Link>
                  );
                }
                return <span key={badge.label}>{inner}</span>;
              })}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            © {year} {footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
