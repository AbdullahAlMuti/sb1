import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceActiveSubscription } from "../_shared/plan-middleware.ts";
import { calculatePrice } from "../_shared/pricing-core.js";
import { validateSupplierKey } from "../_shared/pricing-validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Maximum allowed cents difference between client and server price before rejection
const EPSILON_CENTS = 1;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const block = await enforceActiveSubscription(supabaseAdmin, user.id);
    if (block) return block;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

    let supplierKey: string;
    try { supplierKey = validateSupplierKey(body.supplierKey); }
    catch (e: unknown) { return json({ error: (e as Error).message }, 400); }

    const clientFinalPrice   = Number(body.clientFinalPrice);
    const clientRuleVersion  = Number(body.clientRuleVersion);
    const supplierPrice      = body.supplierPrice;
    const shippingCost       = body.shippingCost ?? 0;

    if (!isFinite(clientFinalPrice)) return json({ error: 'clientFinalPrice must be a number' }, 400);
    if (!isFinite(clientRuleVersion)) return json({ error: 'clientRuleVersion must be a number' }, 400);

    // Load the LATEST saved rule from DB
    const { data: rule, error: ruleErr } = await supabase
      .from('user_pricing_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('supplier_key', supplierKey)
      .maybeSingle();

    if (ruleErr) return json({ error: 'Failed to load pricing rule' }, 500);
    if (!rule) return json({ error: `No pricing rule found for supplier "${supplierKey}"` }, 404);

    // Recompute via pricing-core (authoritative)
    let serverBreakdown: ReturnType<typeof calculatePrice>;
    try {
      serverBreakdown = calculatePrice(
        {
          supplierKey:            rule.supplier_key,
          ruleVersion:            rule.rule_version,
          profitMarginPercent:    Number(rule.profit_margin_percent),
          minimumProfit:          Number(rule.minimum_profit),
          shippingBuffer:         Number(rule.shipping_buffer),
          fixedHandlingFee:       Number(rule.fixed_handling_fee),
          marketplaceFeePercent:  Number(rule.marketplace_fee_percent),
          currencyBufferPercent:  Number(rule.currency_buffer_percent),
          roundingRule:           rule.rounding_rule,
        },
        supplierPrice as number | string,
        shippingCost as number | string,
      );
    } catch (e: unknown) {
      return json({ error: `Calculation error: ${(e as Error).message}` }, 400);
    }

    const serverFinalPrice   = parseFloat(serverBreakdown.finalPrice);
    const serverRuleVersion  = rule.rule_version as number;

    // Check for stale rule version or price drift
    const clientCents = Math.round(clientFinalPrice * 100);
    const serverCents = Math.round(serverFinalPrice * 100);
    const drift       = Math.abs(clientCents - serverCents);
    const staleRule   = clientRuleVersion < serverRuleVersion;

    if (staleRule || drift > EPSILON_CENTS) {
      // [RISK] Log pricing drift for monitoring
      console.warn(`pricing-verify: drift detected user=${user.id} supplier=${supplierKey}`, {
        clientFinalPrice, serverFinalPrice, drift,
        clientRuleVersion, serverRuleVersion, stale: staleRule,
      });

      // Non-blocking audit log (best-effort — don't fail the verify if logging fails)
      supabaseAdmin.from('admin_audit_logs').insert({
        admin_id:       user.id,
        target_user_id: user.id,
        action:         'pricing_drift',
        entity_type:    'pricing_drift',
        entity_id:      supplierKey,
        old_value:      String(clientFinalPrice),
        new_value:      String(serverFinalPrice),
        reason:         staleRule
          ? `Stale rule version (client=${clientRuleVersion} server=${serverRuleVersion})`
          : `Price drift ${drift} cents`,
      }).then(() => {/* fire-and-forget */});

      return json({
        verified:          false,
        serverFinalPrice:  serverBreakdown.finalPrice,
        serverRuleVersion,
        reason: staleRule
          ? `Pricing rules have been updated (v${clientRuleVersion} → v${serverRuleVersion}). Please sync and retry.`
          : `Price mismatch: client=${clientFinalPrice} server=${serverFinalPrice}. Please recalculate.`,
        breakdown: serverBreakdown,
      }, 409);
    }

    return json({
      verified:         true,
      serverFinalPrice: serverBreakdown.finalPrice,
      serverRuleVersion,
    });

  } catch (err: unknown) {
    console.error('pricing-verify: unexpected error', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
