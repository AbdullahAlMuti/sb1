import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

/**
 * Consistent empty / no-data / "search to begin" state.
 *
 * Standardizes the ad-hoc "centered icon + message" blocks that several admin
 * pages re-implement (e.g. the per-user feature-override prompt).
 */
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 p-8 text-center",
        className,
      )}
    >
      {Icon && <Icon className="mb-3 h-8 w-8 text-muted-foreground/50" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
