import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import SellerSuitLogo from "@repo/ui/brand/SellerSuitLogo";
import { siteConfig } from "@/config/siteConfig";

const Footer = () => {
  const { footer } = siteConfig;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#eceae6] dark:border-slate-800 py-14 bg-[#faf9f7] dark:bg-slate-950">
      <div className="container px-4 max-w-7xl mx-auto">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-md space-y-6">
            <div>
              <SellerSuitLogo size="sm" />
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{footer.tagline}</p>
            </div>

            {/* Email Contact */}
            {footer.email && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email Inquiries
                  </span>
                  <a
                    href={`mailto:${footer.email}`}
                    className="font-medium text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    {footer.email}
                  </a>
                </div>
              </div>
            )}

            {/* Global Office Locations */}
            {footer.offices && footer.offices.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Our Office Locations
                </span>
                <div className="grid gap-3">
                  {footer.offices.map((office) => (
                    <div
                      key={office.country}
                      className="rounded-2xl p-3.5 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1">
                        <MapPin className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                        <span className="flex items-center gap-1.5">
                          <span>{office.flag}</span>
                          <span>{office.label}</span>
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground pl-5 font-normal">
                        {office.address}
                      </p>
                      {office.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5 mt-1 font-normal">
                          <Phone className="h-3 w-3 text-orange-600 dark:text-orange-400 shrink-0" />
                          <a
                            href={`tel:${office.phone.replace(/[\s\-()]/g, "")}`}
                            className="hover:text-foreground transition-colors"
                          >
                            {office.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {footer.columns.map((column) => (
              <div key={column.title}>
                <h4 className="mb-3 text-sm font-semibold text-foreground">{column.title}</h4>
                <ul className="space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("/#") ? (
                        <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
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

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} {footer.copyright}</p>
          <p>Built for marketplace operators.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
