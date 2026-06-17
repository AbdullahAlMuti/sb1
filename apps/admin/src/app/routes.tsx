import { type ReactNode } from "react";
import {
  Bot,
  ClipboardList,
  CreditCard,
  Gauge,
  ListChecks,
  Megaphone,
  Newspaper,
  Package,
  PackageCheck,
  PlugZap,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import AdminDashboard from "@/modules/overview";
import AdminUsers from "@/modules/users/UsersPage";
import AdminPlans from "@/pages/AdminPlans";
import AdminPlanFeatures from "@/pages/AdminPlanFeatures";
import AdminPlanPrices from "@/pages/AdminPlanPrices";
import AdminSubscriptions from "@/pages/AdminSubscriptions";
import AdminCheckoutSessions from "@/pages/AdminCheckoutSessions";
import AdminCoupons from "@/pages/AdminCoupons";
import AdminAISettings from "@/pages/AdminAISettings";
import AdminDescriptionConfig from "@/pages/AdminDescriptionConfig";
import AdminPrompts from "@/pages/AdminPrompts";
import AdminExtension from "@/pages/AdminExtension";
import AdminExtensionControl from "@/pages/AdminExtensionControl";
import AdminBlog from "@/pages/AdminBlog";
import AdminBlogEditor from "@/pages/AdminBlogEditor";
import AdminNotices from "@/modules/content/notices";
import AdminAudit from "@/pages/AdminAudit";
import AdminRoles from "@/pages/AdminRoles";
import AdminSettings from "@/pages/AdminSettings";
import {
  AdminBestSellingPage as AdminBestSelling,
  AdminMustSellPage as AdminMustSell,
  AdminProfitableProductsPage as AdminProfitableProducts,
} from "@/modules/catalog";
import QueuesPage from "@/modules/ops/QueuesPage";
import { platformRegistry } from "@/platforms/platformRegistry";
import { PlatformDashboardLayout } from "@/platforms/components/PlatformDashboardLayout";

export type AdminAccess = "admin" | "super_admin";

/** Nav group ordering for the sidebar. */
export const NAV_GROUPS = ["Overview", "Customers", "Billing", "Platform", "Catalog", "Operations", "System"] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

export interface AdminRouteDef {
  path: string;
  element: ReactNode;
  /** When set, the route is also the index ("/") element. */
  index?: boolean;
  /** Present => shown in the sidebar. */
  label?: string;
  icon?: LucideIcon;
  group?: NavGroup;
  access?: AdminAccess;
  /** Legacy aliases that 301 to this canonical path. */
  redirectFrom?: string[];
}

/**
 * THE single source of truth for admin routing + navigation + access.
 * The router (`router.tsx`) and the sidebar both derive from this — add a route
 * once and it is wired everywhere. Scope cuts (workspaces, reports) are simply
 * absent.
 */
export const adminRoutes: AdminRouteDef[] = [
  // Overview
  { path: "overview", element: <AdminDashboard />, index: true, label: "Overview", icon: Gauge, group: "Overview", redirectFrom: ["dashboard"] },

  // Customers
  { path: "users", element: <AdminUsers />, label: "Users", icon: Users, group: "Customers" },
  { path: "users/:userId", element: <AdminUsers /> },

  // Billing
  { path: "plans", element: <AdminPlans />, label: "Plans", icon: Tags, group: "Billing" },
  { path: "plans/:id/features", element: <AdminPlanFeatures /> },
  { path: "plans/:id/prices", element: <AdminPlanPrices /> },
  { path: "subscriptions", element: <AdminSubscriptions />, label: "Subscriptions", icon: Receipt, group: "Billing" },
  { path: "checkout-sessions", element: <AdminCheckoutSessions />, label: "Checkout Sessions", icon: ShoppingCart, group: "Billing" },
  { path: "coupons", element: <AdminCoupons />, label: "Coupons", icon: Tags, group: "Billing" },

  // Platform
  { path: "ai", element: <AdminAISettings />, label: "AI / Automation", icon: Bot, group: "Platform", redirectFrom: ["ai-settings"] },
  { path: "description-config", element: <AdminDescriptionConfig />, label: "Description Config", icon: ClipboardList, group: "Platform" },
  { path: "prompts", element: <AdminPrompts />, label: "Prompts", icon: Bot, group: "Platform", redirectFrom: ["automation"] },
  { path: "extension", element: <AdminExtension />, label: "Extension Setup", icon: PlugZap, group: "Platform" },
  { path: "extension-control", element: <AdminExtensionControl />, label: "Extension Control", icon: ShieldCheck, group: "Platform" },
  { path: "blog", element: <AdminBlog />, label: "Blog", icon: Newspaper, group: "Platform" },
  { path: "blog/new", element: <AdminBlogEditor /> },
  { path: "blog/:id/edit", element: <AdminBlogEditor /> },

  // Catalog (operator-curated content shown to users)
  { path: "best-selling", element: <AdminBestSelling />, label: "Best Selling", icon: TrendingUp, group: "Catalog" },
  { path: "must-sell", element: <AdminMustSell />, label: "Must Sell", icon: Package, group: "Catalog" },
  { path: "profitable-products", element: <AdminProfitableProducts />, label: "Profitable Products", icon: PackageCheck, group: "Catalog", redirectFrom: ["product-intelligence"] },

  // Operations
  { path: "ops/queues", element: <QueuesPage />, label: "Queues", icon: ListChecks, group: "Operations" },

  // System
  { path: "notices", element: <AdminNotices />, label: "Notices", icon: Megaphone, group: "System", redirectFrom: ["notifications"] },
  { path: "audit-logs", element: <AdminAudit />, label: "Audit Logs", icon: ClipboardList, group: "System", redirectFrom: ["audit"] },
  { path: "roles", element: <AdminRoles />, label: "Roles", icon: ShieldCheck, group: "System", access: "super_admin" },
  { path: "settings", element: <AdminSettings />, label: "Settings", icon: Settings, group: "System" },

  // Marketplace platforms (eBay; Shopify when enabled) — generated from the registry.
  ...platformRegistry.map<AdminRouteDef>((platform) => ({
    path: `${platform.id}-app/*`,
    element: <PlatformDashboardLayout platform={platform} />,
    label: `${platform.name} App`,
    icon: platform.icon,
    group: "Platform",
  })),
];

/** Routes that no longer exist (scope cuts / removed aliases) → bounce to overview. */
export const removedRoutes: string[] = ["workspaces", "reports", "billing", "payments", "credits"];
