import { Fragment } from "react";
import { Check, X, Minus } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { type Plan, type PlanFeature } from "@repo/api-client/hooks/usePlans";

interface Props {
  plans: Plan[];
}

const GROUP_ORDER = [
  "Listing & Automation",
  "AI Tools",
  "Product Research",
  "Supplier Support",
  "Marketplace Support",
  "Team & Workspace",
  "Support",
  "Security",
];

function CellValue({ feature }: { feature: PlanFeature | undefined }) {
  if (!feature) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/30" />;

  const val = feature.display_value;
  if (val === "✓" || (!val && feature.included)) {
    return <Check className="mx-auto h-4 w-4 text-success" />;
  }
  if (val === "✗" || (!val && !feature.included)) {
    return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  }
  return (
    <span className={cn("text-sm font-medium", feature.included ? "text-foreground" : "text-muted-foreground/60")}>
      {val}
    </span>
  );
}

export default function ComparisonTable({ plans }: Props) {
  if (!plans.length) return null;

  // Collect all unique (group_name → [title]) from every plan's features
  const groupMap = new Map<string, Map<string, number>>();
  for (const plan of plans) {
    for (const f of plan.plan_features) {
      if (!groupMap.has(f.group_name)) groupMap.set(f.group_name, new Map());
      const g = groupMap.get(f.group_name)!;
      if (!g.has(f.title)) g.set(f.title, f.sort_order);
    }
  }

  const knownGroups = GROUP_ORDER.filter(g => groupMap.has(g));
  const otherGroups = [...groupMap.keys()].filter(g => !GROUP_ORDER.includes(g));
  const allGroups = [...knownGroups, ...otherGroups];

  const groups = allGroups.map(name => {
    const titleMap = groupMap.get(name)!;
    const titles = [...titleMap.entries()]
      .sort(([, a], [, b]) => a - b)
      .map(([t]) => t);
    return { name, titles };
  });

  const getFeature = (plan: Plan, title: string): PlanFeature | undefined =>
    plan.plan_features.find(f => f.title === title);

  return (
    <div className="mt-20 overflow-x-auto">
      <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground">
        Compare all features
      </h2>
      <div className="mx-auto max-w-5xl">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="w-[35%] pb-4 text-left text-xs font-medium text-muted-foreground" />
              {plans.map(plan => (
                <th
                  key={plan.id}
                  className={cn(
                    "pb-4 text-center text-sm font-semibold",
                    plan.is_recommended ? "text-primary" : "text-foreground",
                  )}
                >
                  <div>{plan.display_name || plan.name}</div>
                  {plan.badge_text && (
                    <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {plan.badge_text}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <Fragment key={group.name}>
                <tr>
                  <td
                    colSpan={plans.length + 1}
                    className="border-t border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.name}
                  </td>
                </tr>
                {group.titles.map(title => (
                  <tr key={`${group.name}-${title}`} className="hover:bg-muted/20">
                    <td className="border-b border-border py-3 pl-3 pr-4 font-medium text-foreground">
                      {title}
                    </td>
                    {plans.map(plan => (
                      <td
                        key={plan.id}
                        className={cn(
                          "border-b border-border py-3 text-center",
                          plan.is_recommended && "bg-primary/[0.03]",
                        )}
                      >
                        <CellValue feature={getFeature(plan, title)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
