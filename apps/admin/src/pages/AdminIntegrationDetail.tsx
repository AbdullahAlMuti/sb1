import { Activity, CalendarClock, ExternalLink, KeyRound, RefreshCw, ShieldCheck, Webhook, ArrowLeft } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { Separator } from "@repo/ui/components/ui/separator";
import { StatusBadge } from "@/components/admin-dashboard/StatusBadge";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export interface IntegrationRecord {
  id: string;
  account: string;
  subtext: string;
  provider: string;
  workspace: string;
  health: "Healthy" | "Warning" | "Error" | "Offline" | "Active" | "Connected";
  lastSync: string;
  duration: string;
  issues: number;
  nextAction: string;
}

// Simulated fetch function
const fetchIntegrationDetail = async (id: string): Promise<IntegrationRecord> => {
  // Mock data to match what was passed to DetailDrawer
  return {
    id,
    account: "Dreamy Home Store",
    subtext: "dreamy-home.myshopify.com",
    provider: "Shopify",
    workspace: "Dreamy Home",
    health: "Healthy",
    lastSync: "May 31, 2025",
    duration: "38s",
    issues: 0,
    nextAction: "Review",
  };
};

export default function AdminIntegrationDetail() {
  const { marketplaceAccountId } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<IntegrationRecord | null>(null);

  useEffect(() => {
    if (marketplaceAccountId) {
      fetchIntegrationDetail(marketplaceAccountId).then(setRecord);
    }
  }, [marketplaceAccountId]);

  if (!record) {
    return <div className="p-8 text-center text-slate-500">Loading details...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Integration Details</h1>
          <p className="mt-1 text-sm text-slate-500">Manage and inspect this marketplace connection.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-bold text-emerald-700">
                {record.provider[0]}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-950">{record.account}</h2>
                  <StatusBadge value={record.health} />
                </div>
                <p className="text-sm text-slate-500">{record.subtext} &bull; Workspace: {record.workspace}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-500 text-xl font-bold text-slate-950">
              92
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">Health Score</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:grid-cols-6">
              <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
              <TabsTrigger value="credentials" className="text-sm">Credentials</TabsTrigger>
              <TabsTrigger value="webhooks" className="text-sm">Webhooks</TabsTrigger>
              <TabsTrigger value="jobs" className="text-sm">Sync Jobs</TabsTrigger>
              <TabsTrigger value="errors" className="text-sm">Errors</TabsTrigger>
              <TabsTrigger value="audit" className="text-sm">Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-950">OAuth & Token</h3>
                    <StatusBadge value="Connected" />
                  </div>
                  <div className="space-y-4 text-sm">
                    <InfoRow label="Access Token" value="Valid" icon={KeyRound} />
                    <InfoRow label="Refresh Token" value="Valid" icon={ShieldCheck} />
                    <InfoRow label="Scopes Granted" value="14 scopes" icon={ExternalLink} />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">
                      Reconnect OAuth
                    </Button>
                    <Button variant="outline" className="rounded-xl border-slate-200">
                      View Scopes
                    </Button>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-950">Sync Status</h3>
                    <StatusBadge value="Active" />
                  </div>
                  <div className="space-y-4 text-sm">
                    <InfoRow label="Last Sync" value={record.lastSync} icon={CalendarClock} />
                    <InfoRow label="Next Scheduled" value="In 15 minutes" icon={Activity} />
                    <InfoRow label="Sync Frequency" value="Every 15 minutes" icon={RefreshCw} />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry Sync Now
                    </Button>
                    <Button variant="outline" className="rounded-xl border-slate-200">
                      View Jobs
                    </Button>
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-950">Webhook Status</h3>
                  <StatusBadge value="Active" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3 text-sm">
                  <InfoRow label="Endpoint" value="https://sellersuit.com/api/webhooks/provider" icon={Webhook} />
                  <InfoRow label="Last Received" value="15 seconds ago" icon={CalendarClock} />
                  <InfoRow label="Success Rate" value="99.8%" icon={ShieldCheck} />
                </div>
              </section>
            </TabsContent>

            {["credentials", "webhooks", "jobs", "errors", "audit"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="text-lg font-semibold capitalize text-slate-950">{tab}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    This tab is structured for live admin data and protected server-side actions.
                  </p>
                </section>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sticky top-24">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-950">Recommended Actions</h3>
              <Button variant="link" className="h-auto p-0 text-xs text-blue-600">View all</Button>
            </div>
            <div className="space-y-4">
              <Recommendation label="Review 1 warning in sync logs" action="Review" />
              <Separator />
              <Recommendation label="Token expires in 7 days" action="Review" />
              <Separator />
              <Recommendation label={`Handle ${record.issues} pending issues`} action="Resolve" />
            </div>
          </section>
        </div>
      </div>
    </div>
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
