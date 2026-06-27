import { useMemo, useState } from "react";
import { ListChecks, RotateCcw, XCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { PageHeader } from "@/core/ui/PageHeader";
import { DataTable, type Column } from "@/core/ui/DataTable";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { ConfirmDialog } from "@/core/ui/ConfirmDialog";
import { useQueues, type QueueJob, type QueueSource } from "./queues/useQueues";
import { useRetryJob, useCancelJob } from "./queues/queueActions";

const SOURCES: { value: QueueSource | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "background", label: "Background" },
  { value: "extension", label: "Extension" },
  { value: "bulk", label: "Bulk Lister" },
];

const isTerminal = (s: string) =>
  ["succeeded", "listed", "dead_letter", "cancelled", "skipped"].includes(s);

/**
 * Unified queue monitor over the three job systems. Operators previously had no
 * visibility here at all; now they can observe, retry, and cancel from one view.
 */
export default function QueuesPage() {
  const [source, setSource] = useState<QueueSource | "all">("all");
  const [payload, setPayload] = useState<QueueJob | null>(null);
  const [cancelling, setCancelling] = useState<QueueJob | null>(null);

  const { data: jobs = [], isLoading, isError, refetch } = useQueues(source);
  const retry = useRetryJob();
  const cancel = useCancelJob();

  const columns: Column<QueueJob>[] = useMemo(
    () => [
      { id: "source", header: "Source", cell: (j) => <StatusBadge value={j.source} /> },
      {
        id: "jobType",
        header: "Job",
        cell: (j) => <span className="font-mono text-xs text-slate-700">{j.jobType}</span>,
      },
      { id: "status", header: "Status", cell: (j) => <StatusBadge value={j.status} /> },
      {
        id: "attempts",
        header: "Attempts",
        cell: (j) => (j.attempts == null ? "—" : `${j.attempts}${j.maxAttempts ? `/${j.maxAttempts}` : ""}`),
      },
      { id: "age", header: "Age", cell: (j) => formatDistanceToNow(new Date(j.createdAt), { addSuffix: true }) },
      {
        id: "error",
        header: "Error",
        cell: (j) =>
          j.error ? <span className="line-clamp-1 max-w-[220px] text-xs text-red-600">{j.error}</span> : <span className="text-slate-400">—</span>,
      },
      {
        id: "__actions",
        header: <span className="sr-only">Actions</span>,
        className: "text-right",
        cell: (j) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPayload(j)} aria-label="View payload">
              <Eye className="h-4 w-4" />
            </Button>
            {!isTerminal(j.status) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => retry.mutate({ source: j.source, id: j.id })}
                  aria-label="Retry"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setCancelling(j)}
                  aria-label="Cancel"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [retry],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Queues"
        description="Unified monitor across background, extension, and bulk-lister jobs."
        icon={ListChecks}
        actions={
          <Button variant="outline" onClick={() => refetch()} className="rounded-xl">
            Refresh
          </Button>
        }
      />

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="space-y-4 p-4">
          <div className="flex gap-1.5">
            {SOURCES.map((s) => (
              <Button
                key={s.value}
                variant={source === s.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSource(s.value)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <DataTable<QueueJob>
            columns={columns}
            rows={jobs}
            rowKey={(j) => `${j.source}:${j.id}`}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            emptyTitle="No jobs in this queue"
          />
        </CardContent>
      </Card>

      <Dialog open={!!payload} onOpenChange={(o) => !o && setPayload(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Job payload</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
            {JSON.stringify(payload?.payload ?? {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel job"
        description={`Cancel this ${cancelling?.source} job? It will be moved to a terminal state.`}
        destructive
        reasonRequired
        confirmLabel="Cancel job"
        onConfirm={async (reason) => {
          if (cancelling) await cancel.mutateAsync({ source: cancelling.source, id: cancelling.id, reason });
        }}
      />
    </div>
  );
}
