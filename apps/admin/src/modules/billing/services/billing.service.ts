import { supabase } from "@repo/api-client/supabase/client";

/**
 * Data layer for the admin billing **catalog** (plans + subscriber counts).
 *
 * Scope guard: this service only reads plans and flips plan-level state flags
 * (active / archived). It never touches subscription *state* — that remains the
 * sole responsibility of the Stripe write path (`_shared/billing-sync.ts` via
 * stripe-webhook / create-checkout / reconcile). Keep it that way.
 */

/** All plans in the catalog, ordered by monthly price. Throws on error. */
export async function fetchPlans() {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("price_monthly", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Subscriber counts per plan id, derived from `profiles.plan_id`. Best-effort. */
export async function fetchPlanUserCounts(): Promise<Record<string, number>> {
  const { data } = await supabase.from("profiles").select("plan_id");
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { plan_id: string | null }).plan_id;
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Enable/disable a plan. Existing subscribers are unaffected. */
export async function setPlanActive(planId: string, isActive: boolean) {
  const { error } = await supabase.from("plans").update({ is_active: isActive }).eq("id", planId);
  if (error) throw error;
}

/** Archive a plan and hide it from the public pricing page. */
export async function archivePlan(planId: string) {
  const { error } = await supabase
    .from("plans")
    .update({ archived_at: new Date().toISOString(), is_public: false })
    .eq("id", planId);
  if (error) throw error;
}

/** Attempt to delete a plan entirely from the database. Will fail if referenced by user_plans or checkout_sessions. */
export async function deletePlan(planId: string) {
  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) throw error;
}

/** Display name for a plan — shared by the prices/features sub-pages. */
export async function getPlanName(planId: string): Promise<string | null> {
  const { data } = await supabase.from("plans").select("display_name").eq("id", planId).maybeSingle();
  return data?.display_name ?? null;
}

/** Prices for a plan, ordered by interval. Throws on error. */
export async function fetchPlanPrices(planId: string) {
  const { data, error } = await supabase
    .from("plan_prices")
    .select("*")
    .eq("plan_id", planId)
    .order("interval");
  if (error) throw error;
  return data ?? [];
}

export async function deletePlanPrice(id: string) {
  const { error } = await supabase.from("plan_prices").delete().eq("id", id);
  if (error) throw error;
}

/** Features for a plan, ordered by group then sort order. Throws on error. */
export async function fetchPlanFeatures(planId: string) {
  const { data, error } = await supabase
    .from("plan_features")
    .select("*")
    .eq("plan_id", planId)
    .order("group_name")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function deletePlanFeature(id: string) {
  const { error } = await supabase.from("plan_features").delete().eq("id", id);
  if (error) throw error;
}

/** Recent user subscription records (read-only view). Throws on error. */
export async function fetchSubscriptions() {
  const { data, error } = await supabase
    .from("user_plans")
    .select(`
      id, user_id, status, plan_id, stripe_subscription_id,
      current_period_end, trial_end, orders_used, credits_used,
      profiles:user_id (email, full_name),
      plans:plan_id (name, display_name)
    `)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as any[];
}

/** Recent Stripe checkout sessions (read-only view). Throws on error. */
export async function fetchCheckoutSessions() {
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select(`
      id, user_id, email, selected_plan_id, stripe_checkout_session_id,
      status, metadata, created_at, updated_at,
      plans:selected_plan_id (name, display_name)
    `)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as any[];
}
