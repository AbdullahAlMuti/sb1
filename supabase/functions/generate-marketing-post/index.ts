// generate-marketing-post — AI draft generator for the COMPANY marketing blog.
//
// Distinct from `generate-blog-post` (which is the per-user affiliate-content feature).
// Admin-only. Given a topic, returns a structured SEO draft for the editor to refine.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsHeaders } from "../_shared/cors.ts";


function json(ch: Record<string,string>, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...ch, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are an expert SEO content writer for SellerSuit, an eBay dropshipping toolkit.
You write long-form, genuinely useful, well-structured blog articles that rank on Google.
Target audience: people who dropship on eBay (sourcing from Amazon, Walmart, AliExpress).

Rules:
- Be accurate and practical. No fluff, no fake statistics.
- Use semantic HTML for the body: <h2>, <h3>, <p>, <ul>/<li>, <strong>, <a>. No <h1> (the title is the h1). No inline styles, no <script>, no <style>.
- Aim for 1,200-2,000 words with clear H2 sections and a few H3s.
- Naturally mention how SellerSuit automates sourcing/listing where relevant, without being spammy.
- Include a current-year angle where it helps ("in 2026").

Return ONLY valid minified JSON in exactly this shape:
{
  "title": "SEO title, 50-65 chars, includes the main keyword",
  "seoTitle": "Optional alternate <title>, else repeat title",
  "metaDescription": "150-160 chars, compelling",
  "excerpt": "1-2 sentence summary for cards",
  "keywords": ["5-8", "relevant", "keywords"],
  "content": "<h2>...</h2><p>...</p> full HTML body",
  "faq": [{"q":"question","a":"answer"}, ...4-6 items]
}`;

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json(corsHeaders, 500, { error: "Supabase env not configured" });
    }
    if (!lovableApiKey) return json(corsHeaders, 500, { error: "AI API key not configured" });

    // --- admin auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(corsHeaders, 401, { error: "No authorization header" });
    const token = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json(corsHeaders, 401, { error: "Unauthorized" });

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "super_admin"]);
    if (!roles || roles.length === 0) return json(corsHeaders, 403, { error: "Admin access required" });

    // --- input ---
    const body = await req.json().catch(() => ({}));
    const topic = String(body.topic ?? "").trim();
    const categoryName = String(body.categoryName ?? "").trim();
    if (!topic) return json(corsHeaders, 400, { error: "topic is required" });
    if (topic.length > 500) return json(corsHeaders, 400, { error: "topic too long" });

    const userPrompt = `Write a blog article about: "${topic}".${
      categoryName ? `\nCategory: ${categoryName}.` : ""
    }`;

    // --- AI call (Lovable gateway, same as generate-blog-post) ---
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      if (aiResponse.status === 429) return json(corsHeaders, 429, { error: "Rate limit exceeded. Try again shortly." });
      if (aiResponse.status === 402) return json(corsHeaders, 402, { error: "AI credits exhausted." });
      console.error("AI error:", aiResponse.status, text);
      return json(corsHeaders, 502, { error: "AI generation failed" });
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return json(corsHeaders, 502, { error: "AI returned no parseable content" });

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return json(corsHeaders, 502, { error: "AI returned invalid JSON" });
    }

    return json(corsHeaders, 200, {
      title: parsed.title ?? topic,
      seoTitle: parsed.seoTitle ?? parsed.title ?? "",
      metaDescription: parsed.metaDescription ?? "",
      excerpt: parsed.excerpt ?? "",
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      content: parsed.content ?? "",
      faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    });
  } catch (e) {
    console.error("generate-marketing-post error:", e);
    return json(corsHeaders, 500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
