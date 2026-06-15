// Decide where to send a user immediately after authentication — both after
// signup→verify and after login. Pure and deterministic so it can be unit
// tested and shared by Register and Auth (no duplicate redirect logic).
//
// Priority:
//   1. Already has dashboard access (paid+active, trialing, or admin) → dashboard
//   2. Has a selected plan (URL ?plan → sessionStorage intent → pending_plan_id) → /checkout
//   3. Otherwise → /pricing to choose a plan (Flow A: no-plan signup)
//
// This NEVER grants access — it only chooses a destination. The dashboard guard
// re-validates server-side regardless of where we route.
export function routeAfterAuth(input: {
  canAccess: boolean;
  planToken: string | null | undefined;
  dashboardPath: string;
}): string {
  if (input.canAccess) return input.dashboardPath;
  const token = (input.planToken ?? '').trim();
  if (token) return `/checkout?plan=${encodeURIComponent(token)}`;
  return '/pricing';
}
