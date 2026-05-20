import { forwardRef } from "react";
import { Link } from "react-router-dom";
import SellerSuitLogo from "@repo/ui/brand/SellerSuitLogo";

const footerLinks = {
  product: [
    { label: "Platform", href: "/#features" },
    { label: "Workflow", href: "/#workflow" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Extension", href: "/dashboard/extension" },
  ],
  resources: [
    { label: "Documentation", href: "/documentation" },
    { label: "Troubleshooting", href: "/documentation#troubleshooting" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy-policy" },
    { label: "Terms", href: "/terms-of-service" },
    { label: "Refunds", href: "/refund" },
  ],
};

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer ref={ref} className="border-t border-border bg-secondary/35 py-14">
      <div className="container px-4">
        <div className="grid gap-8 md:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <SellerSuitLogo size="sm" />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Marketplace automation for sellers who need a clearer way to manage
              listings, orders, fulfillment, and usage.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {Object.entries(footerLinks).map(([group, links]) => (
              <div key={group}>
                <h4 className="mb-3 text-sm font-semibold capitalize text-foreground">{group}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
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

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} SellerSuit. All rights reserved.</p>
          <p>Built for marketplace operators.</p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
