import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Shield,
  Sparkles,
  BarChart3,
  Users,
  Megaphone,
  ClipboardList,
  ShieldCheck,
  Puzzle,
  TrendingUp,
  Flame,
  Activity,
  Gem,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { marketplaceScope } from './marketplaceScope';

// ============================================
// NAVIGATION CONFIGURATION
// Single source of truth for all navigation
// ============================================

/**
 * Route keys - use these to reference routes throughout the app
 * This decouples menu labels from actual URLs
 */
export type RouteKey =
  // User routes
  | 'dashboard'
  | 'listings'
  | 'ebay-orders'
  | 'orders'
  | 'extension'
  | 'product-research'
  | 'best-selling'
  | 'must-sell'
  | 'profitable-products'
  | 'settings'
  // Admin routes
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-roles'
  | 'admin-usage'
  | 'admin-notices'
  | 'admin-best-selling'
  | 'admin-must-sell'
  | 'admin-profitable-products'
  | 'admin-prompts'
  | 'admin-extension'
  | 'admin-audit'
  | 'admin-settings'
  | 'admin-ai-settings';

/**
 * Route definitions - maps route keys to actual paths
 * Change paths here to update navigation globally
 */
export const ROUTE_PATHS: Record<RouteKey, string> = {
  // User dashboard routes
  'dashboard': '/dashboard',
  'listings': '/dashboard/listings',
  'ebay-orders': '/dashboard/ebay-orders',
  'orders': '/dashboard/orders',
  'extension': '/dashboard/extension',
  'product-research': '/dashboard/product-research',
  'best-selling': '/dashboard/best-selling',
  'must-sell': '/dashboard/must-sell',
  'profitable-products': '/dashboard/profitable-products',
  'settings': '/dashboard/settings',

  // Admin routes
  'admin-dashboard': '/admin',
  'admin-users': '/admin/users',
  'admin-roles': '/admin/roles',
  'admin-usage': '/admin/usage',
  'admin-notices': '/admin/notices',
  'admin-best-selling': '/admin/best-selling',
  'admin-must-sell': '/admin/must-sell',
  'admin-profitable-products': '/admin/profitable-products',
  'admin-prompts': '/admin/prompts',
  'admin-extension': '/admin/extension',
  'admin-audit': '/admin/audit',
  'admin-settings': '/admin/settings',
  'admin-ai-settings': '/admin/ai-settings',
};

/**
 * PROGRAMMABLE ROUTE MAPPING
 * This is where you can remap menu items to different destinations
 * 
 * Example: To make "Customers" navigate to Users module:
 *   'customers': 'admin-users'
 * 
 * Example: To make "Transactions" navigate to Payments:
 *   'transactions': 'admin-payments'
 */
export const ROUTE_ALIASES: Partial<Record<string, RouteKey>> = {
  // Add your custom mappings here
  // 'customers': 'admin-users',
  // 'transactions': 'admin-payments',
};

/**
 * Navigation item definition
 */
export interface NavItemConfig {
  key: RouteKey;
  icon: LucideIcon;
  label: string;
  /** Optional: required roles to see this item */
  requiredRoles?: ('user' | 'admin' | 'super_admin')[];
  /** Optional: badge content */
  badge?: string | number;
  /** Optional: whether this item is disabled */
  disabled?: boolean;
}

/**
 * Navigation section definition
 */
export interface NavSectionConfig {
  id: string;
  label?: string;
  items: NavItemConfig[];
}

// ============================================
// USER NAVIGATION CONFIGURATION
// ============================================

export const USER_NAV_SECTIONS: NavSectionConfig[] = [
  {
    id: 'main',
    items: [
      { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { key: 'listings', icon: Package, label: 'Listings' },
      { key: 'ebay-orders', icon: ShoppingCart, label: 'eBay Orders' },
      { key: 'orders', icon: Truck, label: 'Auto Orders' },
      { key: 'extension', icon: Puzzle, label: 'Extension' },
    ],
  },
  {
    id: 'advanced-tools',
    label: 'Advanced Tools',
    items: [
      { key: 'product-research', icon: Sparkles, label: 'AI Product Research' },
      { key: 'best-selling', icon: TrendingUp, label: 'Best Selling Items' },
      { key: 'must-sell', icon: Flame, label: 'Must Sell Items' },
      { key: 'profitable-products', icon: Gem, label: 'Profitable Products' },
    ],
  },
];

export const USER_FOOTER_ITEMS: NavItemConfig[] = [
  { key: 'settings', icon: Settings, label: 'Settings' },
];

// ============================================
// ADMIN NAVIGATION CONFIGURATION
// ============================================

export const ADMIN_NAV_SECTIONS: NavSectionConfig[] = [
  {
    id: 'core',
    items: [
      { key: 'admin-dashboard', icon: BarChart3, label: 'Dashboard' },
      { key: 'admin-users', icon: Users, label: 'Users' },
      { key: 'admin-roles', icon: ShieldCheck, label: 'Roles' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { key: 'admin-usage', icon: Activity, label: 'Usage' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { key: 'admin-notices', icon: Megaphone, label: 'Notices' },
      { key: 'admin-best-selling', icon: TrendingUp, label: 'Best Selling Items' },
      { key: 'admin-must-sell', icon: Flame, label: 'Must Sell Items' },
      { key: 'admin-profitable-products', icon: Gem, label: 'Profitable Products' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { key: 'admin-prompts', icon: Sparkles, label: 'AI Prompts' },
      { key: 'admin-extension', icon: Puzzle, label: 'Extension' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { key: 'admin-audit', icon: ClipboardList, label: 'Audit Logs' },
      { key: 'admin-settings', icon: Shield, label: 'Settings' },
    ],
  },
];

// ============================================
// NAVIGATION UTILITIES
// ============================================

/**
 * Resolves a route key to its actual path
 * Supports aliases for programmable navigation
 */
export function getRoutePath(key: RouteKey | string): string {
  // Check if there's an alias first
  const aliasedKey = ROUTE_ALIASES[key];
  const resolvedKey = aliasedKey || key;

  // Return the path for the resolved key
  return ROUTE_PATHS[resolvedKey as RouteKey] || '/';
}

/**
 * Checks if a path matches a route key (for active state)
 */
export function isRouteActive(currentPath: string, key: RouteKey): boolean {
  const routePath = getRoutePath(key);

  // Exact match for index routes
  if (routePath === '/dashboard' || routePath === '/admin') {
    return currentPath === routePath;
  }

  // Prefix match for nested routes
  return currentPath.startsWith(routePath);
}

/**
 * Gets the admin panel link for user sidebar
 */
export const ADMIN_PANEL_LINK: NavItemConfig = {
  key: 'admin-dashboard',
  icon: Shield,
  label: 'Admin Panel',
};

export type SellerGoal = 'ebay' | 'shopify' | 'both' | string | null | undefined;

export function getDashboardPathForGoal(goal: SellerGoal): string {
  // eBay-only scope (see AI_AGENT_SCOPE_EBAY_ONLY.md): Shopify is disabled, so
  // every goal resolves to the eBay workspace. Re-enable Shopify by flipping
  // marketplaceScope.shopify.enabled, then restore the goal === 'shopify' branch.
  if (marketplaceScope.shopify.enabled && goal === 'shopify') return '/dashboard/shopify';
  return '/dashboard/ebay';
}
