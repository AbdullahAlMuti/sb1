// Plan-intent: the user's selected plan token, preserved across the
// signup → checkout funnel.
//
// Source of truth order for "which plan did the user pick":
//   1. URL ?plan=<slug|name|id>   (primary — callers read it directly)
//   2. sessionStorage 'selectedPlan' (this module — survives navigation)
//   3. profile.pending_plan_id    (server fallback — callers read it)
//
// IMPORTANT: plan intent only decides WHERE to route the user. It never
// grants dashboard access; that is always re-validated server-side.
//
// We use sessionStorage (not localStorage) so a stale plan choice does not
// leak into a future, unrelated browser session. Legacy localStorage keys
// written by older flows are migrated into sessionStorage on first read,
// then cleared.

const PLAN_INTENT_KEY = 'selectedPlan';

// Legacy localStorage keys, in migration-preference order. The first
// non-empty value found is adopted as the intent token.
const LEGACY_PLAN_KEYS = ['selectedPlan', 'selectedPlanId', 'selectedPlanName'] as const;

// Funnel keys cleared alongside the plan intent (coupon is not a plan token,
// but it belongs to the same checkout funnel and is always cleared together).
const FUNNEL_CLEAR_KEYS = [...LEGACY_PLAN_KEYS, 'appliedCouponCode'] as const;

function safeSession(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function safeLocal(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Persist the user's selected plan token. No-ops on empty input or when storage is unavailable. */
export function setPlanIntent(token: string | null | undefined): void {
  const ss = safeSession();
  if (!ss) return;
  const value = (token ?? '').trim();
  if (!value) return;
  try {
    ss.setItem(PLAN_INTENT_KEY, value);
  } catch {
    /* storage full / disabled — intent is best-effort */
  }
}

/**
 * Read the stored plan token, migrating any legacy localStorage value into
 * sessionStorage (and clearing the legacy keys) on the way. Returns null when
 * nothing is stored.
 */
export function getPlanIntent(): string | null {
  const ss = safeSession();
  const ls = safeLocal();

  // One-time migration from legacy localStorage keys.
  if (ls) {
    for (const key of LEGACY_PLAN_KEYS) {
      try {
        const legacy = ls.getItem(key);
        if (legacy && legacy.trim() && ss && !ss.getItem(PLAN_INTENT_KEY)) {
          ss.setItem(PLAN_INTENT_KEY, legacy.trim());
        }
        if (legacy !== null) ls.removeItem(key);
      } catch {
        /* ignore individual key failures */
      }
    }
  }

  if (!ss) return null;
  try {
    const v = ss.getItem(PLAN_INTENT_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

/** Clear the plan intent and all legacy funnel keys (plan + coupon). */
export function clearPlanIntent(): void {
  const ss = safeSession();
  const ls = safeLocal();
  try {
    ss?.removeItem(PLAN_INTENT_KEY);
  } catch {
    /* ignore */
  }
  if (ls) {
    for (const key of FUNNEL_CLEAR_KEYS) {
      try {
        ls.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Minimal plan shape the resolver needs — keeps this module decoupled from the full Plan type. */
export interface ResolvablePlan {
  id: string;
  name: string;
  slug?: string | null;
}

/**
 * Resolve a human/URL plan token to a concrete plan.
 * Match order: id (exact) → slug (case-insensitive) → name (case-insensitive).
 * Returns null when the token is empty or nothing matches.
 */
export function resolvePlanToken<T extends ResolvablePlan>(
  token: string | null | undefined,
  plans: T[] | null | undefined,
): T | null {
  const t = (token ?? '').trim();
  if (!t || !plans?.length) return null;
  const lower = t.toLowerCase();
  return (
    plans.find((p) => p.id === t) ??
    plans.find((p) => (p.slug ?? '').toLowerCase() === lower && lower !== '') ??
    plans.find((p) => p.name.toLowerCase() === lower) ??
    null
  );
}
