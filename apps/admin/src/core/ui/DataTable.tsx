import { type ReactNode } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { Button } from "@repo/ui/components/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { StateLayout } from "./StateLayout";

export interface Column<T> {
  /** Stable id; also the sort key when `sortable`. */
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface SortState {
  column: string;
  ascending: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;

  // Controlled server-side sort.
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;

  // Controlled server-side pagination.
  page?: number;
  pageSize?: number;
  total?: number | null;
  onPageChange?: (page: number) => void;

  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

/**
 * The single table primitive: server-controlled sort + pagination, built-in
 * loading/error/empty states via StateLayout. Pages pass columns + rows and
 * never re-implement table chrome.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isError,
  onRetry,
  onRowClick,
  sort,
  onSortChange,
  page,
  pageSize,
  total,
  onPageChange,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: DataTableProps<T>) {
  const toggleSort = (col: Column<T>) => {
    if (!col.sortable || !onSortChange) return;
    const ascending = sort?.column === col.id ? !sort.ascending : true;
    onSortChange({ column: col.id, ascending });
  };

  const totalPages =
    page && pageSize && total != null ? Math.max(1, Math.ceil(total / pageSize)) : null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70">
              {columns.map((col) => (
                <TableHead key={col.id} className={col.className}>
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {col.header}
                      <ArrowUpDown
                        className={cn("h-3 w-3", sort?.column === col.id ? "text-primary" : "opacity-50")}
                      />
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* StateLayout handles loading/error/empty; success renders rows. */}
            {isLoading || isError || rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <div className="px-4 py-2">
                    <StateLayout
                      isLoading={isLoading}
                      isError={isError}
                      isEmpty={!isLoading && !isError && rows.length === 0}
                      onRetry={onRetry}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                      emptyAction={emptyAction}
                    >
                      <></>
                    </StateLayout>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer hover:bg-slate-50")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages != null && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-muted-foreground">
          <span>
            {total === 0
              ? "No records"
              : `Showing ${(page! - 1) * pageSize! + 1}–${Math.min(page! * pageSize!, total!)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onPageChange?.(Math.max(1, page! - 1))}
              disabled={page! <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[70px] text-center text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onPageChange?.(Math.min(totalPages, page! + 1))}
              disabled={page! >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
