import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
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
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Layers,
  ChevronsUpDown,
  Globe,
  ArrowUpCircle,
  Download,
  Gift,
  Info
} from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { cn } from '@repo/ui/lib/utils';
import SellerSuitLogo from '@repo/ui/brand/SellerSuitLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Separator } from '@repo/ui/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover';

const EBAY_NAV_ITEMS = [
  { key: 'overview', path: '/dashboard/ebay', icon: LayoutDashboard, label: 'Overview' },
  { key: 'listings', path: '/dashboard/ebay/listings', icon: Package, label: 'Listings' },
  { key: 'new-listing', path: '/dashboard/ebay/listings/new', icon: ListPlus, label: 'New Listing' },
  { key: 'bulk-lister', path: '/dashboard/ebay/bulk-lister', icon: Layers, label: 'Bulk Lister' },
  { key: 'orders', path: '/dashboard/ebay/orders', icon: ShoppingCart, label: 'eBay Orders' },
  { key: 'auto-orders', path: '/dashboard/ebay/auto-orders', icon: Truck, label: 'Auto Orders' },
  { key: 'product-research', path: '/dashboard/ebay/product-research', icon: Search, label: 'Product Research' },
  { key: 'must-sell', path: '/dashboard/ebay/must-sell', icon: Flame, label: 'Must Sell Items' },
  { key: 'profitable-products', path: '/dashboard/ebay/profitable-products', icon: Gem, label: 'Profitable Products' },
  { key: 'calculator', path: '/dashboard/ebay/calculator', icon: Calculator, label: 'Calculator' },
  { key: 'extension', path: '/dashboard/ebay/extension', icon: Puzzle, label: 'Extension' },
];

const EBAY_FOOTER_ITEMS = [
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
  const { user, profile, signOut } = useAuth();
  const { subscribed } = useSubscription();
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

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isEbay = location.pathname.startsWith('/dashboard/ebay');
  const settingsPath = isEbay ? '/dashboard/ebay/settings' : '/dashboard/settings';

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



      {/* Footer - Profile Popover */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              effectiveCollapsed && "justify-center px-1"
            )}>
              <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-800 select-none pointer-events-none">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              
              {!effectiveCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {subscribed ? 'Pro Active' : 'Free Trial'}
                  </p>
                </div>
              )}
              
              {!effectiveCollapsed && (
                <ChevronsUpDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              )}
            </button>
          </PopoverTrigger>
          
          <PopoverContent 
            side={isMobile ? "top" : "right"} 
            align="end" 
            sideOffset={12} 
            className="w-56 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg"
          >
            <div className="px-2.5 py-2 text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user?.email}
              </p>
              <div className="mt-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {subscribed ? 'Pro Plan' : 'Free Trial'}
                </span>
              </div>
            </div>
            
            <Separator className="bg-slate-200 dark:bg-slate-800 my-1" />
            
            <div className="space-y-0.5">
              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate(settingsPath);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                Settings
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/documentation');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                Language
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/documentation');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                Get help
              </button>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-800 my-1" />

            <div className="space-y-0.5">
              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/dashboard/subscription');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowUpCircle className="h-3.5 w-3.5 text-slate-500" />
                Upgrade plan
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/dashboard/extension');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                Get apps and extensions
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/dashboard/subscription');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Gift className="h-3.5 w-3.5 text-slate-500" />
                Gift SellerSuit
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/documentation');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Info className="h-3.5 w-3.5 text-slate-500" />
                Learn more
              </button>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-800 my-1" />

            <button 
              onClick={() => {
                onMobileClose?.();
                signOut();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
