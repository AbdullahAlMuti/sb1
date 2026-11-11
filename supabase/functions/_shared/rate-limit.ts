type RateLimitOptions = {
  bucket: string;
  key: string | null | undefined;
  limit: number;
  windowSeconds: number;
};

type SupabaseLike = {
  from: (table: string) => any;
  rpc?: (fn: string, args: Record<string, unknown>) => any;
};

/** PostgREST/Postgres codes meaning "the function is not deployed yet". */
function isMissingFunction(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883" ||
    /could not find the function|does not exist/i.test(error.message || "");
}

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  status: number;
  error?: string;
};

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64Url(new Uint8Array(digest));
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function checkRateLimit(
  supabase: SupabaseLike,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowMs = options.windowSeconds * 1000;
  const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs).toISOString();
  const resetAt = new Date(windowStartMs + windowMs).toISOString();
  const expiresAt = new Date(windowStartMs + windowMs * 2).toISOString();
  const key = options.key?.trim() || "unknown";
  const subjectHash = await sha256(`${options.bucket}:${key}`);

  // Atomic path: one INSERT … ON CONFLICT DO UPDATE … RETURNING. The legacy
  // SELECT-then-UPDATE below let N concurrent requests all read the same count
  // and all pass. Used only as a fallback until the migration
  // 20261112090000_atomic_rate_limit.sql is applied.
  if (typeof supabase.rpc === "function") {
    const { data: count, error: rpcError } = await supabase.rpc("increment_rate_limit", {
      p_bucket: options.bucket,
      p_subject_hash: subjectHash,
      p_window_start: windowStart,
      p_expires_at: expiresAt,
    });
    if (!rpcError && typeof count === "number") {
      const allowed = count <= options.limit;
      return {
        allowed,
        remaining: Math.max(0, options.limit - count),
        resetAt,
        status: allowed ? 200 : 429,
        ...(allowed ? {} : { error: "Rate limit exceeded" }),
      };
    }
    if (rpcError && !isMissingFunction(rpcError)) {
      console.error("[rate-limit] rpc failed", rpcError);
      return { allowed: false, remaining: 0, resetAt, status: 503, error: "Rate limit check unavailable" };
    }
  }

  const { data: existing, error: selectError } = await supabase
    .from("function_rate_limits")
    .select("id, request_count")
    .eq("bucket", options.bucket)
    .eq("subject_hash", subjectHash)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (selectError) {
    console.error("[rate-limit] select failed", selectError);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      status: 503,
      error: "Rate limit check unavailable",
    };
  }

  if (existing) {
    const currentCount = Number(existing.request_count ?? 0);
    if (currentCount >= options.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        status: 429,
        error: "Rate limit exceeded",
      };
    }

    const nextCount = currentCount + 1;
    const { error: updateError } = await supabase
      .from("function_rate_limits")
      .update({ request_count: nextCount, expires_at: expiresAt })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[rate-limit] update failed", updateError);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        status: 503,
        error: "Rate limit check unavailable",
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - nextCount),
      resetAt,
      status: 200,
    };
  }

  const { error: insertError } = await supabase.from("function_rate_limits").insert({
    bucket: options.bucket,
    subject_hash: subjectHash,
    window_start: windowStart,
    request_count: 1,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("[rate-limit] insert failed", insertError);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      status: 503,
      error: "Rate limit check unavailable",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - 1),
    resetAt,
    status: 200,
  };
}

export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: result.error || "Rate limit exceeded",
      resetAt: result.resetAt,
    }),
    {
      status: result.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": Math.max(
          1,
          Math.ceil((new Date(result.resetAt).getTime() - Date.now()) / 1000),
        ).toString(),
      },
    },
  );
}
