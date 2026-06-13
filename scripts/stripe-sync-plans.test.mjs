import test from 'node:test';
import assert from 'node:assert/strict';

import { centsFor, neededPricesFor, matchExistingPrice, planActions } from './stripe-sync-plans.mjs';

const trialPlan = {
  id: 'p1', name: 'trial', is_trial: true,
  price_monthly: '1.00', price_yearly: '0',
  stripe_price_id_monthly: null, stripe_price_id_yearly: null, stripe_price_id_one_time: null,
};

const proPlan = {
  id: 'p3', name: 'pro', is_trial: false,
  price_monthly: '49.00', price_yearly: '470.40',
  stripe_price_id_monthly: null, stripe_price_id_yearly: null, stripe_price_id_one_time: null,
};

test('centsFor avoids float artifacts', () => {
  assert.equal(centsFor('470.40'), 47040);
  assert.equal(centsFor('15.00'), 1500);
  assert.equal(centsFor('1.00'), 100);
});

test('trial plan needs only a one-time price', () => {
  const needed = neededPricesFor(trialPlan);
  assert.equal(needed.length, 1);
  assert.deepEqual(needed[0], { kind: 'one_time', column: 'stripe_price_id_one_time', unit_amount: 100 });
});

test('paid plan needs monthly and yearly recurring prices', () => {
  const needed = neededPricesFor(proPlan);
  assert.deepEqual(needed.map((n) => [n.interval, n.unit_amount]), [['month', 4900], ['year', 47040]]);
});

test('matchExistingPrice matches on type, interval, amount, currency, active', () => {
  const monthly = { id: 'price_m', active: true, currency: 'usd', unit_amount: 4900, type: 'recurring', recurring: { interval: 'month' } };
  const yearlyWrongAmount = { id: 'price_y', active: true, currency: 'usd', unit_amount: 49999, type: 'recurring', recurring: { interval: 'year' } };
  const inactive = { id: 'price_i', active: false, currency: 'usd', unit_amount: 47040, type: 'recurring', recurring: { interval: 'year' } };
  const prices = [monthly, yearlyWrongAmount, inactive];

  const [monthSpec, yearSpec] = neededPricesFor(proPlan);
  assert.equal(matchExistingPrice(prices, monthSpec)?.id, 'price_m');
  assert.equal(matchExistingPrice(prices, yearSpec), null);
});

test('planActions: fresh plan creates product and all prices', () => {
  const { createProduct, priceActions, dbPatch } = planActions(proPlan, null, []);
  assert.equal(createProduct, true);
  assert.deepEqual(priceActions.map((a) => a.action), ['create', 'create']);
  assert.deepEqual(dbPatch, {});
});

test('planActions: full match is a no-op except missing db ids', () => {
  const product = { id: 'prod_1' };
  const prices = [
    { id: 'price_m', active: true, currency: 'usd', unit_amount: 4900, type: 'recurring', recurring: { interval: 'month' } },
    { id: 'price_y', active: true, currency: 'usd', unit_amount: 47040, type: 'recurring', recurring: { interval: 'year' } },
  ];
  const { createProduct, priceActions, dbPatch } = planActions(proPlan, product, prices);
  assert.equal(createProduct, false);
  assert.deepEqual(priceActions.map((a) => a.action), ['reuse', 'reuse']);
  assert.deepEqual(dbPatch, { stripe_price_id_monthly: 'price_m', stripe_price_id_yearly: 'price_y' });
});

test('planActions: ids already stored means empty patch (true no-op)', () => {
  const product = { id: 'prod_1' };
  const prices = [
    { id: 'price_m', active: true, currency: 'usd', unit_amount: 4900, type: 'recurring', recurring: { interval: 'month' } },
    { id: 'price_y', active: true, currency: 'usd', unit_amount: 47040, type: 'recurring', recurring: { interval: 'year' } },
  ];
  const synced = { ...proPlan, stripe_price_id_monthly: 'price_m', stripe_price_id_yearly: 'price_y' };
  const { dbPatch, priceActions } = planActions(synced, product, prices);
  assert.deepEqual(priceActions.map((a) => a.action), ['reuse', 'reuse']);
  assert.deepEqual(dbPatch, {});
});

test('planActions: price amount change forces a new price', () => {
  const product = { id: 'prod_1' };
  const oldPrices = [
    { id: 'price_old', active: true, currency: 'usd', unit_amount: 3900, type: 'recurring', recurring: { interval: 'month' } },
  ];
  const { priceActions } = planActions(proPlan, product, oldPrices);
  const monthAction = priceActions.find((a) => a.spec.interval === 'month');
  assert.equal(monthAction.action, 'create');
});
