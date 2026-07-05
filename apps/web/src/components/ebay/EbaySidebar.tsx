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
  LayoutTemplate,
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
  { key: 'listing-templates', path: '/dashboard/ebay/templates', icon: LayoutTemplate, label: 'Listing Template' },
  { key: 'orders', path: '/dashboard/ebay/orders', icon: ShoppingCart, label: 'eBay Orders' },
  { key: 'auto-orders', path: '/dashboard/ebay/auto-orders', icon: Truck, label: 'Auto Orders' },
  { key: 'product-research', path: '/dashboard/ebay/product-research', icon: Search, label: 'Product Research' },
  { key: 'must-sell', path: '/dashboard/ebay/must-sell', icon: Flame, label: 'Must Sell' },
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
          'flex items-center gap-3 px-3 py-1.5 rounded-md group transition-all duration-300 relative overflow-hidden',
          active
            ? 'bg-muted text-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
      >
        <Icon className={cn('h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover:scale-105', active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
        <span className={cn(
          "text-[13px] font-medium transition-all duration-300 ease-in-out origin-left whitespace-nowrap overflow-hidden",
          effectiveCollapsed ? "opacity-0 max-w-0 translate-x-4 pointer-events-none" : "opacity-100 max-w-[200px] translate-x-0"
        )}>
          {item.label}
        </span>
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
        'h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out',
        !isMobile && 'fixed left-0 top-0 z-50',
        isMobile ? 'w-full' : effectiveCollapsed ? 'w-20' : 'w-[244px]'
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-border h-16 shrink-0 overflow-hidden">
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={onMobileClose}>
          <SellerSuitLogo size="sm" showText={!effectiveCollapsed} />
        </Link>
        {!isMobile && (
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} className={cn("h-8 w-8 rounded-lg hover:bg-muted shrink-0 transition-all duration-300", effectiveCollapsed && "ml-auto")}>
            <ChevronLeft className={cn('h-4 w-4 text-muted-foreground transition-transform duration-300', effectiveCollapsed && 'rotate-180')} />
          </Button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {EBAY_NAV_ITEMS.map(renderItem)}

        <div className="my-3 border-t border-border" />

        {EBAY_FOOTER_ITEMS.map(renderItem)}
      </nav>



      {/* Footer - Profile Popover */}
      <div className="p-3 border-t border-border">
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-all duration-300 text-left w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden",
              effectiveCollapsed && "justify-center px-1"
            )}>
              <Avatar className="h-9 w-9 border border-border select-none pointer-events-none shrink-0 transition-transform duration-300">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className={cn(
                "flex-grow flex-shrink min-w-0 flex flex-col transition-all duration-300 ease-in-out origin-left overflow-hidden",
                effectiveCollapsed ? "opacity-0 max-w-0 translate-x-4 pointer-events-none" : "opacity-100 max-w-[150px] translate-x-0"
              )}>
                <p className="text-xs font-semibold text-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {subscribed ? 'Pro Active' : 'Free Trial'}
                </p>
              </div>
              
              <ChevronsUpDown className={cn(
                "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-all duration-300",
                effectiveCollapsed ? "opacity-0 scale-50 pointer-events-none" : "opacity-100 scale-100"
              )} />
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
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                Settings
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/documentation');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Language
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/documentation');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
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
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <ArrowUpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Upgrade plan
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/dashboard/extension');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                Get apps and extensions
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/dashboard/subscription');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Gift className="h-3.5 w-3.5 text-muted-foreground" />
                Gift SellerSuit
              </button>

              <button 
                onClick={() => {
                  onMobileClose?.();
                  navigate('/documentation');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
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
