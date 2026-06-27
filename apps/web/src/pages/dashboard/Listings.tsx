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
  ChevronDown,
  ChevronRight,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { ListingsHeader } from "@/components/dashboard/listings/ListingsHeader";
import { ListingsFilters } from "@/components/dashboard/listings/ListingsFilters";
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
import { supabase } from "@repo/api-client/supabase/client";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { toast } from "@repo/ui/hooks/use-toast";
import { useRealtimeSync } from "@repo/api-client/hooks/useRealtimeSync";
import { useGoogleSheetsSync } from "@/hooks/useGoogleSheetsSync";
import { useAutoSyncListingsToSheets } from "@/hooks/useAutoSyncListingsToSheets";
import { format, subDays, startOfDay, endOfDay, isAfter, isWithinInterval } from "date-fns";
import { cn } from "@repo/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useListings, Listing } from "@/hooks/useListings";
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

import { DateRange } from "react-day-picker";
import { ListingsTable, type Variation, type ListingRowEdits } from "@/components/dashboard/listings/ListingsTable";


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

function decodeSku(encoded: string | null | undefined, fallback: string): string {
  if (!encoded) return fallback;
  if (encoded === fallback) return fallback;
  if (encoded.includes('-')) return fallback;
  try {
    if (!/^[A-Za-z0-9+/=]+$/.test(encoded)) return fallback;
    return decodeURIComponent(escape(window.atob(encoded)));
  } catch {
    return fallback;
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
  const queryClient = useQueryClient();
  const { syncListings, isSyncing: isSyncingSheets, getSettings } = useGoogleSheetsSync();
  
  const { data: listingsData, isLoading, refetch } = useListings(user?.id);
  const listings = listingsData || [];
  
  const [rowEdits, setRowEdits] = useState<Record<string, ListingRowEdits>>({});
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
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

  // Variation expand state — lazy-loaded per listing
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [variationsByListing, setVariationsByListing] = useState<Record<string, Variation[]>>({});
  const [loadingVars, setLoadingVars] = useState<Set<string>>(new Set());

  const toggleExpand = async (listing: Listing) => {
    const next = new Set(expanded);
    if (next.has(listing.id)) {
      next.delete(listing.id);
      setExpanded(next);
      return;
    }
    next.add(listing.id);
    setExpanded(next);
    if (!variationsByListing[listing.id] && listing.has_variations) {
      setLoadingVars(p => { const n = new Set(p); n.add(listing.id); return n; });
      const { data } = await supabase
        .from('listing_variations')
        .select('id, sku, ebay_sku_encoded, final_price, raw_supplier_price, stock_quantity, attributes, variant_asin, image_url')
        .eq('listing_id', listing.id)
        .order('created_at', { ascending: true });
      setVariationsByListing(p => ({ ...p, [listing.id]: (data ?? []) as Variation[] }));
      setLoadingVars(p => { const n = new Set(p); n.delete(listing.id); return n; });
    }
  };

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

  // fetchListings has been removed in favor of useListings React Query hook

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
      queryClient.setQueryData(['listings', user.id], (old: Listing[] | undefined) => {
        if (!old) return [normalized];
        return old.map((l) => (l.id === listing.id ? normalized : l));
      });

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

  // Real-time sync for listings
  useRealtimeSync(
    user ? [
      {
        table: 'listings',
        event: '*',
        filter: `user_id=eq.${user.id}`,
        callback: (payload) => {
          if (import.meta.env.DEV) console.log('[Realtime] Listing changed:', payload.eventType, payload);
          // Invalidate React Query cache to trigger background refetch deduplicated
          queryClient.invalidateQueries({ queryKey: ['listings', user.id] });

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
    [user?.id, queryClient]
  );

  // Filter listings when search, status filter, or date range changes
  const filteredListings = useMemo(() => {
    let filtered = listings;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((listing: Listing) => 
        (listing.title?.toLowerCase() || '').includes(query) ||
        (listing.sku?.toLowerCase() || '').includes(query) ||
        (listing.amazon_asin?.toLowerCase() || '').includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((listing: Listing) => listing.status === statusFilter);
    }

    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((listing: Listing) => {
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

    return filtered;
  }, [searchQuery, statusFilter, listings, dateRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateRange]);

  const stats = useMemo(() => {
    const totalSourcingCost = listings.reduce((sum: number, listing: Listing) => sum + (listing.amazon_price || 0), 0);
    const totalInventoryValue = listings.reduce((sum: number, listing: Listing) => sum + (listing.ebay_price || 0), 0);
    const netProfitForecast = totalInventoryValue - totalSourcingCost;
    return { totalSourcingCost, totalInventoryValue, netProfitForecast };
  }, [listings]);

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
    await refetch();
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
        refetch();
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
      refetch();
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

      refetch();
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
      refetch();
    } catch (e) {
      console.error('[Listings] Repair failed:', e);
      toast({
        title: 'Repair failed',
        description: 'Could not repair this listing.',
        variant: 'destructive',
      });
    }
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
      <ListingsHeader 
        timeBasedStats={timeBasedStats}
        onNewListing={() => navigate("/dashboard/listings/new")}
      />

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
      <ListingsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={(range) => setDateRange(range || { from: undefined, to: undefined })}
        onClearDateRange={clearDateRange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onSyncInventory={() => handleSyncInventory()}
        isSyncing={isSyncing}
        onGenerateReport={handleGenerateReport}
        isGeneratingReport={isGeneratingReport}
        hasListings={listings.length > 0}
        sheetsConnected={sheetsConnected}
        enqueueAutoSheetsSync={() => {
          if (listings.length > 0) {
            handleSyncToSheets();
          }
        }}
      />

          {/* Auto-sync status */}
          {autoSheetsListingsEnabled && lastAutoSyncAt && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Sheet className="h-3.5 w-3.5" />
              <span>Auto-sync: {new Date(lastAutoSyncAt).toLocaleString()}</span>
              {lastAutoSyncError && (
                <Badge variant="destructive" className="text-[10px] h-5">
                  Error
                </Badge>
              )}
            </div>
          )}

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
      <ListingsTable
        isLoading={isLoading}
        filteredListings={filteredListings}
        paginatedListings={paginatedListings}
        selectedListings={selectedListings}
        toggleSelectListing={toggleSelectListing}
        toggleSelectAll={toggleSelectAll}
        expanded={expanded}
        toggleExpand={toggleExpand}
        loadingVars={loadingVars}
        variationsByListing={variationsByListing}
        getEditForListing={getEditForListing}
        isListingDirty={isListingDirty}
        savingById={savingById}
        updateRowEdit={updateRowEdit}
        handleRepairListing={handleRepairListing}
        handleSaveListingEdits={handleSaveListingEdits}
        handleDeleteListing={handleDeleteListing}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        goToPage={goToPage}
      />
    </div>
  );
}
