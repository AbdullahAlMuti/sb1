import { supabase } from "@repo/api-client/supabase/client";

/**
 * Thin, typed helpers over the Supabase client for admin CRUD.
 *
 * This is the ONLY place `supabase as any` is tolerated: admin-only tables and
 * RPCs are not all present in the generated Database types yet (schema drift —
 * see PR 7). Centralising the cast here keeps the rest of the app type-safe and
 * gives us one spot to delete the casts once types are regenerated.
 */
const sb = supabase as any;

export type Order = { column: string; ascending?: boolean };

export interface ListOptions {
  /** PostgREST select expression. Defaults to "*". */
  select?: string;
  /** Equality filters applied with `.eq`. */
  filters?: Record<string, string | number | boolean | null>;
  order?: Order | Order[];
  /** 1-based page. When set with `pageSize`, applies `.range()`. */
  page?: number;
  pageSize?: number;
  /** Return an exact count alongside rows. */
  withCount?: boolean;
}

export interface ListResult<T> {
  rows: T[];
  count: number | null;
}

export async function list<T = unknown>(table: string, opts: ListOptions = {}): Promise<ListResult<T>> {
  let query = sb.from(table).select(opts.select ?? "*", opts.withCount ? { count: "exact" } : undefined);

  for (const [col, value] of Object.entries(opts.filters ?? {})) {
    query = query.eq(col, value);
  }

  const orders = opts.order ? (Array.isArray(opts.order) ? opts.order : [opts.order]) : [];
  for (const o of orders) {
    query = query.order(o.column, { ascending: o.ascending ?? false });
  }

  if (opts.page && opts.pageSize) {
    const from = (opts.page - 1) * opts.pageSize;
    query = query.range(from, from + opts.pageSize - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as T[], count: count ?? null };
}

/** Exact row count for a table with optional equality filters (head-only, no rows fetched). */
export async function count(
  table: string,
  filters?: Record<string, string | number | boolean | null>,
  gte?: { column: string; value: string },
): Promise<number> {
  let query = sb.from(table).select("*", { count: "exact", head: true });
  for (const [col, value] of Object.entries(filters ?? {})) {
    query = query.eq(col, value);
  }
  if (gte) query = query.gte(gte.column, gte.value);
  const { count: c, error } = await query;
  if (error) throw error;
  return c ?? 0;
}

export async function get<T = unknown>(table: string, id: string, select = "*"): Promise<T | null> {
  const { data, error } = await sb.from(table).select(select).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as T | null;
}

export async function insert<T = unknown>(table: string, values: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.from(table).insert(values).select().maybeSingle();
  if (error) throw error;
  return data as T;
}

export async function update<T = unknown>(table: string, id: string, values: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.from(table).update(values).eq("id", id).select().maybeSingle();
  if (error) throw error;
  return data as T;
}

export async function remove(table: string, id: string): Promise<void> {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) throw error;
}

/** Invoke a Supabase Edge Function with the current admin session bearer token. */
export async function invokeFn<T = unknown>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await sb.auth.getSession();
  const { data, error } = await sb.functions.invoke(name, {
    body: body ?? {},
    headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Call a Postgres RPC. Admin mutation RPCs enforce auth + audit server-side. */
export async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args ?? {});
  if (error) throw error;
  return data as T;
}

export interface AdminActionLog {
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  targetUserId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Write an admin audit entry for a direct table mutation (RPC-based mutations
 * audit themselves). Best-effort: a logging failure must never roll back the
 * operator's action, but it is surfaced to the console for follow-up.
 */
export async function logAdminAction(entry: AdminActionLog): Promise<void> {
  try {
    await rpc("log_admin_action", {
      p_target_user_id: entry.targetUserId ?? null,
      p_action: entry.action,
      p_entity_type: entry.entityType,
      p_entity_id: entry.entityId,
      p_old_value: entry.oldValue == null ? null : JSON.stringify(entry.oldValue),
      p_new_value: entry.newValue == null ? null : JSON.stringify(entry.newValue),
      p_reason: entry.reason ?? null,
      p_metadata: null,
    });
  } catch (err) {
    console.warn("[admin audit] failed to log action", entry.action, err);
  }
}
