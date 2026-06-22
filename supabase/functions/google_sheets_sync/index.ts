import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceActiveSubscription } from "../_shared/plan-middleware.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { maxRetries: number; baseDelayMs: number; timeoutMs: number },
): Promise<{ response: Response; attempts: number; timedOut: boolean }> {
  const { maxRetries, baseDelayMs, timeoutMs } = opts;
  let attempts = 0;

  while (true) {
    attempts += 1;
    let timedOut = false;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      const shouldRetry = response.status === 429 || (response.status >= 500 && response.status <= 599);
      if (shouldRetry && attempts <= maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempts - 1);
        console.log(
          `Upstream transient error (${response.status}). Retrying in ${delay}ms (attempt ${attempts}/${maxRetries + 1})`,
        );
        try {
          await response.text();
        } catch {
          /* ignore */
        }
        await sleep(delay);
        continue;
      }

      return { response, attempts, timedOut };
    } catch (err) {
      clearTimeout(timeout);

      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if ((isAbort || err instanceof TypeError) && attempts <= maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempts - 1);
        console.log(
          `Upstream fetch error (${isAbort ? "timeout" : "network"}). Retrying in ${delay}ms (attempt ${attempts}/${maxRetries + 1})`,
        );
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }
}

// Validate URL to prevent SSRF attacks
function validateGoogleScriptUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    if (url.protocol !== "https:") {
      return { valid: false, error: "Only HTTPS URLs are allowed" };
    }

    const allowedDomains = ["script.google.com", "script.googleusercontent.com"];
    const isAllowedDomain = allowedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith("." + domain));
    if (!isAllowedDomain) {
      return { valid: false, error: "URL must be a Google Apps Script URL" };
    }

    const hostname = url.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^\[::1\]$/,
      /^\[fe80:/i,
      /^\[fc00:/i,
      /^\[fd00:/i,
    ];
    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: "Access to private/internal addresses is blocked" };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Manual auth (we keep it even though verify_jwt=false) so users only sync their own data.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized",
          debug: { auth: { method: "header", message: "Missing Authorization: Bearer <token> header" } },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env");
      return new Response(JSON.stringify({ success: false, error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      console.error("Invalid JWT (getUser):", userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JWT",
          debug: { auth: { method: "getUser", message: userError?.message ?? "Unknown auth error" } },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const blockResponse = await enforceActiveSubscription(supabaseAdmin, userData.user.id);
    if (blockResponse) return blockResponse;

    const { scriptUrl, action, sheetName, rows, uniqueColumn } = await req.json();
    if (!scriptUrl) {
      return new Response(JSON.stringify({ success: false, error: "Missing Google Apps Script URL" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urlValidation = validateGoogleScriptUrl(scriptUrl);
    if (!urlValidation.valid) {
      return new Response(JSON.stringify({ success: false, error: urlValidation.error }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Syncing to Google Sheets: ${sheetName}, rows: ${rows?.length || 0}`);

    const { response, attempts, timedOut } = await fetchWithRetry(
      scriptUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sheetName, rows, uniqueColumn }),
      },
      { maxRetries: 2, baseDelayMs: 400, timeoutMs: 8000 },
    );

    const responseText = await response.text();
    console.log("Google Apps Script response:", responseText);
    console.log("Google Apps Script status:", response.status, "ok:", response.ok);

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { success: true, message: responseText };
    }

    (result as Record<string, unknown>).debug = {
      upstream_status: response.status,
      upstream_ok: response.ok,
      upstream_status_text: response.statusText,
      upstream_response_text: responseText,
      retry_attempts: attempts,
      timed_out: timedOut,
      request: {
        action,
        sheetName,
        rows_count: Array.isArray(rows) ? rows.length : 0,
        uniqueColumn,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
