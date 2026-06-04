import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  requireFeatureEntitlement,
  resolveExtensionOrLegacyAuth,
} from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { requireAllowedOrigin, resolveCorsHeaders } from "../_shared/cors.ts";

type Provider = "openai" | "anthropic" | "gemini" | "lovable";

async function readLimitedJson(req: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  const body = await req.text();
  if (body.length > maxBytes) throw new Error("Request body is too large");
  const parsed = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function sanitizeProvider(value: unknown): Provider {
  if (value === "openai" || value === "anthropic" || value === "gemini" || value === "lovable") {
    return value;
  }
  throw new Error("Unknown provider");
}

async function readProviderError(response: Response, fallback: string): Promise<string> {
  try {
    const errorData = await response.json();
    return errorData.error?.message || fallback;
  } catch {
    return fallback;
  }
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  const originError = requireAllowedOrigin(req);
  if (originError) return originError;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createServiceClient();
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "test-api-key:ip",
      key: getClientIp(req),
      limit: 20,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const authContext = await resolveExtensionOrLegacyAuth(supabase, req);
    const userLimit = await checkRateLimit(supabase, {
      bucket: "test-api-key:user",
      key: authContext.userId,
      limit: 10,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    const hasAiAccess = await requireFeatureEntitlement(
      supabase,
      authContext.userId,
      authContext.workspaceId,
      "description_generation",
    );
    if (!hasAiAccess) {
      return new Response(JSON.stringify({ success: false, error: "Feature not entitled or subscription inactive" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await readLimitedJson(req);
    const provider = sanitizeProvider(body.provider);
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const model = typeof body.model === "string" ? body.model.slice(0, 120).trim() : "";

    if (!apiKey && provider !== "lovable") {
      throw new Error("API key is required");
    }
    if (apiKey.length > 4096) {
      throw new Error("API key is too large");
    }

    console.log("[test-api-key] Testing provider", {
      userId: authContext.userId,
      provider,
      hasModel: Boolean(model),
    });

    let isValid = false;
    let errorMessage = "";

    switch (provider) {
      case "openai": {
        const testModel = model || "gpt-4o-mini";
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: "user", content: "Say hello" }],
            max_tokens: 10,
          }),
        });

        isValid = response.ok;
        if (!isValid) errorMessage = await readProviderError(response, "Invalid API key or model");
        break;
      }

      case "anthropic": {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model || "claude-3-5-haiku-20241022",
            max_tokens: 10,
            messages: [{ role: "user", content: "Say hello" }],
          }),
        });

        isValid = response.ok;
        if (!isValid) errorMessage = await readProviderError(response, "Invalid API key");
        break;
      }

      case "gemini": {
        const testModel = "gemini-1.5-flash";
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Say hello" }] }] }),
          },
        );

        isValid = response.ok;
        if (!isValid) errorMessage = await readProviderError(response, "Invalid API key");
        break;
      }

      case "lovable":
        isValid = true;
        break;
    }

    if (isValid) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = /(authorization|auth token|session)/i.test(message) ? 401 : 500;
    console.error("[test-api-key] Error", { message });
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
