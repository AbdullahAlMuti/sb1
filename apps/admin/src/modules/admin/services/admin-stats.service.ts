import { supabase } from "@repo/api-client/supabase/client";

/**
 * Aggregate counts for the admin Overview dashboard.
 *
 * Read-only `head: true` count queries (RLS-guarded). Pulled out of the page so
 * the component stays presentational and the data access lives in one place.
 */
export interface AdminDashboardCounts {
  totalUsers: number;
  activeUsers: number;
  listings: number;
  orders: number;
}

export async function getAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const [profiles, activeProfiles, listings, orders] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("listings").select("*", { count: "exact", head: true }),
    (supabase.from("ebay_orders" as any) as any).select("*", { count: "exact", head: true }),
  ]);

  return {
    totalUsers: profiles.count ?? 0,
    activeUsers: activeProfiles.count ?? 0,
    listings: listings.count ?? 0,
    orders: orders.count ?? 0,
  };
}
