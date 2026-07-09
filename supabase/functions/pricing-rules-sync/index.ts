import { resolveExtensionCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceActiveSubscription } from "../_shared/plan-middleware.ts";

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

    // Fetch only the fields the extension needs — no user_id, no billing data
    const { data: rowsData, error: fetchErr } = await supabase
      .from('user_pricing_settings')
      .select(
        'supplier_key, supplier_name, is_enabled, supplier_domains, rule_version, ' +
        'profit_margin_percent, minimum_profit, shipping_buffer, fixed_handling_fee, ' +
        'marketplace_fee_percent, currency_buffer_percent, rounding_rule, updated_at'
      )
      .eq('user_id', user.id)
      .order('supplier_key');

    if (fetchErr) return json({ error: 'Failed to fetch rules' }, 500);

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
