import { describe, it, expect } from "vitest";
import { Package } from "lucide-react";
import { makeCatalogModule } from "./makeCatalogModule";

describe("makeCatalogModule", () => {
  const base = makeCatalogModule({
    key: "best_selling_items",
    table: "best_selling_items",
    singular: "Item",
    label: "Best Selling",
    description: "x",
    icon: Package,
  });

  it("builds base columns + a status column", () => {
    // image, title, price, sales, country, status
    expect(base.columns).toHaveLength(6);
    expect(base.columns.at(-1)?.id).toBe("is_active");
  });

  it("toRecord nulls empty optional fields and coerces numbers", () => {
    const rec = base.toRecord!({
      title: "Widget",
      image_url: "",
      price: "12.5",
      sales_count: "3",
      country: "US",
      category: "",
      ebay_url: "",
      is_active: true,
    });
    expect(rec).toMatchObject({ title: "Widget", image_url: null, price: 12.5, sales_count: 3, category: null, ebay_url: null, is_active: true });
  });

  it("toFormValues falls back to sensible defaults for a new row", () => {
    const v = base.toFormValues!(null);
    expect(v).toMatchObject({ country: "US", is_active: true, price: 0, sales_count: 0 });
  });

  it("layers extra columns/fields and merges extra record values", () => {
    const withExtras = makeCatalogModule({
      key: "must_sell_items",
      table: "must_sell_items",
      singular: "Item",
      label: "Must Sell",
      description: "x",
      icon: Package,
      extraColumns: [{ id: "profit", header: "Profit", cell: () => null }],
      extraFields: [{ name: "profit", label: "Profit", type: "number", required: true }],
      extraDefaults: { profit: 0 },
      toRecordExtra: (v) => ({ profit: Number(v.profit) || 0 }),
    });
    expect(withExtras.columns).toHaveLength(7); // base 5 + extra 1 + status
    const rec = withExtras.toRecord!({ title: "x", price: 1, sales_count: 1, country: "US", profit: "9" });
    expect(rec.profit).toBe(9);
    expect(withExtras.toFormValues!(null).profit).toBe(0);
  });
});
