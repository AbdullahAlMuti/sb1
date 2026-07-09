import { resolveExtensionCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceActiveSubscription } from "../_shared/plan-middleware.ts";
import { calculatePrice } from "../_shared/pricing-core.js";
import { validateSupplierKey } from "../_shared/pricing-validation.ts";

Deno.serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
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

    const supplierPrice = body.supplierPrice;
    const shippingCost  = body.shippingCost ?? 0;

    if (supplierPrice === undefined || supplierPrice === null) {
      return json({ error: 'supplierPrice is required' }, 400);
    }

    // Load the user's saved rule for this supplier
    const { data: rule, error: ruleErr } = await supabase
      .from('user_pricing_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('supplier_key', supplierKey)
      .maybeSingle();

    if (ruleErr) return json({ error: 'Failed to load pricing rule' }, 500);
    if (!rule) return json({ error: `No pricing rule found for supplier "${supplierKey}"` }, 404);

    // Compute via pricing-core (server-side, authoritative)
    let breakdown: ReturnType<typeof calculatePrice>;
    try {
      breakdown = calculatePrice(
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

    return json({ success: true, preview: breakdown });

  } catch (err: unknown) {
    console.error('pricing-preview: unexpected error', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
