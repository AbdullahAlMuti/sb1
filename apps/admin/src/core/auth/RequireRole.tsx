import { type ReactNode } from "react";
import { useAuth } from "@repo/auth/hooks/useAuth";

export type AdminRole = "admin" | "super_admin";

interface RequireRoleProps {
  role: AdminRole;
  children: ReactNode;
  /** Rendered instead of children when the role check fails. Defaults to null. */
  fallback?: ReactNode;
}

/** True when the current user satisfies `role`. */
export function useHasRole(role: AdminRole): boolean {
  const { isAdmin, isSuperAdmin } = useAuth();
  return role === "super_admin" ? isSuperAdmin : isAdmin;
}

/**
 * Gate UI by admin tier. This is the convenience layer — the real boundary is
 * the server (RPC `has_role(...)`/RLS). Use it to hide dangerous controls from
 * plain admins so they never see a button they can't use.
 */
export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const allowed = useHasRole(role);
  return <>{allowed ? children : fallback}</>;
}
