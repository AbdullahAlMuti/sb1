import { describe, it, expect } from "vitest";
import { keys } from "./keys";

describe("query-key registry", () => {
  it("namespaces list and detail keys per entity", () => {
    expect(keys.users.all).toEqual(["users"]);
    expect(keys.users.detail("abc")).toEqual(["users", "detail", "abc"]);
    expect(keys.users.list({ page: 2 })).toEqual(["users", "list", { page: 2 }]);
  });

  it("uses an empty object for list() with no params (stable cache identity)", () => {
    expect(keys.coupons.list()).toEqual(["coupons", "list", {}]);
  });

  it("keeps distinct namespaces from colliding", () => {
    expect(keys.users.all).not.toEqual(keys.coupons.all);
  });
});
