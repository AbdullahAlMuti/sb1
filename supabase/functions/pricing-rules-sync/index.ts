import { resolveExtensionCors } from "../_shared/cors.ts";
import { createServiceClient, resolveExtensionOrLegacyAuth } from "../_shared/extension-session.ts";
import { enforceActiveSubscription } from "../_shared/plan-middleware.ts";
import { defaultRuleForSupplier } from "../_shared/pricing-service.ts";
import { SUPPLIER_DEFAULTS } from "../_shared/pricing-validation.ts";

const RULE_COLUMNS =
  'supplier_key, supplier_name, is_enabled, supplier_domains, rule_version, ' +
  'profit_margin_percent, minimum_profit, shipping_buffer, fixed_handling_fee, ' +
  'marketplace_fee_percent, currency_buffer_percent, rounding_rule, updated_at, ' +
  'formula_version, per_order_fee';

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  function json(data: unknown, status = 200, extra?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  try {
    // Accept BOTH auth modes. This endpoint used supabase.auth.getUser(), which
    // only understands a Supabase JWT, so an extension session token (ssat_…)
    // gets a 401 and the extension keeps an empty rules cache. Observed live
    // 2026-11-12: scans logged "no_rule_synced" while the dashboard had an
    // enabled Amazon rule (token type in that session was not confirmed).
    const supabaseAdmin = createServiceClient();
    let userId: string;
    try {
      const auth = await resolveExtensionOrLegacyAuth(supabaseAdmin, req);
      userId = auth.userId;
    } catch (authErr) {
      return json({ error: authErr instanceof Error ? authErr.message : 'Unauthorized' }, 401);
    }
    const user = { id: userId };
    // Service-role client: every query below is explicitly scoped to userId.
    const supabase = supabaseAdmin;

    const block = await enforceActiveSubscription(supabaseAdmin, user.id);
    if (block) return block;

    // Fetch only the fields the extension needs — no user_id, no billing data
    const fetchRules = () => supabase
      .from('user_pricing_settings')
      .select(RULE_COLUMNS)
      .eq('user_id', user.id)
      .order('supplier_key');

    let { data: rowsData, error: fetchErr } = await fetchRules();

    if (fetchErr) {
      // Log + surface the database error code: a bare "Failed to fetch rules"
      // left the extension unpriced with nothing to diagnose.
      console.error('pricing-rules-sync: rule query failed', fetchErr);
      return json({ error: `Failed to fetch rules (${fetchErr.code || 'no-code'}: ${String(fetchErr.message || '').slice(0, 140)})` }, 500);
    }

    // Seed default rules for any supplier the user has never configured.
    // Defaults used to be created only by pricing-settings (the dashboard
    // Calculator page), so a user who never opened it synced an empty rule
    // list and every scan showed "No eBay price". Same defaults as the
    // dashboard; ignoreDuplicates never overwrites a row the user saved.
    const existingKeys = new Set(((rowsData ?? []) as any[]).map((r) => r.supplier_key));
    const missingKeys = Object.keys(SUPPLIER_DEFAULTS).filter((k) => !existingKeys.has(k));
    if (missingKeys.length > 0) {
      const { error: seedErr } = await supabase
        .from('user_pricing_settings')
        .upsert(
          missingKeys.map((k) => defaultRuleForSupplier(user.id, k)),
          { onConflict: 'user_id,supplier_key', ignoreDuplicates: true },
        );
      if (seedErr) {
        // Serve whatever rules exist rather than failing the whole sync.
        console.error('pricing-rules-sync: default rule seed failed', seedErr);
      } else {
        ({ data: rowsData, error: fetchErr } = await fetchRules());
        if (fetchErr) {
          console.error('pricing-rules-sync: rule re-query failed', fetchErr);
          return json({ error: `Failed to fetch rules (${fetchErr.code || 'no-code'}: ${String(fetchErr.message || '').slice(0, 140)})` }, 500);
        }
      }
    }

    // Supabase infers a GenericStringError union for the select; the query is
    // valid at runtime, so treat the rows as plain records for typing purposes.
    const rows = (rowsData ?? []) as any[];

    const suppliers = rows.map((r: any) => ({
      supplierKey:     r.supplier_key,
      supplierName:    r.supplier_name,
      isEnabled:       r.is_enabled,
      domains:         r.supplier_domains,
      ruleVersion:     r.rule_version,
      calculationRule: {
        profitMarginPercent:   Number(r.profit_margin_percent),
        minimumProfit:         Number(r.minimum_profit),
        shippingBuffer:        Number(r.shipping_buffer),
        fixedHandlingFee:      Number(r.fixed_handling_fee),
        marketplaceFeePercent: Number(r.marketplace_fee_percent),
        currencyBufferPercent: Number(r.currency_buffer_percent),
        roundingRule:          r.rounding_rule,
        formulaVersion:        Number(r.formula_version ?? 1),
        perOrderFee:           Number(r.per_order_fee ?? 0),
      },
    }));

    // ETag = SHA-256 of "user_id:maxUpdatedAt:enabledCount"
    const maxUpdatedAt = rows?.length
      ? rows.reduce((m, r) => r.updated_at > m ? r.updated_at : m, rows[0].updated_at)
      : '0';
    const enabledCount = (rows ?? []).filter(r => r.is_enabled).length;
    const etagRaw = `${user.id}:${maxUpdatedAt}:${enabledCount}`;
    const etag = `"${await sha256hex(etagRaw)}"`;

    // Conditional GET — return 304 if client has the same etag
    const clientEtag = req.headers.get('if-none-match');
    if (clientEtag && clientEtag === etag) {
      return new Response(null, {
        status: 304,
        headers: { ...corsHeaders, 'ETag': etag, 'Cache-Control': 'max-age=300' },
      });
    }

    const body = {
      version:   etag,
      updatedAt: maxUpdatedAt,
      suppliers,
    };

    return json(body, 200, { 'ETag': etag, 'Cache-Control': 'max-age=300' });

  } catch (err: unknown) {
    console.error('pricing-rules-sync: unexpected error', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
