import { Badge } from "@repo/ui/components/ui/badge";
import { cn } from "@repo/ui/lib/utils";

const styles: Record<string, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  reconnect: "border-orange-200 bg-orange-50 text-orange-700",
  pending: "border-blue-200 bg-blue-50 text-blue-700",
  progress: "border-blue-200 bg-blue-50 text-blue-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  error: "border-red-200 bg-red-50 text-red-700",
  critical: "border-red-200 bg-red-50 text-red-700",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const key = value.toLowerCase().replace(/\s+/g, "-");
  const normalized = key.includes("reconnect") ? "reconnect" : key.includes("progress") ? "progress" : key;

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        styles[normalized] ?? "border-slate-200 bg-slate-50 text-slate-700",
        className,
      )}
    >
      {value}
    </Badge>
  );
}
