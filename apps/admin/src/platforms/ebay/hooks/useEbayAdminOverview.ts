import { useQuery } from "@tanstack/react-query";
import { supabase } from "@repo/api-client/supabase/client";

export function useEbayAdminOverview() {
  return useQuery({
    queryKey: ["ebay-admin-overview"],
    queryFn: async () => {
      const [settings, adminStats] = await Promise.all([
        (supabase as any).from("admin_settings").select("*").eq("key", "ebay_sync_settings").single(),
        (supabase as any).rpc("get_ebay_admin_stats"),
      ]);

      let syncSettings = null;
      if (settings.data?.value) {
        syncSettings = typeof settings.data.value === "string" ? JSON.parse(settings.data.value) : settings.data.value;
      }

      return {
        syncEnabled: syncSettings?.enabled ?? false,
        syncDays: syncSettings?.daysToSync ?? 90,
        updatedAt: settings.data?.updated_at,
        globalStats: adminStats.data?.summary || null,
      };
    },
  });
}
