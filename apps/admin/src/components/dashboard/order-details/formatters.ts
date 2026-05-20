import { format } from "date-fns";

export function formatMoney(value: number | null | undefined, currency = "USD") {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  // Keep the UI compact: show the currency symbol only (no trailing "USD").
  // If multi-currency support is needed later, we can switch to Intl.NumberFormat.
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  // Try standard date parsing first
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return format(d, "MMM dd, yyyy");
  }

  // If standard parsing fails, try to extract a date pattern (e.g., "Jan 28, 2026" or "January 28")
  // Regex looks for Month followed by Day, optionally followed by a Year.
  const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:,? \d{4})?/i;
  const match = value.match(datePattern);

  if (match) {
    let cleanDate = match[0];
    // Attempt to format the matched part if it's a valid partial date
    const partialD = new Date(cleanDate);
    if (!Number.isNaN(partialD.getTime())) {
      // If we matched a year, keep it, otherwise just show MMM dd
      const hasYear = /\d{4}/.test(cleanDate);
      return format(partialD, hasYear ? "MMM dd, yyyy" : "MMM dd");
    }
    return cleanDate;
  }

  return value;
}

export function normalizeWhatsAppPhone(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function getStatusBadgeVariant(
  status: string | null,
): "default" | "secondary" | "destructive" | "outline" {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "shipped") return "default";
  if (s === "cancelled" || s === "refunded") return "destructive";
  if (s === "pending" || s === "processing") return "secondary";
  return "outline";
}
