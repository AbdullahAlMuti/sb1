import {
  Bell,
  CalendarDays,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  SlidersHorizontal,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { cn } from "@repo/ui/lib/utils";
import { SHOPIFY_ENABLED } from "@repo/config/marketplaceScope";

// eBay-only scope (see AI_AGENT_SCOPE_EBAY_ONLY.md): the Shopify provider filter
// is hidden while Shopify is disabled.
const providers = [
  { id: "all", label: "All" },
  { id: "ebay", label: "eBay" },
  ...(SHOPIFY_ENABLED ? [{ id: "shopify", label: "Shopify" }] : []),
  { id: "amazon", label: "Amazon" },
];

interface AdminTopbarProps {
  onOpenMobileSidebar: () => void;
  provider: string;
  onProviderChange: (provider: string) => void;
}

export function AdminTopbar({ onOpenMobileSidebar, provider, onProviderChange }: AdminTopbarProps) {
  const { user, profile, roles, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email || "Admin";
  const initials = (profile?.full_name || user?.email || "A").trim().charAt(0).toUpperCase();
  const roleNames = roles.map((r) => r.role);
  const roleLabel = roleNames.includes("admin")
    ? "Admin"
    : roleNames[0]
      ? roleNames[0].charAt(0).toUpperCase() + roleNames[0].slice(1)
      : "Member";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-3 px-4 lg:px-5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative hidden flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search users, workspaces, stores, orders..."
            className="h-10 max-w-[520px] rounded-xl border-slate-200 bg-slate-50 pl-9 pr-12 text-sm"
          />
          <span className="pointer-events-none absolute left-[470px] top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 xl:block">
            Ctrl K
          </span>
        </div>

        <div className="hidden min-w-[190px] md:block">
          <Select defaultValue="all-workspaces">
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Workspace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-workspaces">All Workspaces</SelectItem>
              <SelectItem value="dreamy-home">Dreamy Home</SelectItem>
              <SelectItem value="top-rated">TopRatedDeals</SelectItem>
              <SelectItem value="seller-central">USA Seller Central</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="hidden items-center gap-1 xl:flex">
          <span className="mr-1 text-xs font-medium text-slate-500">Provider:</span>
          {providers.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={provider === item.id ? "default" : "outline"}
              onClick={() => onProviderChange(item.id)}
              className={cn(
                "h-9 rounded-xl px-3 text-xs font-semibold",
                provider === item.id
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="hidden h-10 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-700 lg:flex"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          May 1 - May 31, 2025
        </Button>

        <Button type="button" variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl">
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
        </Button>

        <Button type="button" variant="ghost" size="icon" className="hidden h-10 w-10 rounded-xl md:inline-flex">
          <HelpCircle className="h-5 w-5 text-slate-600" />
        </Button>

        <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 md:hidden">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="h-11 gap-3 rounded-xl px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="hidden text-left lg:block">
                <div className="max-w-[160px] truncate text-sm font-semibold leading-tight text-slate-900">{displayName}</div>
                <div className="text-xs text-slate-500">{roleLabel}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>Security settings</DropdownMenuItem>
            <DropdownMenuItem>Help center</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
