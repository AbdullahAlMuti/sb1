// Run with: node --experimental-strip-types --test packages/auth/src/lib/routeAfterAuth.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeAfterAuth } from './routeAfterAuth.ts';

test('active/admin user → dashboard regardless of plan token', () => {
  assert.equal(
    routeAfterAuth({ canAccess: true, planToken: 'pro', dashboardPath: '/dashboard/ebay' }),
    '/dashboard/ebay',
  );
  assert.equal(
    routeAfterAuth({ canAccess: true, planToken: null, dashboardPath: '/dashboard/ebay' }),
    '/dashboard/ebay',
  );
});

test('unpaid user with plan token → /checkout (encoded)', () => {
  assert.equal(
    routeAfterAuth({ canAccess: false, planToken: 'pro', dashboardPath: '/dashboard/ebay' }),
    '/checkout?plan=pro',
  );
  assert.equal(
    routeAfterAuth({ canAccess: false, planToken: 'a b', dashboardPath: '/dashboard/ebay' }),
    '/checkout?plan=a%20b',
  );
});

test('unpaid user with no plan token → /billing (defaults into trial via /checkout?plan=trial)', () => {
  // Mirrors resolveNextStep's final fallback. /billing is a real route
  // (apps/web/src/App.tsx) that redirects to /checkout?plan=trial, so a user
  // with no chosen plan is funneled into the trial rather than the marketing page.
  assert.equal(
    routeAfterAuth({ canAccess: false, planToken: null, dashboardPath: '/dashboard/ebay' }),
    '/billing',
  );
  assert.equal(
    routeAfterAuth({ canAccess: false, planToken: '   ', dashboardPath: '/dashboard/ebay' }),
    '/billing',
  );
});
