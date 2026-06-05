import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package as PackageIcon } from "lucide-react";
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  Filter, 
  Plus, 
  RefreshCw,
  ExternalLink,
  Trash2,
  Save,
  Search,
  Activity,
  AlertCircle,
  X,
  CheckSquare,
  Calendar,
  FileDown,
  Clock,
  CalendarDays,
  CalendarIcon,
  Sheet,
  Wrench,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Pause,
  Eye,
  ArrowUpRight,
  BarChart3,
  Layers,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@repo/ui/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { supabase } from "@repo/api-client/supabase/client";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { toast } from "@repo/ui/hooks/use-toast";
import { useRealtimeSync } from "@repo/api-client/hooks/useRealtimeSync";
import { useGoogleSheetsSync } from "@/hooks/useGoogleSheetsSync";
import { useAutoSyncListingsToSheets } from "@/hooks/useAutoSyncListingsToSheets";
import { format, subDays, startOfDay, endOfDay, isAfter, isWithinInterval } from "date-fns";
import { cn } from "@repo/ui/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@repo/ui/components/ui/pagination";
import InventoryStatusBadge from "@/components/listings/InventoryStatusBadge";
import PriceUpdateIndicator from "@/components/listings/PriceUpdateIndicator";
import { ListingImage } from "@/components/listings/ListingImage";
// New Listing selector is now a dedicated page: /dashboard/listings/new

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface Listing {
  id: string;
  created_at: string;
  title: string | null;
  sku: string | null;
  ebay_item_id: string | null;
  ebay_price: number | null;
  amazon_price: number | null;
  amazon_asin: string | null;
  amazon_url: string | null;
  image_url: string | null;
  status: string | null;
  auto_order_enabled: boolean | null;
  sourceMarketplace?: string | null;
  source_marketplace?: string | null;
  // Legacy/backfill fields (older rows may populate these instead)
  asin?: string | null;
  price?: number | null;
  amazon_data?: any;
  ebay_data?: any;
  amazon_stock_quantity?: number | null;
  amazon_stock_status?: string | null;
  price_last_updated?: string | null;
  inventory_last_updated?: string | null;
  sync_error?: string | null;
}

type ListingRowEdits = {
  sku: string;
  ebay_price: string;
  amazon_price: string;
};

const listingEditSchema = z.object({
  sku: z
    .string()
    .trim()
    .max(100, { message: "SKU must be 100 characters or less" })
    .optional()
    .default(""),
  ebay_price: z
    .string()
    .trim()
    .max(32, { message: "eBay price is too long" })
    .optional()
    .default(""),
  amazon_price: z
    .string()
    .trim()
    .max(32, { message: "Amazon price is too long" })
    .optional()
    .default(""),
});

function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) throw new Error("Price must be a number");
  if (n < 0) throw new Error("Price cannot be negative");
  // Keep sanity limits to avoid accidental huge values
  if (n > 1_000_000) throw new Error("Price is too large");
  return Math.round(n * 100) / 100;
}

function safeParseJson(val: unknown) {
  if (!val) return null;
  if (typeof val === 'object') return val as any;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return null;
}

function extractAsinFromAmazonUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return m?.[1]?.toUpperCase() ?? null;
  } catch {
    const m = String(url).match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return m?.[1]?.toUpperCase() ?? null;
  }
}

function normalizeListingRow(row: any): Listing {
  const amazonData = safeParseJson(row?.amazon_data) ?? {};
  const ebayData = safeParseJson(row?.ebay_data) ?? {};

  const title =
    row?.title ??
    ebayData?.title ??
    ebayData?.ebayTitle ??
    amazonData?.title ??
    amazonData?.productTitle ??
    null;

  const sku = row?.sku ?? ebayData?.sku ?? ebayData?.ebaySku ?? null;

  const amazonAsin =
    row?.amazon_asin ??
    row?.asin ??
    amazonData?.asin ??
    amazonData?.amazonAsin ??
    amazonData?.ASIN ??
    null;

  const amazonUrl =
    row?.amazon_url ??
    amazonData?.url ??
    amazonData?.amazonUrl ??
    amazonData?.productURL ??
    amazonData?.productUrl ??
    null;

  const ebayPrice =
    row?.ebay_price ??
    row?.sell_price ??
    ebayData?.price ??
    ebayData?.finalPrice ??
    row?.price ??
    null;

  const amazonPrice =
    row?.amazon_price ??
    row?.source_price ??
    amazonData?.price ??
    amazonData?.amazonPrice ??
    null;

  // Extract image URL from amazon_data or ebay_data
  let imageUrl =
    amazonData?.image ??
    amazonData?.imageUrl ??
    amazonData?.mainImage ??
    amazonData?.productImage ??
    amazonData?.images?.[0] ??
    ebayData?.image ??
    ebayData?.imageUrl ??
    ebayData?.galleryURL ??
    null;

  // Determine source marketplace
  let sourceMarketplace: string | null = null;
  const rawSource = row?.sourceMarketplace ?? row?.source_marketplace ?? row?.supplierMarketplace ?? row?.supplier_marketplace ?? null;
  if (rawSource) {
    const s = String(rawSource).toLowerCase();
    if (s.includes('walmart') || s === 'wal' || s === 'wmt') {
      sourceMarketplace = 'walmart';
    } else if (s.includes('amazon') || s === 'amz') {
      sourceMarketplace = 'amazon';
    }
  }

  // Fallback parsing of URL domain
  if (!sourceMarketplace && amazonUrl) {
    const urlLower = amazonUrl.toLowerCase();
    if (urlLower.includes('walmart.')) {
      sourceMarketplace = 'walmart';
    } else if (urlLower.includes('amazon.')) {
      sourceMarketplace = 'amazon';
    }
  }

  // Note: fallback rendering is handled by <ListingImage /> (multi-URL fallback).

  return {
    ...row,
    title,
    sku,
    amazon_asin: amazonAsin,
    amazon_url: amazonUrl,
    image_url: imageUrl,
    ebay_price: typeof ebayPrice === 'number' ? ebayPrice : (ebayPrice ? Number(ebayPrice) : null),
    amazon_price: typeof amazonPrice === 'number' ? amazonPrice : (amazonPrice ? Number(amazonPrice) : null),
    source_marketplace: sourceMarketplace,
    sourceMarketplace: sourceMarketplace,
  } as Listing;
}

interface ListingStats {
  totalSourcingCost: number;
  totalInventoryValue: number;
  netProfitForecast: number;
}

interface TimeBasedStats {
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
  total: number;
}

// Summary Card Component
function SummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  variant = 'default' 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
}) {
  const variantStyles = {
    default: 'from-muted/50 to-muted/30 border-border/50',
    success: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30',
    warning: 'from-amber-500/10 to-amber-500/5 border-amber-500/30',
    error: 'from-destructive/10 to-destructive/5 border-destructive/30',
    primary: 'from-primary/10 to-primary/5 border-primary/30',
  };

  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-500/20 text-emerald-500',
    warning: 'bg-amber-500/20 text-amber-500',
    error: 'bg-destructive/20 text-destructive',
    primary: 'bg-primary/20 text-primary',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-all hover:shadow-md",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trendLabel && (
            <p className="text-[11px] text-muted-foreground">{trendLabel}</p>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5", iconStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn(
          "absolute bottom-2 right-2 flex items-center gap-0.5 text-[10px] font-medium",
          trend >= 0 ? "text-emerald-500" : "text-destructive"
        )}>
          <ArrowUpRight className={cn("h-3 w-3", trend < 0 && "rotate-180")} />
          {Math.abs(trend)}%
        </div>
      )}
    </motion.div>
  );
}

export default function Listings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { syncListings, isSyncing: isSyncingSheets, getSettings } = useGoogleSheetsSync();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [rowEdits, setRowEdits] = useState<Record<string, ListingRowEdits>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<ListingStats>({
    totalSourcingCost: 0,
    totalInventoryValue: 0,
    netProfitForecast: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewListingDialog, setShowNewListingDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const userCredits = profile?.credits || 0;
  const sheetsConnected = !!getSettings()?.google_sheets_url;
  const autoSheetsListingsEnabled = !!getSettings()?.google_sheets_url && !!getSettings()?.auto_sync_listings;

  const {
    enqueue: enqueueAutoSheetsSync,
    lastAutoSyncAt,
    lastAutoSyncError,
  } = useAutoSyncListingsToSheets({
    enabled: autoSheetsListingsEnabled,
  });

  const handleSyncToSheets = async () => {
    if (listings.length === 0) {
      toast({ title: "No listings", description: "No listings to sync", variant: "destructive" });
      return;
    }
    await syncListings(listings as unknown as Record<string, unknown>[]);
  };

  // If user chose "Create inside app" from the dedicated new listing page
  useEffect(() => {
    const state = location.state as any;
    if (state?.openManualCreate) {
      setShowNewListingDialog(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  // Calculate time-based stats
  const timeBasedStats = useMemo<TimeBasedStats>(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const last7DaysStart = startOfDay(subDays(now, 7));
    const last30DaysStart = startOfDay(subDays(now, 30));

    return {
      today: listings.filter(l => {
        const createdAt = new Date(l.created_at);
        return isAfter(createdAt, todayStart);
      }).length,
      yesterday: listings.filter(l => {
        const createdAt = new Date(l.created_at);
        return isWithinInterval(createdAt, { start: yesterdayStart, end: todayStart });
      }).length,
      last7Days: listings.filter(l => {
        const createdAt = new Date(l.created_at);
        return isAfter(createdAt, last7DaysStart);
      }).length,
      last30Days: listings.filter(l => {
        const createdAt = new Date(l.created_at);
        return isAfter(createdAt, last30DaysStart);
      }).length,
      total: listings.length,
    };
  }, [listings]);

  // Calculate status-based stats
  const statusStats = useMemo(() => {
    const active = listings.filter(l => l.status === 'active').length;
    const paused = listings.filter(l => l.status === 'paused').length;
    const outOfStock = listings.filter(l => l.status === 'out_of_stock').length;
    const withErrors = listings.filter(l => l.sync_error).length;
    const synced = listings.filter(l => !l.sync_error && l.status === 'active').length;
    
    return { active, paused, outOfStock, withErrors, synced };
  }, [listings]);

  // New listing form state
  const [newListing, setNewListing] = useState({
    title: "",
    sku: "",
    amazon_asin: "",
    amazon_url: "",
    amazon_price: "",
    ebay_price: "",
    ebay_item_id: "",
  });

  const fetchListings = async (showLog = false) => {
    if (!user) {
      if (import.meta.env.DEV) console.log("[Listings] No user, skipping fetch");
      return;
    }
    
    try {
      if (import.meta.env.DEV) console.log("[Listings] Fetching listings for user:", user.id);
      
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Listings] Query error:", error);
        throw error;
      }

      const listingsData = data || [];
      if (import.meta.env.DEV) console.log("[Listings] Fetched", listingsData.length, "listings");
      
      if (showLog && listingsData.length > 0) {
        if (import.meta.env.DEV) console.log("[Listings] Latest listing:", listingsData[0]);
      }
      
      const normalized = listingsData.map(normalizeListingRow);
      setListings(normalized);
      setFilteredListings(normalized);

      // Initialize edit buffers (preserve any already-typed values)
      // Note: prices are now read-only, but we keep the type for compatibility
      setRowEdits((prev) => {
        const next = { ...prev };
        for (const l of normalized) {
          if (!next[l.id]) {
            next[l.id] = {
              sku: l.sku ?? "",
              ebay_price: l.ebay_price == null ? "" : l.ebay_price.toFixed(2),
              amazon_price: l.amazon_price == null ? "" : l.amazon_price.toFixed(2),
            };
          }
        }
        return next;
      });

      // Calculate stats
      const totalSourcingCost = normalized.reduce((sum, listing) => sum + (listing.amazon_price || 0), 0);
      const totalInventoryValue = normalized.reduce((sum, listing) => sum + (listing.ebay_price || 0), 0);
      const netProfitForecast = totalInventoryValue - totalSourcingCost;

      setStats({ totalSourcingCost, totalInventoryValue, netProfitForecast });
    } catch (error) {
      console.error("[Listings] Error fetching listings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch listings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getEditForListing = (listing: Listing): ListingRowEdits => {
    return (
      rowEdits[listing.id] ?? {
        sku: listing.sku ?? "",
        ebay_price: listing.ebay_price == null ? "" : listing.ebay_price.toFixed(2),
        amazon_price: listing.amazon_price == null ? "" : listing.amazon_price.toFixed(2),
      }
    );
  };

  const isListingDirty = (listing: Listing): boolean => {
    const edit = getEditForListing(listing);
    const skuNow = (listing.sku ?? "").trim();
    const skuEdit = edit.sku.trim();

    const ebayNow = listing.ebay_price ?? null;
    const amazonNow = listing.amazon_price ?? null;

    const ebayEdit = edit.ebay_price.trim() ? Number(edit.ebay_price) : null;
    const amazonEdit = edit.amazon_price.trim() ? Number(edit.amazon_price) : null;

    const sameSku = skuNow === skuEdit;
    const sameEbay =
      (ebayNow === null && (ebayEdit === null || Number.isNaN(ebayEdit))) ||
      (ebayNow !== null && !Number.isNaN(ebayEdit) && Math.abs(ebayNow - (ebayEdit ?? 0)) < 0.0001);
    const sameAmazon =
      (amazonNow === null && (amazonEdit === null || Number.isNaN(amazonEdit))) ||
      (amazonNow !== null && !Number.isNaN(amazonEdit) && Math.abs(amazonNow - (amazonEdit ?? 0)) < 0.0001);

    return !(sameSku && sameEbay && sameAmazon);
  };

  const updateRowEdit = (listingId: string, patch: Partial<ListingRowEdits>) => {
    setRowEdits((prev) => ({
      ...prev,
      [listingId]: {
        ...(prev[listingId] ?? { sku: "", ebay_price: "", amazon_price: "" }),
        ...patch,
      },
    }));
  };

  const handleSaveListingEdits = async (listing: Listing) => {
    if (!user) return;
    const edit = getEditForListing(listing);

    try {
      setSavingById((p) => ({ ...p, [listing.id]: true }));

      const parsed = listingEditSchema.parse(edit);
      const sku = parsed.sku.trim() || null;
      const ebayPrice = parsePriceInput(parsed.ebay_price);
      const amazonPrice = parsePriceInput(parsed.amazon_price);

      const { data, error } = await supabase
        .from("listings")
        .update({
          sku,
          ebay_price: ebayPrice,
          amazon_price: amazonPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listing.id)
        .eq("user_id", user.id)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error("Listing not found (or you don't have access)");
      }

      const normalized = normalizeListingRow(data);
      setListings((prev) => prev.map((l) => (l.id === listing.id ? normalized : l)));
      setFilteredListings((prev) => prev.map((l) => (l.id === listing.id ? normalized : l)));

      // Ensure edit buffer matches saved values
      setRowEdits((prev) => ({
        ...prev,
        [listing.id]: {
          sku: normalized.sku ?? "",
          ebay_price: normalized.ebay_price == null ? "" : normalized.ebay_price.toFixed(2),
          amazon_price: normalized.amazon_price == null ? "" : normalized.amazon_price.toFixed(2),
        },
      }));

      toast({ title: "Saved", description: "Listing updated." });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save listing";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setSavingById((p) => {
        const next = { ...p };
        delete next[listing.id];
        return next;
      });
    }
  };

  // Fetch on mount and when user changes
  useEffect(() => {
    if (user) {
      if (import.meta.env.DEV) console.log("[Listings] User available, fetching listings...");
      fetchListings(true);
    }
  }, [user]);
  
  // Poll for new listings every 30 seconds as fallback for realtime
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      if (import.meta.env.DEV) console.log("[Listings] Polling for updates...");
      fetchListings();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Real-time sync for listings
  useRealtimeSync(
    user ? [
      {
        table: 'listings',
        event: '*',
        filter: `user_id=eq.${user.id}`,
        callback: (payload) => {
          if (import.meta.env.DEV) console.log('[Realtime] Listing changed:', payload.eventType, payload);
          // Immediate refresh on any change
          fetchListings(true);

          // Background Google Sheets auto-sync (additive; does not affect core listing logic)
          enqueueAutoSheetsSync(payload as any);

          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Listing Synced",
              description: `"${(payload.new as any)?.title?.substring(0, 30) || 'New listing'}..." added`,
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Listing Updated",
              description: "A listing was updated",
            });
          }
        },
      },
    ] : [],
    [user?.id]
  );

  // Filter listings when search, status filter, or date range changes
  useEffect(() => {
    let filtered = listings;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title?.toLowerCase().includes(query) ||
        listing.sku?.toLowerCase().includes(query) ||
        listing.amazon_asin?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(listing => listing.status === statusFilter);
    }

    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(listing => {
        const createdAt = new Date(listing.created_at);
        
        if (dateRange.from && dateRange.to) {
          return isWithinInterval(createdAt, { 
            start: startOfDay(dateRange.from), 
            end: endOfDay(dateRange.to) 
          });
        } else if (dateRange.from) {
          return isAfter(createdAt, startOfDay(dateRange.from)) || 
                 createdAt.toDateString() === dateRange.from.toDateString();
        } else if (dateRange.to) {
          const endDate = endOfDay(dateRange.to);
          return createdAt <= endDate;
        }
        return true;
      });
    }

    setFilteredListings(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, statusFilter, listings, dateRange]);

  // Paginated listings
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (import.meta.env.DEV) console.log("[Listings] Manual refresh triggered");
    await fetchListings(true);
    toast({
      title: "Refreshed",
      description: `Loaded ${listings.length} listings`,
    });
  };

  const handleSyncInventory = async (listingId?: string) => {
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('amazon-inventory-sync', {
        body: { action: listingId ? 'sync' : 'sync-all', listingId },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sync Complete",
          description: `Updated ${data.results?.length || 0} listings from Amazon`,
        });
        fetchListings();
      } else {
        setSyncError(data.error);
        toast({
          title: "Sync Failed",
          description: data.error || "Failed to sync with Amazon",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error syncing inventory:', error);
      toast({
        title: "Error",
        description: "Failed to sync inventory",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateListing = async () => {
    if (!user) return;

    // Check credits first
    if (userCredits < 1) {
      toast({
        title: "Insufficient Credits",
        description: "You need more credits to create a listing. Please recharge your credits.",
        variant: "destructive",
      });
      return;
    }

    if (!newListing.title || !newListing.amazon_asin) {
      toast({
        title: "Error",
        description: "Please fill in the required fields",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const { error } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          title: newListing.title,
          sku: newListing.sku || null,
          amazon_asin: newListing.amazon_asin,
          amazon_url: newListing.amazon_url || null,
          amazon_price: newListing.amazon_price ? parseFloat(newListing.amazon_price) : null,
          ebay_price: newListing.ebay_price ? parseFloat(newListing.ebay_price) : null,
          ebay_item_id: newListing.ebay_item_id || null,
          status: "active",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Listing created successfully",
      });

      setNewListing({
        title: "",
        sku: "",
        amazon_asin: "",
        amazon_url: "",
        amazon_price: "",
        ebay_price: "",
        ebay_item_id: "",
      });
      setShowNewListingDialog(false);
      fetchListings();
    } catch (error) {
      console.error("Error creating listing:", error);
      toast({
        title: "Error",
        description: "Failed to create listing",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Listing has been removed",
      });

      fetchListings();
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast({
        title: "Error",
        description: "Failed to delete listing",
        variant: "destructive",
      });
    }
  };

  const deriveBackfillUpdate = (listing: Listing) => {
    const amazonData = safeParseJson(listing.amazon_data) ?? {};
    const ebayData = safeParseJson(listing.ebay_data) ?? {};

    const nextTitle =
      listing.title ??
      (ebayData as any)?.title ??
      (ebayData as any)?.ebayTitle ??
      (amazonData as any)?.title ??
      (amazonData as any)?.productTitle ??
      null;

    const nextSku =
      listing.sku ??
      (ebayData as any)?.sku ??
      (ebayData as any)?.ebaySku ??
      null;

    const nextAmazonUrl =
      listing.amazon_url ??
      (amazonData as any)?.url ??
      (amazonData as any)?.amazonUrl ??
      (amazonData as any)?.productURL ??
      (amazonData as any)?.productUrl ??
      null;

    const nextAmazonAsin =
      listing.amazon_asin ??
      listing.asin ??
      (amazonData as any)?.asin ??
      (amazonData as any)?.amazonAsin ??
      (amazonData as any)?.ASIN ??
      extractAsinFromAmazonUrl(nextAmazonUrl) ??
      null;

    const nextEbayItemId =
      listing.ebay_item_id ??
      (ebayData as any)?.ebayItemId ??
      (ebayData as any)?.itemId ??
      null;

    const nextEbayPriceRaw =
      listing.ebay_price ??
      (ebayData as any)?.price ??
      (ebayData as any)?.finalPrice ??
      null;

    const nextAmazonPriceRaw =
      listing.amazon_price ??
      (amazonData as any)?.price ??
      (amazonData as any)?.amazonPrice ??
      null;

    const nextEbayPrice =
      typeof nextEbayPriceRaw === 'number' ? nextEbayPriceRaw : (nextEbayPriceRaw ? Number(nextEbayPriceRaw) : null);
    const nextAmazonPrice =
      typeof nextAmazonPriceRaw === 'number' ? nextAmazonPriceRaw : (nextAmazonPriceRaw ? Number(nextAmazonPriceRaw) : null);

    return {
      title: nextTitle,
      sku: nextSku,
      amazon_asin: nextAmazonAsin,
      amazon_url: nextAmazonUrl,
      ebay_item_id: nextEbayItemId,
      ebay_price: nextEbayPrice,
      amazon_price: nextAmazonPrice,
    };
  };

  const handleRepairListing = async (listing: Listing) => {
    try {
      const update = deriveBackfillUpdate(listing);

      // If there's nothing to backfill, don't write.
      const hasAny = Object.values(update).some((v) => v !== null && v !== undefined && v !== '');
      if (!hasAny) {
        toast({
          title: 'Nothing to repair',
          description: 'No backfill data found on this listing.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('listings')
        .update({
          ...update,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      toast({ title: 'Repaired', description: 'Listing fields were backfilled.' });
      fetchListings(true);
    } catch (e) {
      console.error('[Listings] Repair failed:', e);
      toast({
        title: 'Repair failed',
        description: 'Could not repair this listing.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "active":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-medium">
            <Pause className="h-3 w-3" />
            Paused
          </Badge>
        );
      case "out_of_stock":
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 font-medium">
            <XCircle className="h-3 w-3" />
            Out of Stock
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="gap-1">{status || "Unknown"}</Badge>;
    }
  };

  const calculateProfit = (ebayPrice: number | null, amazonPrice: number | null) => {
    if (!ebayPrice || !amazonPrice) return null;
    return ebayPrice - amazonPrice;
  };

  // Selection handlers
  const toggleSelectListing = (listingId: string) => {
    setSelectedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedListings.size === filteredListings.length) {
      setSelectedListings(new Set());
    } else {
      setSelectedListings(new Set(filteredListings.map(l => l.id)));
    }
  };

  const clearSelection = () => {
    setSelectedListings(new Set());
  };

  // Generate downloadable report
  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    
    try {
      // Build CSV content
      const headers = [
        'Title',
        'SKU',
        'Amazon ASIN',
        'Amazon Price',
        'eBay Price',
        'Profit',
        'Status',
        'Created At',
        'Auto Order',
        'Stock Status',
        'Stock Quantity',
      ];

      const rows = listings.map(listing => [
        listing.title || '',
        listing.sku || '',
        listing.amazon_asin || '',
        listing.amazon_price?.toFixed(2) || '0.00',
        listing.ebay_price?.toFixed(2) || '0.00',
        listing.ebay_price && listing.amazon_price 
          ? (listing.ebay_price - listing.amazon_price).toFixed(2) 
          : '0.00',
        listing.status || 'Unknown',
        format(new Date(listing.created_at), 'yyyy-MM-dd HH:mm'),
        listing.auto_order_enabled ? 'Yes' : 'No',
        listing.amazon_stock_status || 'Unknown',
        listing.amazon_stock_quantity?.toString() || '0',
      ]);

      // Add summary section
      const summaryRows = [
        [],
        ['--- REPORT SUMMARY ---'],
        ['Generated At', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
        ['Total Listings', listings.length.toString()],
        ['Listed Today', timeBasedStats.today.toString()],
        ['Listed Yesterday', timeBasedStats.yesterday.toString()],
        ['Listed Last 7 Days', timeBasedStats.last7Days.toString()],
        ['Listed Last 30 Days', timeBasedStats.last30Days.toString()],
        [],
        ['Total Sourcing Cost', `$${stats.totalSourcingCost.toFixed(2)}`],
        ['Total Inventory Value', `$${stats.totalInventoryValue.toFixed(2)}`],
        ['Net Profit Forecast', `$${stats.netProfitForecast.toFixed(2)}`],
        [],
        ['Active Listings', listings.filter(l => l.status === 'active').length.toString()],
        ['Paused Listings', listings.filter(l => l.status === 'paused').length.toString()],
        ['Out of Stock', listings.filter(l => l.status === 'out_of_stock').length.toString()],
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ...summaryRows.map(row => row.join(',')),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `listings-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Report Generated",
        description: `Downloaded listings report with ${listings.length} items`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Title Panel */}
      <div className="rounded-xl border border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm ring-1 ring-border/40">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground leading-tight">
                Listings
              </h2>
              <span className="hidden sm:inline-block h-5 w-px bg-border" />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 shadow-[0_1px_0_hsl(var(--border))]">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground tabular-nums">{timeBasedStats.total}</span>
                <span className="text-xs text-muted-foreground">total</span>
                {timeBasedStats.today > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  >
                    +{timeBasedStats.today} today
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Manage your Amazon→eBay mappings and monitor sync status.
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              size="sm"
              className="shadow-sm h-9 px-4"
              onClick={() => navigate("/dashboard/listings/new")}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Listing
            </Button>
          </div>
        </div>
      </div>

      {/* Existing manual create dialog (kept intact) */}
      <Dialog open={showNewListingDialog} onOpenChange={setShowNewListingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Listing</DialogTitle>
            <DialogDescription>
              Add a new product mapping between Amazon and eBay. (1 credit required)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Product Title *</Label>
              <Input
                id="title"
                placeholder="Enter product title"
                value={newListing.title}
                onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="e.g., B07121HL8M"
                  value={newListing.sku}
                  onChange={(e) => setNewListing({ ...newListing, sku: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="asin">Amazon ASIN *</Label>
                <Input
                  id="asin"
                  placeholder="e.g., B07121HL8M"
                  value={newListing.amazon_asin}
                  onChange={(e) => setNewListing({ ...newListing, amazon_asin: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amazon_url">Amazon URL</Label>
              <Input
                id="amazon_url"
                placeholder="https://amazon.com/dp/..."
                value={newListing.amazon_url}
                onChange={(e) => setNewListing({ ...newListing, amazon_url: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amazon_price">Amazon Price ($)</Label>
                <Input
                  id="amazon_price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newListing.amazon_price}
                  onChange={(e) => setNewListing({ ...newListing, amazon_price: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ebay_price">eBay Price ($)</Label>
                <Input
                  id="ebay_price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newListing.ebay_price}
                  onChange={(e) => setNewListing({ ...newListing, ebay_price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ebay_item_id">eBay Item ID</Label>
              <Input
                id="ebay_item_id"
                placeholder="e.g., 123456789012"
                value={newListing.ebay_item_id}
                onChange={(e) => setNewListing({ ...newListing, ebay_item_id: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewListingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateListing} disabled={isCreating || userCredits < 1}>
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Listing"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, SKU, or ASIN..."
                className="pl-9 h-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Filters */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px]">
                  <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 justify-start text-left font-normal",
                      (dateRange.from || dateRange.to) && "text-primary border-primary/50"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      "Date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Filter by Date</p>
                      {(dateRange.from || dateRange.to) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearDateRange}
                          className="h-7 px-2 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                      >
                        7 Days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                      >
                        30 Days
                      </Button>
                    </div>
                  </div>
                  <CalendarComponent
                    mode="range"
                    selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <div className="h-6 w-px bg-border hidden sm:block" />

              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isRefreshing && "animate-spin")} />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => handleSyncInventory()}
                disabled={isSyncing}
              >
                <Activity className={cn("h-3.5 w-3.5 mr-2", isSyncing && "animate-pulse")} />
                Sync
              </Button>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleGenerateReport} disabled={isGeneratingReport || listings.length === 0}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Download Report
                  </DropdownMenuItem>
                  {sheetsConnected && (
                    <DropdownMenuItem onClick={handleSyncToSheets} disabled={isSyncingSheets || listings.length === 0}>
                      <Sheet className="h-4 w-4 mr-2" />
                      Sync to Sheets
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Auto-sync status */}
          {autoSheetsListingsEnabled && lastAutoSyncAt && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <Sheet className="h-3.5 w-3.5" />
              <span>Auto-sync: {new Date(lastAutoSyncAt).toLocaleString()}</span>
              {lastAutoSyncError && (
                <Badge variant="destructive" className="text-[10px] h-5">
                  Error
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedListings.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Card className="border-primary/30 bg-card/95 backdrop-blur shadow-xl">
              <CardContent className="py-3 px-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">
                    {selectedListings.size} selected
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listings Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent bg-muted/30">
                <TableHead className="w-8 py-2 px-2">
                  <Checkbox
                    checked={filteredListings.length > 0 && selectedListings.size === filteredListings.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className="h-3.5 w-3.5"
                  />
                </TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-1 w-10">Img</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-2">Product</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-2 w-20">SKU</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-2 w-16 text-right">eBay</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-2 w-16 text-right">AMZ</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-1 w-12 text-center">Inv</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-2 w-14 text-right">Profit</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-2 w-20">Status</TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-1 w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2 text-xs">Loading listings...</p>
                  </TableCell>
                </TableRow>
              ) : filteredListings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-full bg-muted/50">
                        <Package className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-foreground font-medium text-sm">No listings found</p>
                        <p className="text-xs text-muted-foreground">Click "New Listing" to add your first product</p>
                      </div>
                      <Button
                        size="sm"
                        className="mt-1 h-7 text-xs"
                        onClick={() => navigate("/dashboard/listings/new")}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Create Listing
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedListings.map((listing) => {
                  const profit = calculateProfit(listing.ebay_price, listing.amazon_price);
                  const isSelected = selectedListings.has(listing.id);
                  const isBlank = !listing.title && !listing.sku && !listing.amazon_asin;
                  const edit = getEditForListing(listing);
                  const isDirty = isListingDirty(listing);
                  const isSaving = !!savingById[listing.id];
                  return (
                    <TableRow 
                      key={listing.id} 
                      className={cn(
                        "border-border/30 transition-colors h-10",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <TableCell className="py-1.5 px-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectListing(listing.id)}
                          aria-label={`Select ${listing.title}`}
                          className="h-3.5 w-3.5"
                        />
                      </TableCell>
                      <TableCell className="py-1.5 px-1">
                        <ListingImage
                          title={listing.title}
                          imageUrl={listing.image_url}
                          amazonAsin={listing.amazon_asin ?? null}
                        />
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        <div className="space-y-0">
                          <p className="text-xs font-medium text-foreground line-clamp-1 max-w-[180px]">
                            {listing.title || "Untitled"}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="font-mono">{listing.amazon_asin || "N/A"}</span>
                            {listing.amazon_url && (
                              <a 
                                href={listing.amazon_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={cn(
                                  "hover:underline inline-flex items-center font-medium",
                                  (listing.source_marketplace === 'walmart' || listing.sourceMarketplace === 'walmart')
                                    ? "text-blue-500"
                                    : "text-orange-500"
                                )}
                              >
                                {(listing.source_marketplace === 'walmart' || listing.sourceMarketplace === 'walmart') ? "WAL" : "AMZ"}
                              </a>
                            )}
                            {listing.sku && (
                              <a 
                                href={`https://www.ebay.com/sh/lst/active?sku=${encodeURIComponent(listing.sku)}&source=filterbar&action=search`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                eBay
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        <Input
                          value={edit.sku}
                          onChange={(e) => updateRowEdit(listing.id, { sku: e.target.value })}
                          placeholder="SKU"
                          className="h-7 text-[11px] font-mono px-2"
                          aria-label={`SKU for ${listing.title ?? "listing"}`}
                        />
                      </TableCell>
                      <TableCell className="text-right py-1.5 px-2">
                        <span className="h-7 text-[11px] font-mono px-2 text-right block leading-7 tabular-nums text-foreground">
                          {listing.ebay_price != null ? `$${listing.ebay_price.toFixed(2)}` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-1.5 px-2">
                        <span className="h-7 text-[11px] font-mono px-2 text-right block leading-7 tabular-nums text-foreground">
                          {listing.amazon_price != null ? `$${listing.amazon_price.toFixed(2)}` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1">
                        <InventoryStatusBadge 
                          stockStatus={listing.amazon_stock_status ?? null}
                          stockQuantity={listing.amazon_stock_quantity ?? null}
                          lastUpdated={listing.inventory_last_updated ?? null}
                        />
                      </TableCell>
                      <TableCell className="text-right py-1.5 px-2">
                        {profit !== null ? (
                          <span className={cn(
                            "text-xs font-semibold",
                            profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                          )}>
                            ${profit.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 px-2">
                        {getStatusBadge(listing.status)}
                      </TableCell>
                      <TableCell className="text-right py-1.5 px-1">
                        <div className="flex items-center justify-end gap-0.5">
                          {isBlank && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Repair listing fields"
                              onClick={() => handleRepairListing(listing)}
                            >
                              <Wrench className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6",
                              isDirty
                                ? "text-foreground hover:bg-secondary"
                                : "text-muted-foreground hover:bg-secondary"
                            )}
                            title={isDirty ? "Save changes" : "No changes"}
                            disabled={!isDirty || isSaving}
                            onClick={() => handleSaveListingEdits(listing)}
                          >
                            <Save className={cn("h-3 w-3", isSaving && "opacity-50")} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteListing(listing.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && filteredListings.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredListings.length)} of {filteredListings.length} listings
          </p>
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => goToPage(currentPage - 1)}
                    className={cn(
                      "h-7 text-xs px-2 cursor-pointer",
                      currentPage === 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => goToPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="h-7 w-7 text-xs cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis className="h-7 w-7" />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => goToPage(totalPages)}
                        className="h-7 w-7 text-xs cursor-pointer"
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => goToPage(currentPage + 1)}
                    className={cn(
                      "h-7 text-xs px-2 cursor-pointer",
                      currentPage === totalPages && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
