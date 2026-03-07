import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { format, endOfMonth, endOfYear, startOfMonth, startOfYear, subDays, subMonths, subWeeks, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, CheckCircle2, ChevronDown, Download, ExternalLink, RefreshCw, Search } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

import { formatMoney, formatDate, getStatusBadgeVariant } from "@/components/dashboard/order-details/formatters";

type PeriodPreset =
  | "all"
  | "last90days"
  | "today"
  | "yesterday"
  | "thisweek"
  | "lastweek"
  | "thismonth"
  | "lastmonth"
  | "thisyear"
  | "lastyear"
  | "custom"
  | (string & {});

type EnrichmentRow = {
  id?: string;
  user_id?: string;
  ebay_order_row_id: string;
  supplier_order_number: string | null;
  supplier_cost: number | null;
  supplier_arriving_date: string | null;
  supplier_order_date: string | null;
  sent_message: boolean;
  sent_message_at: string | null;
  tracking: string | null;
  ebay_refund: boolean;
  ebay_refund_amount: number | null;
  amazon_refund: boolean;
  amazon_refund_amount: number | null;
};

type EbayOrderRow = {
  id: string;
  ebay_order_id: string;
  order_date: string | null;
  date_paid: string | null;
  ship_by_date: string | null;
  order_status: string | null;
  total_amount: number | null;
  currency: string | null;
  net_profit?: number | null;
  add_fee: number | null;
  ad_fee: number | null;
  sales_record_number: number | null;
  delivery_date?: string | null;
  buyer_zip?: string | null;
  shipping_address?: any;
  order_enrichments?: EnrichmentRow[];
};

type OrdersResponse = {
  orders: EbayOrderRow[];
  total: number;
  page: number;
  limit: number;
};

const numberOrNull = (raw: string) => {
  const s = raw.trim().replace(/,/g, ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const enrichmentPatchSchema = z
  .object({
    supplier_order_number: z.string().trim().max(100).nullable().optional(),
    supplier_cost: z.number().min(0).nullable().optional(),
    sent_message: z.boolean().optional(),
    sent_message_at: z.string().datetime().nullable().optional(),
    tracking: z.string().trim().max(100).nullable().optional(),
    ebay_refund: z.boolean().optional(),
    ebay_refund_amount: z.number().min(0).nullable().optional(),
    amazon_refund: z.boolean().optional(),
    amazon_refund_amount: z.number().min(0).nullable().optional(),
  })
  .strict();

const getDateRangeFromPreset = (preset: PeriodPreset, customRange: DateRange | undefined): DateRange | undefined => {
  const now = new Date();
  switch (preset) {
    case "all":
      return undefined;
    case "last90days":
      return { from: subDays(now, 90), to: now };
    case "today":
      return { from: now, to: now };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: y, to: y };
    }
    case "thisweek":
      return { from: subDays(now, 6), to: now };
    case "lastweek": {
      const end = subWeeks(now, 1);
      return { from: subDays(end, 6), to: end };
    }
    case "thismonth":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "lastmonth": {
      const d = subMonths(now, 1);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    }
    case "thisyear":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "lastyear": {
      const d = subYears(now, 1);
      return { from: startOfYear(d), to: endOfYear(d) };
    }
    case "custom":
      return customRange;
    default:
      if (preset.startsWith("month:")) {
        const [, dateStr] = preset.split(":");
        const date = new Date(dateStr + "-01");
        if (!Number.isNaN(date.getTime())) {
          return { from: startOfMonth(date), to: endOfMonth(date) };
        }
      }
      return undefined;
  }
};

const getPeriodLabel = (preset: PeriodPreset): string => {
  switch (preset) {
    case "last90days":
      return "Last 90 days";
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "thisweek":
      return "This week";
    case "lastweek":
      return "Last week";
    case "thismonth":
      return "This month";
    case "lastmonth":
      return "Last month";
    case "thisyear":
      return "This year";
    case "lastyear":
      return "Last year";
    case "custom":
      return "Custom";
    default:
      if (preset.startsWith("month:")) {
        const [, dateStr] = preset.split(":");
        const date = new Date(dateStr + "-01");
        if (!Number.isNaN(date.getTime())) return format(date, "MMMM yyyy");
      }
      return "Select period";
  }
};

export default function Orders() {
  const { user, session } = useAuth();

  const tablePlainInputClass =
    "h-7 text-xs bg-transparent border-transparent shadow-none px-0 py-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border focus-visible:px-2 hover:border-border/60";

  const PAGE_SIZE = 100;
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<EbayOrderRow[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(() => `month:${format(new Date(), "yyyy-MM")}`);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  const dateRange = useMemo(() => getDateRangeFromPreset(periodPreset, customRange), [periodPreset, customRange]);

  const [drafts, setDrafts] = useState<Record<string, EnrichmentRow>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const saveSeq = useRef<Record<string, number>>({});

  const monthOptions = useMemo(() => {
    const options = [] as Array<{ value: string; label: string }>;
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      options.push({ value: `month:${format(d, "yyyy-MM")}`, label: format(d, "MMMM yyyy") });
    }
    return options;
  }, []);

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!user?.id || !session?.access_token) return;
      if (!silent) setIsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke("orders-dashboard", {
          method: "POST",
          body: {
            op: "list",
            page: currentPage,
            limit: PAGE_SIZE,
            search: searchQuery || undefined,
            status: statusFilter || "all",
            dateFrom: dateRange?.from ? dateRange.from.toISOString() : undefined,
            dateTo: dateRange?.to ? dateRange.to.toISOString() : undefined,
          },
        });

        if (error) throw error;
        const resp = data as OrdersResponse;
        const nextOrders = (resp?.orders || []) as EbayOrderRow[];
        setOrders(nextOrders);
        setTotalOrders(Number(resp?.total || 0));

        setDrafts((prev) => {
          const next = { ...prev };
          for (const o of nextOrders) {
            const enrichData = (o as any).order_enrichments || (o as any).order_enrichment;
            const e = Array.isArray(enrichData) ? enrichData[0] : enrichData;

            next[o.id] = {
              ebay_order_row_id: o.id,
              supplier_order_number: e?.supplier_order_number ?? null,
              supplier_cost: typeof e?.supplier_cost === "number" ? e?.supplier_cost : e?.supplier_cost ? Number(e.supplier_cost) : (o as any).amazon_price ?? null,
              supplier_arriving_date: e?.supplier_arriving_date ?? o.delivery_date ?? null,
              supplier_order_date: e?.supplier_order_date ?? null,
              sent_message: Boolean(e?.sent_message ?? false),
              sent_message_at: (e?.sent_message_at as any) ?? null,
              tracking: e?.tracking ?? null,
              ebay_refund: Boolean(e?.ebay_refund ?? false),
              ebay_refund_amount: typeof e?.ebay_refund_amount === "number" ? e?.ebay_refund_amount : e?.ebay_refund_amount ? Number(e.ebay_refund_amount) : null,
              amazon_refund: Boolean(e?.amazon_refund ?? false),
              amazon_refund_amount: typeof e?.amazon_refund_amount === "number" ? e?.amazon_refund_amount : e?.amazon_refund_amount ? Number(e.amazon_refund_amount) : null,
            };
          }
          return next;
        });
      } catch (e: any) {
        const msg = typeof e?.message === "string" && e.message.length ? e.message : "Failed to load orders";
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, session?.access_token, currentPage, PAGE_SIZE, searchQuery, statusFilter, dateRange],
  );

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalOrders / PAGE_SIZE)), [totalOrders, PAGE_SIZE]);

  const saveEnrichment = useCallback(
    async (orderId: string, patch: Partial<EnrichmentRow>) => {
      if (!user?.id) return;
      const parse = enrichmentPatchSchema.safeParse(patch);
      if (!parse.success) {
        toast.error("Invalid value");
        return;
      }

      const seq = (saveSeq.current[orderId] || 0) + 1;
      saveSeq.current[orderId] = seq;

      setSavingIds((prev) => new Set(prev).add(orderId));
      try {
        const payload = {
          user_id: user.id,
          ebay_order_row_id: orderId,
          ...parse.data,
        };

        const { error } = await (supabase as any)
          .from("order_enrichments")
          .upsert(payload, { onConflict: "ebay_order_row_id" });

        if (error) throw error;
      } catch (e: any) {
        if (saveSeq.current[orderId] === seq) {
          const msg = typeof e?.message === "string" && e.message.length ? e.message : "Failed to save";
          toast.error(msg);
        }
      } finally {
        if (saveSeq.current[orderId] === seq) {
          setSavingIds((prev) => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
        }
      }
    },
    [user?.id],
  );

  const calc = useCallback((order: EbayOrderRow, e: EnrichmentRow | undefined) => {
    const ebayNetProfit = (order.net_profit ?? order.add_fee) as number | null | undefined;
    const supplierCost = typeof e?.supplier_cost === "number" ? e.supplier_cost : null;
    const profit = ebayNetProfit == null || supplierCost == null ? null : ebayNetProfit - supplierCost;
    const roi = profit == null || supplierCost <= 0 ? null : (profit / supplierCost) * 100;

    return {
      ebayNetProfit: ebayNetProfit ?? null,
      supplierCost,
      profit,
      roi,
    };
  }, []);

  const exportToCSV = () => {
    if (orders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = [
      "Sale No",
      "Date paid",
      "Ship by date",
      "Order number",
      "Net profit",
      "Supplier order number",
      "Supplier cost",
      "ZIP",
      "eBay refund amount",
      "Supplier refund amount",
    ];

    const rows = orders.map((o) => {
      const e = drafts[o.id];
      const { ebayNetProfit } = calc(o, e);
      return [
        o.sales_record_number ?? "",
        o.date_paid ?? "",
        o.ship_by_date ?? "",
        o.ebay_order_id,
        ebayNetProfit == null ? "" : ebayNetProfit.toFixed(2),
        e?.supplier_order_number ?? "",
        (e?.supplier_cost ?? "") as any,
        (o as any).shipping_address?.postal_code || (o as any).buyer_zip || "",
        (e?.ebay_refund_amount ?? "") as any,
        (e?.amazon_refund_amount ?? "") as any,
      ].map((v) => String(v ?? ""));
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Orders</h1>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => fetchOrders(false)} disabled={isLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={exportToCSV}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-2 sm:p-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold whitespace-nowrap">
                Orders <span className="text-muted-foreground">({totalOrders.toLocaleString()})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row items-center gap-2">
              <div className="relative w-full lg:w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-9 h-8 text-xs"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setCurrentPage(1);
                  setStatusFilter(v);
                }}
              >
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue>
                    <span className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">
                        {statusFilter === "all" ? "All orders" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                      </span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-full lg:w-[160px] justify-between text-xs font-normal">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="text-muted-foreground">Period:</span>
                      <span className="font-medium text-foreground truncate">{getPeriodLabel(periodPreset)}</span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-auto shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-1 z-50 bg-popover" align="start">
                  <div className="space-y-0.5 overflow-y-auto max-h-[320px] scrollbar-thin">
                    <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">Quick Range</div>
                    {[
                      { value: "all", label: "All time" },
                      { value: "last90days", label: "Last 90 days" },
                      { value: "today", label: "Today" },
                      { value: "yesterday", label: "Yesterday" },
                      { value: "thisweek", label: "This week" },
                      { value: "lastweek", label: "Last week" },
                      { value: "thisyear", label: "This year" },
                      { value: "lastyear", label: "Last year" },
                      { value: "custom", label: "Custom Range" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setPeriodPreset(option.value as PeriodPreset);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent transition-colors flex items-center justify-between",
                          periodPreset === option.value && "bg-accent",
                        )}
                      >
                        {option.label}
                        {periodPreset === option.value && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}

                    <div className="mt-2 pt-1 border-t border-border px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">Monthly</div>
                    {monthOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setPeriodPreset(option.value as PeriodPreset);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent transition-colors flex items-center justify-between",
                          periodPreset === option.value && "bg-accent text-primary font-medium",
                        )}
                      >
                        {option.label}
                        {periodPreset === option.value && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {periodPreset === "custom" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-full lg:w-[200px] justify-between text-xs font-normal">
                      <span className="flex items-center gap-2 truncate text-foreground">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {customRange?.from ? format(customRange.from, "MMM dd") : "From"}
                          {customRange?.to ? ` – ${format(customRange.to, "MMM dd")}` : ""}
                        </span>
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-auto shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={customRange}
                      onSelect={(range) => {
                        setCustomRange(range);
                        setCurrentPage(1);
                      }}
                      numberOfMonths={2}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="text-sm font-medium text-foreground">No orders found</div>
              <div className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</div>
            </div>
          ) : (
            <>
              {/* Desktop Expert Table */}
              <div className="hidden md:block overflow-x-auto scrollbar-thin">
                <Table className="table-fixed">
                  <TableHeader className="sticky top-0 z-20 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/70">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-8 px-1.5 text-[11px]">Sale No</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">Date paid</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">Ship by</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">Order Number</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">Net Profit</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">Supplier Order #</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">Supplier Cost</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">ZIP</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">Refund</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">eBay Refund</TableHead>
                      <TableHead className="h-8 px-1.5 text-[11px]">Supplier Refund</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {orders.map((order) => {
                      const enrichData = (order as any).order_enrichments || (order as any).order_enrichment;
                      const rawEnrich = Array.isArray(enrichData) ? enrichData[0] : enrichData;
                      const e = drafts[order.id] || rawEnrich;
                      const metrics = calc(order, e);
                      const isSaving = savingIds.has(order.id);
                      const refundActive = Boolean(e?.ebay_refund);

                      return (
                        <TableRow key={order.id} className="align-top border-b group">
                          {/* Sale No */}
                          <TableCell className="px-1.5 py-1.5 text-xs font-medium tabular-nums">
                            {order.sales_record_number ?? "—"}
                          </TableCell>

                          {/* Date paid */}
                          <TableCell className="px-1.5 py-1.5 text-xs">{formatDate(order.date_paid)}</TableCell>

                          {/* Ship by date */}
                          <TableCell className="px-1.5 py-1.5 text-xs">{formatDate(order.ship_by_date)}</TableCell>

                          {/* Order Number */}
                          <TableCell className="px-1.5 py-1.5 font-mono text-xs truncate">
                            <a
                              href={`https://www.ebay.com/mesh/ord/details?mode=SH&orderid=${order.ebay_order_id}&source=Orders&ru=https%3A%2F%2Fwww.ebay.com%2Fsh%2Ford`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {order.ebay_order_id}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>

                          {/* Net Profit */}
                          <TableCell className="px-1.5 py-1.5 text-xs font-medium">
                            {formatMoney((order.net_profit ?? order.add_fee) ?? null, order.currency || "USD")}
                          </TableCell>

                          {/* Supplier Order # — EDITABLE */}
                          <TableCell className="px-1.5 py-1.5">
                            <div className="flex items-center gap-1">
                              <Input
                                value={e?.supplier_order_number ?? ""}
                                placeholder="—"
                                className={tablePlainInputClass}
                                onChange={(ev) => {
                                  const v = ev.target.value;
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                      supplier_order_number: v.trim() ? v : null,
                                    },
                                  }));
                                }}
                                onBlur={() => saveEnrichment(order.id, { supplier_order_number: drafts[order.id]?.supplier_order_number ?? null })}
                              />
                              {e?.supplier_order_number && (
                                <a
                                  href={`https://www.amazon.com/your-orders/search?search=${e.supplier_order_number}&ref_=ppx_hzsearch_sb_dt_b`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {isSaving && <div className="text-[10px] text-muted-foreground mt-0.5">Saving…</div>}
                          </TableCell>

                          {/* Supplier Cost — EDITABLE */}
                          <TableCell className="px-1.5 py-1.5">
                            <Input
                              inputMode="decimal"
                              value={e?.supplier_cost == null ? "" : String(e.supplier_cost)}
                              placeholder="0.00"
                              className={cn(tablePlainInputClass, "w-[80px] tabular-nums")}
                              onChange={(ev) => {
                                const n = numberOrNull(ev.target.value);
                                setDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                    supplier_cost: n,
                                  },
                                }));
                              }}
                              onBlur={() => saveEnrichment(order.id, { supplier_cost: drafts[order.id]?.supplier_cost ?? null })}
                            />
                          </TableCell>

                          {/* ZIP */}
                          <TableCell className="px-1.5 py-1.5 text-xs tabular-nums">
                            {(order as any).shipping_address?.postal_code || (order as any).buyer_zip || "—"}
                          </TableCell>

                          {/* Refund Toggle */}
                          <TableCell className="px-1.5 py-1.5">
                            <Switch
                              checked={refundActive}
                              onCheckedChange={(checked) => {
                                setDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                    ebay_refund: checked,
                                    amazon_refund: checked,
                                    ebay_refund_amount: checked ? (prev[order.id]?.ebay_refund_amount ?? null) : null,
                                    amazon_refund_amount: checked ? (prev[order.id]?.amazon_refund_amount ?? null) : null,
                                  },
                                }));
                                saveEnrichment(order.id, {
                                  ebay_refund: checked,
                                  amazon_refund: checked,
                                  ebay_refund_amount: checked ? (drafts[order.id]?.ebay_refund_amount ?? null) : null,
                                  amazon_refund_amount: checked ? (drafts[order.id]?.amazon_refund_amount ?? null) : null,
                                });
                              }}
                            />
                          </TableCell>

                          {/* eBay Refund — numeric input */}
                          <TableCell className="px-1.5 py-1.5">
                            <Input
                              inputMode="decimal"
                              placeholder="0.00"
                              disabled={!refundActive}
                              className={cn(tablePlainInputClass, "w-[80px] tabular-nums", !refundActive && "opacity-40")}
                              value={e?.ebay_refund_amount == null ? "" : String(e.ebay_refund_amount)}
                              onChange={(ev) => {
                                const n = numberOrNull(ev.target.value);
                                setDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                    ebay_refund_amount: n,
                                  },
                                }));
                              }}
                              onBlur={() => {
                                if (!refundActive) return;
                                saveEnrichment(order.id, { ebay_refund_amount: drafts[order.id]?.ebay_refund_amount ?? null });
                              }}
                            />
                          </TableCell>

                          {/* Supplier Refund — numeric input */}
                          <TableCell className="px-1.5 py-1.5">
                            <Input
                              inputMode="decimal"
                              placeholder="0.00"
                              disabled={!refundActive}
                              className={cn(tablePlainInputClass, "w-[80px] tabular-nums", !refundActive && "opacity-40")}
                              value={e?.amazon_refund_amount == null ? "" : String(e.amazon_refund_amount)}
                              onChange={(ev) => {
                                const n = numberOrNull(ev.target.value);
                                setDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                    amazon_refund_amount: n,
                                  },
                                }));
                              }}
                              onBlur={() => {
                                if (!refundActive) return;
                                saveEnrichment(order.id, { amazon_refund_amount: drafts[order.id]?.amazon_refund_amount ?? null });
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View (Expert Card List) */}
              <div className="md:hidden divide-y divide-border/50">
                {orders.map((order) => {
                  const enrichData = (order as any).order_enrichments || (order as any).order_enrichment;
                  const e = drafts[order.id] || (Array.isArray(enrichData) ? enrichData[0] : enrichData);
                  const metrics = calc(order, e);
                  const isSaving = savingIds.has(order.id);
                  const refundActive = Boolean(e?.ebay_refund);

                  return (
                    <div key={order.id} className="p-4 space-y-3 bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <a
                            href={`https://www.ebay.com/mesh/ord/details?mode=SH&orderid=${order.ebay_order_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm font-bold text-primary flex items-center gap-1.5"
                          >
                            {order.ebay_order_id}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-3">
                            <span>Sale #{order.sales_record_number ?? "—"}</span>
                            <span>{formatDate(order.date_paid)}</span>
                            {((order as any).shipping_address?.postal_code || (order as any).buyer_zip) && <span>ZIP: {(order as any).shipping_address?.postal_code || (order as any).buyer_zip}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-2 border-y border-dashed border-border/80">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Net Profit</p>
                          <p className="text-xs font-semibold">{formatMoney(metrics.ebayNetProfit, order.currency || "USD")}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Supplier Cost</p>
                          <p className="text-xs font-semibold">{formatMoney(metrics.supplierCost, order.currency || "USD")}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Supplier Order #</label>
                            <Input
                              value={e?.supplier_order_number ?? ""}
                              className="h-7 text-[10px] bg-muted/30 border-none shadow-none focus-visible:bg-muted/50 py-0"
                              placeholder="Enter order #"
                              onChange={(ev) => {
                                const v = ev.target.value;
                                setDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                    supplier_order_number: v.trim() ? v : null,
                                  },
                                }));
                              }}
                              onBlur={() => saveEnrichment(order.id, { supplier_order_number: drafts[order.id]?.supplier_order_number ?? null })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Supplier Cost</label>
                            <Input
                              inputMode="decimal"
                              value={e?.supplier_cost == null ? "" : String(e.supplier_cost)}
                              className="h-7 text-[10px] bg-muted/30 border-none shadow-none focus-visible:bg-muted/50 py-0"
                              placeholder="0.00"
                              onChange={(ev) => {
                                const n = numberOrNull(ev.target.value);
                                setDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                    supplier_cost: n,
                                  },
                                }));
                              }}
                              onBlur={() => saveEnrichment(order.id, { supplier_cost: drafts[order.id]?.supplier_cost ?? null })}
                            />
                          </div>
                        </div>

                        {/* Refund section */}
                        <div className="p-2 rounded border border-border/50 bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Refunds</span>
                            <Switch
                              checked={refundActive}
                              onCheckedChange={(checked) => {
                                setDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                    ebay_refund: checked,
                                    amazon_refund: checked,
                                    ebay_refund_amount: checked ? (prev[order.id]?.ebay_refund_amount ?? null) : null,
                                    amazon_refund_amount: checked ? (prev[order.id]?.amazon_refund_amount ?? null) : null,
                                  },
                                }));
                                saveEnrichment(order.id, {
                                  ebay_refund: checked,
                                  amazon_refund: checked,
                                  ebay_refund_amount: checked ? (drafts[order.id]?.ebay_refund_amount ?? null) : null,
                                  amazon_refund_amount: checked ? (drafts[order.id]?.amazon_refund_amount ?? null) : null,
                                });
                              }}
                              className="scale-75 origin-right"
                            />
                          </div>
                          {refundActive && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-0.5">
                                <label className="text-[9px] font-bold text-muted-foreground">eBay Refund</label>
                                <Input
                                  inputMode="decimal"
                                  value={e?.ebay_refund_amount == null ? "" : String(e.ebay_refund_amount)}
                                  placeholder="0.00"
                                  className="h-6 text-[10px] bg-background border-border/50 py-0"
                                  onChange={(ev) => {
                                    const n = numberOrNull(ev.target.value);
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [order.id]: {
                                        ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                        ebay_refund_amount: n,
                                      },
                                    }));
                                  }}
                                  onBlur={() => saveEnrichment(order.id, { ebay_refund_amount: drafts[order.id]?.ebay_refund_amount ?? null })}
                                />
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[9px] font-bold text-muted-foreground">Supplier Refund</label>
                                <Input
                                  inputMode="decimal"
                                  value={e?.amazon_refund_amount == null ? "" : String(e.amazon_refund_amount)}
                                  placeholder="0.00"
                                  className="h-6 text-[10px] bg-background border-border/50 py-0"
                                  onChange={(ev) => {
                                    const n = numberOrNull(ev.target.value);
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [order.id]: {
                                        ...(prev[order.id] || { ebay_order_row_id: order.id } as EnrichmentRow),
                                        amazon_refund_amount: n,
                                      },
                                    }));
                                  }}
                                  onBlur={() => saveEnrichment(order.id, { amazon_refund_amount: drafts[order.id]?.amazon_refund_amount ?? null })}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {isSaving && <div className="text-[9px] text-primary animate-pulse font-medium text-center bg-primary/5 py-1 rounded-full border border-primary/10">Synchronizing...</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="text-[11px] text-muted-foreground font-medium order-2 sm:order-1">
          Showing <span className="text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span> - <span className="text-foreground">{Math.min(currentPage * PAGE_SIZE, totalOrders)}</span> of <span className="text-foreground font-bold">{totalOrders.toLocaleString()}</span> orders
        </div>
        <Pagination className="order-1 sm:order-2 sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={cn("h-8 text-xs cursor-pointer", currentPage <= 1 && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
            <PaginationItem>
              <div className="px-3 text-xs font-bold text-foreground">
                {currentPage} / {totalPages}
              </div>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={cn("h-8 text-xs cursor-pointer", currentPage >= totalPages && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
