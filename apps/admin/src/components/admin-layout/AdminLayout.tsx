import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sheet, SheetContent } from "@repo/ui/components/ui/sheet";
import { cn } from "@repo/ui/lib/utils";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [provider, setProvider] = useState("all");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] border-0 p-0 sm:max-w-none">
          <AdminSidebar
            collapsed={false}
            mobile
            onToggleCollapsed={() => undefined}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block">
        <AdminSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} />
      </div>

      <div className={cn("min-h-screen transition-[padding] duration-300 lg:pl-[260px]", collapsed && "lg:pl-[84px]")}>
        <AdminTopbar
          provider={provider}
          onProviderChange={setProvider}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 lg:px-6">
          <Outlet context={{ provider }} />
        </main>
      </div>
    </div>
  );
}
