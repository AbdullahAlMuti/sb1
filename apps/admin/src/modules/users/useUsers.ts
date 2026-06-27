import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/core/data/resource";
import { keys } from "@/core/data/keys";

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  account_status: string | null;
  credits_remaining: number;
  total_orders: number;
  orders_last_24h: number;
  orders_last_7d: number;
  latest_synced_at: string | null;
  latest_sync_status: string | null;
  is_sync_enabled: boolean;
}

export interface UsersQuery {
  search: string;
  status: string;
  page: number;
  pageSize: number;
}

/**
 * Server-side user list via `search_ebay_users_admin` — search, filter, and
 * paginate happen in Postgres, so counts and pages are always consistent
 * (fixes the old client-side pagination/filter integrity bug). The RPC returns
 * no total, so we over-fetch by one row to detect "has next page".
 */
export function useUsers({ search, status, page, pageSize }: UsersQuery) {
  return useQuery({
    queryKey: keys.users.list({ search, status, page, pageSize }),
    queryFn: async () => {
      const rows = await rpc<AdminUserRow[]>("search_ebay_users_admin", {
        search_query: search,
        status_filter: status,
        limit_val: pageSize + 1,
        offset_val: (page - 1) * pageSize,
      });
      const hasNext = rows.length > pageSize;
      return { rows: hasNext ? rows.slice(0, pageSize) : rows, hasNext };
    },
    placeholderData: (prev) => prev,
  });
}

export interface AdminUserStats {
  id: string;
  email: string;
  full_name: string | null;
  credits: number;
  is_active: boolean;
  plan_name: string;
  plan_status: string;
  stripe_status: string;
  subscription_period_end: string | null;
  active_listings: number;
  inventory_value: number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  revenue: number;
  success_rate: number;
  avg_order_value: number;
  is_sync_enabled: boolean;
  last_sync_at: string | null;
  sync_status: string;
  created_at: string;
}

/** Full 360 snapshot for one user via `get_ebay_user_dashboard_stats_admin`. */
export function useUserStats(userId: string | null) {
  return useQuery({
    queryKey: keys.users.detail(userId ?? "none"),
    enabled: !!userId,
    queryFn: () => rpc<AdminUserStats>("get_ebay_user_dashboard_stats_admin", { p_user_id: userId }),
  });
}
