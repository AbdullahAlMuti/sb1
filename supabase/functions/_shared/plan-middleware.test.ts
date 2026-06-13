// node --experimental-strip-types --test
import test from "node:test";
import assert from "node:assert/strict";

import { isWithinLimit } from "./billing.ts";

test("isWithinLimit: -1 means unlimited (Starter/Pro max_auto_orders)", () => {
  assert.equal(isWithinLimit(0, 1, -1), true, "0 used + 1, limit -1 = unlimited");
  assert.equal(isWithinLimit(999_999, 1, -1), true, "huge count, limit -1 = still unlimited");
  assert.equal(isWithinLimit(0, 100, -1), true, "batch of 100, limit -1 = unlimited");
});

test("isWithinLimit: limit 0 blocks everything", () => {
  assert.equal(isWithinLimit(0, 1, 0), false, "limit 0 always blocks");
});

test("isWithinLimit: Starter listing cap (500)", () => {
  assert.equal(isWithinLimit(499, 1, 500), true, "499 used, +1 = at cap, allowed");
  assert.equal(isWithinLimit(500, 1, 500), false, "500 used, +1 = over cap, blocked");
});

test("isWithinLimit: Pro listing cap (5000)", () => {
  assert.equal(isWithinLimit(4999, 1, 5000), true, "4999 used, +1 = at cap, allowed");
  assert.equal(isWithinLimit(5000, 1, 5000), false, "5000 used, +1 = over cap, blocked");
});

test("isWithinLimit: Trial listing cap (10)", () => {
  assert.equal(isWithinLimit(9, 1, 10), true, "9 used, +1 = at cap, allowed");
  assert.equal(isWithinLimit(10, 1, 10), false, "10 used, +1 = over cap, blocked");
});

test("isWithinLimit: 1 credit per listing", () => {
  assert.equal(isWithinLimit(499, 1, 500), true, "499 credits used, need 1 more = allowed");
  assert.equal(isWithinLimit(500, 1, 500), false, "500 credits used, need 1 more = blocked");
});
