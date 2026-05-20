import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { NoticesBanner } from './NoticesBanner';
import { CreditsLowBanner } from './CreditsLowBanner';
import { cn } from '@repo/ui/lib/utils';
import { Menu, Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Sheet, SheetContent } from '@repo/ui/components/ui/sheet';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useTheme } from '@repo/ui/theme/useTheme';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { useAlerts } from '@repo/api-client/hooks/useAlerts';
import { supabase } from '@repo/api-client/supabase/client';
import { toast } from 'sonner';

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { subscribed, planName, usage, limits, openCustomerPortal } = useSubscription();
  const navigate = useNavigate();

  const creditsTotal = usage?.credits_total ?? limits?.credits_per_month ?? 0;
  const creditsRemaining = usage?.credits_remaining ?? 0;
  const creditsUsed = usage?.credits_used ?? Math.max(creditsTotal - creditsRemaining, 0);

  // Only paid/trialing users (i.e. subscribed) should see low-credit warnings.
  // Brand-new users (free / unsubscribed) must not see phantom warnings.
  const isInitializingCredits = Boolean(subscribed) && creditsTotal > 0 && creditsRemaining === 0 && creditsUsed === 0;
  const eligibleForCreditWarning = Boolean(subscribed) && !isInitializingCredits;

  // One-time toast when credits are low (<= 5)
  useEffect(() => {
    const shouldToast = eligibleForCreditWarning && creditsTotal > 0 && creditsRemaining <= 5;
    if (!shouldToast) {
      sessionStorage.removeItem('low_credits_toast_shown');
      return;
    }

    if (sessionStorage.getItem('low_credits_toast_shown')) return;
    sessionStorage.setItem('low_credits_toast_shown', '1');
    toast.warning('Credits running low. Renew to avoid interruptions.');
  }, [creditsRemaining, creditsTotal, eligibleForCreditWarning]);

  // Sidebar collapse state is managed via props from DashboardSidebar

  // Removed duplicate alert fetching, useAlerts handles this globally if needed
  // But wait, actually we need to use useAlerts here!
  const { unreadCount } = useAlerts();

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
      window.postMessage({ type: 'REFRESH_EXTENSION_TOKEN' }, window.location.origin);
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
          <CreditsLowBanner
            creditsRemaining={creditsRemaining}
            creditsTotal={creditsTotal}
            eligible={eligibleForCreditWarning}
            onRenew={() => openCustomerPortal()}
          />
          <NoticesBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}