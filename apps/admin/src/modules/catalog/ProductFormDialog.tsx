import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Switch } from "@repo/ui/components/ui/switch";
import { Textarea } from "@repo/ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { parseImageLines } from "./lib";
import { type CatalogProduct, type ProductCategory, type ProductSupplier } from "./types";

const NONE = "__none__";

/** Countries offered on the user-facing profitable-products page. */
const COUNTRIES = ["US", "UK", "DE", "AU", "CA"];

export interface ProductFormResult {
  record: Record<string, unknown>;
  images: string[];
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: CatalogProduct | null;
  images: string[];
  suppliers: ProductSupplier[];
  categories: ProductCategory[];
  submitting?: boolean;
  onSubmit: (result: ProductFormResult) => void;
}

interface FormState {
  title: string;
  sku: string;
  description: string;
  category: string;
  supplier_id: string;
  country: string;
  ebay_url: string;
  cost_price: string;
  price: string;
  discount_price: string;
  discount: string;
  shipping_cost: string;
  profit: string;
  stock: string;
  low_stock_threshold: string;
  total_sold: string;
  priority: string;
  position: string;
  tags: string;
  imagesText: string;
  status: string;
  is_active: boolean;
  is_must_sell: boolean;
  pinned: boolean;
  exclude_from_auto: boolean;
}

function toFormState(p: CatalogProduct | null, images: string[]): FormState {
  const imageLines = images.length > 0 ? images : p?.image_url ? [p.image_url] : [];
  return {
    title: p?.title ?? "",
    sku: p?.sku ?? "",
    description: p?.description ?? "",
    category: p?.category?.trim() || NONE,
    supplier_id: p?.supplier_id ?? NONE,
    country: p?.country ?? "US",
    ebay_url: p?.ebay_url ?? "",
    cost_price: p?.cost_price != null ? String(p.cost_price) : "",
    price: p ? String(p.price) : "",
    discount_price: p?.discount_price ? String(p.discount_price) : "",
    discount: p?.discount ? String(p.discount) : "",
    shipping_cost: p ? String(p.shipping_cost) : "0",
    profit: p ? String(p.profit) : "0",
    stock: p ? String(p.stock) : "0",
    low_stock_threshold: p ? String(p.low_stock_threshold) : "5",
    total_sold: p ? String(p.total_sold) : "0",
    priority: p ? String(p.priority) : "0",
    position: p ? String(p.position) : "0",
    tags: p?.tags?.join(", ") ?? "",
    imagesText: imageLines.join("\n"),
    status: p?.status ?? "active",
    is_active: p?.is_active ?? true,
    is_must_sell: p?.is_must_sell ?? false,
    pinned: p?.pinned ?? false,
    exclude_from_auto: p?.exclude_from_auto ?? false,
  };
}

/**
 * Full product create/edit form. Wider + scrollable than the generic
 * EntityFormDialog because the catalog record carries pricing, sourcing,
 * stock, and automation-override fields in one place.
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  images,
  suppliers,
  categories,
  submitting,
  onSubmit,
}: ProductFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(product, images));

  useEffect(() => {
    if (open) setForm(toFormState(product, images));
  }, [open, product, images]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const num = (s: string): number => (s.trim() === "" ? 0 : Number(s) || 0);

  // Vocabulary + whatever the product already uses (may predate the vocabulary).
  const categoryOptions = [
    ...new Set([
      ...categories.filter((c) => c.is_active).map((c) => c.name),
      ...(product?.category?.trim() ? [product.category.trim()] : []),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wasMustSell = product?.is_must_sell ?? false;
    const imageList = parseImageLines(form.imagesText);
    onSubmit({
      record: {
        title: form.title.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        category: form.category === NONE ? null : form.category,
        supplier_id: form.supplier_id === NONE ? null : form.supplier_id,
        country: form.country,
        ebay_url: form.ebay_url.trim() || null,
        image_url: imageList[0] ?? null,
        cost_price: form.cost_price.trim() === "" ? null : num(form.cost_price),
        price: num(form.price),
        discount_price: form.discount_price.trim() === "" ? null : num(form.discount_price),
        discount: num(form.discount),
        shipping_cost: num(form.shipping_cost),
        profit: num(form.profit),
        stock: Math.max(0, Math.round(num(form.stock))),
        low_stock_threshold: Math.max(0, Math.round(num(form.low_stock_threshold))),
        total_sold: Math.max(0, Math.round(num(form.total_sold))),
        priority: Math.round(num(form.priority)),
        position: Math.round(num(form.position)),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        status: form.status,
        archived_at: form.status === "archived" ? new Date().toISOString() : null,
        is_active: form.is_active,
        is_must_sell: form.is_must_sell,
        must_sell_source: form.is_must_sell ? (wasMustSell ? (product?.must_sell_source ?? "manual") : "manual") : null,
        pinned: form.pinned,
        exclude_from_auto: form.exclude_from_auto,
      },
      images: imageList,
    });
  };

  const numberField = (key: keyof FormState, label: string, placeholder?: string, required = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type="number"
        step="0.01"
        required={required}
        placeholder={placeholder}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as FormState[typeof key])}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "New Product"}</DialogTitle>
          <DialogDescription>
            Cost price enables the real profit engine; without it the manual profit figure is used.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="trending, summer" />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Uncategorized</SelectItem>
                  {categoryOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={(v) => set("supplier_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No supplier</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={form.country} onValueChange={(v) => set("country", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ebay_url">eBay URL</Label>
              <Input id="ebay_url" placeholder="https://www.ebay.com/itm/…" value={form.ebay_url} onChange={(e) => set("ebay_url", e.target.value)} />
            </div>

            {numberField("cost_price", "Cost price (supplier)", "leave empty if unknown")}
            {numberField("price", "Selling price", undefined, true)}
            {numberField("discount_price", "Discount price", "optional")}
            {numberField("discount", "Discount % (badge)", "0")}
            {numberField("shipping_cost", "Shipping cost")}
            {numberField("profit", "Manual profit (fallback)")}

            {numberField("stock", "Stock quantity")}
            {numberField("low_stock_threshold", "Low-stock threshold")}
            {numberField("total_sold", "Total sold (lifetime)")}
            {numberField("priority", "Priority (admin ranking)")}
            {numberField("position", "Position (user-page order, asc)")}

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="clearance">Clearance</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="imagesText">Image URLs (one per line — first becomes the card image)</Label>
              <Textarea
                id="imagesText"
                rows={3}
                placeholder="https://…"
                value={form.imagesText}
                onChange={(e) => set("imagesText", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
            <SwitchRow id="is_active" label="Visible to users" checked={form.is_active} onChange={(v) => set("is_active", v)} />
            <SwitchRow id="is_must_sell" label="Must-sell" checked={form.is_must_sell} onChange={(v) => set("is_must_sell", v)} />
            <SwitchRow id="pinned" label="Pinned (automation never changes it)" checked={form.pinned} onChange={(v) => set("pinned", v)} />
            <SwitchRow id="exclude_from_auto" label="Exclude from auto-ranking" checked={form.exclude_from_auto} onChange={(v) => set("exclude_from_auto", v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SwitchRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm">{label}</Label>
    </div>
  );
}
