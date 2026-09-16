import { useState, useRef, useEffect } from "react";
import { ChevronDown, ArrowUpRight, Sparkles, ArrowUpDown, FileText, Layers, Boxes } from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { ProductItem } from "@/config/types";
import { track } from "@/lib/analytics";
import { cn } from "@repo/ui/lib/utils";

interface ProductsDropdownProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

// Icon mapper for dynamic string iconName
const renderProductIcon = (iconName: string, className?: string) => {
  switch (iconName) {
    case "Sparkles":
      return <Sparkles className={cn("w-4 h-4", className)} />;
    case "ArrowUpDown":
      return <ArrowUpDown className={cn("w-4 h-4", className)} />;
    case "FileText":
      return <FileText className={cn("w-4 h-4", className)} />;
    case "Layers":
      return <Layers className={cn("w-4 h-4", className)} />;
    default:
      return <Boxes className={cn("w-4 h-4", className)} />;
  }
};

export const ProductsDropdown = ({ isMobile = false, onItemClick }: ProductsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const products = siteConfig.products || [];

  // Close on outside click (desktop)
  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isMobile]);

  // Desktop hover debounce handlers
  const handleMouseEnter = () => {
    if (isMobile) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // -------------------------------------------------------------
  // Mobile View: Accordion style inside mobile drawer
  // -------------------------------------------------------------
  if (isMobile) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
            isOpen ? "bg-muted text-foreground font-semibold" : "text-muted-foreground"
          )}
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-1.5">
            Our Products
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180 text-foreground"
            )}
          />
        </button>

        {isOpen && (
          <div className="mt-1 space-y-1 pl-2">
            {products.map((product) => {
              const isComingSoon = product.status === "coming_soon";

              if (isComingSoon) {
                return (
                  <div
                    key={product.name}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors bg-muted/30"
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: product.color ? `${product.color}15` : "#fef3c7",
                        color: product.color || "#d97706",
                      }}
                    >
                      {renderProductIcon(product.iconName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {product.name}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-medium text-amber-600 border border-amber-500/20">
                          {product.statusLabel || "Coming Soon"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {product.tagline}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={product.name}
                  href={product.href}
                  target={product.isExternal ? "_blank" : undefined}
                  rel={product.isExternal ? "noopener noreferrer" : undefined}
                  onClick={() => {
                    track("nav_product_click", { product: product.name, href: product.href });
                    onItemClick?.();
                  }}
                  className="group flex items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: product.color ? `${product.color}18` : "#ecfdf5",
                      color: product.color || "#10b981",
                    }}
                  >
                    {renderProductIcon(product.iconName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {product.name}
                      </span>
                      {product.status === "live" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-600 border border-emerald-500/20">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {product.tagline}
                    </p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // Desktop View: Glassmorphic Floating Popover Card
  // -------------------------------------------------------------
  return (
    <div
      ref={dropdownRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] transition-all cursor-pointer",
          isOpen
            ? "bg-card text-foreground font-semibold shadow-soft-sm"
            : "text-muted-foreground font-normal hover:text-foreground"
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>Our Products</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground",
            isOpen && "rotate-180 text-foreground"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 top-full mt-2 w-[340px] origin-top-left rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header pill */}
          <div className="flex items-center justify-between px-3 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ecosystem Products
            </span>
            <span className="text-[10px] text-muted-foreground/70 font-medium">
              Portfolio
            </span>
          </div>

          <div className="space-y-1">
            {products.map((product) => {
              const isComingSoon = product.status === "coming_soon";

              if (isComingSoon) {
                return (
                  <div
                    key={product.name}
                    className="flex items-start gap-3 rounded-xl p-2.5 transition-all bg-slate-50/70 dark:bg-slate-800/40 opacity-90 cursor-default"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs"
                      style={{
                        backgroundColor: product.color ? `${product.color}15` : "#fef3c7",
                        color: product.color || "#d97706",
                      }}
                    >
                      {renderProductIcon(product.iconName, "w-4 h-4")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground truncate">
                          {product.name}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {product.statusLabel || "Coming Soon"}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">
                        {product.tagline}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={product.name}
                  href={product.href}
                  target={product.isExternal ? "_blank" : undefined}
                  rel={product.isExternal ? "noopener noreferrer" : undefined}
                  onClick={() => {
                    track("nav_product_click", { product: product.name, href: product.href });
                    setIsOpen(false);
                  }}
                  className="group flex items-start gap-3 rounded-xl p-2.5 transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: product.color ? `${product.color}18` : "#ecfdf5",
                      color: product.color || "#10b981",
                    }}
                  >
                    {renderProductIcon(product.iconName, "w-4 h-4")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {product.name}
                        </span>
                        {product.status === "live" && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Live
                          </span>
                        )}
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-1" />
                    </div>
                    <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5 group-hover:text-foreground/80 transition-colors">
                      {product.tagline}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsDropdown;
