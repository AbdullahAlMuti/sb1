import { Boxes, Factory, FolderTree } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { PageHeader } from "@/core/ui/PageHeader";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { EntityListPage } from "@/core/entity/EntityListPage";
import { type EntityModule } from "@/core/entity/types";
import { type ProductCategory, type ProductSupplier } from "./types";

/** Suppliers + categories are pure descriptor entities — no bespoke pages. */

const suppliersModule: EntityModule<ProductSupplier> = {
  key: "product_suppliers",
  singular: "Supplier",
  label: "Suppliers",
  description: "Sourcing suppliers referenced by catalog products; supplier margin analysis groups by these.",
  icon: Factory,
  table: "product_suppliers",
  defaultSort: { column: "name", ascending: true },
  pageSize: 20,
  rowId: (r) => r.id,
  rowTitle: (r) => r.name,
  deletable: true,

  columns: [
    { id: "name", header: "Name", sortable: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    {
      id: "website",
      header: "Website",
      cell: (r) =>
        r.website ? (
          <a href={r.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            {r.website.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          "—"
        ),
    },
    { id: "is_active", header: "Status", cell: (r) => <StatusBadge value={r.is_active ? "active" : "inactive"} /> },
    { id: "created_at", header: "Added", sortable: true, cell: (r) => format(new Date(r.created_at), "MMM dd, yyyy") },
  ],

  search: (r, q) => r.name.toLowerCase().includes(q),

  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "website", label: "Website", type: "text", placeholder: "https://…" },
    { name: "notes", label: "Notes", type: "textarea", rows: 2 },
    { name: "is_active", label: "Active", type: "switch" },
  ],

  toFormValues: (row) => ({
    name: row?.name ?? "",
    website: row?.website ?? "",
    notes: row?.notes ?? "",
    is_active: row?.is_active ?? true,
  }),

  toRecord: (v) => ({
    name: String(v.name).trim(),
    website: String(v.website ?? "").trim() || null,
    notes: String(v.notes ?? "").trim() || null,
    is_active: Boolean(v.is_active),
  }),
};

const categoriesModule: EntityModule<ProductCategory> = {
  key: "product_categories",
  singular: "Category",
  label: "Categories",
  description: "Product categories used for filtering, category-wise profit analytics, and ranking behavior.",
  icon: FolderTree,
  table: "product_categories",
  defaultSort: { column: "name", ascending: true },
  pageSize: 20,
  rowId: (r) => r.id,
  rowTitle: (r) => r.name,
  deletable: true,

  columns: [
    { id: "name", header: "Name", sortable: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { id: "is_active", header: "Status", cell: (r) => <StatusBadge value={r.is_active ? "active" : "inactive"} /> },
    { id: "created_at", header: "Added", sortable: true, cell: (r) => format(new Date(r.created_at), "MMM dd, yyyy") },
  ],

  search: (r, q) => r.name.toLowerCase().includes(q),

  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "is_active", label: "Active", type: "switch" },
  ],

  toFormValues: (row) => ({
    name: row?.name ?? "",
    is_active: row?.is_active ?? true,
  }),

  toRecord: (v) => ({
    name: String(v.name).trim(),
    is_active: Boolean(v.is_active),
  }),
};

export default function TaxonomyPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers & Categories"
        description="The sourcing and grouping taxonomy behind product analytics and ranking."
        icon={Boxes}
      />
      <Tabs defaultValue="suppliers">
        <TabsList className="rounded-xl">
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers">
          <EntityListPage module={suppliersModule} hideHeader />
        </TabsContent>
        <TabsContent value="categories">
          <EntityListPage module={categoriesModule} hideHeader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
