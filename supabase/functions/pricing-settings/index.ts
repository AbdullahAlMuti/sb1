import { resolveExtensionCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceActiveSubscription } from "../_shared/plan-middleware.ts";
import {
  EBAY_FEE_DEFAULT_PERCENT,
  EBAY_PER_ORDER_FEE_DEFAULT,
  PRICING_FORMULA_VERSIONS,
  SUPPLIER_DEFAULTS,
  validateSupplierKey,
  validateRoundingRule,
  validateNumericRange,
  validateNonNegative,
} from "../_shared/pricing-validation.ts";

// Seed default rows for any missing suppliers (idempotent: skips existing rows).
// New seeds start on formula v2 (sale-based gross-up) with honest eBay defaults —
// the marketplace fee belongs to eBay (the selling venue), not the supplier.
async function seedMissingSuppliers(
  // deno-lint-ignore no-explicit-any -- Supabase client generics are unset here; typed loosely to avoid a spurious never[] upsert error.
  supabaseAdmin: any,
  userId: string,
  existingKeys: Set<string>,
) {
  const missing = Object.entries(SUPPLIER_DEFAULTS).filter(([key]) => !existingKeys.has(key));
  if (missing.length === 0) return;

  const rows = missing.map(([key, d]) => ({
    user_id: userId,
    supplier_key: key,
    supplier_name: d.supplierName,
    supplier_domains: d.domains,
    is_enabled: true,
    profit_margin_percent: 25,
    minimum_profit: 5,
    shipping_buffer: 3,
    fixed_handling_fee: 0,
    marketplace_fee_percent: EBAY_FEE_DEFAULT_PERCENT,
    currency_buffer_percent: 2,
    rounding_rule: 'END_99',
    rule_version: 1,
    formula_version: 2,
    per_order_fee: EBAY_PER_ORDER_FEE_DEFAULT,
  }));

  // ignoreDuplicates prevents overwriting rows another request may have inserted
  // concurrently since our existingKeys check.
  const { error } = await supabaseAdmin
    .from('user_pricing_settings')
    .upsert(rows, { onConflict: 'user_id,supplier_key', ignoreDuplicates: true });

  if (error) throw new Error(`Seed failed: ${error.message}`);
}

Deno.serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  function json(data: unknown, status = 200, extra?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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

    // ── GET ─────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { data: rows, error: fetchErr } = await supabase
        .from('user_pricing_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('supplier_key');

      if (fetchErr) return json({ error: 'Failed to fetch settings' }, 500);

      // Seed any supplier rows not yet present (handles new suppliers + first-time users)
      const existingKeys = new Set((rows ?? []).map((r: { supplier_key: string }) => r.supplier_key));
      const allExpected = Object.keys(SUPPLIER_DEFAULTS);
      const needsSeed = allExpected.some((k) => !existingKeys.has(k));

      if (needsSeed) {
        await seedMissingSuppliers(supabaseAdmin, user.id, existingKeys);
        const { data: seeded, error: seededErr } = await supabase
          .from('user_pricing_settings')
          .select('*')
          .eq('user_id', user.id)
          .order('supplier_key');
        if (seededErr) return json({ error: 'Failed to fetch seeded settings' }, 500);
        return json({ success: true, suppliers: seeded ?? [] });
      }

      return json({ success: true, suppliers: rows });
    }

    // ── PUT ─────────────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      let body: Record<string, unknown>;
      try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

      // Validate all inputs
      let supplierKey: string;
      try {
        supplierKey             = validateSupplierKey(body.supplierKey);
        validateRoundingRule(body.roundingRule);
        validateNonNegative(body.profitMarginPercent, 'profitMarginPercent');
        validateNonNegative(body.minimumProfit,       'minimumProfit');
        validateNonNegative(body.shippingBuffer,      'shippingBuffer');
        validateNonNegative(body.fixedHandlingFee,    'fixedHandlingFee');
        validateNumericRange(body.marketplaceFeePercent, 0, 100, 'marketplaceFeePercent');
        validateNumericRange(body.currencyBufferPercent,  0, 100, 'currencyBufferPercent');
        if (body.formulaVersion !== undefined && !PRICING_FORMULA_VERSIONS.has(Number(body.formulaVersion))) {
          throw new RangeError(`formulaVersion must be one of: ${[...PRICING_FORMULA_VERSIONS].join(', ')}`);
        }
        if (body.perOrderFee !== undefined) {
          validateNumericRange(body.perOrderFee, 0, 10, 'perOrderFee');
        }
      } catch (e: unknown) {
        return json({ error: (e as Error).message }, 400);
      }

      // Fetch the current row so we can bump rule_version and preserve the
      // formula fields when the client omits them (older dashboard versions
      // must never silently downgrade a v2 rule back to v1).
      const { data: existing } = await supabase
        .from('user_pricing_settings')
        .select('rule_version, formula_version, per_order_fee')
        .eq('user_id', user.id)
        .eq('supplier_key', supplierKey)
        .maybeSingle();

      const nextVersion = ((existing?.rule_version ?? 0) as number) + 1;
      const formulaVersion = body.formulaVersion !== undefined
        ? Number(body.formulaVersion)
        : Number(existing?.formula_version ?? 2); // brand-new rows default to v2
      const perOrderFee = body.perOrderFee !== undefined
        ? Number(body.perOrderFee)
        : Number(existing?.per_order_fee ?? EBAY_PER_ORDER_FEE_DEFAULT);

      const { data: saved, error: saveErr } = await supabase
        .from('user_pricing_settings')
        .upsert({
          user_id:                 user.id,
          supplier_key:            supplierKey,
          supplier_name:           SUPPLIER_DEFAULTS[supplierKey].supplierName,
          supplier_domains:        SUPPLIER_DEFAULTS[supplierKey].domains,
          is_enabled:              Boolean(body.isEnabled ?? true),
          profit_margin_percent:   Number(body.profitMarginPercent),
          minimum_profit:          Number(body.minimumProfit),
          shipping_buffer:         Number(body.shippingBuffer),
          fixed_handling_fee:      Number(body.fixedHandlingFee),
          marketplace_fee_percent: Number(body.marketplaceFeePercent),
          currency_buffer_percent: Number(body.currencyBufferPercent),
          rounding_rule:           String(body.roundingRule),
          rule_version:            nextVersion,
          formula_version:         formulaVersion,
          per_order_fee:           perOrderFee,
          notes:                   typeof body.notes === 'string' ? body.notes : null,
        }, { onConflict: 'user_id,supplier_key' })
        .select()
        .single();

      if (saveErr) {
        console.error('pricing-settings PUT error:', saveErr);
        return json({ error: 'Failed to save settings' }, 500);
      }

      return json({ success: true, supplier: saved });
    }

    return json({ error: 'Method not allowed' }, 405);

  } catch (err: unknown) {
    console.error('pricing-settings: unexpected error', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
