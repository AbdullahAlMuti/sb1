// Run with: node --experimental-strip-types --test packages/auth/src/lib/resolveNextStep.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveNextStep, type NextStepInput } from './resolveNextStep.ts';

const base: NextStepInput = {
  hasUser: true,
  isEmailVerified: true,
  isAdmin: false,
  access: 'none',
  onboardingCompleted: true,
  planToken: null,
  dashboardPath: '/dashboard/ebay',
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

test('active + onboarding complete → dashboard', () => {
  assert.equal(resolveNextStep({ ...base, access: 'active', onboardingCompleted: true }), '/dashboard/ebay');
});

test('active + onboarding incomplete → /onboarding', () => {
  assert.equal(resolveNextStep({ ...base, access: 'active', onboardingCompleted: false }), '/onboarding');
});

test('trial + onboarding incomplete → /onboarding', () => {
  assert.equal(resolveNextStep({ ...base, access: 'trial', onboardingCompleted: false }), '/onboarding');
});

test('trial + onboarding complete → dashboard', () => {
  assert.equal(resolveNextStep({ ...base, access: 'trial', onboardingCompleted: true }), '/dashboard/ebay');
});

test('trial_expired → /choose-plan', () => {
  assert.equal(resolveNextStep({ ...base, access: 'trial_expired', planToken: 'pro' }), '/choose-plan');
});

test('no access + plan token → /checkout?plan (encoded)', () => {
  assert.equal(resolveNextStep({ ...base, access: 'none', planToken: 'pro' }), '/checkout?plan=pro');
  assert.equal(resolveNextStep({ ...base, access: 'none', planToken: 'a b' }), '/checkout?plan=a%20b');
});

test('no access + no plan token → /pricing', () => {
  assert.equal(resolveNextStep({ ...base, access: 'none', planToken: null }), '/pricing');
  assert.equal(resolveNextStep({ ...base, access: 'none', planToken: '   ' }), '/pricing');
});

test('dashboardPath is honored (shopify goal)', () => {
  assert.equal(
    resolveNextStep({ ...base, access: 'active', onboardingCompleted: true, dashboardPath: '/dashboard/shopify' }),
    '/dashboard/shopify',
  );
});
