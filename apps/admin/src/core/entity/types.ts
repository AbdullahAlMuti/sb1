import { type LucideIcon } from "lucide-react";
import { type Column, type SortState } from "../ui/DataTable";

/** A single field in the generic create/edit form. */
export type FieldDef =
  | { name: string; label: string; type: "text" | "textarea" | "number"; required?: boolean; placeholder?: string; rows?: number }
  | { name: string; label: string; type: "switch"; required?: boolean }
  | { name: string; label: string; type: "datetime"; required?: boolean }
  | { name: string; label: string; type: "select"; required?: boolean; options: { value: string; label: string }[] };

export type FormValues = Record<string, unknown>;

/**
 * Descriptor for a managed entity. Register one of these and the list view,
 * create/edit form, and CRUD wiring are all derived — a new section is a
 * descriptor, not a bespoke page.
 */
export interface EntityModule<T> {
  /** Query-key namespace + identity. */
  key: string;
  /** Singular noun, e.g. "Notice". */
  singular: string;
  /** Plural label for the page header, e.g. "Notices". */
  label: string;
  description?: string;
  icon?: LucideIcon;

  /** Source table. */
  table: string;
  select?: string;
  defaultSort: SortState;
  pageSize?: number;

  /** Columns for the list view. */
  columns: Column<T>[];
  /** Client-side search predicate (used until a server search RPC exists). */
  search?: (row: T, query: string) => boolean;

  /** Form schema for create/edit. Omit to make the entity read-only. */
  fields?: FieldDef[];
  /** Map a row → form values for editing. */
  toFormValues?: (row: T | null) => FormValues;
  /** Map form values → a DB record for insert/update. */
  toRecord?: (values: FormValues) => Record<string, unknown>;

  rowId: (row: T) => string;
  rowTitle?: (row: T) => string;
  /** Allow deleting rows (with confirmation). */
  deletable?: boolean;
}
