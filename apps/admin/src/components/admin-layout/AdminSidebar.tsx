import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, FileClock } from "lucide-react";
import SellerSuitLogo from "@repo/ui/brand/SellerSuitLogo";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { cn } from "@repo/ui/lib/utils";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { adminNavigation, type NavNode } from "@/modules/admin/navigation/admin-navigation.config";
import { useNavBadges } from "@/modules/admin/navigation/useNavBadges";
import { filterNavigation, type AdminPermissionContext } from "@/modules/admin/permissions/admin-permissions";

// Dual-mounted routes (`/x` and `/admin/x`) are normalized so active-state
// highlights correctly no matter which mount the user is on.
function normalizePath(pathname: string) {
  if (pathname === "/admin") return "/overview";
  if (pathname.startsWith("/admin/")) return pathname.slice("/admin".length) || "/overview";
  return pathname;
}

function isActivePath(pathname: string, node: NavNode) {
  const href = node.activeMatch ?? node.route;
  if (!href) return false;
  const path = normalizePath(pathname);
  if (href === "/overview") return path === "/" || path === "/overview";
  return path === href || path.startsWith(`${href}/`);
}

function roleLabel(roles: string[]) {
  if (roles.includes("admin")) return "Admin";
  const first = roles[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "Member";
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}

export function AdminSidebar({ collapsed, onToggleCollapsed, onNavigate, mobile = false }: AdminSidebarProps) {
  const location = useLocation();
  const { user, profile, roles, isAdmin } = useAuth();
  const badges = useNavBadges();
  const effectiveCollapsed = mobile ? false : collapsed;

  const roleNames = roles.map((r) => r.role);
  const ctx: AdminPermissionContext = { isAdmin, roles: roleNames };
  const navGroups = filterNavigation(adminNavigation, ctx);

  const displayName = profile?.full_name || user?.email || "Admin";
  const initials = (profile?.full_name || user?.email || "A").trim().charAt(0).toUpperCase();

  const renderBadge = (node: NavNode) => {
    if (!node.badge || effectiveCollapsed) return null;

    if (node.badge.countKey) {
      const count = badges[node.badge.countKey];
      if (!count || count <= 0) return null;
      return (
        <Badge className="h-4 rounded-md px-1 text-[9px] font-medium border-border">{count}</Badge>
      );
    }

    if (node.badge.label) {
      return (
        <Badge
          variant="outline"
          className={cn(
            "h-4 rounded-md px-1 text-[9px] font-medium",
            node.badge.tone === "warning" && "border-amber-300 text-amber-600",
          )}
        >
          {node.badge.label}
        </Badge>
      );
    }

    return null;
  };

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
              const active = isActivePath(location.pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.route ?? item.label}
                  to={item.route ?? "#"}
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
                  {renderBadge(item)}
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
              {initials}
            </div>
            {!effectiveCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-sidebar-foreground">{displayName}</div>
                <div className="truncate text-[10px] text-muted-foreground">{roleLabel(roleNames)}</div>
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
