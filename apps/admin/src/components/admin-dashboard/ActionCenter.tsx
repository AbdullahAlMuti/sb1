import { AlertTriangle, CheckCircle2, Clock, KeyRound, ShieldAlert, Webhook, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { cn } from "@repo/ui/lib/utils";

export interface ActionCenterItem {
  title: string;
  count: number;
  description: string;
  action: string;
  severity: "critical" | "warning" | "info" | "success";
  icon: LucideIcon;
}

const severityStyles = {
  critical: "border-red-200 bg-red-50 text-red-600",
  warning: "border-amber-200 bg-amber-50 text-amber-600",
  info: "border-blue-200 bg-blue-50 text-blue-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-600",
};

export const defaultActionItems: ActionCenterItem[] = [
  {
    title: "Critical Integrations",
    count: 2,
    description: "2 accounts down",
    action: "Review",
    severity: "critical",
    icon: ShieldAlert,
  },
  {
    title: "Failed Sync Jobs",
    count: 23,
    description: "18.6% failure rate",
    action: "Retry",
    severity: "critical",
    icon: XCircle,
  },
  {
    title: "Reconnect Required",
    count: 5,
    description: "Reauthentication needed",
    action: "Reconnect",
    severity: "warning",
    icon: KeyRound,
  },
  {
    title: "Webhook Issues",
    count: 7,
    description: "Delivery failures",
    action: "View Logs",
    severity: "critical",
    icon: Webhook,
  },
  {
    title: "Pending Approvals",
    count: 4,
    description: "User verification issues",
    action: "Approve",
    severity: "info",
    icon: Clock,
  },
];

export function ActionCenter({ items = defaultActionItems }: { items?: ActionCenterItem[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-sm font-medium text-foreground">Action Center</h1>
          <p className="text-xs text-muted-foreground">Urgent items that need admin attention</p>
        </div>
        <Button type="button" variant="outline" className="h-8 rounded-lg border-border text-xs">
          <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
          Mark reviewed
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {items.map((item) => {
          const Icon = item.icon || AlertTriangle;
          return (
            <Card key={item.title} className={cn("rounded-lg border shadow-none", severityStyles[item.severity])}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-slate-700">{item.title}</div>
                    <div className="mt-0.5 text-lg font-semibold text-slate-950">{item.count}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{item.description}</div>
                    <Button type="button" variant="secondary" size="sm" className="mt-2 h-7 rounded-md bg-white text-[10px] font-medium">
                      {item.action}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
