import { Bot } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { EntityListPage } from "@/core/entity/EntityListPage";
import { type EntityModule } from "@/core/entity/types";

interface Prompt {
  id: string;
  name: string;
  content: string;
  prompt_type: string;
  is_default: boolean;
  created_at: string;
}

const TYPES = [
  { value: "title", label: "Title Generation" },
  { value: "description", label: "Description Generation" },
  { value: "seo", label: "SEO Optimization" },
];

export const promptsModule: EntityModule<Prompt> = {
  key: "prompts",
  singular: "Prompt",
  label: "Prompts",
  description: "AI prompt templates used for title, description, and SEO generation.",
  icon: Bot,
  table: "prompts",
  defaultSort: { column: "created_at", ascending: false },
  rowId: (r) => r.id,
  rowTitle: (r) => r.name,
  deletable: true,

  columns: [
    { id: "name", header: "Name", sortable: true, cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { id: "prompt_type", header: "Type", cell: (r) => TYPES.find((t) => t.value === r.prompt_type)?.label ?? r.prompt_type },
    { id: "is_default", header: "Default", cell: (r) => (r.is_default ? <StatusBadge value="active" /> : <span className="text-slate-400">—</span>) },
    { id: "created_at", header: "Created", sortable: true, cell: (r) => format(new Date(r.created_at), "MMM dd, yyyy") },
  ],
  search: (r, q) => r.name.toLowerCase().includes(q) || r.content.toLowerCase().includes(q),

  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "prompt_type", label: "Type", type: "select", required: true, options: TYPES },
    { name: "content", label: "Prompt content", type: "textarea", required: true, rows: 6 },
    { name: "is_default", label: "Default for this type", type: "switch" },
  ],
  toFormValues: (row) => ({
    name: row?.name ?? "",
    prompt_type: row?.prompt_type ?? "title",
    content: row?.content ?? "",
    is_default: row?.is_default ?? false,
  }),
  toRecord: (v) => ({
    name: v.name,
    prompt_type: v.prompt_type,
    content: v.content,
    is_default: Boolean(v.is_default),
  }),
};

export default function AdminPromptsPage() {
  return <EntityListPage module={promptsModule} />;
}
