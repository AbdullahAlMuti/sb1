import { Fragment } from "react";
import { Navigate, Route, useLocation } from "react-router-dom";
import { adminRoutes, removedRoutes, NAV_GROUPS, type AdminRouteDef, type NavGroup } from "./routes";

/** Strip a leading `/admin` so the old `/admin/*` mount collapses onto the canonical root tree. */
export function StripAdminPrefix() {
  const location = useLocation();
  const next = location.pathname.replace(/^\/admin/, "") || "/";
  return <Navigate to={`${next}${location.search}${location.hash}`} replace />;
}

/**
 * Render the protected admin route children from the single registry:
 * index, canonical paths, legacy alias redirects, and scope-cut redirects.
 * Returns an array of <Route> for use inside the protected parent <Route>.
 */
export function renderAdminRouteChildren() {
  const nodes = [] as JSX.Element[];

  for (const def of adminRoutes) {
    if (def.index) {
      nodes.push(<Route index key={`${def.path}-index`} element={def.element} />);
    }
    nodes.push(<Route key={def.path} path={def.path} element={def.element} />);

    for (const alias of def.redirectFrom ?? []) {
      nodes.push(
        <Route
          key={`redirect-${alias}`}
          path={alias}
          element={<Navigate to={`/${def.path}`} replace />}
        />,
      );
    }
  }

  // Removed routes (scope cuts) → overview.
  for (const path of removedRoutes) {
    nodes.push(
      <Route key={`removed-${path}`} path={path} element={<Navigate to="/overview" replace />} />,
    );
    nodes.push(
      <Route key={`removed-${path}-splat`} path={`${path}/*`} element={<Navigate to="/overview" replace />} />,
    );
  }

  return <Fragment>{nodes}</Fragment>;
}

export interface NavItem {
  label: string;
  href: string;
  icon: AdminRouteDef["icon"];
  access: "admin" | "super_admin";
}

/** Build sidebar groups from the same registry, preserving NAV_GROUPS order. */
export function buildNavGroups(): { group: NavGroup; items: NavItem[] }[] {
  const byGroup = new Map<NavGroup, NavItem[]>();

  for (const def of adminRoutes) {
    if (!def.label || !def.group) continue;
    const item: NavItem = {
      label: def.label,
      href: `/${def.path.replace(/\/\*$/, "")}`,
      icon: def.icon,
      access: def.access ?? "admin",
    };
    const list = byGroup.get(def.group) ?? [];
    list.push(item);
    byGroup.set(def.group, list);
  }

  return NAV_GROUPS.filter((g) => byGroup.has(g)).map((group) => ({ group, items: byGroup.get(group)! }));
}
