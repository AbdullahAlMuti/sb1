import { Activity, CalendarClock, ExternalLink, KeyRound, RefreshCw, ShieldCheck, Webhook } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@repo/ui/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { Separator } from "@repo/ui/components/ui/separator";
import { StatusBadge } from "./StatusBadge";

export interface IntegrationRecord {
  id: string;
  account: string;
  subtext: string;
  provider: "Shopify" | "eBay" | "Amazon";
  workspace: string;
  health: string;
  lastSync: string;
  duration: string;
  issues: number;
  nextAction: string;
}

interface DetailDrawerProps {
  record: IntegrationRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetailDrawer({ record, open, onOpenChange }: DetailDrawerProps) {
  if (!record) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200 px-5 py-4">
          <SheetTitle className="text-base font-bold">Integration Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
                    {record.provider[0]}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-950">{record.account}</h2>
                      <StatusBadge value={record.health} />
                    </div>
                    <p className="text-sm text-slate-500">{record.subtext}</p>
                  </div>
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-500 text-lg font-bold text-slate-950">
                92
              </div>
            </div>
            <p className="mt-2 text-right text-xs font-medium text-slate-500">Health Score</p>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:grid-cols-6">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="credentials" className="text-xs">Credentials</TabsTrigger>
              <TabsTrigger value="webhooks" className="text-xs">Webhooks</TabsTrigger>
              <TabsTrigger value="jobs" className="text-xs">Sync Jobs</TabsTrigger>
              <TabsTrigger value="errors" className="text-xs">Errors</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-950">OAuth & Token</h3>
                  <StatusBadge value="Connected" />
                </div>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Access Token" value="Valid" icon={KeyRound} />
                  <InfoRow label="Refresh Token" value="Valid" icon={ShieldCheck} />
                  <InfoRow label="Scopes Granted" value="14 scopes" icon={ExternalLink} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">
                    Reconnect OAuth
                  </Button>
                  <Button variant="outline" className="rounded-xl border-slate-200">
                    View Scopes
                  </Button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-950">Sync Status</h3>
                  <StatusBadge value="Active" />
                </div>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Last Sync" value={record.lastSync} icon={CalendarClock} />
                  <InfoRow label="Next Scheduled Sync" value="In 15 minutes" icon={Activity} />
                  <InfoRow label="Sync Frequency" value="Every 15 minutes" icon={RefreshCw} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Sync Now
                  </Button>
                  <Button variant="outline" className="rounded-xl border-slate-200">
                    View Sync Jobs
                  </Button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-950">Webhook Status</h3>
                  <StatusBadge value="Active" />
                </div>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Endpoint" value="https://sellersuit.com/api/webhooks/provider" icon={Webhook} />
                  <InfoRow label="Last Received" value="15 seconds ago" icon={CalendarClock} />
                  <InfoRow label="Success Rate" value="99.8%" icon={ShieldCheck} />
                </div>
              </section>
            </TabsContent>

            {["credentials", "webhooks", "jobs", "errors", "audit"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold capitalize text-slate-950">{tab}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    This tab is structured for live admin data and protected server-side actions.
                  </p>
                </section>
              </TabsContent>
            ))}
          </Tabs>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-950">Recommended Actions</h3>
              <Button variant="link" className="h-auto p-0 text-xs text-blue-600">View all</Button>
            </div>
            <div className="space-y-3">
              <Recommendation label="Review 1 warning in sync logs" action="Review" />
              <Separator />
              <Recommendation label="Token expires in 7 days" action="Review" />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="text-right font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function Recommendation({ label, action }: { label: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-600">{label}</span>
      <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 text-xs">
        {action}
      </Button>
    </div>
  );
}
