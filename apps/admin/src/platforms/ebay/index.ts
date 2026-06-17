import {
  Bookmark,
  CreditCard,
  LayoutDashboard,
  Library,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { PlatformDefinition } from "../types";
import { EbayOverview } from "./components/EbayOverview";
import { EbayContentLibrary } from "./components/EbayContentLibrary";
import { EbaySettings } from "./components/EbaySettings";
import AdminEbayUsers from "./AdminEbayUsers";
import AdminEbaySyncHealth from "./AdminEbaySyncHealth";
import AdminEbayFeatureControls from "./AdminEbayFeatureControls";
import AdminEbayCreditsUsage from "./AdminEbayCreditsUsage";
import AdminEbayAuditLogs from "./AdminEbayAuditLogs";
import EbayRightColumn from "./EbayRightColumn";

export const ebayPlatform: PlatformDefinition = {
  id: "ebay",
  name: "eBay",
  icon: ShoppingBag,
  enabled: true,
  colorTheme: {
    primaryBg: "bg-blue-50",
    primaryText: "text-blue-600",
    primaryBorder: "border-blue-200",
    accentBg: "hover:bg-blue-50",
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    iconBorder: "border-blue-100",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-600",
    badgeBorder: "border-blue-200",
    primaryButton: "bg-blue-600 hover:bg-blue-700",
  },
  tabs: [
    { id: "overview", label: "Overview", icon: LayoutDashboard, component: EbayOverview },
    { id: "users", label: "Users", icon: Users, component: AdminEbayUsers },
    { id: "content", label: "Content Library", icon: Library, component: EbayContentLibrary },
    { id: "sync_health", label: "Sync & Orders Health", icon: ShoppingCart, component: AdminEbaySyncHealth },
    { id: "feature_controls", label: "Feature Controls", icon: Sparkles, component: AdminEbayFeatureControls },
    { id: "credits", label: "Credits & Usage", icon: CreditCard, component: AdminEbayCreditsUsage },
    { id: "audit_logs", label: "Audit Logs", icon: Bookmark, component: AdminEbayAuditLogs },
    { id: "settings", label: "Settings", icon: Settings2, component: EbaySettings },
  ],
  rightColumnComponent: EbayRightColumn,
};
