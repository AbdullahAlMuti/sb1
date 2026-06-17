import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  Bell,
  Bot,
  Boxes,
  ChevronLeft,
  ClipboardList,
  FileClock,
  Gauge,
  LifeBuoy,
  Lock,
  Megaphone,
  Newspaper,
  Package,
  PlugZap,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tags,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import SellerSuitLogo from "@repo/ui/brand/SellerSuitLogo";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { cn } from "@repo/ui/lib/utils";
import { SHOPIFY_ENABLED } from "@repo/config/marketplaceScope";

type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
};

type AdminNavGroup = {
  label?: string;
  items: AdminNavItem[];
};

const navGroups: AdminNavGroup[] = [
  {
    items: [{ label: "Overview", href: "/overview", icon: Gauge }],
  },
  {
    label: "Customers",
    items: [
      { label: "Users", href: "/users", icon: Users },
      { label: "Workspaces", href: "/workspaces", icon: Boxes },
      { label: "Stores", href: "/stores", icon: Store },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Integrations", href: "/integrations", icon: PlugZap },
      { label: "Products", href: "/products", icon: Package },
      { label: "Listings", href: "/listings", icon: Tags },
      { label: "Orders", href: "/orders", icon: ShoppingCart },
      { label: "Customers", href: "/customers", icon: ShoppingBag },
      { label: "Inventory", href: "/inventory", icon: Boxes },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Sync Health", href: "/sync-health", icon: Activity, badge: 6 },
      { label: "Webhook Events", href: "/webhook-events", icon: Webhook },
      { label: "Usage", href: "/usage", icon: Receipt },
      { label: "Support", href: "/support", icon: LifeBuoy, badge: 4 },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "AI / Automation", href: "/ai", icon: Bot },
      { label: "Description Config", href: "/description-config", icon: ClipboardList },
      // eBay-only scope (see AI_AGENT_SCOPE_EBAY_ONLY.md): the Shopify App admin
      // entry is hidden while Shopify is disabled. The page stays mounted.
      ...(SHOPIFY_ENABLED
        ? [{ label: "Shopify App", href: "/shopify-app", icon: ShoppingBag }]
        : []),
      { label: "eBay App", href: "/ebay-app", icon: ShoppingBag },
      { label: "Extension Setup", href: "/extension", icon: PlugZap },
      { label: "Extension Control", href: "/extension-control", icon: ShieldCheck },
      { label: "Blog", href: "/blog", icon: Newspaper },
      { label: "Notices", href: "/notices", icon: Megaphone, badge: 12 },
      { label: "Audit Logs", href: "/audit-logs", icon: ClipboardList },
      { label: "Security", href: "/security", icon: Lock },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/overview") return pathname === "/" || pathname === "/overview" || pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}

export function AdminSidebar({ collapsed, onToggleCollapsed, onNavigate, mobile = false }: AdminSidebarProps) {
  const location = useLocation();
  const effectiveCollapsed = mobile ? false : collapsed;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar-background text-sidebar-foreground",
        effectiveCollapsed ? "w-[84px]" : "w-[240px]",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link to="/overview" onClick={onNavigate} className="flex min-w-0 items-center gap-2">
          <SellerSuitLogo size="sm" showText={!effectiveCollapsed} />
        </Link>
        {!mobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            className="h-7 w-7 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", effectiveCollapsed && "rotate-180")} />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navGroups.map((group, groupIndex) => (
          <div key={group.label ?? groupIndex} className="space-y-1">
            {group.label && !effectiveCollapsed && (
              <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = isActivePath(location.pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  title={effectiveCollapsed ? item.label : undefined}
                  className={cn(
                    "group flex h-8 items-center gap-3 rounded-md px-3 text-xs font-medium transition",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    effectiveCollapsed && "justify-center px-0",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!effectiveCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                  {!effectiveCollapsed && item.badge && (
                    <Badge className="h-4 rounded-md px-1 text-[9px] font-medium border-border">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className={cn("rounded-md border border-border bg-sidebar-accent/30 p-2", effectiveCollapsed && "p-2")}>
          <div className={cn("flex items-center gap-2", effectiveCollapsed && "justify-center")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
              A
            </div>
            {!effectiveCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-sidebar-foreground">Admin User</div>
                <div className="truncate text-[10px] text-muted-foreground">Super Admin</div>
              </div>
            )}
          </div>
        </div>
        {!effectiveCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <FileClock className="h-3.5 w-3.5" />
            Collapse
          </button>
        )}
      </div>
    </aside>
  );
}
