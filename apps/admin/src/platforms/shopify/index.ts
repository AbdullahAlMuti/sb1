import {
  BarChart3,
  Bookmark,
  CreditCard,
  LayoutDashboard,
  LayoutTemplate,
  Library,
  Settings2,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { PlatformDefinition } from "../types";
import { ShopifyPages } from "./components/ShopifyPages";
import { ShopifyContent } from "./components/ShopifyContent";
import { ShopifyPlaceholder } from "./components/ShopifyPlaceholder";
import ShopifyRightColumn from "./ShopifyRightColumn";
import { SHOPIFY_ENABLED } from "@repo/config/marketplaceScope";

export const shopifyPlatform: PlatformDefinition = {
  id: "shopify",
  name: "Shopify",
  icon: ShoppingBag,
  enabled: SHOPIFY_ENABLED,
  colorTheme: {
    primaryBg: "bg-emerald-50",
    primaryText: "text-emerald-600",
    primaryBorder: "border-emerald-200",
    accentBg: "hover:bg-emerald-50",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    iconBorder: "border-emerald-100",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-600",
    badgeBorder: "border-emerald-200",
    primaryButton: "bg-emerald-600 hover:bg-emerald-700",
  },
  tabs: [
    { id: "pages", label: "Pages & Features", icon: LayoutTemplate, component: ShopifyPages },
    { id: "overview", label: "Overview", icon: LayoutDashboard, component: () => ShopifyPlaceholder({ title: "Overview" }) },
    { id: "users", label: "Users", icon: Users, component: () => ShopifyPlaceholder({ title: "Users" }) },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard, component: () => ShopifyPlaceholder({ title: "Subscriptions" }) },
    { id: "content", label: "Content Library", icon: Library, component: ShopifyContent },
    { id: "ai", label: "AI Copy Studio", icon: Sparkles, component: () => ShopifyPlaceholder({ title: "AI Copy Studio" }) },
    { id: "saved", label: "Saved Items", icon: Bookmark, component: () => ShopifyPlaceholder({ title: "Saved Items" }) },
    { id: "analytics", label: "Analytics", icon: BarChart3, component: () => ShopifyPlaceholder({ title: "Analytics" }) },
    { id: "settings", label: "Settings", icon: Settings2, component: () => ShopifyPlaceholder({ title: "Settings" }) },
  ],
  rightColumnComponent: ShopifyRightColumn,
};
