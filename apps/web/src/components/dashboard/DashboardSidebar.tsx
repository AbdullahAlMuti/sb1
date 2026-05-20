import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, Rocket, Shield } from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useNavigation, useNavigationConfig, type NavItemConfig, type NavSectionConfig } from '@repo/config/useNavigation';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';
import SellerSuitLogo from '@repo/ui/brand/SellerSuitLogo';
import { getRoutePath } from '@repo/config/navigation';
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
  const {
    isAdmin,
    signOut
  } = useAuth();
  const navigate = useNavigate();
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
          {!effectiveCollapsed && <span className={cn('flex-1 text-[13px] font-medium', active ? 'text-foreground' : '')}>
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

      {/* Pro Access Card */}
      {!effectiveCollapsed && !isAdminSection && <div className="px-3 pb-3">
          <div className="rounded-lg p-3 relative cursor-pointer bg-card border border-border shadow-sm hover:bg-muted/50" onClick={() => {
        onMobileClose?.();
        navigate('/dashboard/subscription');
      }}>
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Get Pro Access</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Unlock premium features
            </p>
            <Button variant="outline" size="sm" className="w-full text-xs h-8 font-medium" onClick={e => {
            e.stopPropagation();
            onMobileClose?.();
            navigate('/dashboard/subscription');
          }}>
              Upgrade Now
            </Button>
          </div>
        </div>}

      {/* Footer - Logout */}
      <div className="p-3 border-t border-border">
        <button onClick={() => {
        onMobileClose?.();
        signOut();
      }} className={cn('w-full flex items-center gap-3 px-3 py-1.5 rounded-md', 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
          <LogOut className="h-[18px] w-[18px]" />
          {!effectiveCollapsed && <span className="text-[13px] font-medium">Log out</span>}
        </button>
      </div>
    </aside>;
}