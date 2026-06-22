// Reconciliation cron — defense-in-depth for dropped/delayed Stripe webhooks.
//
// The webhook (primary) and check-subscription-v2 (per-load self-heal) already
// cover most cases. This sweep catches users who PAID but never returned to the
// app (so check-subscription-v2 never ran for them): it inspects pending
// checkout_sessions, asks Stripe for ground truth, and activates idempotently.
//
// Schedule via Supabase cron (pg_cron → net.http_post) every ~10 min. Protected
// by a shared secret so only the scheduler can invoke it. Safe to run as often
// as you like — every write here is idempotent.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { activateTrial } from "../_shared/trial-activation.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";


const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RECONCILE-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

// Only reconcile sessions in this window: old enough that the webhook has had a
// fair chance, young enough that the Stripe session is still meaningful.
const MIN_AGE_MS = 3 * 60 * 1000; // 3 minutes
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const BATCH_LIMIT = 50;

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

  // Auth: accept the shared cron secret OR the service-role bearer token.
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const authorized =
    (cronSecret && headerSecret === cronSecret) ||
    (serviceRoleKey && bearer === serviceRoleKey);

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const summary = { scanned: 0, trialsActivated: 0, markedCompleted: 0, errors: 0 };

  try {
    const now = Date.now();
    const minCreated = new Date(now - MAX_AGE_MS).toISOString();
    const maxCreated = new Date(now - MIN_AGE_MS).toISOString();

    const { data: pending, error } = await supabase
      .from("checkout_sessions")
      .select("id, user_id, stripe_checkout_session_id, status, created_at")
      .eq("status", "pending")
      .gte("created_at", minCreated)
      .lte("created_at", maxCreated)
      .limit(BATCH_LIMIT);

    if (error) throw error;

    for (const row of pending ?? []) {
      summary.scanned++;
      try {
        if (!row.stripe_checkout_session_id) continue;

        const session = await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id);

        // Not finished paying yet — leave it pending for a later sweep.
        const isComplete = session.status === "complete" || session.payment_status === "paid";
        if (!isComplete) continue;

        if (session.mode === "payment" && session.payment_status === "paid" && session.metadata?.plan_id) {
          // $1 trial — the only path with no Stripe subscription to fall back on.
          const result = await activateTrial(supabase, stripe, {
            userId: row.user_id ?? (session.metadata.user_id as string),
            planId: session.metadata.plan_id,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
            sourceId:
              (typeof session.payment_intent === "string" ? session.payment_intent : null) || session.id,
          });
          if (result.activated) summary.trialsActivated++;
        }
        // For mode === "subscription", entitlement is owned by the webhook and by
        // check-subscription-v2's live Stripe read, so we only need to stop
        // reprocessing this row.

        await supabase
          .from("checkout_sessions")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", row.id);
        summary.markedCompleted++;
      } catch (e) {
        summary.errors++;
        logStep("Row reconcile failed (non-fatal)", { id: row.id, error: String(e) });
      }
    }

    logStep("Sweep complete", summary);
    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logStep("ERROR", { error: String(e) });
    return new Response(JSON.stringify({ error: String(e), ...summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
