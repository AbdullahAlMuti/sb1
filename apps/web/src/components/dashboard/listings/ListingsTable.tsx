import { Checkbox } from "@repo/ui/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@repo/ui/components/ui/pagination";
import { cn } from "@repo/ui/lib/utils";
import { 
  Package, Trash2, Save, Wrench, CheckCircle2, XCircle, Pause, ChevronDown, ChevronRight, RefreshCw, Plus
} from "lucide-react";
import InventoryStatusBadge from "@/components/listings/InventoryStatusBadge";
import { ListingImage } from "@/components/listings/ListingImage";
import { Listing } from "@/hooks/useListings";
import { useNavigate } from "react-router-dom";

export interface Variation {
  id: string;
  sku: string;
  ebay_sku_encoded?: string | null;
  final_price: number | null;
  raw_supplier_price: number | null;
  stock_quantity: number | null;
  attributes: Record<string, { productName?: string }> | null;
  variant_asin: string | null;
  image_url?: string | null;
}

export type ListingRowEdits = {
  sku: string;
  ebay_price: string;
  amazon_price: string;
};

export interface ListingsTableProps {
  isLoading: boolean;
  filteredListings: Listing[];
  paginatedListings: Listing[];
  selectedListings: Set<string>;
  toggleSelectListing: (id: string) => void;
  toggleSelectAll: () => void;
  expanded: Set<string>;
  toggleExpand: (listing: Listing) => void;
  loadingVars: Set<string>;
  variationsByListing: Record<string, Variation[]>;
  getEditForListing: (listing: Listing) => ListingRowEdits;
  isListingDirty: (listing: Listing) => boolean;
  savingById: Record<string, boolean>;
  updateRowEdit: (listingId: string, patch: Partial<ListingRowEdits>) => void;
  handleRepairListing: (listing: Listing) => void;
  handleSaveListingEdits: (listing: Listing) => void;
  handleDeleteListing: (id: string) => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  goToPage: (page: number) => void;
}

function decodeSku(encoded: string | null | undefined, fallback: string): string {
  if (!encoded) return fallback;
  try {
    return decodeURIComponent(escape(window.atob(encoded)));
  } catch (e) {
    return fallback;
  }
}

export function ListingsTable({
  isLoading,
  filteredListings,
  paginatedListings,
  selectedListings,
  toggleSelectListing,
  toggleSelectAll,
  expanded,
  toggleExpand,
  loadingVars,
  variationsByListing,
  getEditForListing,
  isListingDirty,
  savingById,
  updateRowEdit,
  handleRepairListing,
  handleSaveListingEdits,
  handleDeleteListing,
  currentPage,
  totalPages,
  itemsPerPage,
  goToPage
}: ListingsTableProps) {
  const navigate = useNavigate();

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

  return (
    <>
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent bg-muted/30">
                  <TableHead className="w-6 py-2 px-1" />
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
                  <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-2 w-16 text-right">Supplier</TableHead>
                  <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-1 w-12 text-center">Inv</TableHead>
                  <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-2 w-14 text-right">Profit</TableHead>
                  <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-2 w-20">Status</TableHead>
                  <TableHead className="text-muted-foreground text-[11px] font-medium py-2 px-1 w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground mt-2 text-xs">Loading listings...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredListings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10">
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
                  paginatedListings.flatMap((listing) => {
                    const profit = calculateProfit(listing.ebay_price, listing.amazon_price);
                    const isSelected = selectedListings.has(listing.id);
                    const isBlank = !listing.title && !listing.sku && !listing.amazon_asin;
                    const edit = getEditForListing(listing);
                    const isDirty = isListingDirty(listing);
                    const isSaving = !!savingById[listing.id];
                    const isExpanded = expanded.has(listing.id);
                    const isLoadingVars = loadingVars.has(listing.id);
                    const childRows = variationsByListing[listing.id] ?? [];
                    const hasVars = !!listing.has_variations;

                    const parentRow = (
                      <TableRow
                        key={listing.id}
                        className={cn(
                          "border-border/30 transition-colors h-10",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        <TableCell className="py-1.5 px-1 w-6">
                          {hasVars ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => toggleExpand(listing)}
                              aria-label={isExpanded ? 'Collapse variations' : 'Expand variations'}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                            </Button>
                          ) : null}
                        </TableCell>
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

                    // Variation child rows — only rendered when expanded
                    const variationChildRows = isExpanded ? [
                      isLoadingVars ? (
                        <TableRow key={`${listing.id}-loading`} className="bg-muted/10">
                          <TableCell colSpan={11} className="py-2 pl-10 text-xs text-muted-foreground">
                            Loading variations...
                          </TableCell>
                        </TableRow>
                      ) : childRows.map(v => {
                        const varProfit = v.final_price != null && v.raw_supplier_price != null
                          ? v.final_price - v.raw_supplier_price
                          : null;
                        const attrLabel = v.attributes
                          ? Object.values(v.attributes).map((a) => a?.productName).filter(Boolean).join(' / ')
                          : '';
                        return (
                          <TableRow key={v.id} className="bg-muted/10 border-border/20 h-9">
                            <TableCell className="py-1 px-1" />
                            <TableCell className="py-1 px-2">
                              {v.image_url ? (
                                <img
                                  src={v.image_url}
                                  alt=""
                                  className="w-7 h-7 rounded object-cover border border-border/30"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : <div className="w-7 h-7 rounded bg-muted/30 border border-border/20" />}
                            </TableCell>
                            <TableCell className="py-1 px-1" />
                            <TableCell className="py-1 px-2 pl-6">
                              <div className="space-y-0">
                                <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[180px]">
                                  {attrLabel || v.variant_asin || '—'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="py-1 px-2">
                              <span className="text-[11px] font-mono text-muted-foreground truncate block max-w-[72px]" title={decodeSku(v.ebay_sku_encoded, v.sku)}>
                                {decodeSku(v.ebay_sku_encoded, v.sku)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-1 px-2">
                              <span className="text-[11px] font-mono tabular-nums text-foreground">
                                {v.final_price != null ? `$${v.final_price.toFixed(2)}` : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right py-1 px-2">
                              <span className="text-[11px] font-mono tabular-nums text-foreground">
                                {v.raw_supplier_price != null ? `$${v.raw_supplier_price.toFixed(2)}` : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center py-1 px-1">
                              <span className="text-[11px] text-muted-foreground">{v.stock_quantity ?? '—'}</span>
                            </TableCell>
                            <TableCell className="text-right py-1 px-2">
                              {varProfit !== null ? (
                                <span className={cn(
                                  "text-[11px] font-semibold",
                                  varProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                                )}>
                                  ${varProfit.toFixed(2)}
                                </span>
                              ) : <span className="text-muted-foreground text-[11px]">—</span>}
                            </TableCell>
                            <TableCell colSpan={2} />
                          </TableRow>
                        );
                      })
                    ] : [];

                    return [parentRow, ...variationChildRows];
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
    </>
  );
}
