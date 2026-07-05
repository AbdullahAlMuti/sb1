import { useMemo, useState } from "react";
import {
  Archive,
  Flame,
  Package,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import { Input } from "@repo/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { DataTable, type Column, type SortState } from "@/core/ui/DataTable";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { ConfirmDialog } from "@/core/ui/ConfirmDialog";
import { useAdminMutation } from "@/core/data/mutate";
import { insert, update, remove, logAdminAction } from "@/core/data/resource";
import { keys } from "@/core/data/keys";
import {
  bulkUpdateProducts,
  fetchProductImages,
  recomputeScores,
  replaceProductImages,
  useCategories,
  useProducts,
  useSuppliers,
  type ProductFilters,
} from "./api";
import { effectivePrice, formatMoney, formatScore, profitPerUnit, RECOMMENDATION_META } from "./lib";
import { ProductFormDialog, type ProductFormResult } from "./ProductFormDialog";
import { type CatalogProduct } from "./types";

const PAGE_SIZE = 25;
const ALL = "__all__";

const INVALIDATE = [
  keys.catalogProfitable.all as unknown as string[],
  keys.catalogRecommendations.all as unknown as string[],
  keys.catalogAnalytics.all as unknown as string[],
];

/**
 * Product management + must-sell control center. Everything automated is
 * overridable from here: manual must-sell, pinning (never touched by the
 * engine), priority, visibility, bulk actions, and score recompute.
 */
export default function ProductsPage() {
  const [sort, setSort] = useState<SortState>({ column: "priority", ascending: false });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CatalogProduct | null | undefined>(undefined);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<CatalogProduct | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{ label: string; patch: Record<string, unknown> } | null>(null);

  const effectiveFilters = useMemo(() => ({ ...filters, search }), [filters, search]);
  const query = useProducts(effectiveFilters, sort, page, PAGE_SIZE);
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();

  const rows = query.data?.rows ?? [];
  const supplierName = (id: string | null) => suppliers?.find((s) => s.id === id)?.name ?? "—";

  const setFilter = (patch: Partial<ProductFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
    setSelected(new Set());
  };

  const recompute = useAdminMutation(recomputeScores, {
    invalidate: INVALIDATE,
    successMessage: (r) =>
      `Scored ${r.products_scored} products · ${r.recommendations_created} new recommendations` +
      (r.auto_applied ? ` · ${r.auto_applied} auto-applied` : ""),
  });

  const saveMutation = useAdminMutation<ProductFormResult, void>(
    async ({ record, images }) => {
      if (editing) {
        await update("profitable_products", editing.id, record);
        await replaceProductImages(editing.id, images);
        await logAdminAction({ action: "product_updated", entityType: "profitable_products", entityId: editing.id, newValue: record });
      } else {
        const created = await insert<CatalogProduct>("profitable_products", record);
        await replaceProductImages(created.id, images);
        await logAdminAction({ action: "product_created", entityType: "profitable_products", entityId: created.id, newValue: record });
      }
    },
    { invalidate: INVALIDATE, successMessage: "Product saved", onSuccess: () => setEditing(undefined) },
  );

  const deleteMutation = useAdminMutation<{ row: CatalogProduct; reason: string }, void>(
    async ({ row, reason }) => {
      await remove("profitable_products", row.id);
      await logAdminAction({ action: "product_deleted", entityType: "profitable_products", entityId: row.id, reason });
    },
    { invalidate: INVALIDATE, successMessage: "Product deleted", onSuccess: () => setDeleting(null) },
  );

  const bulkMutation = useAdminMutation<{ patch: Record<string, unknown>; reason?: string }, { affected: number }>(
    ({ patch, reason }) => bulkUpdateProducts([...selected], patch, reason),
    {
      invalidate: INVALIDATE,
      successMessage: (r) => `${r.affected} product${r.affected === 1 ? "" : "s"} updated`,
      onSuccess: () => {
        setSelected(new Set());
        setBulkConfirm(null);
      },
    },
  );

  const quickToggle = useAdminMutation<{ row: CatalogProduct; patch: Record<string, unknown>; action: string }, void>(
    async ({ row, patch, action }) => {
      await update("profitable_products", row.id, patch);
      await logAdminAction({ action, entityType: "profitable_products", entityId: row.id, newValue: patch });
    },
    { invalidate: INVALIDATE },
  );

  const openEdit = async (row: CatalogProduct | null) => {
    setEditingImages(row ? await fetchProductImages(row.id).catch(() => []) : []);
    setEditing(row);
  };

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const columns: Column<CatalogProduct>[] = [
    {
      id: "__select",
      header: <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label="Select all" />,
      className: "w-10",
      cell: (r) => (
        <Checkbox
          checked={selected.has(r.id)}
          onCheckedChange={() => toggleOne(r.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${r.title}`}
        />
      ),
    },
    {
      id: "title",
      header: "Product",
      sortable: true,
      cell: (r) => (
        <div className="max-w-[280px]">
          <div className="flex items-center gap-1.5">
            {r.pinned && <Pin className="h-3 w-3 shrink-0 text-blue-500" />}
            <span className="truncate font-medium text-slate-900">{r.title}</span>
          </div>
          <div className="text-xs text-slate-400">
            {r.sku || "no SKU"} · {r.category || "uncategorized"} · {supplierName(r.supplier_id)}
          </div>
        </div>
      ),
    },
    {
      id: "price",
      header: "Price / Profit",
      sortable: true,
      cell: (r) => {
        const unit = profitPerUnit(r);
        return (
          <div className="text-sm">
            <div>{formatMoney(effectivePrice(r.price, r.discount_price, r.discount))}</div>
            <div className={unit != null && unit < 0 ? "text-xs text-red-600" : "text-xs text-emerald-600"}>
              {unit != null ? `${formatMoney(unit)}/unit` : "no cost data"}
            </div>
          </div>
        );
      },
    },
    {
      id: "final_score",
      header: "Score",
      sortable: true,
      cell: (r) => {
        const s = r.product_scores;
        if (!s) return <span className="text-xs text-slate-400">not scored</span>;
        return (
          <div className="text-sm">
            <span className="font-semibold text-slate-900">{formatScore(s.final_score)}</span>
            <span className="text-xs text-slate-400"> /100 · #{s.rank ?? "—"}</span>
            {s.auto_recommendation && (
              <div className="text-[11px] text-slate-500">
                engine: {RECOMMENDATION_META[s.auto_recommendation].label}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "stock",
      header: "Stock",
      sortable: true,
      cell: (r) => (
        <span className={r.stock <= r.low_stock_threshold ? "font-medium text-amber-600" : ""}>
          {r.stock}
        </span>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      sortable: true,
      cell: (r) => r.priority || <span className="text-slate-300">0</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge value={r.status} />
          {r.is_must_sell && (
            <StatusBadge value={`Must Sell${r.must_sell_source === "auto" ? " (auto)" : ""}`} className="border-orange-200 bg-orange-50 text-orange-700" />
          )}
          {!r.is_active && <StatusBadge value="hidden" />}
        </div>
      ),
    },
    {
      id: "__actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-32 text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={r.is_must_sell ? "Remove from must-sell" : "Mark as must-sell"}
            onClick={() =>
              quickToggle.mutate({
                row: r,
                patch: { is_must_sell: !r.is_must_sell, must_sell_source: r.is_must_sell ? null : "manual" },
                action: r.is_must_sell ? "product_must_sell_removed" : "product_must_sell_marked",
              })
            }
          >
            <Flame className={`h-4 w-4 ${r.is_must_sell ? "text-orange-500" : "text-slate-300"}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={r.pinned ? "Unpin (allow automation)" : "Pin (protect from automation)"}
            onClick={() =>
              quickToggle.mutate({
                row: r,
                patch: { pinned: !r.pinned },
                action: r.pinned ? "product_unpinned" : "product_pinned",
              })
            }
          >
            {r.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4 text-slate-400" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={() => void openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label="Delete"
            onClick={() => setDeleting(r)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const bulkActions: { label: string; patch: Record<string, unknown>; confirm?: boolean }[] = [
    { label: "Mark must-sell", patch: { is_must_sell: true } },
    { label: "Remove must-sell", patch: { is_must_sell: false } },
    { label: "Activate", patch: { status: "active", is_active: true } },
    { label: "Deactivate", patch: { status: "inactive", is_active: false } },
    { label: "Clearance", patch: { status: "clearance" } },
    { label: "Exclude from auto-ranking", patch: { exclude_from_auto: true } },
    { label: "Include in auto-ranking", patch: { exclude_from_auto: false } },
    { label: "Reset ranking", patch: { reset_ranking: true }, confirm: true },
    { label: "Archive", patch: { status: "archived" }, confirm: true },
    { label: "Delete", patch: { delete: true }, confirm: true },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Manage the profitable-products catalog: must-sell flags, priority, visibility, and engine overrides."
        icon={Package}
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => recompute.mutate()}
              disabled={recompute.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {recompute.isPending ? "Analyzing…" : "Run analysis"}
            </Button>
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => void openEdit(null)}>
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Button>
          </>
        }
      />

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="space-y-4 p-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search title or SKU…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-xl pl-9"
              />
            </div>
            <Select value={filters.status ?? ALL} onValueChange={(v) => setFilter({ status: v === ALL ? undefined : v })}>
              <SelectTrigger className="h-9 w-[150px] rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All (unarchived)</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="clearance">Clearance</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.category ?? ALL}
              onValueChange={(v) => setFilter({ category: v === ALL ? undefined : v })}
            >
              <SelectTrigger className="h-9 w-[160px] rounded-xl">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.supplierId ?? ALL}
              onValueChange={(v) => setFilter({ supplierId: v === ALL ? undefined : v })}
            >
              <SelectTrigger className="h-9 w-[160px] rounded-xl">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All suppliers</SelectItem>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={filters.mustSell ? "default" : "outline"}
              size="sm"
              className="h-9 rounded-xl"
              onClick={() => setFilter({ mustSell: filters.mustSell ? undefined : true })}
            >
              <Flame className="mr-1.5 h-4 w-4" />
              Must-sell only
            </Button>
          </div>

          {/* Bulk toolbar */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
              <span className="text-sm font-medium text-blue-800">{selected.size} selected</span>
              {bulkActions.map((a) => (
                <Button
                  key={a.label}
                  variant="outline"
                  size="sm"
                  className={`h-7 rounded-lg bg-white text-xs ${a.label === "Delete" ? "text-destructive" : ""}`}
                  disabled={bulkMutation.isPending}
                  onClick={() =>
                    a.confirm ? setBulkConfirm({ label: a.label, patch: a.patch }) : bulkMutation.mutate({ patch: a.patch })
                  }
                >
                  {a.label === "Archive" && <Archive className="mr-1 h-3 w-3" />}
                  {a.label === "Reset ranking" && <RefreshCcw className="mr-1 h-3 w-3" />}
                  {a.label}
                </Button>
              ))}
              <BulkPriorityControl
                disabled={bulkMutation.isPending}
                onApply={(priority) => bulkMutation.mutate({ patch: { priority } })}
              />
            </div>
          )}

          <DataTable<CatalogProduct>
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            isLoading={query.isLoading}
            isError={query.isError}
            onRetry={() => query.refetch()}
            sort={sort}
            onSortChange={(s) => {
              setSort(s);
              setPage(1);
            }}
            page={page}
            pageSize={PAGE_SIZE}
            total={query.data?.count ?? null}
            onPageChange={setPage}
            emptyTitle="No products match"
            emptyDescription="Adjust filters or add your first product."
          />
        </CardContent>
      </Card>

      <ProductFormDialog
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
        product={editing ?? null}
        images={editingImages}
        suppliers={suppliers ?? []}
        categories={categories ?? []}
        submitting={saveMutation.isPending}
        onSubmit={(result) => saveMutation.mutate(result)}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete product"
        description={deleting ? `Delete "${deleting.title}"? This cannot be undone.` : undefined}
        destructive
        reasonRequired
        confirmLabel="Delete"
        onConfirm={(reason) => deleting && deleteMutation.mutateAsync({ row: deleting, reason })}
      />

      <ConfirmDialog
        open={!!bulkConfirm}
        onOpenChange={(o) => !o && setBulkConfirm(null)}
        title={`${bulkConfirm?.label} ${selected.size} product${selected.size === 1 ? "" : "s"}`}
        impact={
          bulkConfirm?.label === "Delete"
            ? "Products and their scores, metrics, and recommendations are permanently removed."
            : bulkConfirm?.label === "Reset ranking"
              ? "Scores are wiped, priority reset to 0, and auto must-sell flags cleared for the selection."
              : "Products are archived and excluded from scoring until restored."
        }
        destructive={bulkConfirm?.label === "Delete"}
        reasonRequired
        confirmLabel={bulkConfirm?.label ?? "Confirm"}
        onConfirm={async (reason) => {
          if (bulkConfirm) await bulkMutation.mutateAsync({ patch: bulkConfirm.patch, reason });
        }}
      />
    </div>
  );
}

/** Inline "set priority for selection" control in the bulk toolbar. */
function BulkPriorityControl({ disabled, onApply }: { disabled: boolean; onApply: (priority: number) => void }) {
  const [value, setValue] = useState("");
  const parsed = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(parsed);
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        placeholder="Priority"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-24 rounded-lg bg-white text-xs"
      />
      <Button
        variant="outline"
        size="sm"
        className="h-7 rounded-lg bg-white text-xs"
        disabled={disabled || !valid}
        onClick={() => {
          onApply(parsed);
          setValue("");
        }}
      >
        Set
      </Button>
    </div>
  );
}
