import type { ReactNode } from "react";
import { useAuth } from "@repo/auth/hooks/useAuth";

/**
 * Renders children only when the current user is on (or above) a given plan.
 *
 * Admins always pass — operators must never be locked out of operator tooling by
 * a subscription gate. Mirrors the user-facing app's plan gating so a single
 * mental model covers both surfaces.
 */
interface PlanGateProps {
  children: ReactNode;
  requiredPlan: string;
  /** Optional ordered plan ladder, lowest -> highest, for ">= plan" checks. */
  planOrder?: string[];
  fallback?: ReactNode;
}

export function PlanGate({ children, requiredPlan, planOrder, fallback = null }: PlanGateProps) {
  const { isAdmin, profile } = useAuth();

  if (isAdmin) return <>{children}</>;

  const plan = profile?.plan_id ?? null;
  let allowed = plan === requiredPlan;

  if (!allowed && planOrder) {
    const current = plan ? planOrder.indexOf(plan) : -1;
    const required = planOrder.indexOf(requiredPlan);
    allowed = current >= 0 && required >= 0 && current >= required;
  }

  return <>{allowed ? children : fallback}</>;
}
