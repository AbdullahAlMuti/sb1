import {
  Bookmark,
  CreditCard,
  LayoutDashboard,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { PlatformDefinition } from "../types";
import { EbayOverview } from "./components/EbayOverview";
import { EbaySettings } from "./components/EbaySettings";
import AdminEbayUsers from "./AdminEbayUsers";
import AdminEbaySyncHealth from "./AdminEbaySyncHealth";
import AdminEbayFeatureControls from "./AdminEbayFeatureControls";
import AdminEbayCreditsUsage from "./AdminEbayCreditsUsage";
import AdminEbayAuditLogs from "./AdminEbayAuditLogs";

export const ebayPlatform: PlatformDefinition = {
  id: "ebay",
  name: "eBay",
  icon: ShoppingBag,
  enabled: true,
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
    primaryButton: "bg-[#3ecf8e] text-[#171717] hover:bg-[#24b47e] hover:text-[#171717] border-none font-medium rounded-sm shadow-sm",
  },
  tabs: [
    { id: "overview", label: "Overview", icon: LayoutDashboard, component: EbayOverview },
    { id: "users", label: "Users", icon: Users, component: AdminEbayUsers },
    { id: "sync_health", label: "Sync & Orders Health", icon: ShoppingCart, component: AdminEbaySyncHealth },
    { id: "feature_controls", label: "Feature Controls", icon: Sparkles, component: AdminEbayFeatureControls },
    { id: "credits", label: "Credits & Usage", icon: CreditCard, component: AdminEbayCreditsUsage },
    { id: "audit_logs", label: "Audit Logs", icon: Bookmark, component: AdminEbayAuditLogs },
    { id: "settings", label: "Settings", icon: Settings2, component: EbaySettings },
  ],
};
