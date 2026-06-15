// Run with: node --experimental-strip-types --test packages/auth/src/lib/planIntent.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory Storage stand-in for the Node test environment.
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}

function freshWindow() {
  (globalThis as any).window = {
    sessionStorage: new MemStorage(),
    localStorage: new MemStorage(),
  };
}

// Import after the first window is in place (module reads window lazily, so order is not critical).
freshWindow();
const { setPlanIntent, getPlanIntent, clearPlanIntent, resolvePlanToken } =
  await import('./planIntent.ts');

const plans = [
  { id: 'aaaaaaaa-0000-0000-0000-000000000001', name: 'Starter', slug: 'starter' },
  { id: 'aaaaaaaa-0000-0000-0000-000000000002', name: 'Pro', slug: 'pro' },
  { id: 'aaaaaaaa-0000-0000-0000-000000000003', name: 'Growth', slug: null },
];

test('resolvePlanToken matches by id', () => {
  assert.equal(resolvePlanToken(plans[1].id, plans)?.name, 'Pro');
});

test('resolvePlanToken matches by slug (case-insensitive)', () => {
  assert.equal(resolvePlanToken('PRO', plans)?.id, plans[1].id);
});

test('resolvePlanToken matches by name when slug is missing', () => {
  assert.equal(resolvePlanToken('growth', plans)?.id, plans[2].id);
});

test('resolvePlanToken returns null for unknown/empty token or empty plans', () => {
  assert.equal(resolvePlanToken('nope', plans), null);
  assert.equal(resolvePlanToken('', plans), null);
  assert.equal(resolvePlanToken('pro', []), null);
  assert.equal(resolvePlanToken(null, plans), null);
});

test('resolvePlanToken does not match a null slug against an empty token', () => {
  // Guards the `lower !== ''` slug branch — an empty token must not match slug:null.
  assert.equal(resolvePlanToken('   ', plans), null);
});

test('set/get/clear round-trip via sessionStorage', () => {
  freshWindow();
  assert.equal(getPlanIntent(), null);
  setPlanIntent('pro');
  assert.equal(getPlanIntent(), 'pro');
  clearPlanIntent();
  assert.equal(getPlanIntent(), null);
});

test('setPlanIntent ignores empty/whitespace tokens', () => {
  freshWindow();
  setPlanIntent('   ');
  assert.equal(getPlanIntent(), null);
});

test('getPlanIntent migrates legacy localStorage and clears it', () => {
  freshWindow();
  (globalThis as any).window.localStorage.setItem('selectedPlan', 'starter');
  assert.equal(getPlanIntent(), 'starter');
  // legacy key cleared, value now lives in sessionStorage
  assert.equal((globalThis as any).window.localStorage.getItem('selectedPlan'), null);
  assert.equal((globalThis as any).window.sessionStorage.getItem('selectedPlan'), 'starter');
});

test('clearPlanIntent removes legacy funnel keys including coupon', () => {
  freshWindow();
  const ls = (globalThis as any).window.localStorage;
  ls.setItem('selectedPlanId', 'x');
  ls.setItem('selectedPlanName', 'y');
  ls.setItem('appliedCouponCode', 'SAVE10');
  setPlanIntent('pro');
  clearPlanIntent();
  assert.equal(getPlanIntent(), null);
  assert.equal(ls.getItem('selectedPlanId'), null);
  assert.equal(ls.getItem('selectedPlanName'), null);
  assert.equal(ls.getItem('appliedCouponCode'), null);
});
