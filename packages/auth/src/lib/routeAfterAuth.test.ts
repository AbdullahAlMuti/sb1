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

test('unpaid user with no plan token → /choose-plan (Flow A)', () => {
  assert.equal(
    routeAfterAuth({ canAccess: false, planToken: null, dashboardPath: '/dashboard/ebay' }),
    '/choose-plan',
  );
  assert.equal(
    routeAfterAuth({ canAccess: false, planToken: '   ', dashboardPath: '/dashboard/ebay' }),
    '/choose-plan',
  );
});
