import { type ReactNode } from "react";
import {
  Activity,
  ClipboardList,
  Gauge,
  ListChecks,
  Megaphone,
  ToggleLeft,
  Webhook,
  Newspaper,
  PlugZap,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Navigate } from "react-router-dom";

import AdminDashboard from "@/modules/overview";
import AdminUsers from "@/modules/users/UsersPage";
import AdminPlans from "@/pages/AdminPlans";
import AdminPlanFeatures from "@/pages/AdminPlanFeatures";
import AdminPlanPrices from "@/pages/AdminPlanPrices";
import AdminSubscriptions from "@/modules/billing/subscriptions";
import AdminCheckoutSessions from "@/modules/billing/checkout-sessions";
import AdminCoupons from "@/modules/billing/coupons";
import AdminExtension from "@/pages/AdminExtension";
import AdminBlog from "@/pages/AdminBlog";
import AdminBlogEditor from "@/pages/AdminBlogEditor";
import AdminNotices from "@/modules/content/notices";
import AdminAudit from "@/modules/ops/AuditPage";
import AdminRoles from "@/pages/AdminRoles";
import QueuesPage from "@/modules/ops/QueuesPage";
import SystemHealthPage from "@/modules/ops/SystemHealthPage";
import FeatureFlagsPage from "@/modules/ops/FeatureFlagsPage";
import StripeEventsPage from "@/modules/billing/StripeEventsPage";
import { platformRegistry } from "@/platforms/platformRegistry";
import { PlatformDashboardLayout } from "@/platforms/components/PlatformDashboardLayout";

export type AdminAccess = "admin" | "super_admin";

/** Nav group ordering for the sidebar. */
export const NAV_GROUPS = ["Overview", "Customers", "Billing", "Platform", "Operations", "System"] as const;
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
  { path: "billing", element: <Navigate to="/plans" replace /> },
  { path: "plans", element: <AdminPlans />, label: "Plans", icon: Tags, group: "Billing" },
  { path: "plans/:id/features", element: <AdminPlanFeatures /> },
  { path: "plans/:id/prices", element: <AdminPlanPrices /> },
  { path: "subscriptions", element: <AdminSubscriptions />, label: "Subscriptions", icon: Receipt, group: "Billing" },
  { path: "checkout-sessions", element: <AdminCheckoutSessions />, label: "Checkout Sessions", icon: ShoppingCart, group: "Billing" },
  { path: "coupons", element: <AdminCoupons />, label: "Coupons", icon: Tags, group: "Billing" },
  { path: "billing/stripe-events", element: <StripeEventsPage />, label: "Stripe Events", icon: Webhook, group: "Billing" },

  // Platform
  {
    path: "extension",
    element: <AdminExtension />,
    label: "eBay Extension",
    icon: PlugZap,
    group: "Platform",
    redirectFrom: ["ai", "ai-settings", "extension-control", "prompts", "automation", "description-config"],
  },
  { path: "blog", element: <AdminBlog />, label: "Blog", icon: Newspaper, group: "System" },
  { path: "blog/new", element: <AdminBlogEditor /> },
  { path: "blog/:id/edit", element: <AdminBlogEditor /> },


  // Operations
  { path: "ops/queues", element: <QueuesPage />, label: "Queues", icon: ListChecks, group: "Operations" },
  { path: "ops/system-health", element: <SystemHealthPage />, label: "System Health", icon: Activity, group: "Operations" },
  { path: "ops/flags", element: <FeatureFlagsPage />, label: "Feature Flags", icon: ToggleLeft, group: "Operations" },

  // System
  { path: "notices", element: <AdminNotices />, label: "Notices", icon: Megaphone, group: "System", redirectFrom: ["notifications"] },
  { path: "audit-logs", element: <AdminAudit />, label: "Audit Logs", icon: ClipboardList, group: "System", redirectFrom: ["audit"] },
  { path: "roles", element: <AdminRoles />, label: "Roles", icon: ShieldCheck, group: "System", access: "super_admin" },

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
export const removedRoutes: string[] = ["workspaces", "reports", "payments", "credits", "best-selling", "must-sell", "profitable-products", "product-intelligence", "settings"];
