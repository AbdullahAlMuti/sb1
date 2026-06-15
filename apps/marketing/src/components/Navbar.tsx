import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { ThemeToggle } from "@repo/ui/theme/ThemeToggle";
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
        "sticky top-0 z-50 border-b transition-all duration-200",
        isScrolled
          ? "border-border bg-background/92 py-3 shadow-sm backdrop-blur-xl"
          : "border-transparent bg-background/75 py-4 backdrop-blur-md",
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

          <div className="hidden items-center gap-1 md:flex">
            {nav.links.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => track(link.event, { href: link.href })}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
                  isActive(link.href)
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
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
            className="rounded-md p-2 text-foreground md:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-3 border-t border-border py-3 md:hidden">
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
                    "rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
                    isActive(link.href)
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-2">
              <ThemeToggle />
              <CtaButton cta={nav.primaryCta} size="sm" className="w-full" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
