import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import SellerSuitLogo from "@repo/ui/brand/SellerSuitLogo";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@repo/ui/lib/utils";
import { siteConfig } from "@/config/siteConfig";
import { track } from "@/lib/analytics";
import { CtaButton } from "@/components/primitives/CtaButton";

const Navbar = () => {
  const { nav } = siteConfig;
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300 ease-in-out backdrop-blur-md backdrop-saturate-150",
        isScrolled
          ? "border-black/[0.06] bg-white/70 shadow-[0_2px_12px_-5px_rgba(0,0,0,0.05)] py-2.5"
          : "border-transparent bg-white/40 py-4",
      )}
    >
      <div className="container px-4">
        <div className="flex h-10 items-center justify-between">
          <Link
            to="/"
            onClick={() => track("nav_logo")}
            className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${siteConfig.brand.name} home`}
          >
            <SellerSuitLogo size="md" />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {nav.links.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => track(link.event, { href: link.href })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] transition-colors hover:text-foreground",
                  isActive(link.href)
                    ? "bg-card text-foreground font-semibold shadow-soft-sm"
                    : "text-muted-foreground font-normal",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <Link
                to={nav.loginCta.href}
                onClick={() => track(nav.loginCta.event)}
              >
                {nav.loginCta.label}
              </Link>
            </Button>
            <CtaButton cta={nav.primaryCta} size="sm" />
          </div>

          <button
            type="button"
            className="rounded-md p-2 text-foreground lg:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-3 rounded-lg border border-border bg-card p-3 shadow-soft-lg lg:hidden">
            <div className="grid gap-1">
              {nav.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => {
                    track(link.event, { href: link.href });
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                    isActive(link.href)
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-3">
              <CtaButton cta={nav.primaryCta} size="sm" className="w-full" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
