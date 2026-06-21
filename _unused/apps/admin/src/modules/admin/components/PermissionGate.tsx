import type { ReactNode } from "react";
import { useAuth } from "@repo/auth/hooks/useAuth";
import type { AdminRole } from "../navigation/admin-navigation.config";
import { canAccess, type AdminPermissionContext } from "../permissions/admin-permissions";

/**
 * Declarative, role-aware wrapper for admin UI fragments.
 *
 * UX only — it hides controls the current admin shouldn't bother with. The
 * authoritative check still lives server-side (Edge Function / RPC / RLS), so
 * a hidden button is never the thing that keeps data safe.
 */
interface PermissionGateProps {
  children: ReactNode;
  /** Minimum role required to render children. */
  requiredRole?: AdminRole;
  featureFlag?: string;
  flags?: Record<string, boolean>;
  fallback?: ReactNode;
}

export function PermissionGate({
  children,
  requiredRole,
  featureFlag,
  flags,
  fallback = null,
}: PermissionGateProps) {
  const { isAdmin, isSuperAdmin, roles } = useAuth();

  const ctx: AdminPermissionContext = {
    isAdmin,
    isSuperAdmin,
    roles: roles.map((r) => r.role),
    flags,
  };

  const allowed = canAccess({ requiredRole, featureFlag }, ctx);

  return <>{allowed ? children : fallback}</>;
}
