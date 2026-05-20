import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import SellerSuitLogo from "@/components/SellerSuitLogo";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Platform", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
  { label: "Customers", href: "#testimonials" },
  { label: "Docs", href: "/documentation" },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goToPricing = () => {
    const pricingSection = document.getElementById("pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate("/#pricing");
  };

  const handlePrimaryAction = () => {
    if (user) {
      navigate("/dashboard");
      return;
    }
    navigate("/register");
  };

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-200",
        isScrolled
          ? "border-border bg-background/92 py-3 shadow-sm backdrop-blur-xl"
          : "border-transparent bg-background/75 py-4 backdrop-blur-md",
      )}
    >
      <div className="container px-4">
        <div className="flex h-10 items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="SellerSuit home"
          >
            <SellerSuitLogo size="md" />
          </button>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => navigate(link.href)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </a>
              ),
            )}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {user ? (
              <Button size="sm" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                  Log in
                </Button>
                <Button size="sm" onClick={handlePrimaryAction}>
                  Start free
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="rounded-md p-2 text-foreground md:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-3 border-t border-border py-3 md:hidden">
            <div className="grid gap-1">
              {navLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => {
                      navigate(link.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {link.label}
                  </button>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ),
              )}
            </div>

            <div className="mt-3 grid grid-cols-[auto_1fr_1fr] items-center gap-2">
              <ThemeToggle />
              {user ? (
                <Button className="col-span-2" size="sm" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                    Log in
                  </Button>
                  <Button size="sm" onClick={goToPricing}>
                    View plans
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
