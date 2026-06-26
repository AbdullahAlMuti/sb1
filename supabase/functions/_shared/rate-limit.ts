import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type RateLimitOptions = {
  bucket: string;
  key: string | null | undefined;
  limit: number;
  windowSeconds: number;
};

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
  supabase: SupabaseClient,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowMs = options.windowSeconds * 1000;
  const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs).toISOString();
  const resetAt = new Date(windowStartMs + windowMs).toISOString();
  const expiresAt = new Date(windowStartMs + windowMs * 2).toISOString();
  const key = options.key?.trim() || "unknown";
  const subjectHash = await sha256(`${options.bucket}:${key}`);

  // Atomic INSERT … ON CONFLICT DO UPDATE avoids the read-then-write TOCTOU race
  // that the previous SELECT→UPDATE pattern had under concurrent requests.
  const { data, error } = await supabase.rpc("rate_limit_check", {
    p_bucket:       options.bucket,
    p_subject_hash: subjectHash,
    p_window_start: windowStart,
    p_expires_at:   expiresAt,
    p_limit:        options.limit,
  });

  if (error) {
    console.error("[rate-limit] atomic check failed", error);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      status: 503,
      error: "Rate limit check unavailable",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const count = Number(row?.request_count ?? 1);
  const allowed = Boolean(row?.allowed ?? false);

  if (!allowed) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      status: 429,
      error: "Rate limit exceeded",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - count),
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
