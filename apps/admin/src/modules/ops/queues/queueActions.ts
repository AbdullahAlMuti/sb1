import { useAdminMutation } from "@/core/data/mutate";
import { update, logAdminAction } from "@/core/data/resource";
import { keys } from "@/core/data/keys";
import { type QueueSource } from "./useQueues";

const TABLE: Record<QueueSource, string> = {
  background: "background_jobs",
  extension: "extension_jobs",
  bulk: "bulk_job_items",
};

// "queued" is a valid status in all three CHECK constraints, so requeue is uniform;
// the cleared/cancel fields differ per table.
const RETRY_PATCH: Record<QueueSource, Record<string, unknown>> = {
  background: { status: "queued", error: null, locked_at: null, locked_by: null, run_after: new Date().toISOString() },
  extension: { status: "queued", error_message: null, next_retry_at: new Date().toISOString() },
  bulk: { status: "queued", error: null },
};

const CANCEL_PATCH: Record<QueueSource, Record<string, unknown>> = {
  background: { status: "dead_letter" },
  extension: { status: "cancelled" },
  bulk: { status: "skipped" },
};

export function useRetryJob() {
  return useAdminMutation<{ source: QueueSource; id: string }, unknown>(
    async ({ source, id }) => {
      await update(TABLE[source], id, RETRY_PATCH[source]);
      await logAdminAction({ action: "queue_job_retried", entityType: TABLE[source], entityId: id });
    },
    { invalidate: [keys.queues.all], successMessage: "Job requeued" },
  );
}

export function useCancelJob() {
  return useAdminMutation<{ source: QueueSource; id: string; reason: string }, unknown>(
    async ({ source, id, reason }) => {
      await update(TABLE[source], id, CANCEL_PATCH[source]);
      await logAdminAction({ action: "queue_job_cancelled", entityType: TABLE[source], entityId: id, reason });
    },
    { invalidate: [keys.queues.all], successMessage: "Job cancelled" },
  );
}
