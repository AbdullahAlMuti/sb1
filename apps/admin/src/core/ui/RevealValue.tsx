import { useState } from "react";
import { Eye } from "lucide-react";
import { logAdminAction } from "@/core/data/resource";

interface RevealValueProps {
  /** The sensitive value (email, address, etc.). */
  value: string | null | undefined;
  /** What kind of PII this is — recorded in the audit log. */
  kind: string;
  /** Optional subject (e.g. user id / order id) for the audit entry. */
  subjectId?: string;
}

/**
 * Masks a PII value until the operator explicitly reveals it. Each reveal writes
 * a `sensitive_data_revealed` audit entry, so access to customer PII is itself
 * tracked (least-privilege reads, ADMIN_SCOPE Part D #5).
 */
export function RevealValue({ value, kind, subjectId }: RevealValueProps) {
  const [revealed, setRevealed] = useState(false);

  if (!value) return <span className="text-slate-400">—</span>;
  if (revealed) return <span className="break-all">{value}</span>;

  return (
    <button
      type="button"
      onClick={() => {
        setRevealed(true);
        void logAdminAction({
          action: "sensitive_data_revealed",
          entityType: kind,
          entityId: subjectId ?? "—",
          reason: `Revealed ${kind}`,
        });
      }}
      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-200"
      title={`Reveal ${kind} (logged)`}
    >
      <Eye className="h-3 w-3" /> Reveal
    </button>
  );
}
