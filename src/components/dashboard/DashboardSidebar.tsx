import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, ChevronLeft, Rocket, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation, useNavigationConfig, type NavItemConfig, type NavSectionConfig } from '@/hooks/useNavigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SellerSuitLogo from '@/components/SellerSuitLogo';
import { getRoutePath } from '@/config/navigation.config';
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
    return <Link to={path} onClick={onMobileClose} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group', item.disabled && 'opacity-50 pointer-events-none', active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
        <Icon className={cn("h-5 w-5 transition-colors", active ? "text-background" : "text-muted-foreground group-hover:text-foreground")} />
        {!effectiveCollapsed && <span className={cn('flex-1 text-sm font-medium', active ? 'text-background' : '')}>
            {item.label}
          </span>}
        {!effectiveCollapsed && item.badge && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
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
            <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
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
          <div className="rounded-2xl p-4 relative overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg bg-[premium-surface-foreground] bg-primary border-solid" onClick={() => {
        onMobileClose?.();
        navigate('/dashboard/subscription');
      }}>
            {/* Background decorative element */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />
            
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-3">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1">Get Pro Access</h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Unlock premium features
              </p>
              <Button size="sm" className="mt-3 bg-white text-ebay hover:bg-white/90 text-xs h-8 font-semibold" onClick={e => {
            e.stopPropagation();
            onMobileClose?.();
            navigate('/dashboard/subscription');
          }}>
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>}

      {/* Footer - Logout */}
      <div className="p-3 border-t border-border">
        <button onClick={() => {
        onMobileClose?.();
        signOut();
      }} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200', 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
          <LogOut className="h-5 w-5" />
          {!effectiveCollapsed && <span className="text-sm font-medium">Log out</span>}
        </button>
      </div>
    </aside>;
}