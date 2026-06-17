import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Switch } from "@repo/ui/components/ui/switch";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Flame,
  Globe,
  Lock,
  Archive,
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  RefreshCw,
  ChevronDown,
  Filter,
  Loader2,
  Paintbrush,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { useStoreDesigns } from "./hooks/useStoreDesigns";
import type { StoreDesign, StoreDesignFilters, StoreDesignSortBy } from "@repo/types";
import StoreDesignFormDrawer from "./StoreDesignFormDrawer";
import StoreDesignPreviewModal from "./StoreDesignPreviewModal";

export default function StoreDesignsManager() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const {
    designs,
    isLoading,
    isSaving,
    totalCount,
    hasMore,
    fetchDesigns,
    loadMore,
    createDesign,
    updateDesign,
    publishDesign,
    unpublishDesign,
    toggleVisibility,
    archiveDesign,
    duplicateDesign,
    deleteDesign,
    uploadImage,
    toggleFlag,
  } = useStoreDesigns();

  // ── State ───────────────────────────────────────────────────────────────

  const [filters, setFilters] = useState<StoreDesignFilters>({});
  const [sortBy, setSortBy] = useState<StoreDesignSortBy>('sort_order');
  const [searchQuery, setSearchQuery] = useState('');

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<StoreDesign | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDesign, setPreviewDesign] = useState<StoreDesign | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [designToDelete, setDesignToDelete] = useState<StoreDesign | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDesigns(filters, sortBy, null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchQuery || undefined }));
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleCreateOrUpdate = async (values: any, publish?: boolean) => {
    if (publish) {
      values.status = 'published';
      values.is_published = true;
    }

    if (selectedDesign) {
      const updated = await updateDesign(selectedDesign.id, values, userId, selectedDesign);
      if (updated) setIsDrawerOpen(false);
    } else {
      const created = await createDesign(values, userId);
      if (created) setIsDrawerOpen(false);
    }
  };

  const handleDuplicate = async (design: StoreDesign) => {
    await duplicateDesign(design.id, userId);
  };

  const handleDeleteConfirm = async () => {
    if (!designToDelete) return;
    const ok = await deleteDesign(designToDelete.id, userId, designToDelete);
    if (ok) setIsDeleteOpen(false);
  };

  // ── Render Helpers ──────────────────────────────────────────────────────

  const statusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-[10px]">Published</Badge>;
      case 'hidden':    return <Badge className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50 text-[10px]">Hidden</Badge>;
      case 'archived':  return <Badge className="bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100 text-[10px]">Archived</Badge>;
      default:          return <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted text-[10px]">Draft</Badge>;
    }
  };

  const accessBadge = (access: string) => {
    switch (access) {
      case 'free':       return <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 text-[10px]">Free</Badge>;
      case 'starter':    return <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 text-[10px]">Starter</Badge>;
      case 'growth':     return <Badge variant="outline" className="text-violet-600 bg-violet-50 border-violet-200 text-[10px]">Pro</Badge>;
      case 'agency':
      case 'enterprise': return <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200 text-[10px]">Agency</Badge>;
      default:           return <Badge variant="outline" className="text-pink-600 bg-pink-50 border-pink-200 text-[10px]">{access}</Badge>;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Store Designs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your template library. Changes instantly reflect on the user dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchDesigns(filters, sortBy, null, true)} className="h-8 text-xs font-medium bg-card">
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => { setSelectedDesign(null); setIsDrawerOpen(true); }}
            className="h-8 text-xs font-medium"
          >
            <Plus className="mr-2 h-3.5 w-3.5" /> Add Design
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-card border border-border rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search designs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/50 border-transparent focus:bg-background"
          />
        </div>
        
        <Select value={filters.status ?? 'all'} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? undefined : v as any })}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.access_level ?? 'all'} onValueChange={(v) => setFilters({ ...filters, access_level: v === 'all' ? undefined : v as any })}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Access" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="growth">Pro</SelectItem>
            <SelectItem value="agency">Agency</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sort_order">Custom Order</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="featured">Featured First</SelectItem>
            <SelectItem value="trending">Trending First</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 pl-2 border-l border-border h-5">
          <Switch
            checked={filters.is_free === true}
            onCheckedChange={(c) => setFilters({ ...filters, is_free: c ? true : undefined })}
          />
          <span className="text-[11px] font-medium text-muted-foreground">Free Only</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full whitespace-nowrap">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px]"></TableHead>
                <TableHead className="text-[11px] font-semibold">Design</TableHead>
                <TableHead className="text-[11px] font-semibold">Category</TableHead>
                <TableHead className="text-[11px] font-semibold">Price</TableHead>
                <TableHead className="text-[11px] font-semibold">Access</TableHead>
                <TableHead className="text-[11px] font-semibold">Status</TableHead>
                <TableHead className="text-[11px] font-semibold text-center">Visible</TableHead>
                <TableHead className="text-[11px] font-semibold text-center">Flags</TableHead>
                <TableHead className="text-[11px] font-semibold text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && designs.length === 0 ? (
                // Skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="w-12 h-9 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="w-32 h-4 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="w-20 h-4 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="w-16 h-4 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="w-16 h-4 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="w-16 h-4 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : designs.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-xs">
                    No designs found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                // Data
                designs.map((design) => (
                  <TableRow key={design.id} className="group border-b border-border hover:bg-muted/30">
                    <TableCell className="py-2.5">
                      {design.thumbnail_image ? (
                        <img
                          src={design.thumbnail_image}
                          alt=""
                          className="w-12 h-9 object-cover rounded shadow-sm border border-border"
                        />
                      ) : (
                        <div className="w-12 h-9 bg-muted rounded border border-border flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">{design.title}</span>
                        <span className="text-[10px] text-muted-foreground">{design.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs">{design.category || '-'}</span>
                        <span className="text-[10px] text-muted-foreground">{design.niche}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs">
                      {design.is_free ? (
                        <span className="text-emerald-600 font-medium">Free</span>
                      ) : (
                        <span>${design.price}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5">
                      {accessBadge(design.access_level)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      {statusBadge(design.status)}
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      <button
                        onClick={() => toggleVisibility(design.id, design.is_visible, userId)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {design.is_visible ? <Eye className="h-4 w-4 mx-auto" /> : <EyeOff className="h-4 w-4 mx-auto opacity-40" />}
                      </button>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => toggleFlag(design.id, 'is_featured', design.is_featured, userId)}>
                          <Star className={`h-3.5 w-3.5 ${design.is_featured ? 'text-violet-500 fill-violet-500' : 'text-muted-foreground opacity-30 hover:opacity-100'}`} />
                        </button>
                        <button onClick={() => toggleFlag(design.id, 'is_trending', design.is_trending, userId)}>
                          <Flame className={`h-3.5 w-3.5 ${design.is_trending ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground opacity-30 hover:opacity-100'}`} />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-muted"
                          onClick={() => {
                            setPreviewDesign(design);
                            setIsPreviewOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-muted"
                          onClick={() => {
                            setSelectedDesign(design);
                            setIsDrawerOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs" onClick={() => { setSelectedDesign(design); setIsDrawerOpen(true); }}>
                              Edit Design
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => handleDuplicate(design)}>
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {design.status === 'published' ? (
                              <DropdownMenuItem className="text-xs" onClick={() => unpublishDesign(design.id, userId, design)}>
                                Unpublish
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-xs text-emerald-600 focus:text-emerald-600" onClick={() => publishDesign(design.id, userId, design)}>
                                Publish
                              </DropdownMenuItem>
                            )}
                            {design.status !== 'archived' && (
                              <DropdownMenuItem className="text-xs" onClick={() => archiveDesign(design.id, userId, design)}>
                                Archive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs text-rose-600 focus:text-rose-600" onClick={() => { setDesignToDelete(design); setIsDeleteOpen(true); }}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border bg-muted/20 px-4 py-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Showing {designs.length} of {totalCount} total designs</span>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMore(filters, sortBy)}
              disabled={isLoading}
              className="h-7 text-[10px]"
            >
              {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : 'Load More'}
            </Button>
          )}
        </div>
      </div>

      {/* Drawer */}
      {isDrawerOpen && (
        <StoreDesignFormDrawer
          isOpen={isDrawerOpen}
          onClose={() => { setIsDrawerOpen(false); setSelectedDesign(null); }}
          design={selectedDesign}
          onSave={handleCreateOrUpdate}
          onUploadImage={uploadImage}
          isSaving={isSaving}
        />
      )}

      {/* Preview Modal */}
      {isPreviewOpen && previewDesign && (
        <StoreDesignPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => { setIsPreviewOpen(false); setPreviewDesign(null); }}
          design={previewDesign}
        />
      )}

      {/* Delete Confirm */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl p-0 overflow-hidden border-border">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-lg font-semibold text-rose-600">Delete Design?</DialogTitle>
            <DialogDescription className="text-xs mt-1">
              This action cannot be undone. This will permanently delete the store design.
            </DialogDescription>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm font-medium">Are you sure you want to delete "{designToDelete?.title}"?</p>
          </div>
          <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteConfirm} disabled={isSaving} className="h-8 text-xs">
              {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
