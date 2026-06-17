import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { Search } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { DataTable, type Column, type SortState } from "../ui/DataTable";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useAdminMutation } from "../data/mutate";
import { insert, update, remove, logAdminAction } from "../data/resource";
import { EntityFormDialog } from "./EntityFormDialog";
import { useEntityList } from "./useEntity";
import { type EntityModule, type FormValues } from "./types";

/**
 * Generic list page for any EntityModule: header + search + DataTable +
 * create/edit form + confirmed delete, all CRUD audited. Wiring a new managed
 * section is just passing a descriptor here.
 */
export function EntityListPage<T>({ module, hideHeader }: { module: EntityModule<T>; hideHeader?: boolean }) {
  const [sort, setSort] = useState<SortState>(module.defaultSort);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<T | null | undefined>(undefined); // undefined = closed
  const [deleting, setDeleting] = useState<T | null>(null);

  const queryResult = useEntityList(module, { sort, page });
  const total = queryResult.data?.count ?? null;

  // Client-side search overlay until a server search RPC exists for the entity.
  const visibleRows = useMemo(() => {
    const rows = queryResult.data?.rows ?? [];
    if (!query.trim() || !module.search) return rows;
    return rows.filter((r) => module.search!(r, query.trim().toLowerCase()));
  }, [queryResult.data, query, module]);

  const invalidate = [[module.key, "list"]];

  const saveMutation = useAdminMutation<FormValues, void>(
    async (values) => {
      const record = module.toRecord?.(values) ?? values;
      const isEdit = editing != null;
      if (isEdit) {
        const id = module.rowId(editing as T);
        await update(module.table, id, record);
        await logAdminAction({ action: `${module.key}_updated`, entityType: module.key, entityId: id, newValue: record });
      } else {
        const created = await insert<T>(module.table, record);
        await logAdminAction({
          action: `${module.key}_created`,
          entityType: module.key,
          entityId: created ? module.rowId(created) : "new",
          newValue: record,
        });
      }
    },
    { invalidate, successMessage: () => `${module.singular} saved`, onSuccess: () => setEditing(undefined) },
  );

  const deleteMutation = useAdminMutation<{ row: T; reason: string }, void>(
    async ({ row, reason }) => {
      const id = module.rowId(row);
      await remove(module.table, id);
      await logAdminAction({ action: `${module.key}_deleted`, entityType: module.key, entityId: id, reason });
    },
    { invalidate, successMessage: () => `${module.singular} deleted`, onSuccess: () => setDeleting(null) },
  );

  const columns: Column<T>[] = useMemo(() => {
    if (!module.fields && !module.deletable) return module.columns;
    const actionsCol: Column<T> = {
      id: "__actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right w-24",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {module.fields && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(row)} aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {module.deletable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(row)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    };
    return [...module.columns, actionsCol];
  }, [module]);

  const initialValues = useMemo<FormValues>(
    () => module.toFormValues?.(editing ?? null) ?? {},
    [module, editing],
  );

  const createButton = module.fields && (
    <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => setEditing(null)}>
      <Plus className="mr-2 h-4 w-4" />
      New {module.singular}
    </Button>
  );

  return (
    <div className="space-y-5">
      {hideHeader
        ? createButton && <div className="flex justify-end">{createButton}</div>
        : (
          <PageHeader
            title={module.label}
            description={module.description}
            icon={module.icon}
            actions={createButton}
          />
        )}

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="space-y-4 p-4">
          {module.search && (
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={`Search ${module.label.toLowerCase()}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 rounded-xl pl-9"
              />
            </div>
          )}

          <DataTable<T>
            columns={columns}
            rows={visibleRows}
            rowKey={module.rowId}
            isLoading={queryResult.isLoading}
            isError={queryResult.isError}
            onRetry={() => queryResult.refetch()}
            sort={sort}
            onSortChange={(s) => {
              setSort(s);
              setPage(1);
            }}
            page={page}
            pageSize={module.pageSize ?? 20}
            total={total}
            onPageChange={setPage}
            emptyTitle={`No ${module.label.toLowerCase()} yet`}
            emptyAction={
              module.fields && (
                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create one
                </Button>
              )
            }
          />
        </CardContent>
      </Card>

      {module.fields && (
        <EntityFormDialog
          open={editing !== undefined}
          onOpenChange={(o) => !o && setEditing(undefined)}
          title={editing ? `Edit ${module.singular}` : `New ${module.singular}`}
          fields={module.fields}
          initialValues={initialValues}
          submitting={saveMutation.isPending}
          onSubmit={(values) => saveMutation.mutate(values)}
        />
      )}

      {module.deletable && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Delete ${module.singular}`}
          description={
            deleting && module.rowTitle
              ? `Delete "${module.rowTitle(deleting)}"? This cannot be undone.`
              : "This cannot be undone."
          }
          destructive
          reasonRequired
          confirmLabel="Delete"
          onConfirm={(reason) => deleting && deleteMutation.mutateAsync({ row: deleting, reason })}
        />
      )}
    </div>
  );
}
