import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Sheet, SheetContent } from '@repo/ui/components/ui/sheet';
import { cn } from '@repo/ui/lib/utils';
import { EbayHeader } from '@/components/ebay/EbayHeader';
import { EbaySidebar } from '@/components/ebay/EbaySidebar';
import { SettingsDialog } from '@/components/dashboard/SettingsDialog';
import { OnboardingStepper } from '@/components/dashboard/OnboardingStepper';
import { useAuth } from '@repo/auth/hooks/useAuth';

export default function EbayLayout() {
  const { profile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isSettingsOpen = location.pathname === '/dashboard/ebay/settings';
  const handleCloseSettings = () => {
    navigate('/dashboard/ebay');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Settings Dialog Modal */}
      <SettingsDialog 
      open={isSettingsOpen} 
      onOpenChange={(open) => {
        if (!open) handleCloseSettings();
      }}
      />

      {profile?.onboarding_completed === false && <OnboardingStepper />}

      <div className="hidden lg:block">
        <EbaySidebar isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      </div>

      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <EbaySidebar isMobile onMobileClose={() => setIsMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className={cn('transition-all duration-300 ease-in-out', isCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[244px]')}>
        <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center h-16 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 mr-3"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <EbayHeader />
          </div>
        </div>

        <main className="p-4 sm:p-5 lg:p-6">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
