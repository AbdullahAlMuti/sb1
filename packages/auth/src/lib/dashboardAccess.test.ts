// Run with: node --experimental-strip-types --test packages/auth/src/lib/dashboardAccess.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessDashboard, isDashboardAllowed } from './dashboardAccess.ts';

const paidActive = {
  selected_plan_id: 'plan-1',
  payment_status: 'paid',
  subscription_status: 'active',
};

test('canAccessDashboard: no user → false', () => {
  assert.equal(canAccessDashboard(null, paidActive, false), false);
});

test('canAccessDashboard: admin → true even without profile', () => {
  assert.equal(canAccessDashboard({ id: 'u' }, null, true), true);
});

test('canAccessDashboard: paid + active + plan → true', () => {
  assert.equal(canAccessDashboard({ id: 'u' }, paidActive, false), true);
  assert.equal(
    canAccessDashboard({ id: 'u' }, { ...paidActive, payment_status: 'succeeded' }, false),
    true,
  );
});

test('canAccessDashboard: missing any of plan/paid/active → false', () => {
  assert.equal(canAccessDashboard({ id: 'u' }, { ...paidActive, selected_plan_id: null }, false), false);
  assert.equal(canAccessDashboard({ id: 'u' }, { ...paidActive, payment_status: 'unpaid' }, false), false);
  assert.equal(canAccessDashboard({ id: 'u' }, { ...paidActive, subscription_status: 'inactive' }, false), false);
});

test('isDashboardAllowed: admin always allowed', () => {
  assert.equal(isDashboardAllowed({ isAdmin: true, access: 'none', profileAllows: false }), true);
});

test('isDashboardAllowed: server active/trial allowed regardless of profile', () => {
  assert.equal(isDashboardAllowed({ isAdmin: false, access: 'active', profileAllows: false }), true);
  assert.equal(isDashboardAllowed({ isAdmin: false, access: 'trial', profileAllows: false }), true);
});

test('isDashboardAllowed: expired trial / past_due BLOCK even if profile flags say ok', () => {
  // The stale-expired-trial hole: profile flags stay paid/active, but server is authoritative.
  assert.equal(isDashboardAllowed({ isAdmin: false, access: 'trial_expired', profileAllows: true }), false);
  assert.equal(isDashboardAllowed({ isAdmin: false, access: 'past_due', profileAllows: true }), false);
});

test('isDashboardAllowed: server none falls back to profile flags (error tolerance)', () => {
  assert.equal(isDashboardAllowed({ isAdmin: false, access: 'none', profileAllows: true }), true);
  assert.equal(isDashboardAllowed({ isAdmin: false, access: 'none', profileAllows: false }), false);
});
