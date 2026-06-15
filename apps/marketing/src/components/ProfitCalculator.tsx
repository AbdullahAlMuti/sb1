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
    <section id="calculator" className="scroll-mt-24 border-b border-border bg-secondary/15 py-20 sm:py-24 text-left">
      <div className="container px-4">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{calculator.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">{calculator.heading}</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{calculator.subheading}</p>
        </Reveal>

        <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Inputs Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
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
            className={`flex flex-col justify-between rounded-2xl border p-6 shadow-soft-lg transition-all duration-300 sm:p-8 ${
              positive 
                ? "border-success/30 bg-success/5 shadow-success/5" 
                : "border-destructive/30 bg-destructive/5 shadow-destructive/5"
            }`}
          >
            <div>
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
              
              <div className="mt-3">
                <p className={`font-display text-5xl font-extrabold tracking-tight tabular-nums ${
                  positive ? "text-success" : "text-destructive"
                }`}>
                  {usd(profit)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Estimated net profit per sale</p>
              </div>

              {/* Progress meters for Profit Margin & ROI */}
              <div className="mt-8 space-y-5 border-t border-border/40 pt-6">
                
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
                    <span title="13.25% standard category rate + payment processor transaction cut.">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </span>
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">{usd(fees)}</span>
                </div>

              </div>
            </div>

            <p className="mt-8 text-[10px] leading-relaxed text-muted-foreground border-t border-border/20 pt-4">
              * Calculations are estimations based on current eBay fee metrics. SellerSuit automatically maps these criteria on every product you view via the Chrome extension so you never list below margin.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfitCalculator;
