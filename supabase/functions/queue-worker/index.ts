import { createServiceClient } from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  const providedSecret = req.headers.get("X-Internal-Function-Secret");
  if (!internalSecret || providedSecret !== internalSecret) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createServiceClient();
  const ipLimit = await checkRateLimit(supabase, {
    bucket: "queue-worker:ip",
    key: getClientIp(req),
    limit: 120,
    windowSeconds: 60,
  });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

  const workerId = req.headers.get("X-Worker-Id") || `edge-${crypto.randomUUID()}`;
  const body = await req.json().catch(() => ({}));
  const jobType = typeof body.jobType === "string" ? body.jobType : null;
  const limit = Math.min(Math.max(Number(body.limit ?? 10), 1), 50);

  let query = supabase
    .from("background_jobs")
    .select("*")
    .eq("status", "queued")
    .lte("run_after", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  if (jobType) query = query.eq("job_type", jobType);

  const { data: queuedJobs, error: selectError } = await query;
  if (selectError) {
    return new Response(JSON.stringify({ success: false, error: selectError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const claimed = [];
  for (const job of queuedJobs ?? []) {
    const { data: updated } = await supabase
      .from("background_jobs")
      .update({
        status: "running",
        locked_at: new Date().toISOString(),
        locked_by: workerId,
        attempts: Number(job.attempts ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (updated) claimed.push(updated);
  }

  return new Response(JSON.stringify({ success: true, workerId, jobs: claimed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
