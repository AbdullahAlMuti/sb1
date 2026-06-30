import { useState, useEffect, useMemo } from "react";
import { supabase } from "@repo/api-client/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Switch } from "@repo/ui/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/ui/select";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@repo/ui/lib/utils";
import { tryCalculatePrice, type SupplierPricingRule } from "../../lib/pricing-calculator";
import {
  ShoppingCart, Store, Globe, Tag, Building2,
  Save, RotateCcw, Info, TrendingUp, CheckCircle2,
  Calculator, RefreshCw, Clock,
} from "lucide-react";

// ─── Supplier catalogue ───────────────────────────────────────────────────────

const SUPPLIERS = [
  {
    key: "amazon",
    name: "Amazon",
    tagline: "US domestic · FBA & FBM",
    Icon: ShoppingCart,
    iconBg: "bg-amber-50",
    iconBorder: "border-amber-100",
    iconColor: "text-amber-600",
    tabActiveDot: "bg-amber-500",
    tips: [
      "eBay fee covers all listing and transaction fees",
      "Shipping buffer handles unexpected overages",
      "No currency risk — US dollars throughout",
      "Profit is calculated on the final selling price",
    ],
    formulaText: "Final = (Price + Ship + Buffer + Handling) + eBay Fee + Profit",
  },
  {
    key: "walmart",
    name: "Walmart",
    tagline: "US domestic · free shipping on most items",
    Icon: Store,
    iconBg: "bg-blue-50",
    iconBorder: "border-blue-100",
    iconColor: "text-blue-600",
    tabActiveDot: "bg-blue-500",
    tips: [
      "Many Walmart items ship free — set buffer to 0",
      "eBay marketplace fee applies to the final selling price",
      "No currency conversion needed",
      "Profit margin is applied on the final selling price",
    ],
    formulaText: "Final = (Price + Ship + Buffer) + eBay Fee + Profit",
  },
  {
    key: "aliexpress",
    name: "AliExpress",
    tagline: "China / SE Asia · international",
    Icon: Globe,
    iconBg: "bg-red-50",
    iconBorder: "border-red-100",
    iconColor: "text-red-500",
    tabActiveDot: "bg-red-500",
    tips: [
      "Currency buffer protects against USD/CNY swings",
      "Shipping buffer covers longer delivery estimates",
      "Use minimum profit to ensure viability on low-cost items",
      "Profit is calculated on the final selling price",
    ],
    formulaText: "Final = (Price + Ship + Buffer) + eBay Fee + Currency Hedge + Profit",
  },
  {
    key: "temu",
    name: "Temu",
    tagline: "Ultra-low cost · slow intl shipping",
    Icon: Tag,
    iconBg: "bg-orange-50",
    iconBorder: "border-orange-100",
    iconColor: "text-orange-500",
    tabActiveDot: "bg-orange-500",
    tips: [
      "Items are cheap — set minimum profit to protect margins",
      "Budget for 2–4 week delivery times",
      "Currency buffer handles CNY volatility",
      "Profit is calculated on the final selling price",
    ],
    formulaText: "Final = (Price + Ship + Buffer) + eBay Fee + Currency Hedge + Min Profit",
  },
  {
    key: "alibaba",
    name: "Alibaba",
    tagline: "B2B wholesale · bulk orders",
    Icon: Building2,
    iconBg: "bg-orange-50",
    iconBorder: "border-orange-100",
    iconColor: "text-orange-600",
    tabActiveDot: "bg-orange-600",
    tips: [
      "Handling fee helps cover per-unit import / customs costs",
      "Currency buffer handles bulk order FX exposure",
      "Higher minimum profit for bulk sourcing effort",
      "Profit is calculated on the final selling price",
    ],
    formulaText: "Final = (Price + Ship + Buffer + Handling) + eBay Fee + Currency Hedge + Profit",
  },
] as const;

type SupplierKey = (typeof SUPPLIERS)[number]["key"];

const ROUNDING_OPTIONS = [
  { value: "NONE",     label: "No rounding" },
  { value: "END_99",   label: "End in .99  (e.g. $29.99)" },
  { value: "END_95",   label: "End in .95  (e.g. $29.95)" },
  { value: "END_49",   label: "End in .49  (e.g. $29.49)" },
  { value: "ROUND_UP", label: "Round up to whole dollar" },
];

// ─── Breakdown dot colors ─────────────────────────────────────────────────────

const DOT: Record<string, string> = {
  supplierPrice:    "bg-slate-400",
  shippingCost:     "bg-blue-400",
  shippingBuffer:   "bg-amber-400",
  fixedHandlingFee: "bg-amber-500",
  marketplaceFee:   "bg-red-400",
  currencyBuffer:   "bg-orange-400",
  profit:           "bg-green-500",
};

// ─── Form state & defaults ────────────────────────────────────────────────────

interface FormState extends SupplierPricingRule {
  isEnabled: boolean;
  ruleVersion?: number;
}

const DEFAULT_RULES: Record<SupplierKey, FormState> = {
  amazon:     { isEnabled: true, profitMarginPercent: 25, minimumProfit: 5,  shippingBuffer: 3,  fixedHandlingFee: 0.5, marketplaceFeePercent: 13, currencyBufferPercent: 0, roundingRule: "END_99" },
  walmart:    { isEnabled: true, profitMarginPercent: 25, minimumProfit: 5,  shippingBuffer: 2,  fixedHandlingFee: 0,   marketplaceFeePercent: 8,  currencyBufferPercent: 0, roundingRule: "END_99" },
  aliexpress: { isEnabled: true, profitMarginPercent: 25, minimumProfit: 5,  shippingBuffer: 5,  fixedHandlingFee: 0,   marketplaceFeePercent: 5,  currencyBufferPercent: 3, roundingRule: "END_99" },
  temu:       { isEnabled: true, profitMarginPercent: 30, minimumProfit: 3,  shippingBuffer: 8,  fixedHandlingFee: 0,   marketplaceFeePercent: 8,  currencyBufferPercent: 5, roundingRule: "END_99" },
  alibaba:    { isEnabled: true, profitMarginPercent: 30, minimumProfit: 10, shippingBuffer: 10, fixedHandlingFee: 2,   marketplaceFeePercent: 5,  currencyBufferPercent: 8, roundingRule: "END_99" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalculatorSettings() {
  const [selectedKey, setSelectedKey] = useState<SupplierKey>("amazon");
  const [rules, setRules] = useState<Record<string, FormState>>(() =>
    Object.fromEntries(SUPPLIERS.map((s) => [s.key, { ...DEFAULT_RULES[s.key as SupplierKey] }]))
  );
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSaving,    setIsSaving]    = useState(false);
  const [productPrice, setProductPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("0");
  const [lastSavedAt,  setLastSavedAt]  = useState<Date | null>(null);
  const [, setTick] = useState(0);

  const currentSupplier = SUPPLIERS.find((s) => s.key === selectedKey)!;
  const currentRule      = rules[selectedKey];

  // Tick the relative-time label every minute after a save
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  const syncLabel = lastSavedAt
    ? (() => {
        const mins = Math.floor((Date.now() - lastSavedAt.getTime()) / 60_000);
        if (mins < 1) return "Just now";
        if (mins === 1) return "1 min ago";
        return `${mins} min ago`;
      })()
    : null;

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pricing-settings");
      if (error) throw error;
      if (data?.suppliers?.length > 0) {
        const updates: Record<string, FormState> = {};
        for (const row of data.suppliers) {
          updates[row.supplier_key] = {
            isEnabled:             Boolean(row.is_enabled),
            profitMarginPercent:   Number(row.profit_margin_percent),
            minimumProfit:         Number(row.minimum_profit),
            shippingBuffer:        Number(row.shipping_buffer),
            fixedHandlingFee:      Number(row.fixed_handling_fee),
            marketplaceFeePercent: Number(row.marketplace_fee_percent),
            currencyBufferPercent: Number(row.currency_buffer_percent),
            roundingRule:          String(row.rounding_rule),
            ruleVersion:           row.rule_version,
          };
        }
        setRules((prev) => ({ ...prev, ...updates }));
      }
    } catch {
      toast.error("Failed to load pricing settings");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setIsSaving(true);
    try {
      const rule = rules[selectedKey];
      const { data, error } = await supabase.functions.invoke("pricing-settings", {
        method: "PUT",
        body: {
          supplierKey:            selectedKey,
          isEnabled:              rule.isEnabled,
          profitMarginPercent:    rule.profitMarginPercent,
          minimumProfit:          rule.minimumProfit,
          shippingBuffer:         rule.shippingBuffer,
          fixedHandlingFee:       rule.fixedHandlingFee,
          marketplaceFeePercent:  rule.marketplaceFeePercent,
          currencyBufferPercent:  rule.currencyBufferPercent,
          roundingRule:           rule.roundingRule,
        },
      });
      if (error) throw error;
      if (data?.supplier?.rule_version != null) {
        setRules((prev) => ({
          ...prev,
          [selectedKey]: { ...prev[selectedKey], ruleVersion: data.supplier.rule_version },
        }));
      }
      setLastSavedAt(new Date());
      setTick(0);
      toast.success(`${currentSupplier.name} settings saved`);
    } catch {
      toast.error(`Failed to save ${currentSupplier.name} settings`);
    } finally {
      setIsSaving(false);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function handleReset() {
    setRules((prev) => ({
      ...prev,
      [selectedKey]: {
        ...DEFAULT_RULES[selectedKey],
        ruleVersion: prev[selectedKey]?.ruleVersion,
      },
    }));
    toast.info(`${currentSupplier.name} reset to defaults (not yet saved)`);
  }

  // ── Field helpers ─────────────────────────────────────────────────────────

  function setNum(field: keyof FormState, raw: string) {
    const val = parseFloat(raw);
    setRules((prev) => ({
      ...prev,
      [selectedKey]: { ...prev[selectedKey], [field]: isFinite(val) ? val : 0 },
    }));
  }

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setRules((prev) => ({
      ...prev,
      [selectedKey]: { ...prev[selectedKey], [field]: value },
    }));
  }

  // ── Live preview ──────────────────────────────────────────────────────────

  const breakdown = useMemo(
    () => tryCalculatePrice(currentRule, productPrice, shippingCost),
    [currentRule, productPrice, shippingCost],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const SIcon = currentSupplier.Icon;

  return (
    <div className="space-y-5 pb-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Calculator
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure supplier-wise pricing rules. The Chrome extension uses these rules to calculate
          selling prices automatically.
        </p>
      </div>

      {/* ── Supplier tabs ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 w-fit">
        {SUPPLIERS.map(({ key, name, Icon: TabIcon, iconBg, iconColor, tabActiveDot }) => {
          const active = selectedKey === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedKey(key as SupplierKey)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800"
              )}
            >
              <span className={cn(
                "flex items-center justify-center w-[22px] h-[22px] rounded-md",
                active ? iconBg : "bg-slate-200/60 dark:bg-slate-700/60"
              )}>
                <TabIcon className={cn("h-3 w-3", active ? iconColor : "text-slate-400 dark:text-slate-500")} />
              </span>
              {name}
              {active && (
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", tabActiveDot)} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Two-column grid ───────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* ── LEFT: Settings card ───────────────────────────────────────── */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-xl border-2",
                  currentSupplier.iconBg,
                  currentSupplier.iconBorder,
                )}>
                  <SIcon className={cn("h-5 w-5", currentSupplier.iconColor)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {currentSupplier.name} Settings
                    </CardTitle>
                    {currentRule?.ruleVersion != null && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-slate-400 border-slate-200 dark:border-slate-700">
                        v{currentRule.ruleVersion}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    {currentSupplier.tagline}
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <span className={cn(
                  "text-xs font-medium select-none",
                  currentRule?.isEnabled
                    ? "text-slate-700 dark:text-slate-300"
                    : "text-slate-400 dark:text-slate-500"
                )}>
                  {currentRule?.isEnabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={currentRule?.isEnabled ?? true}
                  onCheckedChange={(v) => setField("isEnabled", v)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">

            {/* PROFIT GOALS */}
            <FormSection label="Profit Goals">
              <div className="grid grid-cols-2 gap-3">
                <FieldItem
                  prefix="%"
                  label="Desired Profit"
                  hint="% of final selling price"
                  value={currentRule?.profitMarginPercent ?? 25}
                  onChange={(e) => setNum("profitMarginPercent", e.target.value)}
                />
                <FieldItem
                  prefix="$"
                  label="Minimum Profit"
                  hint="Floor guarantee per sale"
                  value={currentRule?.minimumProfit ?? 5}
                  onChange={(e) => setNum("minimumProfit", e.target.value)}
                  step="0.01"
                />
              </div>
            </FormSection>

            <SectionDivider />

            {/* FEE STRUCTURE */}
            <FormSection label="Fee Structure">
              <div className="grid grid-cols-2 gap-3">
                <FieldItem
                  prefix="%"
                  label="eBay Marketplace Fee"
                  hint="Includes listing + transaction"
                  value={currentRule?.marketplaceFeePercent ?? 13}
                  onChange={(e) => setNum("marketplaceFeePercent", e.target.value)}
                />
                <FieldItem
                  prefix="%"
                  label="Currency Buffer"
                  hint="FX volatility hedge"
                  value={currentRule?.currencyBufferPercent ?? 0}
                  onChange={(e) => setNum("currencyBufferPercent", e.target.value)}
                />
              </div>
            </FormSection>

            <SectionDivider />

            {/* SHIPPING & HANDLING */}
            <FormSection label="Shipping & Handling">
              <div className="grid grid-cols-2 gap-3">
                <FieldItem
                  prefix="$"
                  label="Shipping Buffer"
                  hint="Overage / uncertainty pad"
                  value={currentRule?.shippingBuffer ?? 3}
                  onChange={(e) => setNum("shippingBuffer", e.target.value)}
                  step="0.01"
                />
                <FieldItem
                  prefix="$"
                  label="Fixed Handling Fee"
                  hint="Packaging, labels, etc."
                  value={currentRule?.fixedHandlingFee ?? 0}
                  onChange={(e) => setNum("fixedHandlingFee", e.target.value)}
                  step="0.01"
                />
              </div>
            </FormSection>

            <SectionDivider />

            {/* PRICE ROUNDING */}
            <FormSection label="Price Rounding">
              <div className="space-y-1.5">
                <FieldLabel prefix={null} label="Rounding Rule" />
                <Select
                  value={currentRule?.roundingRule ?? "END_99"}
                  onValueChange={(v) => setField("roundingRule", v)}
                >
                  <SelectTrigger className="h-9 text-sm border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUNDING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-sm">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Applied after adding all fees — always rounds up, never down
                </p>
              </div>
            </FormSection>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-1">
              <Button
                className="flex-1 h-10 text-sm font-semibold"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-3.5 w-3.5 mr-2" />
                {isSaving ? "Saving…" : `Save ${currentSupplier.name} Settings`}
              </Button>
              <Button
                variant="outline"
                className="h-10 text-sm border-slate-200 dark:border-slate-700"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── RIGHT: Preview + formula ──────────────────────────────────── */}
        <div className="space-y-4">

          {/* Preview card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {currentSupplier.name} Price Preview
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    See your estimated final eBay price using the current settings.
                  </CardDescription>
                </div>
                <Badge className="shrink-0 flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {currentSupplier.name} Price ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 19.99"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="h-9 text-sm border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Shipping Cost ($)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="h-9 text-sm border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {breakdown ? (
                <>
                  {/* 3-metric summary */}
                  <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 overflow-hidden">
                    <MetricCell
                      label="Final eBay Price"
                      value={`$${breakdown.finalPrice}`}
                      valueClass="text-slate-900 dark:text-white"
                    />
                    <MetricCell
                      label="Estimated Profit"
                      value={`$${breakdown.realizedProfit}`}
                      valueClass="text-green-600 dark:text-green-400"
                    />
                    <MetricCell
                      label="Profit Margin"
                      value={`${breakdown.marginPercent}%`}
                      valueClass="text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Breakdown table */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Calculation Breakdown
                      </p>
                    </div>
                    <div className="px-1 py-1">
                      <BRow dot={DOT.supplierPrice}    label={`${currentSupplier.name} Price`}       value={`$${breakdown.supplierPrice}`} />
                      {breakdown.shippingCostCents > 0 && (
                        <BRow dot={DOT.shippingCost}   label="Shipping Cost"                         value={`+$${breakdown.shippingCost}`} />
                      )}
                      {breakdown.shippingBufferCents > 0 && (
                        <BRow dot={DOT.shippingBuffer} label="Shipping Buffer"                       value={`+$${breakdown.shippingBuffer}`} />
                      )}
                      {breakdown.fixedHandlingFeeCents > 0 && (
                        <BRow dot={DOT.fixedHandlingFee} label="Fixed Handling Fee"                  value={`+$${breakdown.fixedHandlingFee}`} />
                      )}
                      <BRow
                        dot={DOT.marketplaceFee}
                        label={`eBay Marketplace Fee (${currentRule?.marketplaceFeePercent ?? 13}%)`}
                        value={`+$${breakdown.marketplaceFee}`}
                      />
                      {breakdown.currencyBufferCents > 0 && (
                        <BRow
                          dot={DOT.currencyBuffer}
                          label={`Currency Buffer (${currentRule?.currencyBufferPercent ?? 0}%)`}
                          value={`+$${breakdown.currencyBuffer}`}
                        />
                      )}
                      <BRow
                        dot={DOT.profit}
                        label={`Profit (${currentRule?.profitMarginPercent ?? 25}% of final price)`}
                        value={`+$${breakdown.targetProfit}`}
                      />
                    </div>
                    {/* Final price highlight row */}
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border-t border-blue-100 dark:border-blue-900/40">
                      <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                        Final eBay Price
                      </span>
                      <span className="text-base font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                        ${breakdown.finalPrice}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Calculator className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Enter a product price above
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    to see the calculation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formula explanation card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Info className="h-4 w-4 text-slate-400" />
                How {currentSupplier.name} pricing works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              <div className="font-mono text-[12px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                {currentSupplier.formulaText}
              </div>
              <div className="space-y-1.5 pr-12">
                {currentSupplier.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                    {tip}
                  </div>
                ))}
              </div>
            </CardContent>
            {/* Decorative illustration */}
            <div className="absolute bottom-3 right-4 pointer-events-none select-none opacity-[0.07] dark:opacity-[0.05]">
              <Calculator className="h-10 w-10 text-slate-900 dark:text-white absolute bottom-0 right-0" />
              <TrendingUp className="h-6 w-6 text-slate-900 dark:text-white absolute top-0 left-0" />
            </div>
          </Card>
        </div>

      </div>

      {/* ── Bottom sync status bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40">
        <div className="flex items-center gap-2 min-w-0">
          <RefreshCw className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            <span className="font-medium text-slate-700 dark:text-slate-300">Extension Sync:</span>{" "}
            The Chrome extension caches these rules locally and applies them in real time when you browse{" "}
            {currentSupplier.name}.
          </p>
        </div>
        {syncLabel ? (
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium whitespace-nowrap">Last synced: {syncLabel}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 shrink-0">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs whitespace-nowrap">Save to sync with the extension</span>
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-slate-100 dark:border-slate-800" />;
}

function FieldLabel({ prefix, label }: { prefix: string | null; label: string }) {
  return (
    <div className="flex items-center gap-1 mb-1.5">
      {prefix && (
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 select-none">
          {prefix}
        </span>
      )}
      <Label className="text-[13px] font-medium text-slate-700 dark:text-slate-300 cursor-default">
        {label}
      </Label>
      <Info className="h-3 w-3 text-slate-300 dark:text-slate-600 ml-0.5 shrink-0" />
    </div>
  );
}

function FieldItem({
  prefix,
  label,
  hint,
  value,
  onChange,
  step = "0.1",
}: {
  prefix: string;
  label: string;
  hint: string;
  value: number;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  step?: string;
}) {
  return (
    <div>
      <FieldLabel prefix={prefix} label={label} />
      <Input
        type="number"
        step={step}
        min="0"
        value={value}
        onChange={onChange}
        className="h-9 text-sm border-slate-200 dark:border-slate-700"
      />
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{hint}</p>
    </div>
  );
}

function MetricCell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="px-3.5 py-3 text-center">
      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
        {label}
      </p>
      <p className={cn("text-xl font-bold mt-1 tabular-nums leading-none", valueClass)}>
        {value}
      </p>
    </div>
  );
}

function BRow({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
        <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{label}</span>
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums ml-4 shrink-0">
        {value}
      </span>
    </div>
  );
}
