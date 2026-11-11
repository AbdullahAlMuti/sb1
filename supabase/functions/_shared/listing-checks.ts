// listing-checks.ts — pure helpers for the pre-listing safety checks
// (check-vero, check-duplicate). No I/O here so they are unit-testable.

export interface VeroMatch {
  brand: string;
  risk: "high";
  category: string | null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match a listing title against the owner-maintained protected-brand list
 * (description_config.exclusion_rules.vero_brands).
 *
 * Whole-word, case-insensitive: "Apple" matches "Apple iPhone 11" and
 * "for APPLE watch" but not "Pineapple Slicer" or "Applesauce".
 */
export function matchVeroBrands(title: string, brands: unknown): VeroMatch[] {
  if (typeof title !== "string" || !title.trim() || !Array.isArray(brands)) return [];
  const seen = new Set<string>();
  const matches: VeroMatch[] = [];
  for (const raw of brands) {
    if (typeof raw !== "string") continue;
    const brand = raw.trim();
    if (!brand) continue;
    const key = brand.toLowerCase();
    if (seen.has(key)) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(brand)}(?![\\p{L}\\p{N}])`, "iu");
    if (re.test(title)) {
      seen.add(key);
      matches.push({ brand, risk: "high", category: null });
    }
  }
  return matches;
}

/** Normalize a supplier product id / ASIN from a request body. Null when unusable. */
export function normalizeProductId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v || v.length > 100) return null;
  return v;
}
