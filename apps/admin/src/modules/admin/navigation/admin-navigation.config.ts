import {
  Bot,
  ClipboardList,
  CreditCard,
  Gauge,
  KeyRound,
  Layers,
  Megaphone,
  Newspaper,
  PlugZap,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SHOPIFY_ENABLED } from "@repo/config/marketplaceScope";

/**
 * Single source of truth for the Admin sidebar.
 *
 * Routes here MUST match the live routes declared in `App.tsx` so navigation and
 * active-state stay identical. Adding a node never moves a page — it only surfaces
 * an already-mounted route.
 */

export type AdminRole = "admin" | "super_admin" | "moderator" | "staff";

export type NavBadgeTone = "default" | "warning";

export interface NavBadge {
  /** Resolved dynamically by `useNavBadges()`; hidden when the count is 0/undefined. */
  countKey?: string;
  /** Static status label. */
  label?: string;
  tone?: NavBadgeTone;
}

export interface NavNode {
  label: string;
  icon: LucideIcon;
  /** Absolute route. Omitted for pure parent nodes that only group children. */
  route?: string;
  children?: NavNode[];
  /** Minimum role required to see this node. Unset = visible to any admin. */
  requiredRole?: AdminRole;
  /** Plan gate (resolver treats admins as bypassing plan gating). */
  requiredPlan?: string;
  /** Feature-flag key; hidden when the flag resolves explicitly to `false`. */
  featureFlag?: string;
  badge?: NavBadge;
  /** Static visibility toggle (e.g. `SHOPIFY_ENABLED`). */
  visible?: boolean;
  /** Overrides the prefix used for active-state matching. */
  activeMatch?: string;
}

export interface NavGroup {
  label?: string;
  items: NavNode[];
}

export const adminNavigation: NavGroup[] = [
  {
    items: [{ label: "Overview", icon: Gauge, route: "/overview" }],
  },
  {
    label: "Customers",
    items: [
      { label: "Users", icon: Users, route: "/users" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Usage", icon: Receipt, route: "/usage" },
    ],
  },
  {
    label: "Billing",
    items: [
      { label: "Plans", icon: Layers, route: "/plans" },
      { label: "Subscriptions", icon: CreditCard, route: "/subscriptions" },
      { label: "Checkout Sessions", icon: Receipt, route: "/checkout-sessions" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "AI / Automation", icon: Bot, route: "/ai" },
      { label: "Description Config", icon: ClipboardList, route: "/description-config" },
      // eBay-only scope (see AI_AGENT_SCOPE_EBAY_ONLY.md): the Shopify App admin
      // entry stays mounted but is hidden while Shopify is disabled.
      { label: "Shopify App", icon: ShoppingBag, route: "/shopify-app", visible: SHOPIFY_ENABLED },
      { label: "eBay App", icon: ShoppingBag, route: "/ebay-app" },
      { label: "Extension Setup", icon: PlugZap, route: "/extension" },
      { label: "Extension Control", icon: ShieldCheck, route: "/extension-control" },
      { label: "Blog", icon: Newspaper, route: "/blog" },
      { label: "Notices", icon: Megaphone, route: "/notices", badge: { countKey: "notices" } },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Audit Logs", icon: ClipboardList, route: "/audit-logs" },
      { label: "Roles", icon: KeyRound, route: "/roles" },
      { label: "Settings", icon: Settings, route: "/settings" },
    ],
  },
];
