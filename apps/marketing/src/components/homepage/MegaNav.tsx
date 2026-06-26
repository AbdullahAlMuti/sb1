/**
 * MegaNav — top navigation with mega-menu dropdowns.
 * Logo, grouped dropdown menus (icon+title+subtitle per item), Sign in + primary CTA.
 */
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { ThemeToggle } from "@repo/ui/theme/ThemeToggle";
import SellerSuitLogo from "@repo/ui/brand/SellerSuitLogo";
import { cn } from "@repo/ui/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { HpNav } from "@repo/types";
import { Icon } from "./LucideResolver";
import { HpCtaButton } from "./HpCtaButton";
import { track } from "@/lib/analytics";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface MegaNavProps { nav: HpNav }

export function MegaNav({ nav }: MegaNavProps) {
  const [openDrop, setOpenDrop] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const reduced = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Set when a dropdown is opened via keyboard (ArrowDown) so we move focus to
  // the first menu item once it has actually rendered (see effect below).
  const focusFirstOnOpen = useRef(false);

  // Only open dropdowns on hover for devices that actually hover. On touch, a
  // tap fires mouseenter+click in sequence, which would open then immediately
  // toggle the panel shut — so touch relies on click alone.
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Rearrange the menu to follow the order:
  // Product (drop) | Features (link) | How it works (link) | Calculator (link) | Pricing (link) | Resources (drop) | Blog (link) | FAQ (link)
  const menuItems = (() => {
    const items: Array<
      | { type: "link"; label: string; href: string }
      | { type: "drop"; label: string; drop: typeof nav.megaDrops[number]; originalIndex: number }
    > = [];

    const linksMap = new Map(nav.links.map((l) => [l.label.toLowerCase(), l]));
    const dropsMap = new Map(nav.megaDrops.map((d, index) => [d.label.toLowerCase(), { d, index }]));

    const order = [
      { label: "Product", type: "drop" },
      { label: "Features", type: "link" },
      { label: "How it works", type: "link" },
      { label: "Calculator", type: "link" },
      { label: "Pricing", type: "link" },
      { label: "Resources", type: "drop" },
      { label: "Blog", type: "link" },
      { label: "FAQ", type: "link" },
    ] as const;

    for (const item of order) {
      if (item.type === "drop") {
        const dropInfo = dropsMap.get(item.label.toLowerCase());
        if (dropInfo) {
          items.push({
            type: "drop",
            label: dropInfo.d.label,
            drop: dropInfo.d,
            originalIndex: dropInfo.index,
          });
        }
      } else {
        const link = linksMap.get(item.label.toLowerCase());
        if (link) {
          items.push({
            type: "link",
            label: link.label,
            href: link.href,
          });
        }
      }
    }

    const orderedLabels = new Set(order.map((o) => o.label.toLowerCase()));
    for (const link of nav.links) {
      if (!orderedLabels.has(link.label.toLowerCase())) {
        items.push({ type: "link", label: link.label, href: link.href });
      }
    }
    for (let index = 0; index < nav.megaDrops.length; index++) {
      const drop = nav.megaDrops[index];
      if (!orderedLabels.has(drop.label.toLowerCase())) {
        items.push({ type: "drop", label: drop.label, drop, originalIndex: index });
      }
    }

    return items;
  })();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown when navigating
  useEffect(() => { setOpenDrop(null); setMobileOpen(false); }, [location.pathname]);

  // When a dropdown opens via keyboard, move focus to its first menu item. This
  // runs after commit, so the menu items are guaranteed to be in the DOM.
  useEffect(() => {
    if (openDrop !== null && focusFirstOnOpen.current) {
      focusFirstOnOpen.current = false;
      navRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[0]?.focus();
    }
  }, [openDrop]);

  // Close on outside click, on scroll (so the panel never floats detached from
  // its trigger), and on Escape.
  useEffect(() => {
    if (openDrop === null) return;
    const onPointer = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenDrop(null);
    };
    const onScroll = () => setOpenDrop(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const trigger = triggerRefs.current[openDrop];
        setOpenDrop(null);
        trigger?.focus(); // return focus to the trigger that opened the menu
      }
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDrop]);

  const dropMotion = reduced
    ? {}
    : { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.18 } };

  return (
    <nav
      ref={navRef}
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-border/40 bg-background/70 py-3 shadow-soft-sm backdrop-blur-xl"
          : "border-border/10 bg-background/45 py-4 backdrop-blur-md",
      )}
    >
      <div className="container px-4">
        <div className="flex h-10 items-center justify-between">
          {/* Logo */}
          <Link to="/" onClick={() => track("nav_logo")}
            className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="SellerSuit home">
            <SellerSuitLogo size="md" />
          </Link>

          {/* Desktop: interleaved flat links + mega-drops */}
          <div className="hidden items-center gap-1 lg:flex">
            {menuItems.map((item, idx) => {
              if (item.type === "link") {
                return (
                  <Link key={item.href} to={item.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
                      location.pathname.startsWith(item.href) && item.href !== "/"
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground",
                    )}>
                    {item.label}
                  </Link>
                );
              } else {
                const di = item.originalIndex;
                const drop = item.drop;
                return (
                  <div key={idx} className="relative">
                    <button
                      type="button"
                      ref={(el) => { triggerRefs.current[di] = el; }}
                      onClick={() => setOpenDrop(openDrop === di ? null : di)}
                      onMouseEnter={() => { if (canHover) setOpenDrop(di); }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          focusFirstOnOpen.current = true;
                          setOpenDrop(di);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
                        openDrop === di ? "bg-secondary text-foreground" : "text-muted-foreground",
                      )}
                      aria-expanded={openDrop === di}
                      aria-haspopup="true"
                    >
                      {drop.label}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openDrop === di && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {openDrop === di && (
                        <motion.div key={`drop-${di}`} {...dropMotion}
                          onMouseLeave={() => { if (canHover) setOpenDrop(null); }}
                          onKeyDown={(e) => {
                            const items = Array.from(
                              e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
                            );
                            const idx = items.indexOf(document.activeElement as HTMLElement);
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              items[(idx + 1) % items.length]?.focus();
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              items[(idx - 1 + items.length) % items.length]?.focus();
                            } else if (e.key === "Home") {
                              e.preventDefault();
                              items[0]?.focus();
                            } else if (e.key === "End") {
                              e.preventDefault();
                              items[items.length - 1]?.focus();
                            }
                          }}
                          className="absolute right-0 top-full mt-2 w-[min(480px,calc(100vw-2rem))] rounded-xl border border-border bg-card shadow-soft-xl"
                          role="menu"
                        >
                          <div className="flex gap-0 p-3">
                            {drop.groups.map((group, gi) => (
                              <div key={gi} className="flex-1 min-w-[200px] px-2">
                                {group.heading && (
                                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {group.heading}
                                  </p>
                                )}
                                {group.items.map((subItem, ii) => (
                                  <Link key={ii} to={subItem.href} role="menuitem"
                                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
                                    onClick={() => setOpenDrop(null)}
                                  >
                                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                      <Icon name={subItem.icon} className="h-3.5 w-3.5" />
                                    </span>
                                    <span>
                                      <span className="block text-sm font-medium text-foreground">{subItem.title}</span>
                                      <span className="block text-xs text-muted-foreground">{subItem.subtitle}</span>
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
            })}
          </div>

          {/* Desktop right: theme + login + CTA */}
          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to={nav.loginCta.href}>{nav.loginCta.label}</Link>
            </Button>
            <HpCtaButton cta={nav.primaryCta} size="sm" className="rounded-lg" />
          </div>

          {/* Mobile hamburger */}
          <button type="button" aria-label="Toggle menu" aria-expanded={mobileOpen}
            className="rounded-md p-2 text-foreground lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="mt-3 border-t border-border py-3 lg:hidden">
            <div className="grid gap-1">
              {menuItems.map((item, idx) => {
                if (item.type === "link") {
                  return (
                    <Link key={item.href} to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                      {item.label}
                    </Link>
                  );
                } else {
                  const di = item.originalIndex;
                  return item.drop.groups.flatMap((group) =>
                    group.items.map((subItem, ii) => (
                      <Link key={`${di}-${ii}`} to={subItem.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <Icon name={subItem.icon} className="h-4 w-4 shrink-0" />
                        {subItem.title}
                      </Link>
                    ))
                  );
                }
              })}
            </div>
            <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-2">
              <ThemeToggle />
              <HpCtaButton cta={nav.primaryCta} size="sm" className="w-full" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default MegaNav;
