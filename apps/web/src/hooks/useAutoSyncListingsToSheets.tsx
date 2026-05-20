import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync';

type RealtimeListingPayload = {
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
};

type Options = {
  enabled: boolean;
  /** Debounce window for batching (ms). */
  debounceMs?: number;
};

/**
 * Additive, non-blocking Google Sheets auto-sync for listings.
 * - Does NOT change listing creation/update/delete logic.
 * - Batches realtime events into a single upsert/delete call.
 */
export function useAutoSyncListingsToSheets({ enabled, debounceMs = 1500 }: Options) {
  const { syncListingsUpsert, syncListingsDelete } = useGoogleSheetsSync();

  const [lastAutoSyncAt, setLastAutoSyncAt] = useState<string | null>(null);
  const [lastAutoSyncError, setLastAutoSyncError] = useState<string | null>(null);
  const [lastAutoSyncAttemptAt, setLastAutoSyncAttemptAt] = useState<string | null>(null);

  const bufferRef = useRef<{
    upserts: Map<string, Record<string, unknown>>;
    deletes: Map<string, Record<string, unknown>>;
  }>({
    upserts: new Map(),
    deletes: new Map(),
  });

  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(async () => {
    if (!enabled) return;

    setLastAutoSyncAttemptAt(new Date().toISOString());

    const upserts = Array.from(bufferRef.current.upserts.values());
    const deletes = Array.from(bufferRef.current.deletes.values());
    bufferRef.current.upserts.clear();
    bufferRef.current.deletes.clear();

    let firstError: string | null = null;

    if (upserts.length > 0) {
      const res = await syncListingsUpsert(upserts, { silent: true });
      if (res && !res.success) firstError = firstError ?? res.message;
    }
    if (deletes.length > 0) {
      const res = await syncListingsDelete(deletes, { silent: true });
      if (res && !res.success) firstError = firstError ?? res.message;
    }

    if (firstError) {
      setLastAutoSyncError(firstError);
      return;
    }

    // Only mark success if we actually attempted to write something.
    if (upserts.length > 0 || deletes.length > 0) {
      setLastAutoSyncAt(new Date().toISOString());
      setLastAutoSyncError(null);
    }
  }, [enabled, syncListingsDelete, syncListingsUpsert]);

  const scheduleFlush = useCallback(() => {
    if (!enabled) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      flush();
    }, debounceMs);
  }, [clearTimer, debounceMs, enabled, flush]);

  const enqueue = useCallback(
    (payload: RealtimeListingPayload) => {
      if (!enabled) return;

      const type = payload.eventType;
      if (type === 'DELETE') {
        const row = payload.old ?? undefined;
        const id = row?.id;
        if (typeof id === 'string') {
          bufferRef.current.deletes.set(id, row);
          // If a delete comes in, it should override any pending upsert.
          bufferRef.current.upserts.delete(id);
          scheduleFlush();
        }
        return;
      }

      if (type === 'INSERT' || type === 'UPDATE') {
        const row = payload.new ?? undefined;
        const id = row?.id;
        if (typeof id === 'string') {
          bufferRef.current.upserts.set(id, row);
          // Upsert should override any pending delete (e.g., undelete).
          bufferRef.current.deletes.delete(id);
          scheduleFlush();
        }
      }
    },
    [enabled, scheduleFlush]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return useMemo(
    () => ({
      enqueue,
      flush,
      lastAutoSyncAt,
      lastAutoSyncAttemptAt,
      lastAutoSyncError,
    }),
    [enqueue, flush, lastAutoSyncAt, lastAutoSyncAttemptAt, lastAutoSyncError]
  );
}
