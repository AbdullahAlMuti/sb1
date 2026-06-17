import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, LogOut, type LucideIcon } from "lucide-react";
import SellerSuitLogo from "@repo/ui/brand/SellerSuitLogo";
import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { buildNavGroups } from "@/app/router";
import { useHasRole } from "@/core/auth/RequireRole";
import { useAdminIdentity } from "@/core/auth/useAdminIdentity";

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
  const isSuperAdmin = useHasRole("super_admin");
  const identity = useAdminIdentity();

  // Single registry-driven nav; hide super-admin-only items from plain admins.
  const navGroups = buildNavGroups().map((g) => ({
    ...g,
    items: g.items.filter((item) => item.access !== "super_admin" || isSuperAdmin),
  }));

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
        {navGroups.map(({ group, items }) => (
          <div key={group} className="space-y-1">
            {!effectiveCollapsed && (
              <div className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </div>
            )}
            {items.map((item) => {
              const active = isActivePath(location.pathname, item.href);
              const Icon = item.icon as LucideIcon;
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
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {!effectiveCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-md border border-border bg-sidebar-accent/30 p-2">
          <div className={cn("flex items-center gap-2", effectiveCollapsed && "justify-center")}>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground">
              {identity.initial}
            </div>
            {!effectiveCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-sidebar-foreground">{identity.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{identity.role}</div>
              </div>
            )}
          </div>
        </div>
        {!effectiveCollapsed && (
          <button
            type="button"
            onClick={() => identity.signOut()}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
