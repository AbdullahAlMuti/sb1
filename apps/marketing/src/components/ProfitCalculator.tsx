import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingDown, TrendingUp, DollarSign, Percent, ShieldCheck, HelpCircle } from "lucide-react";
import { siteConfig } from "@/config/siteConfig";
import type { CalculatorFieldKey } from "@/config/types";
import { Reveal } from "@/components/primitives/Reveal";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { track } from "@/lib/analytics";

type Values = Record<CalculatorFieldKey, number>;

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const ProfitCalculator = () => {
  const { calculator } = siteConfig;
  const reduced = useReducedMotion();

  const initial = useMemo(
    () => Object.fromEntries(calculator.fields.map((f) => [f.key, f.default])) as Values,
    [calculator.fields],
  );
  const [values, setValues] = useState<Values>(initial);

  const { fees, profit, margin, roi } = useMemo(() => {
    const fees = (values.price * values.feePct) / 100;
    const profit = values.price - values.cost - fees - values.shipping;
    const margin = values.price > 0 ? (profit / values.price) * 100 : 0;
    const base = values.cost + values.shipping;
    const roi = base > 0 ? (profit / base) * 100 : 0;
    return { fees, profit, margin, roi };
  }, [values]);

  const positive = profit > 0;
  const wasPositive = useRef(positive);

  useEffect(() => {
    if (positive && !wasPositive.current) {
      track("calculator_positive_margin", { profit: Math.round(profit * 100) / 100 });
      if (!reduced) {
        void import("canvas-confetti").then(({ default: confetti }) => {
          confetti({ particleCount: 90, spread: 72, startVelocity: 38, origin: { y: 0.7 }, scalar: 0.9 });
        });
      }
    }
    wasPositive.current = positive;
  }, [positive, profit, reduced]);

  const update = (key: CalculatorFieldKey, raw: number) =>
    setValues((prev) => ({ ...prev, [key]: Number.isFinite(raw) ? raw : 0 }));

  return (
    <section id="calculator" className="scroll-mt-24 border-b border-border bg-hero-gradient py-20 sm:py-28 text-left relative overflow-hidden">
      {/* Background radial highlight */}
      <div aria-hidden className="pointer-events-none absolute -right-48 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-48 bottom-1/4 h-96 w-96 rounded-full bg-success/5 blur-3xl" />

      <div className="container relative px-4">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">{calculator.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">{calculator.heading}</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{calculator.subheading}</p>
        </Reveal>

        <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Inputs Section */}
          <div className="rounded-2xl border border-border bg-card/65 backdrop-blur-md p-6 shadow-soft-sm sm:p-8 flex flex-col justify-between hover:border-border/80 transition-colors duration-300">
            <div className="space-y-6">
              {/* Category selector */}
              <div className="space-y-2 pb-4 border-b border-border/40">
                <label htmlFor="ebay-category-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  eBay Store Category (Sets Fee Rate)
                </label>
                <select
                  id="ebay-category-select"
                  value={values.feePct}
                  onChange={(e) => update("feePct", parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                >
                  <option value={13.25}>Home, Garden, Automotive & General (13.25%)</option>
                  <option value={9.00}>Smartphones, Tech & Electronics (9.00%)</option>
                  <option value={14.95}>Books, Music, Movies & Media (14.95%)</option>
                  <option value={15.00}>Apparel, Shoes & Accessories (15.00%)</option>
                  <option value={7.00}>Heavy Equipment, Motors & Vehicles (7.00%)</option>
                </select>
              </div>

              {calculator.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`calc-${field.key}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      {field.key === "cost" || field.key === "price" || field.key === "shipping" ? (
                        <DollarSign className="h-3 w-3 text-muted-foreground/60" />
                      ) : (
                        <Percent className="h-3 w-3 text-muted-foreground/60" />
                      )}
                      {field.label}
                    </label>
                    
                    <div className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-bold tabular-nums text-foreground focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/40">
                      <span className="text-muted-foreground/60 text-xs font-medium mr-0.5">{field.prefix}</span>
                      <input
                        id={`calc-${field.key}`}
                        type="number"
                        inputMode="decimal"
                        value={values[field.key]}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        onChange={(e) => update(field.key, parseFloat(e.target.value))}
                        className="w-16 bg-transparent text-right outline-none font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label={field.label}
                      />
                      <span className="text-muted-foreground/60 text-xs font-medium ml-0.5">{field.suffix}</span>
                    </div>
                  </div>
                  
                  <input
                    type="range"
                    value={values[field.key]}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    onChange={(e) => update(field.key, parseFloat(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                    aria-label={`${field.label} slider`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-border/40 pt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>Includes standard payment gateway processing fees.</span>
            </div>
          </div>

          {/* Live Outcome Summary Panel */}
          <div
            className={`flex flex-col justify-between rounded-2xl border p-6 shadow-soft-xl transition-all duration-300 sm:p-8 relative overflow-hidden ${
              positive 
                ? "border-success/20 bg-card/75 shadow-success/5" 
                : "border-destructive/20 bg-card/75 shadow-destructive/5"
            }`}
          >
            {/* Ambient internal background color glow */}
            <div className={`absolute -right-24 -top-24 h-48 w-48 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
              positive ? "bg-success/10" : "bg-destructive/10"
            }`} />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimated Margin</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {positive ? "Profitable" : "Negative Margin"}
                </span>
              </div>
              
              <div>
                <p className={`font-display text-5xl font-extrabold tracking-tight tabular-nums ${
                  positive ? "text-success" : "text-destructive"
                }`}>
                  {usd(profit)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Estimated net profit per sale</p>
              </div>

              {/* Stacked Price Distribution Bar */}
              {values.price > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price Distribution</div>
                  <div className="h-3 w-full rounded-full bg-secondary/80 flex overflow-hidden">
                    <div 
                      className="h-full bg-slate-500 transition-all duration-300" 
                      style={{ width: `${Math.min(Math.max((values.cost / values.price) * 100, 0), 100)}%` }} 
                    />
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300" 
                      style={{ width: `${Math.min(Math.max((values.shipping / values.price) * 100, 0), 100)}%` }} 
                    />
                    <div 
                      className="h-full bg-amber-500 transition-all duration-300" 
                      style={{ width: `${Math.min(Math.max((fees / values.price) * 100, 0), 100)}%` }} 
                    />
                    {profit > 0 && (
                      <div 
                        className="h-full bg-success transition-all duration-300" 
                        style={{ width: `${Math.min(Math.max((profit / values.price) * 100, 0), 100)}%` }} 
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground mt-1 select-none">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                      <span>Cost ({((values.cost / values.price) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span>Ship ({((values.shipping / values.price) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Fees ({((fees / values.price) * 100).toFixed(0)}%)</span>
                    </div>
                    {profit > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        <span className="font-semibold text-success">Profit ({margin.toFixed(0)}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress meters for Profit Margin & ROI */}
              <div className="space-y-4 border-t border-border/40 pt-4">
                {/* Margin progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Profit Margin</span>
                    <span className="font-bold text-foreground tabular-nums">{margin.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${positive ? 'bg-success' : 'bg-destructive'}`}
                      style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                    />
                  </div>
                </div>

                {/* ROI progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Return on Cost (ROI)</span>
                    <span className="font-bold text-foreground tabular-nums">{roi.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${positive ? 'bg-primary' : 'bg-destructive'}`}
                      style={{ width: `${Math.min(Math.max(roi, 0), 100)}%` }}
                    />
                  </div>
                </div>

                {/* Fees line item */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/20">
                  <span className="flex items-center gap-1">
                    eBay + Payment Fees
                    <span title="eBay Final Value Fee + payment processor transaction cut.">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </span>
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{usd(fees)}</span>
                </div>
              </div>
            </div>

            <p className="mt-8 text-[10px] leading-relaxed text-muted-foreground border-t border-border/20 pt-4 relative z-10">
              * Calculations are estimations based on current eBay fee metrics. SellerSuit automatically maps these criteria on every product you view via the Chrome extension so you never list below margin.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfitCalculator;
