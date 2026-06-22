import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { resolveCorsHeaders } from "../_shared/cors.ts";

// Admin-only replacement for the removed create-stripe-price function.
// Ensures one Stripe product per active plan (metadata.sellersuit_plan) and
// the required prices (monthly/yearly recurring, one-time for trial), then
// writes the price ids back to plans. Idempotent; supports { dryRun: true }.


function json(ch: Record<string,string>, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...ch, "Content-Type": "application/json" },
  });
}

type PlanRow = {
  id: string;
  name: string;
  display_name: string | null;
  price_monthly: number | string | null;
  price_yearly: number | string | null;
  is_trial: boolean;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  stripe_price_id_one_time: string | null;
};

type PriceSpec = {
  kind: "one_time" | "recurring";
  interval?: "month" | "year";
  column: "stripe_price_id_monthly" | "stripe_price_id_yearly" | "stripe_price_id_one_time";
  unit_amount: number;
};

const centsFor = (amount: number | string | null) => Math.round(Number(amount ?? 0) * 100);

function neededPricesFor(plan: PlanRow): PriceSpec[] {
  if (plan.is_trial) {
    return [{ kind: "one_time", column: "stripe_price_id_one_time", unit_amount: centsFor(plan.price_monthly) }];
  }
  const needed: PriceSpec[] = [];
  if (Number(plan.price_monthly) > 0) {
    needed.push({ kind: "recurring", interval: "month", column: "stripe_price_id_monthly", unit_amount: centsFor(plan.price_monthly) });
  }
  if (Number(plan.price_yearly) > 0) {
    needed.push({ kind: "recurring", interval: "year", column: "stripe_price_id_yearly", unit_amount: centsFor(plan.price_yearly) });
  }
  return needed;
}

function matchExistingPrice(prices: Stripe.Price[], spec: PriceSpec): Stripe.Price | null {
  return (
    prices.find((p) => {
      if (!p.active || p.currency !== "usd" || p.unit_amount !== spec.unit_amount) return false;
      if (spec.kind === "one_time") return p.type === "one_time";
      return p.type === "recurring" && p.recurring?.interval === spec.interval;
    }) ?? null
  );
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!supabaseUrl || !serviceKey || !anonKey) return json(corsHeaders, 500, { error: "Supabase env not configured" });
    if (!stripeKey) return json(corsHeaders, 500, { error: "STRIPE_SECRET_KEY is not set" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(corsHeaders, 401, { error: "No authorization header" });

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json(corsHeaders, 401, { error: "Unauthorized" });

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "super_admin"]);
    if (rolesErr || !roles?.length) return json(corsHeaders, 403, { error: "Admin access required" });

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);

    const { data: plans, error: plansErr } = await supabaseAdmin
      .from("plans")
      .select(
        "id, name, display_name, price_monthly, price_yearly, is_trial, stripe_price_id_monthly, stripe_price_id_yearly, stripe_price_id_one_time",
      )
      .eq("is_active", true)
      .order("sort_order");
    if (plansErr) return json(corsHeaders, 500, { error: `Failed to fetch plans: ${plansErr.message}` });
    if (!plans?.length) return json(corsHeaders, 400, { error: "No active plans found" });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const livemode = stripeKey.startsWith("sk_live_");
    const report: Array<Record<string, unknown>> = [];

    for (const plan of plans as PlanRow[]) {
      const actions: string[] = [];
      const search = await stripe.products.search({
        query: `active:'true' AND metadata['sellersuit_plan']:'${plan.name}'`,
      });
      let product = search.data[0] ?? null;

      if (!product) {
        if (dryRun) {
          actions.push("would create product");
        } else {
          product = await stripe.products.create({
            name: `SellerSuit ${plan.display_name || plan.name}`,
            metadata: { sellersuit_plan: plan.name },
          });
          actions.push(`created product ${product.id}`);
        }
      } else {
        actions.push(`product ${product.id} (existing)`);
      }

      const existingPrices = product
        ? (await stripe.prices.list({ product: product.id, active: true, limit: 100 })).data
        : [];

      const patch: Record<string, string> = {};
      for (const spec of neededPricesFor(plan)) {
        const label = spec.kind === "one_time" ? "one-time" : spec.interval;
        const match = matchExistingPrice(existingPrices, spec);
        if (match) {
          actions.push(`price ${label} -> ${match.id} (existing)`);
          if (plan[spec.column] !== match.id) patch[spec.column] = match.id;
        } else if (dryRun || !product) {
          actions.push(`would create ${label} price $${(spec.unit_amount / 100).toFixed(2)}`);
        } else {
          const price = await stripe.prices.create({
            product: product.id,
            currency: "usd",
            unit_amount: spec.unit_amount,
            ...(spec.kind === "recurring" ? { recurring: { interval: spec.interval! } } : {}),
            metadata: { sellersuit_plan: plan.name },
          });
          patch[spec.column] = price.id;
          actions.push(`created ${label} price ${price.id}`);
        }
      }

      if (Object.keys(patch).length) {
        if (dryRun) {
          actions.push(`would update plans row: ${JSON.stringify(patch)}`);
        } else {
          const { error: patchErr } = await supabaseAdmin.from("plans").update(patch).eq("id", plan.id);
          if (patchErr) return json(corsHeaders, 500, { error: `Failed to update plan ${plan.name}: ${patchErr.message}` });
          actions.push(`updated plans row: ${JSON.stringify(patch)}`);
        }
      }

      report.push({ plan: plan.name, actions });
    }

    return json(corsHeaders, 200, { ok: true, dryRun, livemode, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ADMIN-SYNC-STRIPE-PLANS]", message);
    return json(corsHeaders, 500, { error: message });
  }
});
