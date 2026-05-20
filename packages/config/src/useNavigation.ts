import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  getRoutePath, 
  isRouteActive, 
  type RouteKey,
  type NavItemConfig,
  type NavSectionConfig,
  USER_NAV_SECTIONS,
  USER_FOOTER_ITEMS,
  ADMIN_NAV_SECTIONS,
  ADMIN_PANEL_LINK,
} from '@repo/config/navigation';

/**
 * Hook for programmable navigation
 * Provides utilities to navigate using route keys instead of hardcoded paths
 */
export function useNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  
  /**
   * Navigate to a route by its key
   */
  const navigateTo = useCallback((key: RouteKey | string) => {
    const path = getRoutePath(key);
    navigate(path);
  }, [navigate]);
  
  /**
   * Check if a route is currently active
   */
  const isActive = useCallback((key: RouteKey) => {
    return isRouteActive(location.pathname, key);
  }, [location.pathname]);
  
  /**
   * Get the resolved path for a route key
   */
  const getPath = useCallback((key: RouteKey | string) => {
    return getRoutePath(key);
  }, []);
  
  /**
   * Check if we're in the admin section
   */
  const isAdminSection = location.pathname.startsWith('/admin');
  
  return {
    navigateTo,
    isActive,
    getPath,
    isAdminSection,
    currentPath: location.pathname,
  };
}

/**
 * Hook to get navigation configuration for the current context
 */
export function useNavigationConfig(isAdmin: boolean, isAdminSection: boolean) {
  return {
    sections: isAdminSection && isAdmin ? ADMIN_NAV_SECTIONS : USER_NAV_SECTIONS,
    footerItems: isAdminSection ? [] : USER_FOOTER_ITEMS,
    adminPanelLink: !isAdminSection && isAdmin ? ADMIN_PANEL_LINK : null,
  };
}

export type { NavItemConfig, NavSectionConfig, RouteKey };
