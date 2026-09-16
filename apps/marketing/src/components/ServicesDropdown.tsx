import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Palette,
  Layout,
  Cpu,
  CreditCard,
  ShoppingBag,
  BarChart3,
  Store,
  CheckCircle2,
  Smartphone,
  Boxes,
  Cloud,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import { ServiceItem } from "@/config/types";
import { track } from "@/lib/analytics";
import { cn } from "@repo/ui/lib/utils";

interface ServicesDropdownProps {
  isMobile?: boolean;
  onItemClick?: () => void;
  onSelectService?: (service: ServiceItem) => void;
}

const renderServiceIcon = (iconName: string, className?: string) => {
  switch (iconName) {
    case "Palette":
      return <Palette className={cn("w-4 h-4", className)} />;
    case "Layout":
      return <Layout className={cn("w-4 h-4", className)} />;
    case "Cpu":
      return <Cpu className={cn("w-4 h-4", className)} />;
    case "CreditCard":
      return <CreditCard className={cn("w-4 h-4", className)} />;
    case "ShoppingBag":
      return <ShoppingBag className={cn("w-4 h-4", className)} />;
    case "BarChart3":
      return <BarChart3 className={cn("w-4 h-4", className)} />;
    case "Store":
      return <Store className={cn("w-4 h-4", className)} />;
    case "CheckCircle2":
      return <CheckCircle2 className={cn("w-4 h-4", className)} />;
    case "Smartphone":
      return <Smartphone className={cn("w-4 h-4", className)} />;
    case "Boxes":
      return <Boxes className={cn("w-4 h-4", className)} />;
    case "Cloud":
      return <Cloud className={cn("w-4 h-4", className)} />;
    default:
      return <Sparkles className={cn("w-4 h-4", className)} />;
  }
};

export const ServicesDropdown = ({
  isMobile = false,
  onItemClick,
  onSelectService,
}: ServicesDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const services = siteConfig.services || [];

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

  const handleServiceClick = (service: ServiceItem, e: React.MouseEvent) => {
    track("nav_service_click", { service: service.title, id: service.id });
    setIsOpen(false);
    onItemClick?.();

    if (onSelectService) {
      onSelectService(service);
      return;
    }

    // Smooth scroll to section if on home
    const element = document.getElementById(`service-${service.id}`);
    if (element) {
      e.preventDefault();
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const section = document.getElementById("our-services-section");
      if (section) {
        e.preventDefault();
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // -------------------------------------------------------------
  // Mobile View: Accordion inside drawer
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
            Our Services
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180 text-foreground"
            )}
          />
        </button>

        {isOpen && (
          <div className="mt-1 max-h-[320px] overflow-y-auto space-y-1 pl-2 pr-1">
            {services.map((service) => (
              <a
                key={service.id}
                href={`#service-${service.id}`}
                onClick={(e) => handleServiceClick(service, e)}
                className="group flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
              >
                <div
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `${service.accentColor}18`,
                    color: service.accentColor,
                  }}
                >
                  {renderServiceIcon(service.iconName, "w-3.5 h-3.5")}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold tracking-wide text-foreground truncate block group-hover:text-primary">
                    {service.title}
                  </span>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {service.tagline}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // Desktop View: 2-Column Mega Popover Menu
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
        <span>Our Services</span>
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
            "absolute left-0 top-full mt-2 w-[620px] origin-top-left rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.18)] dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header pill */}
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 border-b border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              Full-Service Capabilities
            </span>
            <span className="text-[11px] text-muted-foreground/80 font-medium">
              11 Enterprise Services
            </span>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {services.map((service) => (
              <a
                key={service.id}
                href={`#service-${service.id}`}
                onClick={(e) => handleServiceClick(service, e)}
                className="group flex items-start gap-2.5 rounded-xl p-2 transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer"
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-xs transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: `${service.accentColor}15`,
                    color: service.accentColor,
                  }}
                >
                  {renderServiceIcon(service.iconName, "w-4 h-4")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black tracking-wide text-foreground group-hover:text-primary transition-colors truncate">
                      {service.title}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-1" />
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {service.tagline}
                  </p>
                </div>
              </a>
            ))}
          </div>

          {/* Bottom Footer Callout */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-3 text-[11px] text-muted-foreground bg-slate-50/60 dark:bg-slate-800/40 rounded-lg p-2">
            <span>Need a custom enterprise scope?</span>
            <a
              href="#contact"
              onClick={(e) => {
                const contact = document.getElementById("contact") || document.getElementById("cta-section");
                if (contact) {
                  e.preventDefault();
                  contact.scrollIntoView({ behavior: "smooth" });
                }
                setIsOpen(false);
              }}
              className="font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Talk to an Architect →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesDropdown;
