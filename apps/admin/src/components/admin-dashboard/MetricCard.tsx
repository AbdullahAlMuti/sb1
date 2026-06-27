import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { Sparkline } from "./Sparkline";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: "green" | "red" | "blue" | "amber";
  /** Optional caption under the value (e.g. provenance). */
  comparison?: string;
  /** Optional real trend %. Omit when there is no real trend data — never fabricate one. */
  trend?: number;
  /** Optional real sparkline series. */
  sparkline?: number[];
  /** Optional link/action label. */
  action?: string;
}

export function MetricCard({ title, value, comparison, trend, action, icon: Icon, tone = "blue", sparkline }: MetricCardProps) {
  const hasTrend = typeof trend === "number";
  const isPositive = (trend ?? 0) >= 0;
  const trendColor = isPositive ? "text-emerald-600" : "text-red-600";

  return (
    <Card className="overflow-hidden rounded-xl border-border bg-card shadow-none">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{title}</span>
            </div>
            <div className="mt-2.5 text-xl font-semibold text-foreground">{value}</div>
            {(hasTrend || comparison) && (
              <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                {hasTrend && (
                  <span className={cn("inline-flex items-center gap-1 font-semibold", trendColor)}>
                    {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {Math.abs(trend!)}%
                  </span>
                )}
                {comparison && <span className="text-slate-500">{comparison}</span>}
              </div>
            )}
          </div>
          {sparkline && sparkline.length > 0 && <Sparkline data={sparkline} tone={tone} className="mt-7 shrink-0" />}
        </div>
        {action && (
          <Button type="button" variant="link" className="mt-2 h-auto p-0 text-[11px] font-medium text-blue-600">
            {action}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
