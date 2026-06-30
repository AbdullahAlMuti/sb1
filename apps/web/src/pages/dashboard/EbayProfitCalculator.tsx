import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { cn } from "@repo/ui/lib/utils";
import {
  TrendingUp, TrendingDown, Receipt, Wallet, Tag, Layers,
  Search, Sparkles, ArrowRight, Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  MARKETPLACE_LIST,
  CATEGORY_OPTIONS,
  categoryFeePercent,
  computeProfit,
  formatMoney,
  formatPercent,
  type Marketplace,
  type SalesTaxMethod,
} from "../../lib/ebay-profit-calculator";

// ─── Local form state ─────────────────────────────────────────────────────────

interface FormState {
  category: string;
  itemSoldPrice: string;
  itemCost: string;
  ebayFeePercent: string;
  shippingCharge: string;
  shippingCost: string;
  promotionPercent: string;
  otherCosts: string;
  salesTaxMethod: SalesTaxMethod;
  salesTaxAmount: string;
}

function defaultForm(mp: Marketplace): FormState {
  return {
    category: "other",
    itemSoldPrice: "",
    itemCost: "",
    ebayFeePercent: String(categoryFeePercent("other", mp)),
    shippingCharge: "0",
    shippingCost: "0",
    promotionPercent: "0",
    otherCosts: "0",
    salesTaxMethod: "percent",
    salesTaxAmount: "0",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EbayProfitCalculator() {
  const [marketplace, setMarketplace] = useState<Marketplace>("us");
  const [form, setForm] = useState<FormState>(() => defaultForm("us"));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Switching marketplace re-applies the category-based fee default for that site.
  function switchMarketplace(mp: Marketplace) {
    if (mp === marketplace) return;
    setMarketplace(mp);
    set("ebayFeePercent", String(categoryFeePercent(form.category, mp)));
  }

  // Picking a category re-applies its default fee % for the current marketplace.
  function switchCategory(value: string) {
    set("category", value);
    set("ebayFeePercent", String(categoryFeePercent(value, marketplace)));
  }

  const r = useMemo(
    () => computeProfit({ marketplace, ...form }),
    [marketplace, form],
  );

  const money = (v: number) => formatMoney(v, r.currency);

  return (
    <div className="space-y-5 pb-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Calculator
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Estimate your eBay profit, fees, and break-even price before you list. Pick a marketplace
          and enter your numbers — everything updates live.
        </p>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] items-start">

        {/* ── LEFT: input panel ───────────────────────────────────────────── */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 space-y-4">

            {/* Marketplace toggle */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Marketplace
              </Label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1">
                {MARKETPLACE_LIST.map((mp) => {
                  const active = marketplace === mp.id;
                  return (
                    <button
                      key={mp.id}
                      onClick={() => switchMarketplace(mp.id)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      )}
                    >
                      <span className="text-base leading-none">{mp.flag}</span>
                      {mp.short}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
                {MARKETPLACE_LIST.find((m) => m.id === marketplace)!.note}
              </p>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <FieldLabel icon={<Tag className="h-3 w-3" />}>Category</FieldLabel>
              <Select value={form.category} onValueChange={switchCategory}>
                <SelectTrigger className="h-9 text-sm border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-sm">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Divider />

            {/* Money inputs */}
            <div className="grid grid-cols-2 gap-3">
              <MoneyField symbol={r.symbol} label="Item Sold Price" highlight
                value={form.itemSoldPrice} placeholder="0.00"
                onChange={(v) => set("itemSoldPrice", v)} />
              <MoneyField symbol={r.symbol} label="Item Cost"
                value={form.itemCost} placeholder="0.00"
                onChange={(v) => set("itemCost", v)} />
              <PercentField label="eBay Fee" suffix="%"
                value={form.ebayFeePercent}
                onChange={(v) => set("ebayFeePercent", v)} />
              <PercentField label="Promotion" suffix="%"
                value={form.promotionPercent}
                onChange={(v) => set("promotionPercent", v)} />
              <MoneyField symbol={r.symbol} label="Shipping Charge"
                value={form.shippingCharge} placeholder="0.00"
                onChange={(v) => set("shippingCharge", v)} />
              <MoneyField symbol={r.symbol} label="Shipping Cost"
                value={form.shippingCost} placeholder="0.00"
                onChange={(v) => set("shippingCost", v)} />
            </div>

            <MoneyField symbol={r.symbol} label="Other Costs"
              value={form.otherCosts} placeholder="0.00"
              onChange={(v) => set("otherCosts", v)} />

            <Divider />

            {/* Sales tax */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FieldLabel icon={<Receipt className="h-3 w-3" />}>Sales Tax</FieldLabel>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Charged to buyer</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={form.salesTaxMethod}
                  onValueChange={(v) => set("salesTaxMethod", v as SalesTaxMethod)}
                >
                  <SelectTrigger className="h-9 text-sm border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent" className="text-sm">% Percentage</SelectItem>
                    <SelectItem value="fixed" className="text-sm">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                    {form.salesTaxMethod === "percent" ? "%" : r.symbol}
                  </span>
                  <Input
                    type="number" min="0" step="0.01" value={form.salesTaxAmount}
                    onChange={(e) => set("salesTaxAmount", e.target.value)}
                    className="h-9 text-sm pl-7 border-slate-200 dark:border-slate-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── RIGHT: results ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Your Profit hero */}
          <Card className={cn(
            "border shadow-sm transition-colors duration-300 overflow-hidden",
            !r.hasInput
              ? "border-slate-200 dark:border-slate-800"
              : r.positive
                ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/15"
                : "border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/15"
          )}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Your Profit
                  </p>
                  {r.hasInput ? (
                    <>
                      <p className={cn(
                        "mt-1 text-4xl font-extrabold tracking-tight tabular-nums leading-none",
                        r.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {money(r.profit)}
                      </p>
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        Net profit per sale on a {money(r.soldPrice)} item
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                      Enter sold price to calculate profit
                    </p>
                  )}
                </div>

                {r.hasInput && (
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      r.positive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                    )}>
                      {r.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {r.positive ? "Profitable" : "Loss"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Margin <span className={cn(
                        "font-bold tabular-nums",
                        r.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>{r.profitMargin.toFixed(1)}%</span>
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profit & Fees Breakdown */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Profit &amp; Fees Breakdown</CardTitle>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Sold Price:{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {r.hasInput ? money(r.soldPrice) : "—"}
                  </span>
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid sm:grid-cols-2 sm:divide-x divide-slate-100 dark:divide-slate-800">
                {/* eBay fees */}
                <div className="p-4 space-y-0.5">
                  <ColHeader icon={<Receipt className="h-3.5 w-3.5 text-rose-500" />}>
                    eBay Transaction Fees
                  </ColHeader>
                  <Row label="Final Value Fee" sub={formatPercent(r.finalValueFeePercent)} value={money(r.finalValueFee)} />
                  <Row label="Fixed Transaction Fee" value={money(r.fixedTransactionFee)} />
                  <Row label="Promotion Fees" sub={formatPercent(r.promotionPercent)} value={money(r.promotionFees)} />
                  <RowTotal label="Total eBay Fees" value={money(r.totalEbayFees)} />
                  <Row label="Total eBay Fees %" value={formatPercent(r.totalEbayFeesPercent)} muted />
                </div>
                {/* Other costs */}
                <div className="p-4 space-y-0.5 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <ColHeader icon={<Wallet className="h-3.5 w-3.5 text-blue-500" />}>
                    Other Costs
                  </ColHeader>
                  <Row label="Item Cost" value={money(r.itemCost)} />
                  <Row label="Shipping Cost" value={money(r.shippingCost)} />
                  <Row label="Other Costs" value={money(r.otherCosts)} />
                  <RowTotal label="Total Cost" value={money(r.totalCost)} />
                  <Row label="Total Cost %" value={formatPercent(r.totalCostPercent)} muted />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom summary */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryStat
                  label="Break-even Price"
                  value={r.hasInput ? money(r.breakEvenPrice) : "—"}
                  hint="Min. sold price for zero profit"
                />
                <SummaryStat
                  label="Profit Margin"
                  value={r.hasInput ? `${r.profitMargin.toFixed(1)}%` : "—"}
                  valueClass={r.hasInput ? (r.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400") : undefined}
                  hint="Profit ÷ sold price"
                />
                <SummaryStat
                  label="Sales Tax"
                  value={r.hasInput ? money(r.salesTax) : "—"}
                  hint="Charged to buyer only"
                />
                {/* Total Profit — prominent */}
                <div className={cn(
                  "rounded-xl px-3.5 py-3 flex flex-col justify-center",
                  !r.hasInput
                    ? "bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                    : r.positive
                      ? "bg-emerald-600 dark:bg-emerald-600 text-white shadow-sm"
                      : "bg-rose-600 dark:bg-rose-600 text-white shadow-sm"
                )}>
                  <p className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    r.hasInput ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                  )}>
                    Total Profit
                  </p>
                  <p className={cn(
                    "mt-0.5 text-xl font-extrabold tabular-nums leading-none",
                    !r.hasInput && "text-slate-400 dark:text-slate-500"
                  )}>
                    {r.hasInput ? money(r.totalProfit) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Try more tools */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 px-4 py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Try more of our tools</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ToolLink to="/dashboard/ebay/product-research" icon={<Search className="h-3.5 w-3.5" />} label="Product Research" />
              <ToolLink to="/dashboard/ebay/bulk-lister" icon={<Layers className="h-3.5 w-3.5" />} label="Bulk Lister" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Label className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300">
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </Label>
  );
}

function Divider() {
  return <div className="border-t border-slate-100 dark:border-slate-800" />;
}

function MoneyField({
  symbol, label, value, placeholder, highlight, onChange,
}: {
  symbol: string;
  label: string;
  value: string;
  placeholder?: string;
  highlight?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className={cn(
        "text-[12px] font-medium",
        highlight ? "text-slate-800 dark:text-slate-100 font-semibold" : "text-slate-600 dark:text-slate-300"
      )}>
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
          {symbol}
        </span>
        <Input
          type="number" min="0" step="0.01" inputMode="decimal"
          value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-9 text-sm pl-6 border-slate-200 dark:border-slate-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
            highlight && "border-slate-300 dark:border-slate-600 font-semibold"
          )}
        />
      </div>
    </div>
  );
}

function PercentField({
  label, suffix, value, onChange,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[12px] font-medium text-slate-600 dark:text-slate-300">{label}</Label>
      <div className="relative">
        <Input
          type="number" min="0" step="0.01" inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-sm pr-7 border-slate-200 dark:border-slate-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function ColHeader({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        {children}
      </p>
    </div>
  );
}

function Row({
  label, value, sub, muted,
}: {
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-xs", muted ? "text-slate-400 dark:text-slate-500" : "text-slate-600 dark:text-slate-400")}>
        {label}
        {sub && <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500">({sub})</span>}
      </span>
      <span className={cn(
        "text-xs tabular-nums",
        muted ? "text-slate-400 dark:text-slate-500" : "font-medium text-slate-700 dark:text-slate-200"
      )}>
        {value}
      </span>
    </div>
  );
}

function RowTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 mt-0.5 border-t border-slate-100 dark:border-slate-800">
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function SummaryStat({
  label, value, hint, valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className={cn("mt-0.5 text-lg font-bold tabular-nums leading-none text-slate-900 dark:text-white", valueClass)}>
        {value}
      </p>
      {hint && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
          <Info className="h-2.5 w-2.5 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

function ToolLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white transition-colors"
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 dark:group-hover:text-slate-400 shrink-0" />
    </Link>
  );
}
