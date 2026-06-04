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
