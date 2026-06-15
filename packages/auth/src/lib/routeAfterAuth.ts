// Thin compatibility wrapper over resolveNextStep (the single routing source of
// truth). Kept for the simple "do they have access or not" callers that don't
// know onboarding/trial state. New code should call resolveNextStep directly so
// onboarding and billing-recovery routing is honored.
//
// This NEVER grants access — it only chooses a destination. The dashboard guard
// re-validates server-side regardless of where we route.
import { resolveNextStep } from './resolveNextStep.ts';

export function routeAfterAuth(input: {
  canAccess: boolean;
  planToken: string | null | undefined;
  dashboardPath: string;
}): string {
  return resolveNextStep({
    hasUser: true,
    isEmailVerified: true,
    isAdmin: false,
    access: input.canAccess ? 'active' : 'none',
    onboardingCompleted: true,
    planToken: input.planToken,
    dashboardPath: input.dashboardPath,
  });
}
