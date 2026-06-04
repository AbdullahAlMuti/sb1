type CorsOptions = {
  extension?: boolean;
  publicEndpoint?: boolean;
  methods?: string[];
  headers?: string[];
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://sellersuit.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
];

const DEFAULT_ALLOWED_HEADERS = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-internal-function-secret",
];

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function splitOrigins(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => normalizeOrigin(item.trim()))
    .filter((item): item is string => Boolean(item));
}

export function getAllowedOrigins(options: CorsOptions = {}): Set<string> {
  const origins = [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...splitOrigins(Deno.env.get("APP_URL")),
    ...splitOrigins(Deno.env.get("PUBLIC_APP_URL")),
    ...splitOrigins(Deno.env.get("MARKETING_APP_URL")),
    ...splitOrigins(Deno.env.get("ADMIN_APP_URL")),
    ...splitOrigins(Deno.env.get("ALLOWED_ORIGINS")),
  ];

  if (options.extension) {
    origins.push(...splitOrigins(Deno.env.get("EXTENSION_ALLOWED_ORIGINS")));
  }

  return new Set(origins);
}

export function isAllowedOrigin(origin: string | null | undefined, options: CorsOptions = {}): boolean {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return getAllowedOrigins(options).has(normalized);
}

export function resolveCorsHeaders(req: Request, options: CorsOptions = {}): Record<string, string> {
  const origin = normalizeOrigin(req.headers.get("origin"));
  const allowedOrigin = origin && isAllowedOrigin(origin, options) ? origin : null;
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": (options.headers ?? DEFAULT_ALLOWED_HEADERS).join(", "),
    "Access-Control-Allow-Methods": (options.methods ?? ["GET", "POST", "OPTIONS"]).join(", "),
  };

  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  } else if (options.publicEndpoint) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

export function requireAllowedOrigin(req: Request, options: CorsOptions = {}): Response | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  if (isAllowedOrigin(origin, options)) return null;

  return new Response(JSON.stringify({ error: "Origin is not allowed" }), {
    status: 403,
    headers: { ...resolveCorsHeaders(req, options), "Content-Type": "application/json" },
  });
}

export function getAllowedReturnOrigin(req: Request, options: CorsOptions = {}): string {
  const origin = normalizeOrigin(req.headers.get("origin"));
  if (origin && isAllowedOrigin(origin, options)) return origin;

  const configured =
    normalizeOrigin(Deno.env.get("APP_URL")) ??
    normalizeOrigin(Deno.env.get("PUBLIC_APP_URL")) ??
    normalizeOrigin(Deno.env.get("MARKETING_APP_URL"));

  return configured ?? "https://sellersuit.com";
}
