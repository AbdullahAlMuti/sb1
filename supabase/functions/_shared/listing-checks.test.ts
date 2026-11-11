import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { matchVeroBrands, normalizeProductId } from "./listing-checks.ts";

Deno.test("matchVeroBrands: whole-word, case-insensitive", () => {
  const brands = ["Apple", "Nike", "Sony"];
  assertEquals(matchVeroBrands("Apple iPhone 11, 64GB", brands).map((m) => m.brand), ["Apple"]);
  assertEquals(matchVeroBrands("Case for APPLE watch & nike band", brands).map((m) => m.brand), ["Apple", "Nike"]);
});

Deno.test("matchVeroBrands: does not match inside other words", () => {
  const brands = ["Apple", "Nike"];
  assertEquals(matchVeroBrands("Pineapple Slicer and Applesauce Maker", brands), []);
  assertEquals(matchVeroBrands("Bernike Running Socks", brands), []);
});

Deno.test("matchVeroBrands: multi-word and special-character brands", () => {
  const brands = ["Under Armour", "L'Oréal", "AT&T"];
  assertEquals(matchVeroBrands("under armour shirt", brands).map((m) => m.brand), ["Under Armour"]);
  assertEquals(matchVeroBrands("L'Oréal Paris serum", brands).map((m) => m.brand), ["L'Oréal"]);
  assertEquals(matchVeroBrands("Phone unlocked for AT&T", brands).map((m) => m.brand), ["AT&T"]);
});

Deno.test("matchVeroBrands: tolerates bad input and duplicates", () => {
  assertEquals(matchVeroBrands("", ["Apple"]), []);
  assertEquals(matchVeroBrands("Apple", null), []);
  assertEquals(matchVeroBrands("Apple thing", ["Apple", "apple", "", 5]).length, 1);
});

Deno.test("normalizeProductId", () => {
  assertEquals(normalizeProductId("  B07ZPKBL9V "), "B07ZPKBL9V");
  assertEquals(normalizeProductId(""), null);
  assertEquals(normalizeProductId(123), null);
  assertEquals(normalizeProductId("x".repeat(101)), null);
});
