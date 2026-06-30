import { Link } from "react-router-dom";
import SellerSuitLogo from "@repo/ui/brand/SellerSuitLogo";
import { siteConfig } from "@/config/siteConfig";

const Footer = () => {
  const { footer } = siteConfig;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#eceae6] py-14" style={{ background: "#faf9f7" }}>
      <div className="container px-4">
        <div className="grid gap-8 md:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <SellerSuitLogo size="sm" />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{footer.tagline}</p>
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

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} {footer.copyright}</p>
          <p>Built for marketplace operators.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
