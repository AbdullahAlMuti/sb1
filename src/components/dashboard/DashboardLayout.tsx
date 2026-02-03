import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { NoticesBanner } from './NoticesBanner';
import { cn } from '@/lib/utils';
import { Menu, Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Listen for sidebar collapse state via custom event
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent<{
      collapsed: boolean;
    }>) => {
      setIsCollapsed(e.detail.collapsed);
    };
    window.addEventListener('sidebar-toggle' as any, handleSidebarToggle);
    return () => window.removeEventListener('sidebar-toggle' as any, handleSidebarToggle);
  }, []);

  // Fetch unread alerts count for mobile header
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('inventory_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'UNREAD');

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    fetchUnreadCount();

    const channel = supabase
      .channel('mobile-alerts-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 🔐 EXTENSION SYNC (SENDER)
  // ─────────────────────────────────────────────────────────────────────────────
  // This effect ensures the Chrome Extension receives the latest Auth Token.
  // 
  // HOW IT WORKS:
  // 1. We listen for `user` changes from Supabase Auth.
  // 2. When a user is detected, we send a message to the window.
  // 3. The content script (`auth_sync.js`) listening on the window picks this up.
  // 4. It then forwards the token to the Extension Background script.
  // 
  // This serves as a "Force Push" to ensure the extension is logged in immediately.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      window.postMessage({ type: 'REFRESH_EXTENSION_TOKEN' }, '*');
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <DashboardSidebar
            onCollapseChange={setIsCollapsed}
            isMobile={true}
            onMobileClose={() => setIsMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar onCollapseChange={setIsCollapsed} />
      </div>

      <div className={cn(
        "min-h-screen transition-[margin] duration-300 ease-in-out flex flex-col",
        // Only apply margin on desktop
        "lg:ml-[260px]",
        isCollapsed && "lg:ml-20"
      )}>
        {/* Mobile header with menu button and notifications */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold text-foreground">SellerSuit</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Moon className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>

            {/* Notifications bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              onClick={() => navigate('/dashboard/alerts')}
            >
              <Bell className="h-5 w-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block">
          <DashboardHeader />
        </div>

        <main className="flex-1 p-4 lg:p-6 xl:p-8">
          <NoticesBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}