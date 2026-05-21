import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calculator,
  ChevronLeft,
  Flame,
  Gem,
  HelpCircle,
  LayoutDashboard,
  ListPlus,
  LogOut,
  Package,
  Puzzle,
  Rocket,
  Search,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { cn } from '@repo/ui/lib/utils';
import SellerSuitLogo from '@repo/ui/brand/SellerSuitLogo';

const EBAY_NAV_ITEMS = [
  { key: 'overview', path: '/dashboard/ebay', icon: LayoutDashboard, label: 'Overview' },
  { key: 'listings', path: '/dashboard/ebay/listings', icon: Package, label: 'Listings' },
  { key: 'new-listing', path: '/dashboard/ebay/listings/new', icon: ListPlus, label: 'New Listing' },
  { key: 'orders', path: '/dashboard/ebay/orders', icon: ShoppingCart, label: 'eBay Orders' },
  { key: 'auto-orders', path: '/dashboard/ebay/auto-orders', icon: Truck, label: 'Auto Orders' },
  { key: 'product-research', path: '/dashboard/ebay/product-research', icon: Search, label: 'Product Research' },
  { key: 'best-selling', path: '/dashboard/ebay/best-selling', icon: TrendingUp, label: 'Best Selling' },
  { key: 'must-sell', path: '/dashboard/ebay/must-sell', icon: Flame, label: 'Must Sell' },
  { key: 'profitable-products', path: '/dashboard/ebay/profitable-products', icon: Gem, label: 'Profitable Products' },
  { key: 'calculator', path: '/dashboard/ebay/calculator', icon: Calculator, label: 'Calculator' },
  { key: 'extension', path: '/dashboard/ebay/extension', icon: Puzzle, label: 'Extension' },
];

const EBAY_FOOTER_ITEMS = [
  { key: 'settings', path: '/dashboard/ebay/settings', icon: Settings, label: 'Settings' },
  { key: 'help', path: '/documentation', icon: HelpCircle, label: 'Help' },
];

interface EbaySidebarProps {
  isMobile?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function EbaySidebar({ isMobile, onMobileClose, isCollapsed = false, onToggleCollapse }: EbaySidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const isActive = (path: string) => {
    if (path === '/dashboard/ebay') {
      return location.pathname === path || location.pathname === '/dashboard/ebay/overview';
    }
    return location.pathname.startsWith(path);
  };

  const renderItem = (item: (typeof EBAY_NAV_ITEMS)[number] | (typeof EBAY_FOOTER_ITEMS)[number]) => {
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
  };

  return (
    <aside
      data-collapsed={effectiveCollapsed}
      className={cn(
        'h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out',
        !isMobile && 'fixed left-0 top-0 z-50',
        isMobile ? 'w-full' : effectiveCollapsed ? 'w-20' : 'w-[244px]'
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2" onClick={onMobileClose}>
          {!effectiveCollapsed ? <SellerSuitLogo size="sm" showText={true} /> : <SellerSuitLogo size="sm" showText={false} />}
        </Link>
        {!isMobile && (
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft className={cn('h-4 w-4 text-slate-500 transition-transform duration-300', effectiveCollapsed && 'rotate-180')} />
          </Button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {EBAY_NAV_ITEMS.map(renderItem)}

        <div className="my-3 border-t border-slate-200 dark:border-slate-800" />

        {EBAY_FOOTER_ITEMS.map(renderItem)}
      </nav>

      {!effectiveCollapsed && (
        <div className="px-3 pb-3">
          <div
            className="rounded-lg p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
            onClick={() => {
              onMobileClose?.();
              navigate('/dashboard/subscription');
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Grow eBay Sales</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Upgrade for higher limits and automation tools.
            </p>
            <Button size="sm" variant="outline" className="w-full text-xs h-8 font-medium">
              View Plans
            </Button>
          </div>
        </div>
      )}

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
