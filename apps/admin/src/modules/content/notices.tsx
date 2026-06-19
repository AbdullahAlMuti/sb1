import { Megaphone } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { EntityListPage } from "@/core/entity/EntityListPage";
import { type EntityModule } from "@/core/entity/types";

interface Notice {
  id: string;
  title: string;
  content: string | null;
  type: string;
  priority: number;
  target_audience: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

/**
 * Notices managed entirely through the descriptor — no bespoke fetch, table,
 * form, or dialog code. This is the reference for "a new section is a
 * descriptor, not a page".
 */
export const noticesModule: EntityModule<Notice> = {
  key: "notices",
  singular: "Announcement",
  label: "Notices",
  description: "Platform-wide banners and system announcements shown to users.",
  icon: Megaphone,
  table: "notices",
  defaultSort: { column: "priority", ascending: false },
  pageSize: 20,
  rowId: (r) => r.id,
  rowTitle: (r) => r.title,
  deletable: true,

  columns: [
    { id: "title", header: "Title", sortable: true, cell: (r) => <span className="font-medium text-slate-900">{r.title}</span> },
    { id: "type", header: "Type", cell: (r) => <StatusBadge value={r.type || "info"} /> },
    { id: "priority", header: "Priority", sortable: true, cell: (r) => r.priority },
    { id: "target_audience", header: "Audience", cell: (r) => r.target_audience || "all" },
    { id: "is_active", header: "Status", cell: (r) => <StatusBadge value={r.is_active ? "active" : "inactive"} /> },
    { id: "created_at", header: "Created", sortable: true, cell: (r) => format(new Date(r.created_at), "MMM dd, yyyy") },
  ],

  search: (r, q) => r.title.toLowerCase().includes(q) || (r.content ?? "").toLowerCase().includes(q),

  fields: [
    { name: "title", label: "Title", type: "text", required: true, placeholder: "Announcement title" },
    { name: "content", label: "Content", type: "textarea", required: true, rows: 4, placeholder: "Announcement message" },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "info", label: "Info" },
        { value: "warning", label: "Warning" },
        { value: "error", label: "Error" },
        { value: "success", label: "Success" },
      ],
    },
    { name: "priority", label: "Priority", type: "number" },
    {
      name: "target_audience",
      label: "Audience",
      type: "select",
      options: [
        { value: "all", label: "All Users" },
        { value: "free", label: "Free Users" },
        { value: "paid", label: "Paid Users" },
        { value: "admin", label: "Admins Only" },
      ],
    },
    { name: "starts_at", label: "Start Date (optional)", type: "datetime" },
    { name: "ends_at", label: "End Date (optional)", type: "datetime" },
    { name: "is_active", label: "Published", type: "switch" },
  ],

  toFormValues: (row) => ({
    title: row?.title ?? "",
    content: row?.content ?? "",
    type: row?.type ?? "info",
    priority: row?.priority ?? 0,
    target_audience: row?.target_audience ?? "all",
    starts_at: row?.starts_at ? format(new Date(row.starts_at), "yyyy-MM-dd'T'HH:mm") : "",
    ends_at: row?.ends_at ? format(new Date(row.ends_at), "yyyy-MM-dd'T'HH:mm") : "",
    is_active: row?.is_active ?? true,
  }),

  toRecord: (v) => ({
    title: v.title,
    content: v.content,
    type: v.type,
    priority: Number(v.priority) || 0,
    target_audience: v.target_audience,
    starts_at: v.starts_at || null,
    ends_at: v.ends_at || null,
    is_active: Boolean(v.is_active),
  }),
};

export default function AdminNoticesPage() {
  return <EntityListPage module={noticesModule} />;
}
