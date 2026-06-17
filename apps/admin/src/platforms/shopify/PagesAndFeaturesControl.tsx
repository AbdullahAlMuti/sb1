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
import { Label } from "@repo/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Switch } from "@repo/ui/components/ui/switch";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Download,
  LayoutTemplate,
  Home,
  Search,
  Sparkles,
  Trophy,
  Store,
  Paintbrush,
  Image,
  Bookmark,
  Settings,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { useShopifyPageSettings } from "./hooks/useShopifyPageSettings";
import type { ShopifyPageSetting } from "@repo/types";

// ── Icon map (from icon_name stored in DB) ────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Search, Trophy, Store, Paintbrush,
  Image, Sparkles, Bookmark, Settings, CreditCard, HelpCircle,
  Home, LayoutTemplate,
};

function PageIcon({ name }: { name: string | null }) {
  const Icon = name ? (ICON_MAP[name] ?? LayoutTemplate) : LayoutTemplate;
  return <Icon className="h-3.5 w-3.5" />;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onManageContent?: (pageKey: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PagesAndFeaturesControl({ onManageContent }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const {
    pages,
    isLoading,
    fetchPages,
    updatePage,
    toggleVisibility,
    updateStatus,
    updateSortOrder,
  } = useShopifyPageSettings();

  const [isAddOpen,     setIsAddOpen]     = useState(false);
  const [isEditOpen,    setIsEditOpen]    = useState(false);
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [selectedPage,  setSelectedPage]  = useState<ShopifyPageSetting | null>(null);
  const [formData,      setFormData]      = useState<Partial<ShopifyPageSetting>>({});
  const [isSaving,      setIsSaving]      = useState(false);
  // Local reorder state (confirmed to DB on save)
  const [reorderList,   setReorderList]   = useState<ShopifyPageSetting[]>([]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleVisibility = async (pageKey: string, current: boolean) => {
    await toggleVisibility(pageKey, current, userId);
  };

  const handleUpdateStatus = async (pageKey: string, status: ShopifyPageSetting['status']) => {
    await updateStatus(pageKey, status, userId);
  };

  const handleSavePage = async () => {
    if (!selectedPage || !formData) return;
    setIsSaving(true);
    try {
      await updatePage(selectedPage.page_key, {
        name:             formData.name,
        plan_access:      formData.plan_access,
        usage_limit:      formData.usage_limit,
        status:           formData.status,
        is_visible:       formData.is_visible,
        content_editable: formData.content_editable,
      }, userId);
      toast.success('Page settings saved.');
    } finally {
      setIsSaving(false);
      setIsEditOpen(false);
      setSelectedPage(null);
      setFormData({});
    }
  };

  const openEdit = (page: ShopifyPageSetting) => {
    setSelectedPage(page);
    setFormData({ ...page });
    setIsEditOpen(true);
  };

  const openReorder = () => {
    setReorderList([...pages]);
    setIsReorderOpen(true);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...reorderList];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setReorderList(next);
  };

  const moveDown = (index: number) => {
    if (index === reorderList.length - 1) return;
    const next = [...reorderList];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    setReorderList(next);
  };

  const handleSaveReorder = async () => {
    await updateSortOrder(reorderList.map(p => p.page_key), userId);
    setIsReorderOpen(false);
  };

  // ── Status badge ─────────────────────────────────────────────────────────

  const statusClass = (status: string) => {
    switch (status) {
      case 'Active':      return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Disabled':    return 'bg-rose-50 text-rose-500 border-rose-200';
      case 'Coming Soon': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Maintenance': return 'bg-slate-100 text-slate-500 border-slate-200';
      default:            return 'bg-muted text-muted-foreground';
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading && pages.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading page settings…</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Pages & Features Control</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage every page, feature access, limits, content and visibility from one place.
            Changes are persisted to the database instantly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPages} className="h-8 text-xs font-medium">
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={openReorder} className="h-8 text-xs font-medium">
            <GripVertical className="mr-2 h-3.5 w-3.5" /> Manage Page Order
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <Table className="w-full whitespace-nowrap min-w-[900px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px] text-[11px] font-semibold">Page / Feature</TableHead>
                <TableHead className="text-[11px] font-semibold">Route</TableHead>
                <TableHead className="text-[11px] font-semibold">Type</TableHead>
                <TableHead className="text-[11px] font-semibold">Status</TableHead>
                <TableHead className="text-[11px] font-semibold">Plan Access</TableHead>
                <TableHead className="text-[11px] font-semibold">Usage Limit</TableHead>
                <TableHead className="text-[11px] font-semibold text-center">Visible</TableHead>
                <TableHead className="text-[11px] font-semibold">Content</TableHead>
                <TableHead className="text-[11px] font-semibold">Last Updated</TableHead>
                <TableHead className="text-[11px] font-semibold text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id} className="group border-b border-border hover:bg-muted/30">
                  {/* Name + Icon */}
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <PageIcon name={page.icon_name} />
                      </div>
                      <span className="text-xs font-medium">{page.name}</span>
                    </div>
                  </TableCell>

                  {/* Route */}
                  <TableCell className="py-2.5 text-xs text-muted-foreground font-mono">
                    {page.route}
                  </TableCell>

                  {/* Type */}
                  <TableCell className="py-2.5">
                    <Badge variant="secondary" className="bg-muted/50 text-[10px] font-normal rounded-sm px-1.5">
                      {page.page_type}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-2.5">
                    <Badge
                      variant="outline"
                      className={`px-1.5 py-0 text-[10px] rounded-sm border ${statusClass(page.status)}`}
                    >
                      {page.status}
                    </Badge>
                  </TableCell>

                  {/* Plan Access */}
                  <TableCell className="py-2.5 text-xs">{page.plan_access}</TableCell>

                  {/* Usage Limit */}
                  <TableCell className="py-2.5 text-xs text-muted-foreground">{page.usage_limit}</TableCell>

                  {/* Visible toggle */}
                  <TableCell className="py-2.5 text-center">
                    <button
                      onClick={() => handleToggleVisibility(page.page_key, page.is_visible)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={page.is_visible ? 'Hide this page' : 'Show this page'}
                    >
                      {page.is_visible
                        ? <Eye className="h-4 w-4 mx-auto" />
                        : <EyeOff className="h-4 w-4 mx-auto opacity-50" />}
                    </button>
                  </TableCell>

                  {/* Content editable */}
                  <TableCell className="py-2.5 text-[11px] text-emerald-600 font-medium">
                    {page.content_editable ? 'Editable' : 'Locked'}
                  </TableCell>

                  {/* Last updated */}
                  <TableCell className="py-2.5">
                    <div className="flex flex-col">
                      <span className="text-[11px]">
                        {new Date(page.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">by Admin</span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-2.5 text-right pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-muted"
                        onClick={() => openEdit(page)}
                        title="Edit page settings"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                          <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase">
                            Actions
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem className="text-xs" onClick={() => openEdit(page)}>
                            Edit Settings
                          </DropdownMenuItem>

                          {/* Manage Content — navigates to content manager */}
                          {page.content_editable && (
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => onManageContent?.(page.page_key)}
                            >
                              Manage Content
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-xs"
                            onClick={() => handleToggleVisibility(page.page_key, page.is_visible)}
                          >
                            {page.is_visible ? 'Hide from Sidebar' : 'Show in Sidebar'}
                          </DropdownMenuItem>

                          {/* Status changes */}
                          {page.status !== 'Active' && (
                            <DropdownMenuItem
                              className="text-xs text-emerald-600 focus:text-emerald-600"
                              onClick={() => handleUpdateStatus(page.page_key, 'Active')}
                            >
                              Set Active
                            </DropdownMenuItem>
                          )}
                          {page.status !== 'Disabled' && (
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => handleUpdateStatus(page.page_key, 'Disabled')}
                            >
                              Disable Page
                            </DropdownMenuItem>
                          )}
                          {page.status !== 'Coming Soon' && (
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => handleUpdateStatus(page.page_key, 'Coming Soon')}
                            >
                              Mark Coming Soon
                            </DropdownMenuItem>
                          )}
                          {page.status !== 'Maintenance' && (
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => handleUpdateStatus(page.page_key, 'Maintenance')}
                            >
                              Mark Maintenance
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/20 px-4 py-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Showing {pages.length} pages · DB-backed
          </span>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1"><Home className="h-3 w-3" /> Core Page</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Feature Page</span>
            <span className="flex items-center gap-1"><LayoutTemplate className="h-3 w-3" /> Custom Page</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Visible</span>
            <span className="flex items-center gap-1"><EyeOff className="h-3 w-3" /> Hidden</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full">
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
          {[
            { label: 'Refresh Data',    desc: 'Reload from database',      icon: RefreshCw,      onClick: fetchPages      },
            { label: 'Reorder Pages',   desc: 'Drag and drop to reorder',  icon: GripVertical,   onClick: openReorder     },
            { label: 'Import Page',     desc: 'Import page from template', icon: Download,       onClick: () => toast.info('Coming soon') },
            { label: 'Page Templates',  desc: 'Browse page templates',     icon: LayoutTemplate, onClick: () => toast.info('Coming soon') },
          ].map(item => (
            <div
              key={item.label}
              className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-card hover:border-primary/50 cursor-pointer transition-colors"
              onClick={item.onClick}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold">{item.label}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Edit Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        if (!open) { setIsEditOpen(false); setSelectedPage(null); setFormData({}); }
      }}>
        <DialogContent className="sm:max-w-[500px] rounded-xl p-0 overflow-hidden border-border shadow-lg">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-lg font-semibold">Edit Page Settings</DialogTitle>
            <DialogDescription className="text-xs">
              Changes are saved to the database and take effect immediately.
            </DialogDescription>
          </div>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Display Name</Label>
              <Input
                className="h-8 text-xs rounded-md"
                value={formData.name ?? ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Route (read-only) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Route (read-only)</Label>
              <Input
                className="h-8 text-xs rounded-md bg-muted/30 cursor-not-allowed"
                value={formData.route ?? ''}
                readOnly
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val as ShopifyPageSetting['status'] })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-md">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Active"       className="text-xs">Active</SelectItem>
                    <SelectItem value="Disabled"     className="text-xs">Disabled</SelectItem>
                    <SelectItem value="Coming Soon"  className="text-xs">Coming Soon</SelectItem>
                    <SelectItem value="Maintenance"  className="text-xs">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Plan Access */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Plan Access</Label>
                <Select
                  value={formData.plan_access}
                  onValueChange={(val) => setFormData({ ...formData, plan_access: val })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-md">
                    <SelectValue placeholder="Select access" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="All Plans" className="text-xs">All Plans</SelectItem>
                    <SelectItem value="Starter+"  className="text-xs">Starter+</SelectItem>
                    <SelectItem value="Pro+"      className="text-xs">Pro+</SelectItem>
                    <SelectItem value="Agency"    className="text-xs">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Usage Limit */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Usage Limit</Label>
              <Input
                className="h-8 text-xs rounded-md"
                value={formData.usage_limit ?? ''}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                placeholder="e.g. 500 / mo"
              />
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Sidebar Visibility</Label>
                <p className="text-[10px] text-muted-foreground">Show this page in the user sidebar</p>
              </div>
              <Switch
                checked={formData.is_visible ?? true}
                onCheckedChange={(val) => setFormData({ ...formData, is_visible: val })}
              />
            </div>

            {/* Content editable toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Content Editable</Label>
                <p className="text-[10px] text-muted-foreground">Allow admins to edit page content</p>
              </div>
              <Switch
                checked={formData.content_editable ?? true}
                onCheckedChange={(val) => setFormData({ ...formData, content_editable: val })}
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => { setIsEditOpen(false); setSelectedPage(null); setFormData({}); }}
              className="h-8 text-xs rounded-md"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSavePage}
              disabled={isSaving}
              className="h-8 text-xs rounded-md"
            >
              {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reorder Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={isReorderOpen} onOpenChange={setIsReorderOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl p-0 overflow-hidden border-border shadow-lg">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-lg font-semibold">Reorder Pages</DialogTitle>
            <DialogDescription className="text-xs">
              Use the arrows to reorder pages. Clicking Save will persist the order to the database.
            </DialogDescription>
          </div>
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-2">
            {reorderList.map((page, index) => (
              <div key={page.id} className="flex items-center justify-between rounded-md border border-border p-2 bg-card">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-xs font-medium">{page.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => moveUp(index)}>
                    ↑
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === reorderList.length - 1} onClick={() => moveDown(index)}>
                    ↓
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsReorderOpen(false)} className="h-8 text-xs rounded-md">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveReorder} className="h-8 text-xs rounded-md">
              Save Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
