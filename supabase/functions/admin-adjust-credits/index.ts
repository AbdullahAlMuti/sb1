import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsHeaders } from "../_shared/cors.ts";


type Action = "grant" | "set" | "reset_to_plan";

function json(ch: Record<string,string>, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...ch, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json(corsHeaders, 500, { error: "Supabase env not configured" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(corsHeaders, 401, { error: "No authorization header" });
    }

    // Verify caller identity using anon client bound to the incoming token.
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return json(corsHeaders, 401, { error: "Unauthorized" });
    }
    const adminId = userData.user.id;

    // Use service role for admin operations.
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .in("role", ["admin"]);

    if (rolesErr || !roles || roles.length === 0) {
      return json(corsHeaders, 403, { error: "Admin access required" });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId ?? "");
    const action = body.action as Action;
    const reason = String(body.reason ?? "").trim();
    const amountRaw = body.amount;

    if (!userId) return json(corsHeaders, 400, { error: "userId is required" });
    if (!reason) return json(corsHeaders, 400, { error: "reason is required" });
    if (!action || !["grant", "set", "reset_to_plan"].includes(action)) {
      return json(corsHeaders, 400, { error: "Invalid action" });
    }

    // Load profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, credits, plan_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr || !profile) return json(corsHeaders, 404, { error: "User profile not found" });

    const currentCredits = Math.max(Number(profile.credits ?? 0), 0);

    let newCredits = currentCredits;
    let delta = 0;

    if (action === "reset_to_plan") {
      // Determine plan credits
      let planCredits = 0;
      if (profile.plan_id) {
        const { data: plan } = await supabaseAdmin
          .from("plans")
          .select("credits_per_month")
          .eq("id", profile.plan_id)
          .maybeSingle();
        planCredits = Math.max(Number(plan?.credits_per_month ?? 0), 0);
      }

      newCredits = planCredits;
      delta = newCredits - currentCredits;

      // Reset usage tracking (best-effort)
      await supabaseAdmin
        .from("user_plans")
        .update({ credits_used: 0 })
        .eq("user_id", userId);
    } else {
      const amount = Number(amountRaw);
      if (!Number.isFinite(amount) || amount === 0) {
        return json(corsHeaders, 400, { error: "amount must be a non-zero number" });
      }

      if (action === "grant") {
        delta = amount;
        newCredits = Math.max(currentCredits + delta, 0);
        delta = newCredits - currentCredits; // clamp-aware
      } else if (action === "set") {
        newCredits = Math.max(amount, 0);
        delta = newCredits - currentCredits;
      }
    }

    // Apply profile credits update
    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId);
    if (updErr) {
      console.error("[admin-adjust-credits] db error:", updErr.message);
      return json(corsHeaders, 500, { error: "Failed to update credits" });
    }

    const transactionType =
      action === "grant" ? "admin_grant" : action === "set" ? "admin_set" : "admin_reset";

    // Log credit transaction
    const { error: txErr } = await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: delta,
      balance_after: newCredits,
      transaction_type: transactionType,
      description: reason,
      metadata: {
        admin_user_id: adminId,
        action,
        requested_amount: action === "reset_to_plan" ? null : Number(amountRaw),
        previous_credits: currentCredits,
      },
    });

    if (txErr) {
      // Credits already updated; keep this best-effort but report.
      console.error("credit_transactions insert failed", txErr);
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: adminId,
      action: "ADMIN_CREDITS_UPDATED",
      entity_type: "profile",
      entity_id: userId,
      metadata: {
        transaction_type: transactionType,
        delta,
        new_credits: newCredits,
        reason,
      },
    });

    return json(corsHeaders, 200, {
      success: true,
      userId,
      previousCredits: currentCredits,
      newCredits,
      delta,
      transactionLogged: !txErr,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("admin-adjust-credits error", message);
    return json(corsHeaders, 500, { error: message });
  }
});
