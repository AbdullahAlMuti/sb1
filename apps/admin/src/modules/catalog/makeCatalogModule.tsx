import { type LucideIcon, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { type Column } from "@/core/ui/DataTable";
import { type EntityModule, type FieldDef, type FormValues } from "@/core/entity/types";

/**
 * The shape shared by the two operator-curated catalog tables
 * (must_sell_items, profitable_products). Table-specific
 * columns are layered on top via the factory's `extra*` options.
 */
export interface CatalogItem {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
  sales_count: number;
  country: string;
  category: string | null;
  ebay_url: string | null;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

const COUNTRIES = ["US", "UK", "DE", "AU", "CA"];

interface CatalogConfig {
  key: string;
  table: string;
  singular: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Extra columns inserted before the Status column. */
  extraColumns?: Column<CatalogItem>[];
  /** Extra form fields inserted before the Active toggle. */
  extraFields?: FieldDef[];
  /** Defaults for the extra fields when creating a new row. */
  extraDefaults?: FormValues;
  /** Map extra form values → DB record fields. */
  toRecordExtra?: (v: FormValues) => Record<string, unknown>;
}

const money = (n: unknown) => `$${Number(n ?? 0).toFixed(2)}`;

/**
 * Build a fully-wired EntityModule for a curated catalog table. The three
 * catalog sections are each a single call to this — adding a fourth is a
 * descriptor, not a page.
 */
export function makeCatalogModule(config: CatalogConfig): EntityModule<CatalogItem> {
  const baseColumns: Column<CatalogItem>[] = [
    {
      id: "image_url",
      header: "Image",
      className: "w-16",
      cell: (r) => (
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
          {r.image_url ? (
            <img src={r.image_url} alt="" className="h-full w-full object-contain" />
          ) : (
            <ShoppingCart className="h-4 w-4 text-slate-400" />
          )}
        </div>
      ),
    },
    {
      id: "title",
      header: "Title",
      sortable: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-medium text-slate-900">{r.title}</p>
          {r.category && <span className="text-xs text-slate-500">{r.category}</span>}
        </div>
      ),
    },
    { id: "price", header: "Price", sortable: true, cell: (r) => money(r.price) },
    { id: "sales_count", header: "Sales", sortable: true, cell: (r) => Number(r.sales_count).toLocaleString() },
    { id: "country", header: "Country", cell: (r) => <StatusBadge value={r.country} /> },
  ];

  const statusColumn: Column<CatalogItem> = {
    id: "is_active",
    header: "Status",
    cell: (r) => <StatusBadge value={r.is_active ? "active" : "inactive"} />,
  };

  const baseFields: FieldDef[] = [
    { name: "title", label: "Title", type: "text", required: true, placeholder: "Product title" },
    { name: "image_url", label: "Image URL", type: "text", placeholder: "https://..." },
    { name: "price", label: "Price ($)", type: "number", required: true },
    { name: "sales_count", label: "Sales count", type: "number", required: true },
    { name: "country", label: "Country", type: "select", options: COUNTRIES.map((c) => ({ value: c, label: c })) },
    { name: "category", label: "Category", type: "text", placeholder: "e.g. Electronics" },
    { name: "ebay_url", label: "eBay URL", type: "text", placeholder: "https://ebay.com/..." },
  ];

  return {
    key: config.key,
    singular: config.singular,
    label: config.label,
    description: config.description,
    icon: config.icon,
    table: config.table,
    defaultSort: { column: "created_at", ascending: false },
    pageSize: 20,
    rowId: (r) => r.id,
    rowTitle: (r) => r.title,
    deletable: true,

    columns: [...baseColumns, ...(config.extraColumns ?? []), statusColumn],
    search: (r, q) => r.title.toLowerCase().includes(q) || (r.category ?? "").toLowerCase().includes(q),

    fields: [...baseFields, ...(config.extraFields ?? []), { name: "is_active", label: "Active (visible to users)", type: "switch" }],

    toFormValues: (row) => ({
      title: row?.title ?? "",
      image_url: row?.image_url ?? "",
      price: row?.price ?? 0,
      sales_count: row?.sales_count ?? 0,
      country: row?.country ?? "US",
      category: row?.category ?? "",
      ebay_url: row?.ebay_url ?? "",
      is_active: row?.is_active ?? true,
      ...(config.extraDefaults ?? {}),
      // Existing-row extras override defaults.
      ...Object.fromEntries(
        Object.keys(config.extraDefaults ?? {}).map((k) => [k, row?.[k] ?? (config.extraDefaults as FormValues)[k]]),
      ),
    }),

    toRecord: (v) => ({
      title: v.title,
      image_url: v.image_url || null,
      price: Number(v.price) || 0,
      sales_count: Number(v.sales_count) || 0,
      country: v.country,
      category: v.category || null,
      ebay_url: v.ebay_url || null,
      is_active: Boolean(v.is_active),
      ...(config.toRecordExtra?.(v) ?? {}),
    }),
  };
}
