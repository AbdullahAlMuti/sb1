import { type ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Skeleton } from "@repo/ui/components/ui/skeleton";

interface StateLayoutProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  /** Override the loading body (defaults to skeleton rows). */
  loading?: ReactNode;
  /** Empty-state copy + optional CTA. */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  errorMessage?: string;
  children: ReactNode;
}

/**
 * The single wrapper for the four data states every admin view must handle:
 * loading, error, empty, success. Pages never hand-roll spinners or empty copy.
 */
export function StateLayout({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  loading,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  errorMessage = "Something went wrong while loading this data.",
  children,
}: StateLayoutProps) {
  if (isLoading) {
    return (
      <>{loading ?? (
        <div className="space-y-3" role="status" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}</>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="max-w-sm text-sm text-muted-foreground">{errorMessage}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        {emptyDescription && <p className="max-w-sm text-xs text-muted-foreground">{emptyDescription}</p>}
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  return <>{children}</>;
}
