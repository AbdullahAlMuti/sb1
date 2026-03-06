import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useExtensionStatus } from "@/hooks/useExtensionStatus";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search, Download, ShoppingBag, CalendarIcon, X, ExternalLink, CheckCircle2, AlertCircle, Clock, Plug, PlugZap, MoreVertical, Maximize2, ArrowUpDown, ChevronDown, Truck, MessageSquare, Star, MapPin, Tag, Trash2, Zap } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay, formatDistanceToNow, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { OrderDetailsDrawer } from "@/components/dashboard/OrderDetailsDrawer";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const AmazonIcon = () => null; // Placeholder to be removed later if not used

type PeriodPreset = "all" | "last90days" | "today" | "yesterday" | "thisweek" | "lastweek" | "thismonth" | "lastmonth" | "thisyear" | "lastyear" | "custom" | (string & {});

interface EbayOrder {
  id: string;
  ebay_order_id: string;
  buyer_name: string | null;
  buyer_username: string | null;
  buyer_email: string | null;
  order_date: string | null;
  order_status: string | null;
  total_amount: number | null;
  subtotal: number | null;
  currency: string | null;
  shipping_address: any;
  line_items: any;
  platform: string | null;
  synced_at: string | null;
  created_at: string;
  // New fields
  item_number: string | null;
  item_title: string | null;
  custom_label: string | null;
  quantity: number | null;
  sold_via: string | null;
  discount_info: string | null;
  ship_by_date: string | null;
  date_sold: string | null;
  date_paid: string | null;
  buyer_zip: string | null;
  item_image_url: string | null;
  shipping_cost: number | null;
  earnings: number | null;
  add_fee: number | null;
  sales_record_number: string | number | null;
  amazon_price: number | null;
  delivery_date: string | null;
  deleted_at?: string | null;
  // Join data
  order_enrichments?: {
    supplier_order_number: string | null;
    supplier_cost: number | null;
    supplier_arriving_date: string | null;
    supplier_order_date: string | null;
    tracking: string | null;
  } | null;
}

interface SyncStatus {
  lastSync: Date | null;
  isActive: boolean;
  orderCount: number | null;
}

export default function EbayOrders() {
  const { user, session } = useAuth();
  const extensionStatus = useExtensionStatus();

  const PAGE_SIZE = 100;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [totalOrders, setTotalOrders] = useState(0);
  const [orders, setOrders] = useState<EbayOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    isActive: false,
    orderCount: null,
  });

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(() => `month:${format(new Date(), "yyyy-MM")}`);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // UI-only state: mark an order as "processing" after clicking "Order Now".
  const [processingOrderIds, setProcessingOrderIds] = useState<Set<string>>(new Set());
  const [updatedOrderIds, setUpdatedOrderIds] = useState<Set<string>>(new Set());

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<EbayOrder | null>(null);
  const [serverCounts, setServerCounts] = useState({
    all: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0,
  });

  // Removed Amazon fulfillment states

  // Generate options for the last 12 months
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      options.push({
        value: `month:${format(d, "yyyy-MM")}`,
        label: format(d, "MMMM yyyy"),
      });
    }
    return options;
  }, []);

  // Helper function to get date range based on period preset
  const getDateRangeFromPreset = (preset: PeriodPreset): DateRange | undefined => {
    const now = new Date();
    switch (preset) {
      case "all":
        return undefined;
      case "last90days":
        return { from: startOfDay(subDays(now, 90)), to: endOfDay(now) };
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case "thisweek":
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case "lastweek":
        const prevWeek = subWeeks(now, 1);
        return { from: startOfWeek(prevWeek, { weekStartsOn: 1 }), to: endOfWeek(prevWeek, { weekStartsOn: 1 }) };
      case "thismonth":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "lastmonth":
        const prevMonth = subMonths(now, 1);
        return { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
      case "thisyear":
        return { from: startOfYear(now), to: endOfYear(now) };
      case "lastyear":
        const prevYear = subYears(now, 1);
        return { from: startOfYear(prevYear), to: endOfYear(prevYear) };
      case "custom":
        return dateRange;
      default:
        // Handle month:YYYY-MM format
        if (preset.startsWith("month:")) {
          const [_, dateStr] = preset.split(":");
          const [year, month] = dateStr.split("-").map(Number);
          const date = new Date(year, month - 1, 1);
          if (!isNaN(date.getTime())) {
            return { from: startOfMonth(date), to: endOfMonth(date) };
          }
        }
        return undefined;
    }
  };

  // Update date range when period preset changes
  useEffect(() => {
    if (periodPreset !== "custom") {
      const newRange = getDateRangeFromPreset(periodPreset);
      setDateRange(newRange);
      setCurrentPage(1);
    }
  }, [periodPreset]);

  // Listen for Amazon Fulfillment Completion
  // Removed handleOrderCompletion effect (Amazon Fulfillment)

  // Get display label for period preset
  const getPeriodLabel = (preset: PeriodPreset): string => {
    switch (preset) {
      case "last90days": return "Last 90 days";
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "thisweek": return "This week";
      case "lastweek": return "Last week";
      case "thismonth": return "This month";
      case "lastmonth": return "Last month";
      case "thisyear": return "This year";
      case "lastyear": return "Last year";
      case "custom": return "Custom";
      default:
        if (preset.startsWith("month:")) {
          const [_, dateStr] = preset.split(":");
          const date = new Date(dateStr + "-01");
          if (!isNaN(date.getTime())) {
            return format(date, "MMMM yyyy");
          }
        }
        return "Select period";
    }
  };

  // Open eBay Seller Hub orders page to trigger sync
  const triggerExtensionSync = () => {
    setSyncStatus(prev => ({ ...prev, isActive: true }));
    window.open('https://www.ebay.com/sh/ord', '_blank');
    toast.info("eBay Seller Hub opened", {
      description: "Orders will sync automatically. You'll see updates here in real-time.",
      duration: 5000,
    });

    // Reset sync status after timeout if no realtime update
    setTimeout(() => {
      setSyncStatus(prev => {
        if (prev.isActive) {
          return { ...prev, isActive: false };
        }
        return prev;
      });
    }, 120000); // 2 minute timeout
  };

  const fetchOrders = useCallback(async (silent = false) => {
    // Avoid firing the query before the auth session is fully hydrated.
    // (This can happen briefly during redirects and would result in a 401/RLS error.)
    if (!user?.id || !session?.access_token) return;

    if (!silent) {
      setIsLoading(true);
    } else {
      setIsAutoRefreshing(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke("ebay-orders", {
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



      setOrders((data?.orders as EbayOrder[]) || []);
      setTotalOrders(Number(data?.total || 0));
      setTotalRevenue(Number(data?.totalRevenue || 0));
      if (data?.counts) {
        setServerCounts({
          all: Number(data.counts.all || 0),
          pending: Number(data.counts.pending || 0),
          processing: Number(data.counts.processing || 0),
          shipped: Number(data.counts.shipped || 0),
          completed: Number(data.counts.completed || 0),
          cancelled: Number(data.counts.cancelled || 0),
          refunded: Number(data.counts.refunded || 0),
        });
      }
      setLastRefresh(new Date());
    } catch (error: any) {
      console.error("Error fetching eBay orders:", error);
      if (!silent) {
        const msg =
          typeof error?.message === "string" && error.message.length
            ? error.message
            : "Failed to load eBay orders";
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
      setIsAutoRefreshing(false);
    }
  }, [user?.id, session?.access_token, currentPage, searchQuery, statusFilter, dateRange]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 📡 Realtime Part 1: Global INSERT listener (Lighter load)
  useEffect(() => {
    if (!user?.id) return;

    const channel = (supabase as any)
      .channel('ebay-orders-insert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ebay_orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newOrder = payload.new as EbayOrder;
          if (newOrder.deleted_at) return;

          const matchesSearch = !searchQuery || [
            newOrder.ebay_order_id,
            newOrder.buyer_name,
            newOrder.item_title,
            newOrder.custom_label,
          ].some(f => f?.toLowerCase().includes(searchQuery.toLowerCase()));

          if (matchesSearch) {
            setOrders(prev => {
              if (prev.find(o => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev].slice(0, PAGE_SIZE);
            });
            setTotalOrders(t => t + 1);
            setNewOrderIds(prev => new Set([...prev, newOrder.id]));
            setTimeout(() => {
              setNewOrderIds(prev => {
                const n = new Set(prev);
                n.delete(newOrder.id);
                return n;
              });
            }, 5000);
          }

          setServerCounts(prev => {
            const next = { ...prev, all: prev.all + 1 };
            const s = (newOrder.order_status?.toLowerCase()) as any;
            if (s === 'paid') { if (next.pending !== undefined) next.pending++; }
            else if (s && (next as any)[s] !== undefined) (next as any)[s]++;
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, searchQuery]);

  // 📡 Realtime Part 2: Dynamic UPDATE listener (Targeted logic)
  useEffect(() => {
    if (!user?.id || processingOrderIds.size === 0) return;

    // Create a targeted channel for each processing order to minimize broadcast overhead
    const channels = Array.from(processingOrderIds).map(orderId => {
      const orderDbId = orders.find(o => o.id === orderId || o.ebay_order_id === orderId)?.id;
      if (!orderDbId) return null;

      return (supabase as any)
        .channel(`order-update-${orderDbId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ebay_orders',
            filter: `id=eq.${orderDbId}`,
          },
          (payload: any) => {
            const updatedOrder = payload.new as EbayOrder;
            const oldOrder = payload.old as EbayOrder;

            // Visual feedback
            setUpdatedOrderIds(prev => new Set([...prev, updatedOrder.id]));
            setTimeout(() => {
              setUpdatedOrderIds(prev => {
                const n = new Set(prev);
                n.delete(updatedOrder.id);
                return n;
              });
            }, 3000);

            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

            // Logic to remove from "processing" once we have profit/earnings
            if (updatedOrder.add_fee !== null) {
              setProcessingOrderIds(prev => {
                const next = new Set(prev);
                next.delete(updatedOrder.ebay_order_id);
                next.delete(updatedOrder.id);
                return next;
              });
            }

            // Sync counts if status changed
            if (oldOrder?.order_status && updatedOrder.order_status !== oldOrder.order_status) {
              setServerCounts(prev => {
                const next = { ...prev };
                const oldS = oldOrder.order_status?.toLowerCase() as any;
                const newS = updatedOrder.order_status?.toLowerCase() as any;
                if (oldS === 'paid') { if (next.pending > 0) next.pending--; }
                else if (oldS && (next as any)[oldS] > 0) (next as any)[oldS]--;
                if (newS === 'paid') { if (next.pending !== undefined) next.pending++; }
                else if (newS && (next as any)[newS] !== undefined) (next as any)[newS]++;
                return next;
              });
            }
          }
        )
        .subscribe();
    }).filter(Boolean);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user?.id, processingOrderIds, orders]);

  // Orders are already filtered server-side (search/status/date) for the current page.
  const filteredOrders = orders;

  const latestDate = useMemo(() => {
    if (orders.length === 0) return null;
    const dates = orders
      .map(o => o.order_date)
      .filter(Boolean)
      .map(d => new Date(d!).getTime());
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates)).toDateString();
  }, [orders]);


  const statusTabCounts = serverCounts;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalOrders / PAGE_SIZE)), [totalOrders]);

  const isAllVisibleSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.every((o) => selectedOrderIds.has(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const isSomeVisibleSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.some((o) => selectedOrderIds.has(o.id)) && !isAllVisibleSelected;
  }, [filteredOrders, selectedOrderIds, isAllVisibleSelected]);

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const o of filteredOrders) next.add(o.id);
      } else {
        for (const o of filteredOrders) next.delete(o.id);
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const openDeleteConfirm = (ids: string[]) => {
    setPendingDeleteIds(ids);
    setConfirmDeleteOpen(true);
  };

  const performDelete = async (ids: string[]) => {
    if (!user?.id || !session?.access_token) return;

    // Optimistic UI removal
    setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

    try {
      const { data, error } = await supabase.functions.invoke("ebay-orders", {
        method: "POST",
        body: { op: "delete", ids },
      });
      if (error) throw error;

      const deletedCount = Number(data?.deletedCount || 0);
      toast.success(`Deleted ${deletedCount} order${deletedCount === 1 ? "" : "s"}`);
    } catch (e) {
      console.error("Failed to delete orders", e);
      toast.error("Failed to delete orders");
    } finally {
      fetchOrders(true);
    }
  };

  const handleOrderProcessing = (order: EbayOrder) => {
    // Open eBay order details page directly (works even without extension content script listening)
    const url = `https://www.ebay.com/mesh/ord/details?mode=SH&srn=${order.sales_record_number || ""}&orderid=${order.ebay_order_id}&source=Orders&ru=https%3A%2F%2Fwww.ebay.com%2Fsh%2Ford`;

    // Check if extension is installed to avoid double-opening tabs
    const isExtensionInstalled = (window as any).__SELLERSUIT_EXTENSION_INSTALLED__;

    if (isExtensionInstalled) {
      // Send message to extension to handle it (background script)
      window.postMessage({ type: 'OPEN_BACKGROUND_TAB', url }, '*');
    } else {
      // Fallback: Open locally if extension is not present
      window.open(url, '_blank');
    }

    // UI fallback: mark as processing locally
    setProcessingOrderIds((prev) => new Set([...prev, order.id]));

    // Optimistically update the order in the list to trigger re-render
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: 'processing' } : o));

    toast.success("Opening eBay Order...", {
      description: "Scraper will sync earnings automatically.",
      duration: 3000
    });
  };

  // Removed handleOrderFulfillment (Amazon Fulfillment)

  const getStatusBadge = (order: EbayOrder) => {
    const statusLower = (order.total_amount === 0 || order.total_amount === null)
      ? "cancelled"
      : (order.order_status?.toLowerCase() || "pending");

    if (processingOrderIds.has(order.id) || order.order_status?.toLowerCase() === 'processing') {
      return (
        <Badge variant="outline" className="gap-1.5 border-green-500/25 bg-green-500/10 text-green-600 animate-pulse font-medium">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className={cn(
        "capitalize font-medium shadow-sm",
        statusLower === 'completed' && "border-green-500/25 bg-green-500/10 text-green-600",
        statusLower === 'shipped' && "border-blue-500/25 bg-blue-500/10 text-blue-600",
        statusLower === 'cancelled' && "border-red-500/25 bg-red-500/10 text-red-600",
        statusLower === 'pending' && "border-amber-500/25 bg-amber-500/10 text-amber-600",
      )}>
        {statusLower}
      </Badge>
    );
  };

  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = ["Order ID", "Buyer Name", "Buyer Email", "Order Date", "Status", "Total", "Currency"];
    const rows = filteredOrders.map((order) => [
      order.ebay_order_id,
      order.buyer_name || "",
      order.buyer_email || "",
      order.order_date ? format(new Date(order.order_date), "yyyy-MM-dd") : "",
      order.order_status || "",
      order.total_amount?.toString() || "",
      order.currency || "USD",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ebay-orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Orders exported successfully");
  };

  const stats = useMemo(() => {
    const total = statusTabCounts.all;
    const completed = statusTabCounts.completed + statusTabCounts.shipped;
    const pending = statusTabCounts.pending + statusTabCounts.processing;
    const cancelled = statusTabCounts.cancelled;
    return { total, completed, pending, cancelled };
  }, [statusTabCounts]);

  const statsPct = useMemo(() => {
    const denom = Math.max(1, stats.total);
    return {
      completed: Math.round((stats.completed / denom) * 100),
      pending: Math.round((stats.pending / denom) * 100),
      cancelled: Math.round((stats.cancelled / denom) * 100),
    };
  }, [stats]);

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="px-5 py-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-foreground">Order Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Order</div>
                    <div className="text-3xl font-bold tracking-tight">{stats.total.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Total Revenue</div>
                    <div className="text-3xl font-bold tracking-tight text-green-600">
                      ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-1 rounded-full bg-primary" />
                    <div>
                      <div className="text-[11px] text-muted-foreground">Completed</div>
                      <div className="text-sm font-semibold">{stats.completed}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-1 rounded-full bg-accent" />
                    <div>
                      <div className="text-[11px] text-muted-foreground">Pending</div>
                      <div className="text-sm font-semibold">{stats.pending}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-1 rounded-full bg-destructive" />
                    <div>
                      <div className="text-[11px] text-muted-foreground">Cancelled</div>
                      <div className="text-sm font-semibold">{stats.cancelled}</div>
                    </div>
                  </div>
                </div>

                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(stats.completed / Math.max(1, stats.total)) * 100}%` }}
                    />
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(stats.pending / Math.max(1, stats.total)) * 100}%` }}
                    />
                    <div
                      className="h-full bg-destructive"
                      style={{ width: `${(stats.cancelled / Math.max(1, stats.total)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full flex flex-col">
            <CardHeader className="px-5 py-4 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-0">
              <div className="flex items-center gap-4">
                <div
                  className="h-24 w-24 rounded-full shrink-0"
                  style={{
                    background: `conic-gradient(
                      hsl(var(--primary)) 0 ${statsPct.completed}%,
                      hsl(var(--accent)) ${statsPct.completed}% ${statsPct.completed + statsPct.pending}%,
                      hsl(var(--destructive)) ${statsPct.completed + statsPct.pending}% 100%
                    )`,
                  }}
                  aria-label="Order status distribution"
                />
                <div className="space-y-2 text-sm flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Completed</span>
                    </div>
                    <span className="font-medium">{statsPct.completed}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                      <span className="text-muted-foreground">Pending</span>
                    </div>
                    <span className="font-medium">{statsPct.pending}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">Cancelled</span>
                    </div>
                    <span className="font-medium">{statsPct.cancelled}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Management Bar - Placed under overview */}
      <Card className="border-border">
        <CardContent className="p-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Left: Title with count */}
            <div className="flex items-center gap-2 min-w-fit">
              <h2 className="text-base font-semibold whitespace-nowrap">
                Orders <span className="text-muted-foreground">({totalOrders.toLocaleString()})</span>
              </h2>
            </div>

            {/* Center: Controls */}
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative w-full sm:w-[200px] lg:w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => {
                setCurrentPage(1);
                setStatusFilter(v);
              }}>
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                  <SelectValue>
                    <span className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">
                        {statusFilter === "all" ? `All orders` : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
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

              {/* Period Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-full sm:w-[160px] justify-between text-sm font-normal">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="text-muted-foreground">Period:</span>
                      <span className="font-medium text-foreground">{getPeriodLabel(periodPreset)}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
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
                          "w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors flex items-center justify-between",
                          periodPreset === option.value && "bg-accent"
                        )}
                      >
                        {option.label}
                        {periodPreset === option.value && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
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
                          "w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors flex items-center justify-between",
                          periodPreset === option.value && "bg-accent text-primary font-medium"
                        )}
                      >
                        {option.label}
                        {periodPreset === option.value && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Extension Status Badge - Inline */}
              {!extensionStatus.isInstalled && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-destructive/10 border border-destructive/20 cursor-help">
                        <PlugZap className="h-4 w-4 text-destructive" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">Extension Not Connected</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={triggerExtensionSync}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {syncStatus.lastSync && (
                        <div className="absolute -top-1 -right-1 flex items-center justify-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full" />
                            <Badge
                              variant="default"
                              className="relative h-5 px-1.5 text-[10px] font-medium bg-primary border-background border-2 shadow-sm"
                            >
                              {formatDistanceToNow(syncStatus.lastSync, { addSuffix: false }).replace(' minutes', 'm').replace(' minute', 'm').replace(' hours', 'h').replace(' hour', 'h').replace(' days', 'd').replace(' day', 'd')}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">Sync Now</p>
                      {syncStatus.lastSync && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last sync: {formatDistanceToNow(syncStatus.lastSync, { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={exportToCSV}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Export to CSV</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => fetchOrders(false)}
                      disabled={isLoading}
                    >
                      <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Refresh Orders</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Status Tabs - Now directly below controls */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-4 scrollbar-thin">
            {[
              { value: "all", label: "All", count: statusTabCounts.all },
              { value: "pending", label: "Pending", count: statusTabCounts.pending },
              { value: "processing", label: "Processing", count: statusTabCounts.processing },
              { value: "shipped", label: "Shipped", count: statusTabCounts.shipped },
              { value: "completed", label: "Completed", count: statusTabCounts.completed },
              { value: "cancelled", label: "Cancelled", count: statusTabCounts.cancelled },
              { value: "refunded", label: "Refunded", count: statusTabCounts.refunded },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.label}
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  statusFilter === tab.value ? "bg-primary-foreground/20" : "bg-muted"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                {/* Columns always render (even when there are 0 rows) */}
                <TableHeader className="sticky top-0 z-20 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/70">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[44px] h-10 px-3 text-xs">
                      <Checkbox
                        checked={isAllVisibleSelected ? true : isSomeVisibleSelected ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleSelectAllVisible(Boolean(v))}
                        aria-label="Select all orders on this page"
                      />
                    </TableHead>
                    <TableHead className="min-w-[100px] h-10 px-3 text-xs">Sale No</TableHead>
                    <TableHead className="min-w-[140px] h-10 px-3 text-xs">Order Number</TableHead>
                    <TableHead className="w-[120px] h-10 px-3 text-xs">Date Paid</TableHead>
                    <TableHead className="w-[120px] h-10 px-3 text-xs">Ship By Date</TableHead>
                    <TableHead className="min-w-[180px] h-10 px-3 text-xs">Buyer</TableHead>
                    <TableHead className="w-[90px] h-10 px-3 text-xs">Quantity</TableHead>
                    <TableHead className="min-w-[140px] h-10 px-3 text-xs">SKU</TableHead>
                    <TableHead className="min-w-[220px] h-10 px-3 text-xs">Shipping</TableHead>
                    <TableHead className="w-[120px] h-10 px-3 text-xs">Revenue</TableHead>
                    <TableHead className="w-[110px] h-10 px-3 text-xs">Net Profit</TableHead>
                    <TableHead className="w-[140px] h-10 px-3 text-xs">Order Status</TableHead>
                    <TableHead className="w-[60px] h-10 px-3 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-10" colSpan={10}>
                        <div className="flex flex-col items-center justify-center text-center">
                          <ShoppingBag className="h-10 w-10 text-muted-foreground mb-3" />
                          <div className="text-sm font-medium text-foreground">No eBay orders found</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {orders.length === 0
                              ? 'Sync your eBay orders using the browser extension'
                              : 'No orders match your current filters'}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                      const transaction = typeof order.total_amount === "number" ? order.total_amount : null;
                      const shipping = typeof order.shipping_cost === "number" ? order.shipping_cost : null;


                      return (
                        <TableRow
                          key={order.id}
                          className={cn(
                            "align-top border-b cursor-pointer transition-all duration-500",
                            newOrderIds.has(order.id) && "bg-primary/5",
                            updatedOrderIds.has(order.id) && "bg-green-500/5 ring-1 ring-inset ring-green-500/20 shadow-sm z-10",
                          )}
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailsOpen(true);
                          }}
                        >
                          <TableCell
                            className="px-3 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedOrderIds.has(order.id)}
                              onCheckedChange={(v) => toggleSelectOne(order.id, Boolean(v))}
                              aria-label={`Select order ${order.ebay_order_id}`}
                            />
                          </TableCell>
                          {/* Sale No */}
                          <TableCell className="px-3 py-3 font-mono text-sm">
                            <div className="flex flex-col items-start gap-1">
                              {order.order_date && new Date(order.order_date).toDateString() === latestDate && (
                                <Badge
                                  variant="outline"
                                  className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-4 px-1 whitespace-nowrap font-bold"
                                >
                                  New Order
                                </Badge>
                              )}
                              <span>{order.sales_record_number || '—'}</span>
                            </div>
                          </TableCell>

                          {/* Order Number */}
                          <TableCell className="px-3 py-3 font-mono text-sm max-w-[140px] truncate" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`https://www.ebay.com/mesh/ord/details?mode=SH&srn=${order.sales_record_number || ""}&orderid=${order.ebay_order_id}&source=Orders&ru=https%3A%2F%2Fwww.ebay.com%2Fsh%2Ford`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {order.ebay_order_id || '—'}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>

                          {/* Date Paid */}
                          <TableCell className="px-3 py-3 text-sm">
                            {order.date_paid ? format(new Date(order.date_paid), 'MMM dd, yyyy') : '—'}
                          </TableCell>

                          {/* Ship By Date */}
                          <TableCell className="px-3 py-3 text-sm">
                            {order.ship_by_date ? format(new Date(order.ship_by_date), 'MMM dd, yyyy') : '—'}
                          </TableCell>

                          {/* Buyer */}
                          <TableCell className="px-3 py-3">
                            <div className="text-sm truncate max-w-[160px]">
                              {order.buyer_name || '—'}
                            </div>
                          </TableCell>

                          {/* Quantity */}
                          <TableCell className="px-3 py-3 text-sm">{order.quantity ?? 1}</TableCell>

                          {/* SKU */}
                          <TableCell className="px-3 py-3 text-sm">{order.custom_label || order.item_number || '—'}</TableCell>

                          {/* Shipping (Ship To) */}
                          <TableCell className="px-3 py-3 text-sm">
                            {(() => {
                              const ship = (order.shipping_address || {}) as any;
                              const name = typeof ship?.name === "string" ? ship.name : "";
                              const address1 = typeof ship?.address1 === "string" ? ship.address1 : "";
                              const address2 = typeof ship?.address2 === "string" ? ship.address2 : "";
                              const state = typeof ship?.state === "string" ? ship.state : "";
                              const zip = typeof ship?.postal_code === "string" ? ship.postal_code : "";
                              const country = typeof ship?.country === "string" ? ship.country : "";
                              const phone = typeof ship?.phone === "string" ? ship.phone : "";
                              const hasAny = Boolean(name || address1 || address2 || state || zip || country || phone);

                              if (!hasAny) return <span className="text-muted-foreground">—</span>;

                              const line1 = name || "Ship To";
                              const line2 = [address1, address2].filter(Boolean).join(" ");
                              const line3 = [state, zip, country].filter(Boolean).join(" ");
                              const tooltipLines = [
                                name ? `Ship To Name: ${name}` : null,
                                address1 ? `Ship To Address 1: ${address1}` : null,
                                address2 ? `Ship To Address 2: ${address2}` : null,
                                state ? `Ship To State: ${state}` : null,
                                zip ? `Ship To Zip: ${zip}` : null,
                                country ? `Ship To Country: ${country}` : null,
                                phone ? `Ship To Phone: ${phone}` : null,
                                `Quantity: ${order.quantity ?? 1}`,
                              ].filter(Boolean) as string[];

                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="text-left w-full rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring"
                                      >
                                        <div className="font-medium truncate max-w-[210px]">{line1}</div>
                                        {line2 ? (
                                          <div className="text-xs text-muted-foreground truncate max-w-[210px]">{line2}</div>
                                        ) : null}
                                        {line3 ? (
                                          <div className="text-xs text-muted-foreground truncate max-w-[210px]">{line3}</div>
                                        ) : null}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-sm">
                                      <div className="space-y-1">
                                        {tooltipLines.map((t) => (
                                          <div key={t} className="text-xs">
                                            {t}
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })()}
                          </TableCell>

                          {/* Revenue */}
                          <TableCell className="px-3 py-3 text-sm font-medium">
                            {transaction !== null ? (
                              transaction === 0 ? (
                                <span className="text-red-500 line-through">$0.00</span>
                              ) : (
                                `$${transaction.toFixed(2)}`
                              )
                            ) : '—'}
                          </TableCell>

                          {/* Net Profit */}
                          <TableCell className="px-3 py-3 text-sm">
                            {order.add_fee !== null ? (
                              <div className="flex items-center gap-1.5">
                                <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-bold shadow-sm border border-green-500/20">
                                  ${order.add_fee.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOrderProcessing(order);
                                  }}
                                  title="Check Net Profit (Sync Order)"
                                >
                                  <Zap className="h-4 w-4 fill-current" />
                                </Button>
                              </div>
                            )}
                          </TableCell>



                          {/* Order Status */}
                          <TableCell className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            {getStatusBadge(order)}
                          </TableCell>

                          <TableCell className="px-3 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteConfirm([order.id]);
                              }}
                              aria-label={`Delete order ${order.ebay_order_id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border p-3">
                <div className="text-sm text-muted-foreground">
                  Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
                  <span className="font-medium text-foreground">{totalPages}</span> • Total{" "}
                  <span className="font-medium text-foreground">{totalOrders.toLocaleString()}</span>
                </div>

                <Pagination>
                  <PaginationContent className="justify-end">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((p) => Math.max(1, p - 1));
                        }}
                        className={cn(currentPage <= 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((p) => Math.min(totalPages, p + 1));
                        }}
                        className={cn(currentPage >= totalPages && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {
        selectedOrderIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <Card className="glass-card border-primary/30 shadow-xl">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="text-sm">
                  <span className="font-medium">{selectedOrderIds.size}</span> selected
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openDeleteConfirm(Array.from(selectedOrderIds))}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedOrderIds(new Set())}>
                  Clear
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      }

      {/* Delete confirmation */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete orders?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <span className="font-medium">{pendingDeleteIds.length}</span> order
              {pendingDeleteIds.length === 1 ? "" : "s"}. You can’t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const ids = [...pendingDeleteIds];
                setConfirmDeleteOpen(false);
                setPendingDeleteIds([]);
                performDelete(ids);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <OrderDetailsDrawer
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedOrder(null);
        }}
        order={selectedOrder}
      />
    </div>
  );
}
