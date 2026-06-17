import { useMemo } from "react";
import { Tags } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/core/ui/StatusBadge";
import { EntityListPage } from "@/core/entity/EntityListPage";
import { type EntityModule } from "@/core/entity/types";
import { usePlansList } from "@/modules/users/userActions";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  usage_limit: number | null;
  used_count: number;
  is_one_time_per_user: boolean;
  applicable_plans: string[] | null;
  is_active: boolean;
  valid_until: string | null;
  created_at: string;
}

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

/** Coupons CRUD via the engine — uses the new multiselect field for applicable_plans. */
export default function AdminCouponsPage() {
  const { data: plans = [] } = usePlansList();

  const module = useMemo<EntityModule<Coupon>>(
    () => ({
      key: "coupons",
      singular: "Coupon",
      label: "Coupons",
      description: "Discount codes, their limits, and plan applicability.",
      icon: Tags,
      table: "coupons",
      defaultSort: { column: "created_at", ascending: false },
      rowId: (r) => r.id,
      rowTitle: (r) => r.code,
      deletable: true,

      columns: [
        { id: "code", header: "Code", sortable: true, cell: (r) => <span className="font-mono text-sm font-semibold text-slate-900">{r.code}</span> },
        { id: "discount", header: "Discount", cell: (r) => (r.discount_type === "percentage" ? `${r.discount_value}%` : `$${r.discount_value}`) },
        { id: "used_count", header: "Used", cell: (r) => `${r.used_count}${r.usage_limit ? `/${r.usage_limit}` : ""}` },
        { id: "is_active", header: "Status", cell: (r) => <StatusBadge value={r.is_active ? "active" : "inactive"} /> },
        { id: "valid_until", header: "Expires", cell: (r) => (r.valid_until ? format(new Date(r.valid_until), "MMM dd, yyyy") : "Never") },
      ],
      search: (r, q) => r.code.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q),

      fields: [
        { name: "code", label: "Code", type: "text", required: true },
        { name: "description", label: "Description", type: "text" },
        { name: "discount_type", label: "Discount type", type: "select", required: true, options: [
          { value: "percentage", label: "Percentage" },
          { value: "fixed", label: "Fixed amount" },
        ] },
        { name: "discount_value", label: "Discount value", type: "number", required: true },
        { name: "usage_limit", label: "Usage limit (0 = unlimited)", type: "number" },
        { name: "min_order_amount", label: "Min order amount", type: "number" },
        { name: "max_discount_amount", label: "Max discount amount", type: "number" },
        { name: "applicable_plans", label: "Applicable plans (none = all)", type: "multiselect", options: plans.map((p) => ({ value: p.id, label: p.display_name })) },
        { name: "valid_until", label: "Valid until (optional)", type: "datetime" },
        { name: "is_one_time_per_user", label: "One-time per user", type: "switch" },
        { name: "is_active", label: "Active", type: "switch" },
      ],
      toFormValues: (row) => ({
        code: row?.code ?? generateCode(),
        description: row?.description ?? "",
        discount_type: row?.discount_type ?? "percentage",
        discount_value: row?.discount_value ?? 10,
        usage_limit: row?.usage_limit ?? 0,
        min_order_amount: (row as any)?.min_order_amount ?? 0,
        max_discount_amount: (row as any)?.max_discount_amount ?? 0,
        applicable_plans: row?.applicable_plans ?? [],
        valid_until: row?.valid_until ? format(new Date(row.valid_until), "yyyy-MM-dd'T'HH:mm") : "",
        is_one_time_per_user: row?.is_one_time_per_user ?? false,
        is_active: row?.is_active ?? true,
      }),
      toRecord: (v) => ({
        code: String(v.code).toUpperCase(),
        description: v.description || null,
        discount_type: v.discount_type,
        discount_value: Number(v.discount_value) || 0,
        usage_limit: Number(v.usage_limit) || null,
        min_order_amount: Number(v.min_order_amount) || null,
        max_discount_amount: Number(v.max_discount_amount) || null,
        applicable_plans: Array.isArray(v.applicable_plans) && (v.applicable_plans as string[]).length > 0 ? v.applicable_plans : null,
        valid_until: v.valid_until || null,
        is_one_time_per_user: Boolean(v.is_one_time_per_user),
        is_active: Boolean(v.is_active),
      }),
    }),
    [plans],
  );

  return <EntityListPage module={module} />;
}
