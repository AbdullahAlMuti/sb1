import React from "react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { CreditCard, ShoppingBag, Settings2, TrendingUp, Users } from "lucide-react";
import { useEbayAdminOverview } from "../hooks/useEbayAdminOverview";

/* ─── Supabase Design Tokens ─── */
const sb = {
  primary: "#3ecf8e",
  ink: "#171717",
  inkMute: "#707070",
  inkFaint: "#b2b2b2",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  hairline: "#dfdfdf",
} as const;

export function EbayOverview() {
  const { data: overviewData, isLoading } = useEbayAdminOverview();

  return (
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.42, color: sb.ink }} className="tracking-tight">
          eBay App Overview
        </h2>
        <p style={{ fontSize: 13, color: sb.inkMute, lineHeight: 1.45 }} className="mt-1">
          High-level statistics from your eBay Admin configuration and global system usage.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" style={{ borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            {
              title: "System-Wide Orders",
              value: overviewData?.globalStats?.totalOrders?.toLocaleString() || 0,
              desc: "Total orders synced",
              icon: ShoppingBag,
              iconColor: sb.primary,
            },
            {
              title: "System-Wide Revenue",
              value: `$${overviewData?.globalStats?.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`,
              desc: "Total revenue tracked",
              icon: CreditCard,
              iconColor: "#054cff", // Accent indigo
            },
            {
              title: "Active Stores",
              value: overviewData?.globalStats?.uniqueUsersWithOrders?.toLocaleString() || 0,
              desc: "Users with synced orders",
              icon: Users,
              iconColor: "#644fc1", // Accent violet
            },
            {
              title: "Last 24h Activity",
              value: overviewData?.globalStats?.ordersLast24h?.toLocaleString() || 0,
              desc: "Orders synced recently",
              icon: TrendingUp,
              iconColor: "#ffdb13", // Accent yellow
            },
            {
              title: "Sync Status",
              value: overviewData?.syncEnabled ? "Enabled" : "Disabled",
              desc: overviewData?.syncDays ? `${overviewData.syncDays} Days Range` : "Not Configured",
              icon: Settings2,
              iconColor: "#644fc1",
            }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                style={{
                  background: sb.canvas,
                  border: `1px solid ${sb.hairline}`,
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                }}
                className="flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2" style={{ color: sb.inkMute }}>
                    <Icon style={{ width: 16, height: 16, color: card.iconColor }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{card.title}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: sb.ink, letterSpacing: -0.5 }}>
                    {card.value}
                  </div>
                </div>
                <p style={{ fontSize: 12, color: sb.inkMute, marginTop: 4, marginBlockEnd: 0 }}>
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
