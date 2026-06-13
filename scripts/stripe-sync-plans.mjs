#!/usr/bin/env node
// Syncs the plans table to Stripe: ensures one product per active plan
// (matched by metadata.sellersuit_plan) and the needed prices (monthly +
// yearly recurring for paid plans, one-time for the trial), then writes the
// price ids back to plans.stripe_price_id_monthly/_yearly/_one_time.
//
// Idempotent: re-running is a no-op when products/prices already match.
// Stripe prices are immutable — amount changes create a new price and the
// old one stays attached to existing subscriptions.
//
// Usage:
//   node scripts/stripe-sync-plans.mjs [--dry-run]
//
// Env (read from process.env, then .env.local, then .env at repo root):
//   STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import fs from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');

// ---------- env ----------

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

export function resolveEnv(root = process.cwd()) {
  const fileEnv = {
    ...loadEnvFile(path.join(root, '.env')),
    ...loadEnvFile(path.join(root, '.env.local')),
  };
  const get = (name) => process.env[name] || fileEnv[name] || '';
  return {
    stripeKey: get('STRIPE_SECRET_KEY'),
    supabaseUrl: get('SUPABASE_URL') || get('VITE_SUPABASE_URL'),
    serviceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

// ---------- pure planner (unit-tested) ----------

export function centsFor(amount) {
  return Math.round(Number(amount) * 100);
}

export function neededPricesFor(plan) {
  if (plan.is_trial) {
    return [{ kind: 'one_time', column: 'stripe_price_id_one_time', unit_amount: centsFor(plan.price_monthly) }];
  }
  const needed = [];
  if (Number(plan.price_monthly) > 0) {
    needed.push({ kind: 'recurring', interval: 'month', column: 'stripe_price_id_monthly', unit_amount: centsFor(plan.price_monthly) });
  }
  if (Number(plan.price_yearly) > 0) {
    needed.push({ kind: 'recurring', interval: 'year', column: 'stripe_price_id_yearly', unit_amount: centsFor(plan.price_yearly) });
  }
  return needed;
}

export function matchExistingPrice(prices, spec) {
  return prices.find((p) => {
    if (!p.active || p.currency !== 'usd' || p.unit_amount !== spec.unit_amount) return false;
    if (spec.kind === 'one_time') return p.type === 'one_time';
    return p.type === 'recurring' && p.recurring && p.recurring.interval === spec.interval;
  }) || null;
}

// Computes what to do for one plan given current Stripe state.
// Returns { createProduct, priceActions: [{spec, action: 'reuse'|'create', priceId?}], dbPatch }
export function planActions(plan, existingProduct, existingPrices) {
  const createProduct = !existingProduct;
  const priceActions = [];
  const dbPatch = {};
  for (const spec of neededPricesFor(plan)) {
    const match = existingProduct ? matchExistingPrice(existingPrices, spec) : null;
    if (match) {
      priceActions.push({ spec, action: 'reuse', priceId: match.id });
      if (plan[spec.column] !== match.id) dbPatch[spec.column] = match.id;
    } else {
      priceActions.push({ spec, action: 'create' });
    }
  }
  return { createProduct, priceActions, dbPatch };
}

// ---------- stripe REST helpers ----------

function makeStripe(stripeKey) {
  async function call(method, endpoint, params) {
    const body = params ? new URLSearchParams(params).toString() : undefined;
    const res = await fetch(`https://api.stripe.com${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`Stripe ${method} ${endpoint} failed: ${json.error?.message || res.status}`);
    }
    return json;
  }
  return {
    findProductByPlanName: async (name) => {
      const result = await call(
        'GET',
        `/v1/products/search?query=${encodeURIComponent(`active:'true' AND metadata['sellersuit_plan']:'${name}'`)}`,
      );
      return result.data[0] || null;
    },
    createProduct: (plan) =>
      call('POST', '/v1/products', {
        name: `SellerSuit ${plan.display_name || plan.name}`,
        'metadata[sellersuit_plan]': plan.name,
      }),
    listPrices: async (productId) => {
      const result = await call('GET', `/v1/prices?product=${productId}&active=true&limit=100`);
      return result.data;
    },
    createPrice: (productId, spec, planName) => {
      const params = {
        product: productId,
        currency: 'usd',
        unit_amount: String(spec.unit_amount),
        'metadata[sellersuit_plan]': planName,
      };
      if (spec.kind === 'recurring') params['recurring[interval]'] = spec.interval;
      return call('POST', '/v1/prices', params);
    },
  };
}

// ---------- supabase REST helpers ----------

function makeDb(supabaseUrl, serviceRoleKey) {
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
  return {
    fetchActivePlans: async () => {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/plans?is_active=eq.true&select=id,name,display_name,price_monthly,price_yearly,is_trial,stripe_price_id_monthly,stripe_price_id_yearly,stripe_price_id_one_time&order=sort_order`,
        { headers },
      );
      if (!res.ok) throw new Error(`Failed to fetch plans: ${res.status} ${await res.text()}`);
      return res.json();
    },
    patchPlan: async (id, patch) => {
      const res = await fetch(`${supabaseUrl}/rest/v1/plans?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Failed to update plan ${id}: ${res.status} ${await res.text()}`);
    },
  };
}

// ---------- main ----------

async function main() {
  const env = resolveEnv();
  for (const [key, value] of Object.entries({
    STRIPE_SECRET_KEY: env.stripeKey,
    SUPABASE_URL: env.supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: env.serviceRoleKey,
  })) {
    if (!value) {
      console.error(`Missing ${key} (set in environment or .env.local)`);
      process.exit(1);
    }
  }
  if (env.stripeKey.startsWith('sk_live_')) {
    console.log('NOTE: using a LIVE Stripe key.');
  }

  const stripe = makeStripe(env.stripeKey);
  const db = makeDb(env.supabaseUrl, env.serviceRoleKey);

  const plans = await db.fetchActivePlans();
  if (!plans.length) {
    console.error('No active plans found — run migrations/seeds first.');
    process.exit(1);
  }

  let changes = 0;
  for (const plan of plans) {
    const existingProduct = await stripe.findProductByPlanName(plan.name);
    const existingPrices = existingProduct ? await stripe.listPrices(existingProduct.id) : [];
    const { createProduct, priceActions, dbPatch } = planActions(plan, existingProduct, existingPrices);

    console.log(`\n[${plan.name}]`);
    let product = existingProduct;
    if (createProduct) {
      changes++;
      if (DRY_RUN) {
        console.log('  would create product');
      } else {
        product = await stripe.createProduct(plan);
        console.log(`  created product ${product.id}`);
      }
    } else {
      console.log(`  product ${product.id} (existing)`);
    }

    const patch = { ...dbPatch };
    for (const { spec, action, priceId } of priceActions) {
      const label = spec.kind === 'one_time' ? 'one-time' : spec.interval;
      if (action === 'reuse') {
        console.log(`  price ${label} $${(spec.unit_amount / 100).toFixed(2)} -> ${priceId} (existing)`);
      } else {
        changes++;
        if (DRY_RUN) {
          console.log(`  would create ${label} price $${(spec.unit_amount / 100).toFixed(2)}`);
        } else {
          const price = await stripe.createPrice(product.id, spec, plan.name);
          patch[spec.column] = price.id;
          console.log(`  created ${label} price ${price.id} ($${(spec.unit_amount / 100).toFixed(2)})`);
        }
      }
    }

    if (Object.keys(patch).length) {
      changes++;
      if (DRY_RUN) {
        console.log(`  would update plans row: ${JSON.stringify(patch)}`);
      } else {
        await db.patchPlan(plan.id, patch);
        console.log(`  updated plans row: ${JSON.stringify(patch)}`);
      }
    }
  }

  console.log(`\n${DRY_RUN ? 'Dry run complete' : 'Sync complete'} — ${changes === 0 ? 'no changes needed' : `${changes} change(s)`}.`);
}

const isDirectRun = process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
