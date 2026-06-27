import { LogOut, Menu, UserCircle } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { useAdminIdentity } from "@/core/auth/useAdminIdentity";

interface AdminTopbarProps {
  onOpenMobileSidebar: () => void;
}

/**
 * Lean operator topbar: mobile menu + real identity account menu with a working
 * Sign Out. Dead decoration (workspace select, provider filter, fixed date
 * range, fake notification badge, non-functional search) was removed.
 */
export function AdminTopbar({ onOpenMobileSidebar }: AdminTopbarProps) {
  const identity = useAdminIdentity();

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

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="h-11 gap-3 rounded-xl px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {identity.initial}
              </div>
              <div className="hidden text-left lg:block">
                <div className="text-sm font-semibold leading-tight text-slate-900">{identity.name}</div>
                <div className="text-xs text-slate-500">{identity.role}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{identity.email || "Admin account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserCircle className="mr-2 h-4 w-4" />
              {identity.role}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => identity.signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
