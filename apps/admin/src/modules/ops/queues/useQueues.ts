import { useQuery } from "@tanstack/react-query";
import { list } from "@/core/data/resource";
import { keys } from "@/core/data/keys";

export type QueueSource = "background" | "extension" | "bulk";

/** A job from any of the three queues, normalized to one shape for the monitor. */
export interface QueueJob {
  source: QueueSource;
  id: string;
  jobType: string;
  status: string;
  attempts: number | null;
  maxAttempts: number | null;
  error: string | null;
  createdAt: string;
  payload: unknown;
}

const PER_SOURCE = 50;

/**
 * Unified read across the three disjoint job systems (background_jobs,
 * extension_jobs, bulk_job_items). Each is fetched and normalized; failures on a
 * drift table degrade to an empty list rather than breaking the whole view.
 */
export function useQueues(source: QueueSource | "all") {
  return useQuery({
    queryKey: keys.queues.list({ source }),
    queryFn: async (): Promise<QueueJob[]> => {
      const wants = (s: QueueSource) => source === "all" || source === s;

      const [bg, ext, bulk] = await Promise.all([
        wants("background")
          ? list<any>("background_jobs", {
              select: "id, job_type, status, attempts, max_attempts, error, created_at, payload",
              order: { column: "created_at", ascending: false },
              page: 1,
              pageSize: PER_SOURCE,
            }).then((r) => r.rows).catch(() => [])
          : [],
        wants("extension")
          ? list<any>("extension_jobs", {
              select: "id, job_type, status, attempt_count, max_attempts, error_message, created_at, payload",
              order: { column: "created_at", ascending: false },
              page: 1,
              pageSize: PER_SOURCE,
            }).then((r) => r.rows).catch(() => [])
          : [],
        wants("bulk")
          ? list<any>("bulk_job_items", {
              select: "id, status, error, title, supplier, created_at, draft_overrides",
              order: { column: "created_at", ascending: false },
              page: 1,
              pageSize: PER_SOURCE,
            }).then((r) => r.rows).catch(() => [])
          : [],
      ]);

      const normalized: QueueJob[] = [
        ...bg.map((j) => ({
          source: "background" as const,
          id: j.id,
          jobType: j.job_type,
          status: j.status,
          attempts: j.attempts ?? null,
          maxAttempts: j.max_attempts ?? null,
          error: j.error ?? null,
          createdAt: j.created_at,
          payload: j.payload,
        })),
        ...ext.map((j) => ({
          source: "extension" as const,
          id: j.id,
          jobType: j.job_type,
          status: j.status,
          attempts: j.attempt_count ?? null,
          maxAttempts: j.max_attempts ?? null,
          error: j.error_message ?? null,
          createdAt: j.created_at,
          payload: j.payload,
        })),
        ...bulk.map((j) => ({
          source: "bulk" as const,
          id: j.id,
          jobType: j.title ? `list: ${j.title}` : "bulk_list",
          status: j.status,
          attempts: null,
          maxAttempts: null,
          error: j.error ?? null,
          createdAt: j.created_at,
          payload: j.draft_overrides,
        })),
      ];

      return normalized.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    },
  });
}
