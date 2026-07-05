import { useQuery } from "@tanstack/react-query";
import { supabase } from "@repo/api-client/supabase/client";
import { keys } from "@/core/data/keys";
import { rpc } from "@/core/data/resource";
import { type SortState } from "@/core/ui/DataTable";
import {
  type AutomationLog,
  type CatalogProduct,
  type MetricsDaily,
  type MustSellRecommendation,
  type ProductCategory,
  type ProductSupplier,
  type SmartSettings,
  type SuggestedSettings,
} from "./types";

// Admin-only tables aren't in the generated Database types yet — same
// centralised-cast policy as core/data/resource.ts.
const sb = supabase as any;

export interface ProductFilters {
  status?: string;
  mustSell?: boolean;
  /** Matches the live free-text profitable_products.category column. */
  category?: string;
  supplierId?: string;
  search?: string;
}

const PRODUCT_SELECT = "*, product_scores(*)";

export function useProducts(filters: ProductFilters, sort: SortState, page: number, pageSize: number) {
  return useQuery({
    queryKey: keys.catalogProfitable.list({ filters, sort, page, pageSize }),
    queryFn: async (): Promise<{ rows: CatalogProduct[]; count: number | null }> => {
      let query = sb.from("profitable_products").select(PRODUCT_SELECT, { count: "exact" });

      if (filters.status) query = query.eq("status", filters.status);
      else query = query.neq("status", "archived");
      if (filters.mustSell) query = query.eq("is_must_sell", true);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.supplierId) query = query.eq("supplier_id", filters.supplierId);
      if (filters.search?.trim()) {
        const q = filters.search.trim().replace(/,/g, " ");
        query = query.or(`title.ilike.%${q}%,sku.ilike.%${q}%`);
      }

      // Score columns live on the joined table; everything else sorts natively.
      if (sort.column === "final_score") {
        query = query.order("final_score", {
          referencedTable: "product_scores",
          ascending: sort.ascending,
          nullsFirst: sort.ascending,
        });
      } else {
        query = query.order(sort.column, { ascending: sort.ascending });
      }

      const from = (page - 1) * pageSize;
      const { data, error, count } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as CatalogProduct[], count: count ?? null };
    },
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: keys.catalogSuppliers.list(),
    queryFn: async (): Promise<ProductSupplier[]> => {
      const { data, error } = await sb.from("product_suppliers").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: keys.catalogCategories.list(),
    queryFn: async (): Promise<ProductCategory[]> => {
      const { data, error } = await sb.from("product_categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecommendations(status: string) {
  return useQuery({
    queryKey: keys.catalogRecommendations.list({ status }),
    queryFn: async (): Promise<MustSellRecommendation[]> => {
      let query = sb
        .from("must_sell_recommendations")
        .select("*, profitable_products(title, sku, price, stock, is_must_sell, status, priority)")
        .order("confidence", { ascending: false })
        .limit(200);
      if (status === "pending") query = query.eq("status", "pending");
      else query = query.neq("status", "pending").order("decided_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSmartSettings() {
  return useQuery({
    queryKey: keys.catalogSettings.all,
    queryFn: async (): Promise<SmartSettings> => {
      const { data, error } = await sb.from("product_smart_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data as SmartSettings;
    },
  });
}

export function useAutomationLogs() {
  return useQuery({
    queryKey: keys.catalogAutomationLogs.list(),
    queryFn: async (): Promise<AutomationLog[]> => {
      const { data, error } = await sb
        .from("product_automation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Full (score-joined) catalog snapshot for the analytics page. */
export function useCatalogSnapshot() {
  return useQuery({
    queryKey: keys.catalogAnalytics.list({ scope: "snapshot" }),
    queryFn: async (): Promise<CatalogProduct[]> => {
      const { data, error } = await sb
        .from("profitable_products")
        .select(PRODUCT_SELECT)
        .neq("status", "archived")
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as CatalogProduct[];
    },
  });
}

export function useMetricsTrend(days = 60) {
  return useQuery({
    queryKey: keys.catalogAnalytics.list({ scope: "trend", days }),
    queryFn: async (): Promise<MetricsDaily[]> => {
      const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      const { data, error } = await sb
        .from("product_metrics_daily")
        .select("metric_date, views, clicks, orders, units_sold, revenue, returns")
        .gte("metric_date", since)
        .order("metric_date", { ascending: true })
        .limit(10_000);
      if (error) throw error;
      // Aggregate rows (one per product per day) into one point per day.
      const byDate = new Map<string, MetricsDaily>();
      for (const row of (data ?? []) as MetricsDaily[]) {
        const agg = byDate.get(row.metric_date) ?? {
          metric_date: row.metric_date,
          views: 0, clicks: 0, orders: 0, units_sold: 0, revenue: 0, returns: 0,
        };
        agg.views += row.views;
        agg.clicks += row.clicks;
        agg.orders += row.orders;
        agg.units_sold += row.units_sold;
        agg.revenue += Number(row.revenue);
        agg.returns += row.returns;
        byDate.set(row.metric_date, agg);
      }
      return [...byDate.values()];
    },
  });
}

// ---- engine RPCs (audited server-side) ------------------------------------

export function recomputeScores() {
  return rpc<{ products_scored: number; recommendations_created: number; auto_applied: number }>(
    "admin_recompute_product_scores",
  );
}

export function suggestSettings() {
  return rpc<SuggestedSettings>("admin_suggest_product_settings");
}

export function decideRecommendation(id: string, decision: "accept" | "reject", reason?: string) {
  return rpc("admin_decide_recommendation", {
    p_recommendation_id: id,
    p_decision: decision,
    p_reason: reason ?? null,
  });
}

export function bulkUpdateProducts(ids: string[], patch: Record<string, unknown>, reason?: string) {
  return rpc<{ affected: number }>("admin_bulk_update_products", {
    p_ids: ids,
    p_patch: patch,
    p_reason: reason ?? null,
  });
}

/** Replace a product's image rows with the given ordered URL list. */
export async function replaceProductImages(productId: string, urls: string[]): Promise<void> {
  const { error: delError } = await sb.from("profitable_product_images").delete().eq("product_id", productId);
  if (delError) throw delError;
  if (urls.length === 0) return;
  const { error } = await sb
    .from("profitable_product_images")
    .insert(urls.map((url, i) => ({ product_id: productId, image_url: url, position: i })));
  if (error) throw error;
}

export async function fetchProductImages(productId: string): Promise<string[]> {
  const { data, error } = await sb
    .from("profitable_product_images")
    .select("image_url, position")
    .eq("product_id", productId)
    .order("position");
  if (error) throw error;
  return (data ?? []).map((r: { image_url: string }) => r.image_url);
}
