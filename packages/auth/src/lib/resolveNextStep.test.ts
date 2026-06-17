// Run with: node --experimental-strip-types --test packages/auth/src/lib/resolveNextStep.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveNextStep, type NextStepInput } from './resolveNextStep.ts';

const base: NextStepInput = {
  hasUser: true,
  isEmailVerified: true,
  isAdmin: false,
  access: 'none',
  planToken: null,
  dashboardPath: '/dashboard/ebay',
  onboardingCompleted: true,
};

test('no user → /auth', () => {
  assert.equal(resolveNextStep({ ...base, hasUser: false }), '/auth');
});

test('unverified email → /verify-email', () => {
  assert.equal(resolveNextStep({ ...base, isEmailVerified: false }), '/verify-email');
});

test('admin → /admin (regardless of access/plan)', () => {
  assert.equal(resolveNextStep({ ...base, isAdmin: true, access: 'none', planToken: 'pro' }), '/admin');
});

test('past_due → /dashboard/billing', () => {
  assert.equal(resolveNextStep({ ...base, access: 'past_due' }), '/dashboard/billing');
});

test('active → dashboard', () => {
  assert.equal(resolveNextStep({ ...base, access: 'active' }), '/dashboard/ebay');
});

test('trial → dashboard', () => {
  assert.equal(resolveNextStep({ ...base, access: 'trial' }), '/dashboard/ebay');
});

test('trial_expired → /choose-plan', () => {
  assert.equal(resolveNextStep({ ...base, access: 'trial_expired', planToken: 'pro' }), '/choose-plan');
});

test('no access + plan token → /checkout?plan (encoded)', () => {
  assert.equal(resolveNextStep({ ...base, access: 'none', planToken: 'pro' }), '/checkout?plan=pro');
  assert.equal(resolveNextStep({ ...base, access: 'none', planToken: 'a b' }), '/checkout?plan=a%20b');
});

test('no access + no plan token → /billing', () => {
  assert.equal(resolveNextStep({ ...base, access: 'none', planToken: null }), '/billing');
  assert.equal(resolveNextStep({ ...base, access: 'none', planToken: '   ' }), '/billing');
});

test('dashboardPath is honored (shopify goal)', () => {
  assert.equal(
    resolveNextStep({ ...base, access: 'active', dashboardPath: '/dashboard/shopify' }),
    '/dashboard/shopify',
  );
});

test('onboardingCompleted: false → dashboardPath (bypasses subscription check)', () => {
  assert.equal(
    resolveNextStep({ ...base, onboardingCompleted: false, access: 'none', planToken: 'pro' }),
    '/dashboard/ebay',
  );
});
