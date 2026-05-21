import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  Search,
  Globe,
  Palette,
  BarChart3,
  Megaphone,
  Sparkles,
  Bookmark,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Rocket,
  CreditCard,
  Settings,
} from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';
import SellerSuitLogo from '@repo/ui/brand/SellerSuitLogo';
import { useShopifyPageSettings } from '../../hooks/shopify/useShopifyPageSettings';

const SHOPIFY_NAV_ITEMS = [
  { key: 'dashboard', path: '/dashboard/shopify', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'winning-products', path: '/dashboard/shopify/winning-products', icon: Trophy, label: 'Product Opportunities' },
  { key: 'product-research', path: '/dashboard/shopify/product-research', icon: Search, label: 'Product Research' },
  { key: 'store-explorer', path: '/dashboard/shopify/store-explorer', icon: Globe, label: 'Store Explorer' },
  { key: 'store-designs', path: '/dashboard/shopify/store-designs', icon: Palette, label: 'Store Designs' },
  { key: 'store-analytics', path: '/dashboard/shopify/store-analytics', icon: BarChart3, label: 'Store Intelligence' },
  { key: 'ad-library', path: '/dashboard/shopify/ad-library', icon: Megaphone, label: 'Ad Library' },
  { key: 'ai-copy-studio', path: '/dashboard/shopify/copy-studio', icon: Sparkles, label: 'AI Copy Studio' },
  { key: 'saved-items', path: '/dashboard/shopify/saved-items', icon: Bookmark, label: 'Saved Research' },
];

const SHOPIFY_FOOTER_ITEMS = [
  { key: 'billing', path: '/dashboard/shopify/billing', icon: CreditCard, label: 'Billing' },
  { key: 'settings', path: '/dashboard/shopify/settings', icon: Settings, label: 'Settings' },
  { key: 'help', path: '/dashboard/shopify/help', icon: HelpCircle, label: 'Help & Support' },
];

interface ShopifySidebarProps {
  isMobile?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ShopifySidebar({ isMobile, onMobileClose, isCollapsed = false, onToggleCollapse }: ShopifySidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { settings, isLoading } = useShopifyPageSettings();

  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const isActive = (path: string) => {
    if (path === '/dashboard/shopify') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const navItems = isLoading || settings.length === 0 ? SHOPIFY_NAV_ITEMS : [
    ...settings.filter(s => s.is_visible && SHOPIFY_NAV_ITEMS.some(nav => nav.key === s.page_key)).map(s => ({
      ...SHOPIFY_NAV_ITEMS.find(nav => nav.key === s.page_key)!,
      label: s.name, // Use DB name
    })),
    ...SHOPIFY_NAV_ITEMS.filter(nav => !settings.some(s => s.page_key === nav.key))
  ];

  const footerItems = isLoading || settings.length === 0 ? SHOPIFY_FOOTER_ITEMS : SHOPIFY_FOOTER_ITEMS.map(item => {
    const s = settings.find(s => s.page_key === item.key);
    return s ? { ...item, label: s.name, isVisible: s.is_visible } : { ...item, isVisible: true };
  }).filter(item => item.isVisible);

  return (
    <aside
      data-collapsed={effectiveCollapsed}
      className={cn(
        'h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out',
        !isMobile && 'fixed left-0 top-0 z-50',
        isMobile ? 'w-full' : effectiveCollapsed ? 'w-20' : 'w-[260px]'
      )}
    >
      {/* Logo Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2" onClick={onMobileClose}>
          {!effectiveCollapsed ? (
            <SellerSuitLogo size="sm" showText={true} />
          ) : (
            <SellerSuitLogo size="sm" showText={false} />
          )}
        </Link>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className={cn('h-4 w-4 text-slate-500 transition-transform duration-300', effectiveCollapsed && 'rotate-180')} />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-1.5 rounded-md group',
                active
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className={cn('h-[18px] w-[18px]', active ? 'text-slate-900 dark:text-white' : 'text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-300')} />
              {!effectiveCollapsed && (
                <span className="text-[13px] font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t border-slate-200 dark:border-slate-800" />

        {/* Footer items */}
        {footerItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-1.5 rounded-md group',
                active
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className={cn('h-[18px] w-[18px]', active ? 'text-slate-900 dark:text-white' : 'text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-300')} />
              {!effectiveCollapsed && <span className="text-[13px] font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade Card */}
      {!effectiveCollapsed && (
        <div className="px-3 pb-3">
          <div
            className="rounded-lg p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
            onClick={() => {
              onMobileClose?.();
              navigate('/dashboard/shopify/billing');
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Unlock Insights</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Access advanced filters, store intelligence, and higher AI limits.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-8 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onMobileClose?.();
                navigate('/dashboard/shopify/billing');
              }}
            >
              Upgrade Plan
            </Button>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            onMobileClose?.();
            signOut();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          {!effectiveCollapsed && <span className="text-sm font-medium">Log out</span>}
        </button>
      </div>
    </aside>
  );
}
