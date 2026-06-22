import {
  Activity,
  Bot,
  Boxes,
  ClipboardList,
  CreditCard,
  Gauge,
  KeyRound,
  Layers,
  LifeBuoy,
  Lock,
  Megaphone,
  Newspaper,
  Package,
  PlugZap,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tags,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { SHOPIFY_ENABLED } from "@repo/config/marketplaceScope";

/**
 * Single source of truth for the Admin sidebar.
 *
 * The sidebar used to hardcode its groups, fake numeric badges (`6 / 4 / 12`),
 * and a static "Admin User / Super Admin" identity. This config replaces all of
 * that with a dynamic, declarative tree that the renderer (`AdminSidebar`) walks.
 *
 * Routes here MUST match the live routes declared in `App.tsx` so navigation and
 * active-state stay identical. Adding a node never moves a page — it only surfaces
 * an already-mounted route.
 */

export type AdminRole = "admin" | "super_admin" | "moderator" | "staff";

export type NavBadgeTone = "default" | "preview" | "warning";

export interface NavBadge {
  /** Resolved dynamically by `useNavBadges()`; hidden when the count is 0/undefined. */
  countKey?: string;
  /** Static status label (e.g. "Preview" for non-wired scaffold routes). */
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
  /** Marks a scaffold route that is not yet wired to a backend. */
  placeholder?: boolean;
  /** Overrides the prefix used for active-state matching. */
  activeMatch?: string;
}

export interface NavGroup {
  label?: string;
  items: NavNode[];
}

const PREVIEW_BADGE: NavBadge = { label: "Preview", tone: "preview" };

export const adminNavigation: NavGroup[] = [
  {
    items: [{ label: "Overview", icon: Gauge, route: "/overview" }],
  },
  {
    label: "Customers",
    items: [
      { label: "Users", icon: Users, route: "/users" },
      { label: "Workspaces", icon: Boxes, route: "/workspaces", placeholder: true, badge: PREVIEW_BADGE },
      { label: "Stores", icon: Store, route: "/stores", placeholder: true, badge: PREVIEW_BADGE },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Integrations", icon: PlugZap, route: "/integrations", placeholder: true, badge: PREVIEW_BADGE },
      { label: "Products", icon: Package, route: "/products", placeholder: true, badge: PREVIEW_BADGE },
      { label: "Listings", icon: Tags, route: "/listings", placeholder: true, badge: PREVIEW_BADGE },
      { label: "Orders", icon: ShoppingCart, route: "/orders", placeholder: true, badge: PREVIEW_BADGE },
      { label: "Customers", icon: ShoppingBag, route: "/customers", placeholder: true, badge: PREVIEW_BADGE },
      { label: "Inventory", icon: Boxes, route: "/inventory", placeholder: true, badge: PREVIEW_BADGE },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Sync Health", icon: Activity, route: "/sync-health", placeholder: true, badge: PREVIEW_BADGE },
      { label: "Webhook Events", icon: Webhook, route: "/webhook-events", placeholder: true, badge: PREVIEW_BADGE },
      { label: "Usage", icon: Receipt, route: "/usage" },
      { label: "Support", icon: LifeBuoy, route: "/support", placeholder: true, badge: PREVIEW_BADGE },
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
      { label: "Security", icon: Lock, route: "/security", placeholder: true, badge: PREVIEW_BADGE },
      { label: "Settings", icon: Settings, route: "/settings" },
    ],
  },
];
