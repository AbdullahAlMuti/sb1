import { Package, PackageCheck, TrendingUp } from "lucide-react";
import { EntityListPage } from "@/core/entity/EntityListPage";
import { makeCatalogModule, type CatalogItem } from "./makeCatalogModule";

const money = (n: unknown) => `$${Number(n ?? 0).toFixed(2)}`;

/** Best-selling: the shared catalog shape, nothing extra. */
export const bestSellingModule = makeCatalogModule({
  key: "best_selling_items",
  table: "best_selling_items",
  singular: "Item",
  label: "Best Selling",
  description: "Curated best-selling eBay items shown to users.",
  icon: TrendingUp,
});

/** Must-sell: adds profit + total_sold (both NOT NULL). */
export const mustSellModule = makeCatalogModule({
  key: "must_sell_items",
  table: "must_sell_items",
  singular: "Item",
  label: "Must Sell",
  description: "Curated must-sell products highlighted to users.",
  icon: Package,
  extraColumns: [{ id: "profit", header: "Profit", sortable: true, cell: (r: CatalogItem) => money(r.profit) }],
  extraFields: [
    { name: "profit", label: "Profit ($)", type: "number", required: true },
    { name: "total_sold", label: "Total sold", type: "number", required: true },
  ],
  extraDefaults: { profit: 0, total_sold: 0 },
  toRecordExtra: (v) => ({ profit: Number(v.profit) || 0, total_sold: Number(v.total_sold) || 0 }),
});

/** Profitable products: adds profit + margin economics (several NOT NULL). */
export const profitableModule = makeCatalogModule({
  key: "profitable_products",
  table: "profitable_products",
  singular: "Product",
  label: "Profitable Products",
  description: "Curated high-margin products shown to users.",
  icon: PackageCheck,
  extraColumns: [{ id: "profit", header: "Profit", sortable: true, cell: (r: CatalogItem) => money(r.profit) }],
  extraFields: [
    { name: "profit", label: "Profit ($)", type: "number", required: true },
    { name: "shipping_cost", label: "Shipping cost ($)", type: "number", required: true },
    { name: "stock", label: "Stock", type: "number", required: true },
    { name: "total_sold", label: "Total sold", type: "number", required: true },
    { name: "sku", label: "SKU", type: "text" },
    { name: "description", label: "Description", type: "textarea", rows: 2 },
  ],
  extraDefaults: { profit: 0, shipping_cost: 0, stock: 0, total_sold: 0, sku: "", description: "" },
  toRecordExtra: (v) => ({
    profit: Number(v.profit) || 0,
    shipping_cost: Number(v.shipping_cost) || 0,
    stock: Number(v.stock) || 0,
    total_sold: Number(v.total_sold) || 0,
    sku: v.sku || null,
    description: v.description || null,
  }),
});

export function AdminBestSellingPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  return <EntityListPage module={bestSellingModule} hideHeader={hideHeader} />;
}
export function AdminMustSellPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  return <EntityListPage module={mustSellModule} hideHeader={hideHeader} />;
}
export function AdminProfitableProductsPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  return <EntityListPage module={profitableModule} hideHeader={hideHeader} />;
}
