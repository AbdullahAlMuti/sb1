// title-guard.ts — final, deterministic pass over every eBay title the server
// returns (AI output AND fallbacks). The model is asked to follow these rules;
// this guarantees them.
//
// Mirrors apps/extension/common/title-quality.js (same limit, same word lists).

export const EBAY_TITLE_MAX = 80;

const SUPPLIERS = ["amazon", "walmart", "aliexpress", "alibaba", "temu"];
const PROMO = [
  "free shipping", "fast shipping", "free delivery", "best seller", "best price", "best deal",
  "hot sale", "on sale", "limited stock", "limited time", "top rated", "brand new", "new arrival",
  "premium quality", "high quality", "must have", "l@@k", "wow", "cheapest", "cheap", "guaranteed",
];
const CONNECTORS = ["and", "with", "for", "of", "the", "a", "an", "in", "on", "to", "by", "or", "&"];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripPhrases(text: string, phrases: string[]): string {
  let out = text;
  // longest first so "free shipping" goes before "free"
  for (const p of [...phrases].sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`(^|[^a-z0-9])${escapeRegExp(p)}(?=[^a-z0-9]|$)`, "gi"), "$1");
  }
  return out;
}

/** Cut at a word boundary; never end on a connector or punctuation. */
export function trimToLimit(title: string, max = EBAY_TITLE_MAX): string {
  let t = String(title || "").replace(/\s+/g, " ").trim();
  if (t.length > max) {
    t = t.slice(0, max + 1);
    const cut = t.lastIndexOf(" ");
    t = (cut > max * 0.5 ? t.slice(0, cut) : t.slice(0, max)).trim();
  }
  for (let guard = 0; guard < 6; guard++) {
    const before = t;
    t = t.replace(/[\s,;:\-–—/&|]+$/, "");
    const m = t.match(/\s(\S+)$/);
    if (m && CONNECTORS.includes(m[1].toLowerCase())) t = t.slice(0, m.index);
    if (t === before) break;
  }
  return t.trim();
}

/**
 * Make one title safe to list: no promotional wording, no supplier names, no
 * symbol stuffing, no shouting, within eBay's limit. Returns "" when nothing
 * usable remains (callers must then fall back, not invent a title).
 */
export function guardTitle(raw: unknown): string {
  let t = typeof raw === "string" ? raw : "";
  t = t.replace(/[\r\n\t]+/g, " ").replace(/^["'`\s]+|["'`\s]+$/g, "");
  t = stripPhrases(t, PROMO);
  t = stripPhrases(t, SUPPLIERS);
  // decorative symbols and stuffing
  t = t.replace(/[!*~^=_|]+/g, " ").replace(/\s*([,;:])\s*(?=[,;:])/g, "").replace(/\(\s*\)/g, " ");
  // shouting: an ALL-CAPS word of 5+ letters becomes Title Case (model codes
  // and acronyms are shorter or carry digits, so they are left alone)
  t = t.replace(/\b[A-Z]{5,}\b/g, (w) => w.charAt(0) + w.slice(1).toLowerCase());
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,;:.])/g, "$1").replace(/^[\s,;:\-–—]+/, "").trim();
  return trimToLimit(t);
}

/**
 * Honest fallback when the model returns nothing usable: the product's own
 * title, cleaned — never padded with promotional words.
 */
export function fallbackTitle(productTitle: unknown, brand?: unknown): string {
  const base = guardTitle(productTitle);
  if (base) return base;
  return guardTitle(brand);
}
