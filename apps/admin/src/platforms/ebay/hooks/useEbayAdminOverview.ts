import { useQuery } from "@tanstack/react-query";
import { supabase } from "@repo/api-client/supabase/client";

export function useEbayAdminOverview() {
  return useQuery({
    queryKey: ["ebay-admin-overview"],
    queryFn: async () => {
      const [mustSellCount, profitableCount, settings, adminStats] = await Promise.all([
        (supabase as any).from("must_sell_items").select("*", { count: "exact", head: true }),
        (supabase as any).from("profitable_products").select("*", { count: "exact", head: true }),
        (supabase as any).from("admin_settings").select("*").eq("key", "ebay_sync_settings").single(),
        (supabase as any).rpc("get_ebay_admin_stats"),
      ]);

      let syncSettings = null;
      if (settings.data?.value) {
        syncSettings = typeof settings.data.value === "string" ? JSON.parse(settings.data.value) : settings.data.value;
      }

      return {
        mustSell: mustSellCount.count || 0,
        profitable: profitableCount.count || 0,
        syncEnabled: syncSettings?.enabled ?? false,
        syncDays: syncSettings?.daysToSync ?? 90,
        updatedAt: settings.data?.updated_at,
        globalStats: adminStats.data?.summary || null,
      };
    },
  });
}
