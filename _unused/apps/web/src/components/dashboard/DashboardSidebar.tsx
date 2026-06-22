import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, LogOut, Settings, Globe, HelpCircle, 
  ArrowUpCircle, Download, Gift, Info, ChevronsUpDown
} from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { useNavigation, useNavigationConfig, type NavItemConfig, type NavSectionConfig } from '@repo/config/useNavigation';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';
import SellerSuitLogo from '@repo/ui/brand/SellerSuitLogo';
import { getRoutePath } from '@repo/config/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Separator } from '@repo/ui/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover';

interface DashboardSidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
}

export function DashboardSidebar({
  onCollapseChange,
  isMobile,
  onMobileClose
}: DashboardSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { subscribed } = useSubscription();
  const {
    isActive,
    isAdminSection
  } = useNavigation();
  const {
    sections,
    footerItems,
    adminPanelLink
  } = useNavigationConfig(isAdmin, isAdminSection);

  // Never collapse in mobile mode
  const effectiveCollapsed = isMobile ? false : isCollapsed;
  const handleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    onCollapseChange?.(collapsed);
  };

  // Reusable navigation item component
  const NavItemComponent = ({
    item
  }: {
    item: NavItemConfig;
  }) => {
    const Icon = item.icon;
    const active = isActive(item.key);
    const path = getRoutePath(item.key);
      return <Link to={path} onClick={onMobileClose} className={cn('flex items-center gap-3 px-3 py-1.5 rounded-md group', item.disabled && 'opacity-50 pointer-events-none', active ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
          <Icon className={cn("h-[18px] w-[18px]", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
          {!effectiveCollapsed && <span className={cn("text-[13px] font-medium", active ? "text-foreground font-semibold" : "")}>
              {item.label}
            </span>}
          {!effectiveCollapsed && item.badge && <span className="text-[11px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {item.badge}
            </span>}
        </Link>;
  };

  // Section label component
  const SectionLabel = ({
    label
  }: {
    label?: string;
  }) => {
    if (effectiveCollapsed || !label) return null;
    return <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider mb-2 px-3 mt-4">
        {label}
      </p>;
  };

  // Render a navigation section
  const renderSection = (section: NavSectionConfig, index: number) => <div key={section.id}>
      {index > 0 && <SectionLabel label={section.label} />}
      {section.items.map(item => <NavItemComponent key={item.key} item={item} />)}
    </div>;

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isEbay = location.pathname.startsWith('/dashboard/ebay');
  const settingsPath = isEbay ? '/dashboard/ebay/settings' : '/dashboard/settings';

  return <aside data-collapsed={effectiveCollapsed} className={cn("h-screen bg-card border-r border-border flex flex-col",
  // Only position fixed on desktop, sheet handles mobile
  !isMobile && "fixed left-0 top-0 z-50", isMobile ? "w-full" : effectiveCollapsed ? "w-20" : "w-[260px]")}>
      {/* Logo Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="flex items-center gap-2" onClick={onMobileClose}>
          {!effectiveCollapsed ? <SellerSuitLogo size="sm" showText={true} /> : <SellerSuitLogo size="sm" showText={false} />}
        </Link>
        {!isMobile && <Button variant="ghost" size="icon" onClick={() => handleCollapse(!isCollapsed)} className="h-8 w-8 rounded-lg hover:bg-muted">
            <ChevronLeft className={cn("h-4 w-4", isCollapsed && "rotate-180")} />
          </Button>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="space-y-1">
          {sections.map((section, index) => renderSection(section, index))}
          
          {/* Footer items (settings, etc.) */}
          {footerItems.length > 0 && <>
              <div className="my-3 border-t border-border" />
              {footerItems.map(item => <NavItemComponent key={item.key} item={item} />)}
            </>}
          
          {/* Admin Panel Link (for users with admin access) */}
          {adminPanelLink && <NavItemComponent item={adminPanelLink} />}
        </div>
      </nav>

      {/* Footer - Profile Popover */}
      <div className="p-3 border-t border-border">
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors text-left w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              effectiveCollapsed && "justify-center px-1"
            )}>
              <Avatar className="h-9 w-9 border border-border select-none pointer-events-none">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              
              {!effectiveCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {subscribed ? 'Pro Active' : 'Free Trial'}
                  </p>
                </div>
              )}
              
              {!effectiveCollapsed && (
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </button>
          </PopoverTrigger>
          
          <PopoverContent 
            side={isMobile ? "top" : "right"} 
            align="end" 
            sideOffset={12} 
            className="w-56 p-1 bg-popover border border-border rounded-xl shadow-lg"
          >
            <div className="px-2.5 py-2 text-left">
              <p className="text-xs font-semibold text-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user?.email}
              </p>
              <div className="mt-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-muted text-muted-foreground border border-border">
                  {subscribed ? 'Pro Plan' : 'Free Trial'}
                </span>
              </div>
            </div>
            
            <Separator className="bg-border/60 my-1" />
            
            <div className="space-y-0.5">
              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate(settingsPath);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                Settings
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/documentation');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
              >
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Language
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/documentation');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Get help
              </button>
            </div>

            <Separator className="bg-border/60 my-1" />

            <div className="space-y-0.5">
              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/dashboard/subscription');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
              >
                <ArrowUpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Upgrade plan
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/dashboard/extension');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                Get apps and extensions
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/dashboard/subscription');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
              >
                <Gift className="h-3.5 w-3.5 text-muted-foreground" />
                Gift SellerSuit
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/documentation');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
              >
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                Learn more
              </button>
            </div>

            <Separator className="bg-border/60 my-1" />

            <button 
              onClick={() => {
                onMobileClose?.();
                signOut();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </aside>;
}
