import { describe, expect, it } from "vitest";
import { effectivePrice, normalizeWeights, parseImageLines, profitPerUnit } from "./lib";

describe("normalizeWeights", () => {
  it("normalizes weights to sum to 1", () => {
    const out = normalizeWeights({ margin: 2, velocity: 1, demand: 1 });
    expect(out.margin).toBeCloseTo(0.5, 4);
    expect(out.velocity).toBeCloseTo(0.25, 4);
    const total = Object.values(out).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 3);
  });

  it("drops zero/negative/non-finite entries", () => {
    const out = normalizeWeights({ margin: 1, velocity: 0, demand: -3, junk: NaN });
    expect(Object.keys(out)).toEqual(["margin"]);
    expect(out.margin).toBe(1);
  });

  it("returns empty for all-zero input", () => {
    expect(normalizeWeights({ a: 0, b: 0 })).toEqual({});
  });
});

describe("parseImageLines", () => {
  it("keeps only http(s) URLs, trimmed", () => {
    const out = parseImageLines("  https://a.com/1.jpg \n\nnot-a-url\nhttp://b.com/2.png\n");
    expect(out).toEqual(["https://a.com/1.jpg", "http://b.com/2.png"]);
  });
});

describe("profit helpers", () => {
  it("discount price wins, then percentage discount, then list price", () => {
    expect(effectivePrice(20, 15)).toBe(15);
    expect(effectivePrice(20, null)).toBe(20);
    expect(effectivePrice(20, 0)).toBe(20);
    expect(effectivePrice(20, null, 25)).toBe(15);
    expect(effectivePrice(20, 15, 25)).toBe(15); // explicit price beats percent
    expect(effectivePrice(20, null, 100)).toBe(20); // nonsense percent ignored
  });

  it("uses cost-based profit when cost is known", () => {
    expect(
      profitPerUnit({ price: 20, discount_price: null, cost_price: 12, shipping_cost: 3, profit: 99 }),
    ).toBe(5);
    expect(
      profitPerUnit({ price: 20, discount_price: null, discount: 25, cost_price: 10, shipping_cost: 0, profit: 0 }),
    ).toBe(5);
  });

  it("falls back to manual profit, then null", () => {
    expect(
      profitPerUnit({ price: 20, discount_price: null, cost_price: null, shipping_cost: 0, profit: 7 }),
    ).toBe(7);
    expect(
      profitPerUnit({ price: 20, discount_price: null, cost_price: null, shipping_cost: 0, profit: 0 }),
    ).toBeNull();
  });
});
