import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveCorsHeaders } from '../_shared/cors.ts';

// ── cors / helpers ────────────────────────────────────────────────────────────

function createServiceClient() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { autoRefreshToken: false, persistSession: false } });
}

function getAuthToken(req: Request): string | null {
  const h = req.headers.get('Authorization') || '';
  if (h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim() || null;
  return req.headers.get('x-api-key')?.trim() || null;
}

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
}

function isExpired(v: string | null | undefined): boolean { if (!v) return true; return new Date(v).getTime() <= Date.now(); }
function base64Url(bytes: Uint8Array): string { let b = ''; for (const x of bytes) b += String.fromCharCode(x); return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }
async function sha256h(value: string): Promise<string> { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return base64Url(new Uint8Array(d)); }

// ── rate limit ────────────────────────────────────────────────────────────────
async function checkRateLimit(supabase: SupabaseClient, bucket: string, key: string | null | undefined, limit: number, windowSeconds: number) {
  const wMs = windowSeconds * 1000;
  const wStartMs = Math.floor(Date.now() / wMs) * wMs;
  const windowStart = new Date(wStartMs).toISOString();
  const resetAt = new Date(wStartMs + wMs).toISOString();
  const expiresAt = new Date(wStartMs + wMs * 2).toISOString();
  const hash = await sha256h(`${bucket}:${key?.trim() || 'unknown'}`);
  const { data: ex } = await supabase.from('function_rate_limits').select('id,request_count').eq('bucket', bucket).eq('subject_hash', hash).eq('window_start', windowStart).maybeSingle();
  if (ex) {
    const count = Number(ex.request_count ?? 0);
    if (count >= limit) return { allowed: false, resetAt };
    await supabase.from('function_rate_limits').update({ request_count: count + 1, expires_at: expiresAt }).eq('id', ex.id);
    return { allowed: true, resetAt };
  }
  await supabase.from('function_rate_limits').insert({ bucket, subject_hash: hash, window_start: windowStart, request_count: 1, expires_at: expiresAt });
  return { allowed: true, resetAt };
}

// ── auth ──────────────────────────────────────────────────────────────────────
async function resolveAuth(supabase: SupabaseClient, req: Request) {
  const token = getAuthToken(req);
  if (!token) throw new Error('Missing authorization');

  if (token.startsWith('ssat_')) {
    const hash = await sha256h(token);
    const { data: session } = await supabase.from('extension_sessions').select('*').eq('access_token_hash', hash).maybeSingle();
    if (!session || session.status !== 'active') throw new Error('Invalid extension session');
    if (isExpired(session.access_token_expires_at)) throw new Error('Extension access token expired');
    const { data: device } = await supabase.from('extension_devices').select('*').eq('id', session.device_id).maybeSingle();
    if (!device || device.status !== 'active') throw new Error('Extension device not approved');
    const { data: profile } = await supabase.from('profiles').select('id,email,full_name,is_active,account_status,plan_id,credits,default_workspace_id,selected_plan_id,payment_status,subscription_status').eq('id', session.user_id).maybeSingle();
    if (!profile) throw new Error('User profile not found');
    if (profile.is_active === false || ['Suspended','Banned'].includes(profile.account_status)) throw new Error('User account not active');
    
    // Resolve workspace gracefully
    let ws = null;
    if (session.workspace_id) {
      const { data: wsData } = await supabase.from('workspaces').select('*').eq('id', session.workspace_id).maybeSingle();
      ws = wsData;
    }
    
    if (!ws) {
      let workspaceId = profile.default_workspace_id;
      if (workspaceId) {
        const { data: wsData } = await supabase.from('workspaces').select('*').eq('id', workspaceId).maybeSingle();
        ws = wsData;
      }
      if (!ws) {
        const { data: wsData } = await supabase.from('workspaces').select('*').eq('owner_user_id', session.user_id).is('slug', null).maybeSingle();
        ws = wsData;
      }
      if (!ws) {
        const { data: wsData, error: wsErr } = await supabase.from('workspaces').insert({
          owner_user_id: session.user_id,
          name: "Default Workspace",
          slug: null,
          status: "active",
          metadata: { created_by: "create_listing_resolve_auth_fallback" }
        }).select('*').single();
        if (wsErr || !wsData) throw new Error(wsErr?.message || 'Failed to create fallback workspace');
        ws = wsData;
      }
      
      // Ensure workspace membership
      await supabase.from('workspace_members').upsert({
        workspace_id: ws.id,
        user_id: session.user_id,
        role: 'owner',
        status: 'active'
      }, { onConflict: 'workspace_id,user_id' });
      
      // Update session and profile default_workspace_id
      await supabase.from('extension_sessions').update({ workspace_id: ws.id }).eq('id', session.id);
      if (!profile.default_workspace_id) {
        await supabase.from('profiles').update({ default_workspace_id: ws.id }).eq('id', session.user_id);
      }
    }
    
    await supabase.from('extension_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', session.id);

    // Enforce subscription check for extension sessions
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', profile.id);
    const isAdmin = (roleRows || []).some(
      (r: any) => r.role === 'admin' || r.role === 'super_admin' || r.role === 'moderator'
    );
    if (!isAdmin) {
      const isPaid = profile.payment_status === 'paid' || profile.payment_status === 'succeeded';
      const isSubscriptionActive = profile.subscription_status === 'active';
      if (!profile.selected_plan_id || !isPaid || !isSubscriptionActive) {
        throw new Error('Active paid subscription required');
      }
    }

    return { userId: profile.id as string, workspaceId: ws.id as string, profile, workspace: ws, authMode: 'extension_session' };
  }

  // Legacy Supabase JWT
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid legacy auth token');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (!profile) throw new Error('User profile not found');
  if (profile?.is_active === false || ['Suspended','Banned'].includes(profile?.account_status)) throw new Error('User account not active');

  // Enforce subscription check for legacy JWT
  const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
  const isAdmin = (roleRows || []).some(
    (r: any) => r.role === 'admin' || r.role === 'super_admin' || r.role === 'moderator'
  );
  if (!isAdmin) {
    const isPaid = profile.payment_status === 'paid' || profile.payment_status === 'succeeded';
    const isSubscriptionActive = profile.subscription_status === 'active';
    if (!profile.selected_plan_id || !isPaid || !isSubscriptionActive) {
      throw new Error('Active paid subscription required');
    }
  }

  let workspaceId: string | null = profile?.default_workspace_id || null;
  if (!workspaceId) {
    const { data: ws } = await supabase.from('workspaces').select('id').eq('owner_user_id', data.user.id).is('slug', null).maybeSingle();
    workspaceId = ws?.id || null;
  }
  return { userId: data.user.id as string, workspaceId, profile, workspace: null, authMode: 'legacy_jwt' };
}

// ── feature entitlement ───────────────────────────────────────────────────────
async function planAllowsFeature(supabase: SupabaseClient, planId: string, featureKey: string): Promise<boolean> {
  const { data: plan } = await supabase.from('plans').select('id,features').eq('id', planId).maybeSingle();
  if (!plan?.features) return false;
  const { data: ent } = await supabase.from('feature_entitlements').select('enabled').eq('feature_key', featureKey).eq('plan_id', plan.id).maybeSingle();
  if (ent) return Boolean(ent.enabled);
  const f = plan.features as any;
  if (Array.isArray(f)) return f.includes(featureKey);
  return Boolean(f[featureKey]);
}

async function requireFeatureEntitlement(supabase: SupabaseClient, userId: string, workspaceId: string | null, featureKey: string): Promise<boolean> {
  let q = supabase.from('feature_overrides').select('enabled,expires_at').eq('feature_key', featureKey);
  q = workspaceId ? q.or(`user_id.eq.${userId},workspace_id.eq.${workspaceId}`) : q.eq('user_id', userId);
  const { data: overrides } = await q;
  for (const ov of overrides || []) {
    if (ov.expires_at && new Date(ov.expires_at).getTime() <= Date.now()) continue;
    if (ov.enabled === false) return false;
    if (ov.enabled === true) return true;
  }

  // Fetch all candidates in parallel: profiles.plan_id, user_plans, subscriptions
  const [
    profileRes,
    userPlanRes,
    subRes
  ] = await Promise.all([
    supabase.from('profiles').select('plan_id, is_active, account_status').eq('id', userId).maybeSingle(),
    supabase.from('user_plans').select('plan_id, status').eq('user_id', userId).maybeSingle(),
    workspaceId
      ? supabase
          .from('subscriptions')
          .select('plan_id, status')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const profile = profileRes.data;
  const userPlan = userPlanRes.data;
  const subscription = subRes.data;

  // Block suspended/banned/inactive profiles
  if (profile?.is_active === false || ['Suspended', 'Banned'].includes(profile?.account_status || '')) {
    return false;
  }

  let planId: string | null = null;
  let isPlanActive = false;

  // 1. Check workspace subscription
  if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
    planId = subscription.plan_id;
    isPlanActive = true;
  }

  // 2. Check user plan
  if (!isPlanActive && userPlan && userPlan.status === 'active') {
    planId = userPlan.plan_id;
    isPlanActive = true;
  }

  // 3. Fallback to profiles.plan_id if profile is active
  if (!isPlanActive && profile && profile.plan_id) {
    planId = profile.plan_id;
    isPlanActive = true;
  }

  if (!isPlanActive || !planId) return false;

  return planAllowsFeature(supabase, planId, featureKey);
}

// ── plan validation (listing count + credit) ──────────────────────────────────
async function validateListingAllowed(supabase: SupabaseClient, userId: string): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
  const { data: profile } = await supabase.from('profiles').select('credits,plan_id').eq('id', userId).maybeSingle();
  if (!profile) return { allowed: false, reason: 'User not found' };
  const { data: up } = await supabase.from('user_plans').select('is_blocked,blocked_reason,trial_end,current_period_end,status,admin_override_limits,plan_id').eq('user_id', userId).maybeSingle();
  const planId = profile.plan_id || up?.plan_id;
  let maxListings = 10;
  if (planId) {
    const { data: plan } = await supabase.from('plans').select('max_listings').eq('id', planId).maybeSingle();
    if (plan?.max_listings != null) maxListings = plan.max_listings;
  }
  if (up?.admin_override_limits?.max_listings != null) maxListings = up.admin_override_limits.max_listings;
  if (up?.is_blocked) return { allowed: false, reason: up.blocked_reason || 'Account blocked' };
  const now = new Date();
  if (up?.trial_end && new Date(up.trial_end) < now) return { allowed: false, reason: 'Trial expired' };
  if (up?.current_period_end && new Date(up.current_period_end) < now) return { allowed: false, reason: 'Subscription expired' };
  const { count } = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active');
  const current = count ?? 0;
  if (maxListings !== -1 && current >= maxListings) return { allowed: false, reason: `Listing limit reached (${current}/${maxListings})`, current, limit: maxListings };
  const credits = profile.credits ?? 0;
  if (credits < 1) return { allowed: false, reason: `Insufficient credits (have ${credits})`, current: credits, limit: 1 };
  return { allowed: true, current, limit: maxListings };
}

// ── types ─────────────────────────────────────────────────────────────────────
interface VariationRow {
  sku: string;
  ebay_sku_encoded?: string;
  final_price: number;
  raw_supplier_price?: number;
  currency?: string;
  stock_quantity?: number;
  variant_asin?: string;
  parent_asin?: string;
  attributes?: Record<string, unknown>;
  image_url?: string | null;
}

interface ListingPayload {
  title: string;
  sku?: string;
  ebayPrice?: number; ebay_price?: number;
  amazonPrice?: number; amazon_price?: number;
  amazonUrl?: string; amazon_url?: string;
  amazonAsin?: string; amazon_asin?: string;
  ebayItemId?: string; ebay_item_id?: string;
  status?: string;
  auto_order_enabled?: boolean;
  amazon_data?: unknown;
  ebay_data?: unknown;
  variations?: VariationRow[];
}

function safeJson(val: unknown) {
  if (!val) return {};
  if (typeof val === 'object') return val as Record<string, unknown>;
  try { return JSON.parse(val as string) as Record<string, unknown>; } catch { return {}; }
}

function extractAsin(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = String(url).match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return m?.[1]?.toUpperCase() ?? null;
}

function cleanPrice(price: any): number | null {
  if (price === null || price === undefined) return null;
  if (typeof price === 'number') {
    return isNaN(price) ? null : price;
  }
  const s = String(price).replace(/[^\d.-]/g, '').trim();
  if (s === '' || s === '-') return null;
  const parsed = parseFloat(s);
  return isNaN(parsed) ? null : parsed;
}

// ── main ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const svc = createServiceClient();

    const ipOk = await checkRateLimit(svc, 'create-listing:ip', getClientIp(req), 60, 60);
    if (!ipOk.allowed) return json({ success: false, error: 'Rate limit exceeded' }, 429);

    const auth = await resolveAuth(svc, req);
    const userId = auth.userId;

    console.log(`[create-listing] User authenticated: ${userId} (${auth.authMode})`);

    const userOk = await checkRateLimit(svc, 'create-listing:user', userId, 120, 60);
    if (!userOk.allowed) return json({ success: false, error: 'Rate limit exceeded' }, 429);

    const hasAccess = await requireFeatureEntitlement(svc, userId, auth.workspaceId, 'ebay_listing_create');
    if (!hasAccess) return json({ success: false, error: 'Feature not entitled or subscription inactive' }, 403);

    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

    const body: ListingPayload = await req.json();
    const amazonData = safeJson((body as any).amazon_data);
    const ebayData   = safeJson((body as any).ebay_data);

    const inferredTitle =
      (typeof body.title === 'string' ? body.title : '') ||
      (ebayData as any)?.title || (ebayData as any)?.ebayTitle ||
      (amazonData as any)?.title || (amazonData as any)?.productTitle || '';

    if (!inferredTitle?.trim()) return json({ success: false, error: 'Title is required' }, 400);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Ensure profile exists
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!profile) {
      const { error: ce } = await supabase.from('profiles').insert({ id: userId, email: auth.profile?.email || '', full_name: auth.profile?.full_name || '', credits: 0, is_active: true, plan_id: null }).select('id').single();
      if (ce) return json({ success: false, error: 'Failed to initialize profile' }, 500);
    }

    const normSku  = body.sku?.trim().substring(0, 100) || null;
    const normAsin = ((body.amazon_asin ?? body.amazonAsin)?.trim().substring(0, 20)) || extractAsin(body.amazon_url ?? body.amazonUrl)?.substring(0, 20) || null;

    // Detect existing listing (idempotent re-list)
    let existingId: string | null = null;
    if (normSku) {
      const { data } = await supabase.from('listings').select('id').eq('user_id', userId).eq('sku', normSku).maybeSingle();
      if (data) existingId = data.id;
    }
    if (!existingId && normAsin) {
      const { data } = await supabase.from('listings').select('id').eq('user_id', userId).eq('amazon_asin', normAsin).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) existingId = data.id;
    }

    // Validate plan limits for NEW listings only
    if (!existingId) {
      const v = await validateListingAllowed(supabase, userId);
      if (!v.allowed) return json({ success: false, error: v.reason, limitType: 'listings', current: v.current, limit: v.limit, upgradeRequired: true }, 402);
    }

    const ebayPrice   = cleanPrice(body.ebayPrice   ?? body.ebay_price);
    const amazonPrice = cleanPrice(body.amazonPrice ?? body.amazon_price);

    const rawVars: VariationRow[] = Array.isArray(body.variations) ? body.variations : [];
    const normVars = rawVars
      .filter(v => v && typeof v.sku === 'string' && v.sku.trim())
      .map(v => ({
        sku:                v.sku.trim().substring(0, 50),
        ebay_sku_encoded:   typeof v.ebay_sku_encoded === 'string' ? v.ebay_sku_encoded : '',
        final_price:        cleanPrice(v.final_price) || 0,
        raw_supplier_price: cleanPrice(v.raw_supplier_price) || 0,
        currency:           v.currency || 'USD',
        stock_quantity:     Number(v.stock_quantity) || 1,
        variant_asin:       v.variant_asin || null,
        parent_asin:        v.parent_asin || normAsin,
        attributes:         v.attributes || {},
        image_url:          v.image_url || null,
      }));

    const varCount  = normVars.length;
    const priceLow  = varCount > 1 ? Math.min(...normVars.map(v => v.final_price)) : (ebayPrice ?? null);
    const priceHigh = varCount > 1 ? Math.max(...normVars.map(v => v.final_price)) : (ebayPrice ?? null);

    // Phase 7: source flags (nullable text fields)
    const titleSource       = typeof (body as any).title_source       === 'string' ? (body as any).title_source.substring(0, 50)       : null;
    const descriptionSource = typeof (body as any).description_source === 'string' ? (body as any).description_source.substring(0, 50) : null;
    const priceSource       = typeof (body as any).price_source       === 'string' ? (body as any).price_source.substring(0, 50)       : null;
    const skuSource         = typeof (body as any).sku_source         === 'string' ? (body as any).sku_source.substring(0, 50)         : null;

    const listingPayload = {
      title:              inferredTitle.trim().substring(0, 500),
      sku:                normSku,
      ebay_price:         ebayPrice,
      amazon_price:       amazonPrice,
      amazon_url:         body.amazonUrl ?? body.amazon_url ?? null,
      amazon_asin:        normAsin,
      ebay_item_id:       (body.ebay_item_id ?? body.ebayItemId)?.trim().substring(0, 50) || null,
      status:             body.status || 'active',
      auto_order_enabled: body.auto_order_enabled ?? false,
      amazon_data:        amazonData,
      ebay_data:          ebayData,
      price_low:          priceLow,
      price_high:         priceHigh,
      // Phase 7: source flags
      ...(titleSource       ? { title_source:       titleSource       } : {}),
      ...(descriptionSource ? { description_source: descriptionSource } : {}),
      ...(priceSource       ? { price_source:       priceSource       } : {}),
      ...(skuSource         ? { sku_source:         skuSource         } : {}),
    };

    // Atomic upsert: parent + all children in one RPC call
    const { data: rpc, error: rpcErr } = await supabase.rpc('create_listing_with_variations', {
      p_user_id:    userId,
      p_listing:    listingPayload,
      p_variations: normVars,
    });

    if (rpcErr || !rpc) {
      const msg = rpcErr?.message || 'Failed to create listing';
      const httpStatus = /(limit|credit|subscription|blocked|plan)/i.test(msg) ? 402 : 500;
      console.error('[create-listing] RPC error:', msg);
      return json({ success: false, error: msg, upgradeRequired: httpStatus === 402 }, httpStatus);
    }

    const created = (rpc as any).listing;
    const action  = (rpc as any).action ?? 'created';
    console.log(`[create-listing] ${action}: ${created?.id} (${varCount} variations)`);

    return json({ success: true, action, listing: created, variation_count: varCount }, action === 'updated' ? 200 : 201);

  } catch (error) {
    console.error('[create-listing] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = /(authorization|auth token|session|missing)/i.test(msg) ? 401 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
