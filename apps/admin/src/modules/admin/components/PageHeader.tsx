import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

/**
 * Standard admin page header.
 *
 * Replaces the per-page hand-rolled "icon chip + title + description + actions"
 * blocks duplicated across AdminEbayApp, AdminExtensionControl, AdminModulePage,
 * and most standalone admin pages. Keeps spacing and typography consistent and
 * theme-token based (no hardcoded slate/blue values).
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
