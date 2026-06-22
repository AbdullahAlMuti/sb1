import type { AdminRole, NavGroup, NavNode } from "../navigation/admin-navigation.config";

/**
 * Central, pure resolver for "what should this admin be able to see".
 *
 * IMPORTANT: this only decides UI *visibility*. It is not a security boundary —
 * the real permission matrix is enforced server-side (Edge Function role checks,
 * SECURITY DEFINER RPCs, and RLS `has_role(auth.uid(),'admin')`). Hiding a node
 * here never grants access; it only declutters the shell.
 */

export interface AdminPermissionContext {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  roles: string[];
  /** Active subscription plan id (admins bypass plan gating). */
  plan?: string | null;
  /** Resolved feature flags; a key set to `false` hides flagged nodes. */
  flags?: Record<string, boolean>;
}

/** The gating-relevant subset of a nav node — also usable by `<PermissionGate>`. */
export interface PermissionRule {
  requiredRole?: AdminRole;
  requiredPlan?: string;
  featureFlag?: string;
  visible?: boolean;
}

const ROLE_RANK: Record<AdminRole, number> = {
  staff: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
};

function hasRequiredRole(rule: PermissionRule, ctx: AdminPermissionContext): boolean {
  if (!rule.requiredRole) return true;
  if (rule.requiredRole === "super_admin") return ctx.isSuperAdmin;

  const required = ROLE_RANK[rule.requiredRole];
  const highest = ctx.roles.reduce((max, role) => {
    const rank = ROLE_RANK[role as AdminRole];
    return rank && rank > max ? rank : max;
  }, 0);
  return highest >= required;
}

/** Core gate: decide whether a permission rule is satisfied by the context. */
export function canAccess(rule: PermissionRule, ctx: AdminPermissionContext): boolean {
  if (rule.visible === false) return false;
  if (!hasRequiredRole(rule, ctx)) return false;
  // Plan gate is a no-op for admins; kept for parity with the user-facing app.
  if (rule.requiredPlan && !ctx.isAdmin && ctx.plan !== rule.requiredPlan) return false;
  if (rule.featureFlag && ctx.flags && ctx.flags[rule.featureFlag] === false) return false;
  return true;
}

/** Decide whether a single nav node should render for the given admin. */
export function isNodeVisible(node: NavNode, ctx: AdminPermissionContext): boolean {
  return canAccess(node, ctx);
}

/** Filter a nav tree (groups -> items -> children), dropping empty groups. */
export function filterNavigation(groups: NavGroup[], ctx: AdminPermissionContext): NavGroup[] {
  const filterNodes = (nodes: NavNode[]): NavNode[] =>
    nodes
      .filter((node) => isNodeVisible(node, ctx))
      .map((node) => (node.children ? { ...node, children: filterNodes(node.children) } : node));

  return groups
    .map((group) => ({ ...group, items: filterNodes(group.items) }))
    .filter((group) => group.items.length > 0);
}
