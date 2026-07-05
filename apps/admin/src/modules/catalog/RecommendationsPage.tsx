import { useState } from "react";
import { format } from "date-fns";
import { Check, Sparkles, X } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { PageHeader } from "@/core/ui/PageHeader";
import { DataTable, type Column } from "@/core/ui/DataTable";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { ConfirmDialog } from "@/core/ui/ConfirmDialog";
import { useAdminMutation } from "@/core/data/mutate";
import { keys } from "@/core/data/keys";
import { decideRecommendation, recomputeScores, useAutomationLogs, useRecommendations } from "./api";
import { RECOMMENDATION_META } from "./lib";
import { type AutomationLog, type MustSellRecommendation } from "./types";

const INVALIDATE = [
  keys.catalogRecommendations.all as unknown as string[],
  keys.catalogProfitable.all as unknown as string[],
  keys.catalogAutomationLogs.all as unknown as string[],
];

/**
 * The engine's suggestions, awaiting human judgment. Accepting applies the
 * change server-side (audited); rejecting records the decision so the same
 * suggestion isn't re-raised until the data changes.
 */
export default function RecommendationsPage() {
  const [tab, setTab] = useState("pending");
  const pending = useRecommendations("pending");
  const history = useRecommendations("history");
  const logs = useAutomationLogs();
  const [rejecting, setRejecting] = useState<MustSellRecommendation | null>(null);

  const recompute = useAdminMutation(recomputeScores, {
    invalidate: INVALIDATE,
    successMessage: (r) => `Scored ${r.products_scored} products · ${r.recommendations_created} new recommendations`,
  });

  const decide = useAdminMutation<{ id: string; decision: "accept" | "reject"; reason?: string }, unknown>(
    ({ id, decision, reason }) => decideRecommendation(id, decision, reason),
    {
      invalidate: INVALIDATE,
      successMessage: (_d, vars) => (vars.decision === "accept" ? "Recommendation applied" : "Recommendation rejected"),
      onSuccess: () => setRejecting(null),
    },
  );

  const recCell = (r: MustSellRecommendation) => {
    const meta = RECOMMENDATION_META[r.recommendation];
    return <StatusBadge value={meta.label} />;
  };

  const productCell = (r: MustSellRecommendation) => (
    <div className="max-w-[260px]">
      <div className="truncate font-medium text-slate-900">{r.profitable_products?.title ?? "(deleted)"}</div>
      <div className="text-xs text-slate-400">
        {r.profitable_products?.sku || "no SKU"} · stock {r.profitable_products?.stock ?? "—"} · currently{" "}
        {r.profitable_products?.is_must_sell ? "must-sell" : (r.profitable_products?.status ?? "—")}
      </div>
    </div>
  );

  const reasonsCell = (r: MustSellRecommendation) => (
    <div className="flex max-w-[320px] flex-wrap gap-1">
      {(Array.isArray(r.reasons) ? r.reasons : []).map((reason, i) => (
        <span key={i} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
          {String(reason)}
        </span>
      ))}
    </div>
  );

  const confidenceCell = (r: MustSellRecommendation) => (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round(r.confidence * 100)}%` }} />
      </div>
      <span className="text-xs text-slate-500">{Math.round(r.confidence * 100)}%</span>
    </div>
  );

  const pendingColumns: Column<MustSellRecommendation>[] = [
    { id: "product", header: "Product", cell: productCell },
    { id: "recommendation", header: "Suggests", cell: recCell },
    { id: "confidence", header: "Confidence", cell: confidenceCell },
    { id: "reasons", header: "Why", cell: reasonsCell },
    {
      id: "__actions",
      header: <span className="sr-only">Decide</span>,
      className: "w-40 text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700"
            disabled={decide.isPending}
            onClick={() => decide.mutate({ id: r.id, decision: "accept" })}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg"
            disabled={decide.isPending}
            onClick={() => setRejecting(r)}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const historyColumns: Column<MustSellRecommendation>[] = [
    { id: "product", header: "Product", cell: productCell },
    { id: "recommendation", header: "Suggested", cell: recCell },
    { id: "status", header: "Outcome", cell: (r) => <StatusBadge value={r.status.replace("_", " ")} /> },
    {
      id: "decided_at",
      header: "Decided",
      cell: (r) => (r.decided_at ? format(new Date(r.decided_at), "MMM dd, HH:mm") : "—"),
    },
    { id: "decision_reason", header: "Reason", cell: (r) => <span className="text-xs text-slate-500">{r.decision_reason ?? "—"}</span> },
  ];

  const logColumns: Column<AutomationLog>[] = [
    { id: "created_at", header: "When", cell: (l) => format(new Date(l.created_at), "MMM dd, HH:mm:ss"), className: "w-36" },
    { id: "run_type", header: "Type", cell: (l) => <StatusBadge value={l.run_type.replace("_", " ")} /> },
    { id: "action", header: "Action", cell: (l) => <span className="text-sm">{l.action.replace(/_/g, " ")}</span> },
    { id: "triggered_by", header: "Triggered by", cell: (l) => <span className="text-xs text-slate-500">{l.triggered_by}</span> },
    {
      id: "details",
      header: "Details",
      cell: (l) => (
        <span className="block max-w-[360px] truncate text-xs text-slate-500" title={JSON.stringify(l.details)}>
          {JSON.stringify(l.details)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Smart Recommendations"
        description="Data-driven must-sell, clearance, and priority suggestions. Nothing is applied without approval unless auto-apply mode is enabled in Smart Settings."
        icon={Sparkles}
        actions={
          <Button
            className="rounded-xl bg-blue-600 hover:bg-blue-700"
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {recompute.isPending ? "Analyzing…" : "Run analysis now"}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-xl">
          <TabsTrigger value="pending">
            Pending {pending.data?.length ? `(${pending.data.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="logs">Automation log</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="p-4">
              <DataTable
                columns={pendingColumns}
                rows={pending.data ?? []}
                rowKey={(r) => r.id}
                isLoading={pending.isLoading}
                isError={pending.isError}
                onRetry={() => pending.refetch()}
                emptyTitle="No pending recommendations"
                emptyDescription="Run the analysis to generate fresh suggestions from current data."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="p-4">
              <DataTable
                columns={historyColumns}
                rows={history.data ?? []}
                rowKey={(r) => r.id}
                isLoading={history.isLoading}
                isError={history.isError}
                onRetry={() => history.refetch()}
                emptyTitle="No decided recommendations yet"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="p-4">
              <DataTable
                columns={logColumns}
                rows={logs.data ?? []}
                rowKey={(l) => l.id}
                isLoading={logs.isLoading}
                isError={logs.isError}
                onRetry={() => logs.refetch()}
                emptyTitle="No automation activity yet"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title="Reject recommendation"
        description={
          rejecting
            ? `Reject "${RECOMMENDATION_META[rejecting.recommendation].label}" for "${rejecting.profitable_products?.title ?? "product"}"?`
            : undefined
        }
        reasonRequired
        confirmLabel="Reject"
        onConfirm={async (reason) => {
          if (rejecting) await decide.mutateAsync({ id: rejecting.id, decision: "reject", reason });
        }}
      />
    </div>
  );
}
