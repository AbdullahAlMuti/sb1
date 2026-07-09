// Runs under Node 22+ (node --experimental-strip-types --test) and Deno
// (deno test --allow-env) — uses node: builtins supported by both.
//
// Regression coverage for AUTH-P1-001 follow-up: the strict CORS allow-list
// must always include the canonical production origins (app/admin/www
// sellersuit.com) even when no origin env vars are configured. When
// app.sellersuit.com was missing, the browser blocked the create-checkout
// preflight and supabase-js surfaced "Failed to send a request to the Edge
// Function" on the choose-plan page.
import test from "node:test";
import assert from "node:assert/strict";

// cors.ts reads Deno.env at call time. Provide a controllable stub that works
// in both runtimes: under Node we define globalThis.Deno; under Deno we
// monkey-patch Deno.env.get. Tests set `envVars` per case.
let envVars: Record<string, string | undefined> = {};
const envGet = (key: string): string | undefined => envVars[key];

const g = globalThis as Record<string, unknown>;
if (typeof g.Deno === "undefined") {
  g.Deno = { env: { get: envGet } };
} else {
  (g.Deno as { env: { get: (k: string) => string | undefined } }).env.get = envGet;
}

const {
  getAllowedOrigins,
  isAllowedOrigin,
  resolveCorsHeaders,
  requireAllowedOrigin,
  getAllowedReturnOrigin,
  isExtensionCallerOrigin,
  resolveExtensionCors,
} = await import("./cors.ts");

function reqWithOrigin(origin: string | null, method = "POST"): Request {
  const headers = new Headers();
  if (origin !== null) headers.set("origin", origin);
  return new Request("https://example.supabase.co/functions/v1/create-checkout", {
    method,
    headers,
  });
}

test("canonical production origins are allowed with no env configured", () => {
  envVars = {};
  for (const origin of [
    "https://sellersuit.com",
    "https://www.sellersuit.com",
    "https://app.sellersuit.com",
    "https://admin.sellersuit.com",
  ]) {
    assert.equal(isAllowedOrigin(origin), true, `${origin} should be allowed by default`);
  }
});

test("app.sellersuit.com preflight gets Access-Control-Allow-Origin (checkout regression)", () => {
  envVars = {};
  const headers = resolveCorsHeaders(reqWithOrigin("https://app.sellersuit.com", "OPTIONS"));
  assert.equal(headers["Access-Control-Allow-Origin"], "https://app.sellersuit.com");
  assert.ok(headers["Access-Control-Allow-Methods"].includes("POST"));
  assert.ok(headers["Access-Control-Allow-Headers"].includes("authorization"));
});

test("unknown origins get no Access-Control-Allow-Origin and a 403 from requireAllowedOrigin", async () => {
  envVars = {};
  const headers = resolveCorsHeaders(reqWithOrigin("https://evil.example.com"));
  assert.equal(headers["Access-Control-Allow-Origin"], undefined);

  const res = requireAllowedOrigin(reqWithOrigin("https://evil.example.com"));
  assert.ok(res, "requireAllowedOrigin should reject unknown origins");
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, "Origin is not allowed");
});

test("requireAllowedOrigin passes canonical production origins and origin-less requests", () => {
  envVars = {};
  assert.equal(requireAllowedOrigin(reqWithOrigin("https://app.sellersuit.com")), null);
  assert.equal(requireAllowedOrigin(reqWithOrigin("https://admin.sellersuit.com")), null);
  // Server-to-server calls (Stripe CLI, curl) send no Origin header.
  assert.equal(requireAllowedOrigin(reqWithOrigin(null)), null);
});

test("localhost dev origins remain allowed", () => {
  envVars = {};
  for (const origin of [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
  ]) {
    assert.equal(isAllowedOrigin(origin), true, `${origin} should be allowed for dev`);
  }
});

test("env vars extend the allow-list instead of replacing it", () => {
  envVars = { ALLOWED_ORIGINS: "https://staging.sellersuit.dev, https://preview.sellersuit.dev" };
  const origins = getAllowedOrigins();
  assert.ok(origins.has("https://staging.sellersuit.dev"));
  assert.ok(origins.has("https://preview.sellersuit.dev"));
  // Defaults survive env configuration.
  assert.ok(origins.has("https://app.sellersuit.com"));
  assert.ok(origins.has("https://sellersuit.com"));
});

test("malformed env origins are ignored, valid ones normalized to origin", () => {
  envVars = { APP_URL: "https://app.sellersuit.com/some/path, not-a-url" };
  const origins = getAllowedOrigins();
  assert.ok(origins.has("https://app.sellersuit.com"), "path should normalize to origin");
  assert.equal([...origins].some((o) => o.includes("not-a-url")), false);
});

test("getAllowedReturnOrigin reflects allowed origins and falls back safely", () => {
  envVars = {};
  assert.equal(
    getAllowedReturnOrigin(reqWithOrigin("https://app.sellersuit.com")),
    "https://app.sellersuit.com",
  );
  // Unknown origin + no env → hardcoded safe fallback.
  assert.equal(
    getAllowedReturnOrigin(reqWithOrigin("https://evil.example.com")),
    "https://sellersuit.com",
  );
  envVars = { APP_URL: "https://app.sellersuit.com" };
  assert.equal(
    getAllowedReturnOrigin(reqWithOrigin("https://evil.example.com")),
    "https://app.sellersuit.com",
  );
});

test("extension CORS still reflects marketplace and extension origins", () => {
  envVars = {};
  assert.equal(isExtensionCallerOrigin("chrome-extension://abcdefghijklmnop"), true);
  assert.equal(isExtensionCallerOrigin("https://www.ebay.com"), true);
  assert.equal(isExtensionCallerOrigin("https://evil.example.com"), false);

  const headers = resolveExtensionCors(reqWithOrigin("https://www.ebay.com"));
  assert.equal(headers["Access-Control-Allow-Origin"], "https://www.ebay.com");
  assert.equal(headers["Vary"], "Origin");

  const blocked = resolveExtensionCors(reqWithOrigin("https://evil.example.com"));
  assert.equal(blocked["Access-Control-Allow-Origin"], undefined);
});
