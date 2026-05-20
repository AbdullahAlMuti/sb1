import React, { useState } from "react";
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
  Trash2,
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
} from "lucide-react";
import { toast } from "sonner";

// Data Model
export type ShopifyFeaturePage = {
  id: string;
  name: string;
  route: string;
  type: "Core" | "Feature" | "Custom";
  status: "Active" | "Disabled" | "Coming Soon" | "Maintenance";
  planAccess: string;
  usageLimit: string;
  visible: boolean;
  contentEditable: boolean;
  lastUpdated: string;
  updatedBy: string;
  icon?: any;
};

const initialPages: ShopifyFeaturePage[] = [
  { id: "1", name: "Dashboard", route: "/dashboard", type: "Core", status: "Active", planAccess: "All Plans", usageLimit: "-", visible: true, contentEditable: true, lastUpdated: "May 30, 2025", updatedBy: "Admin", icon: Home },
  { id: "2", name: "Product Research", route: "/product-research", type: "Feature", status: "Active", planAccess: "Starter+", usageLimit: "500 searches / mo", visible: true, contentEditable: true, lastUpdated: "May 30, 2025", updatedBy: "Admin", icon: Search },
  { id: "3", name: "Winning Products", route: "/winning-products", type: "Feature", status: "Active", planAccess: "Pro+", usageLimit: "200 items / mo", visible: true, contentEditable: true, lastUpdated: "May 29, 2025", updatedBy: "Admin", icon: Trophy },
  { id: "4", name: "Store Explorer", route: "/store-explorer", type: "Feature", status: "Active", planAccess: "Starter+", usageLimit: "50 lookups / mo", visible: true, contentEditable: true, lastUpdated: "May 29, 2025", updatedBy: "Admin", icon: Store },
  { id: "5", name: "Store Designs", route: "/store-designs", type: "Feature", status: "Active", planAccess: "Pro+", usageLimit: "50 views / mo", visible: true, contentEditable: true, lastUpdated: "May 29, 2025", updatedBy: "Admin", icon: Paintbrush },
  { id: "6", name: "Ad Library", route: "/ad-library", type: "Feature", status: "Active", planAccess: "Pro+", usageLimit: "100 lookups / mo", visible: true, contentEditable: true, lastUpdated: "May 28, 2025", updatedBy: "Admin", icon: Image },
  { id: "7", name: "AI Copy Studio", route: "/ai-copy-studio", type: "Feature", status: "Active", planAccess: "Starter+", usageLimit: "200 generations / mo", visible: true, contentEditable: true, lastUpdated: "May 28, 2025", updatedBy: "Admin", icon: Sparkles },
  { id: "8", name: "Saved Items", route: "/saved-items", type: "Feature", status: "Active", planAccess: "All Plans", usageLimit: "500 items", visible: true, contentEditable: true, lastUpdated: "May 28, 2025", updatedBy: "Admin", icon: Bookmark },
  { id: "9", name: "Settings", route: "/settings", type: "Core", status: "Active", planAccess: "All Plans", usageLimit: "-", visible: true, contentEditable: true, lastUpdated: "May 27, 2025", updatedBy: "Admin", icon: Settings },
  { id: "10", name: "Billing", route: "/billing", type: "Core", status: "Active", planAccess: "All Plans", usageLimit: "-", visible: true, contentEditable: true, lastUpdated: "May 27, 2025", updatedBy: "Admin", icon: CreditCard },
  { id: "11", name: "Help", route: "/help", type: "Core", status: "Active", planAccess: "All Plans", usageLimit: "-", visible: true, contentEditable: true, lastUpdated: "May 27, 2025", updatedBy: "Admin", icon: HelpCircle },
];

export default function PagesAndFeaturesControl() {
  const [pages, setPages] = useState<ShopifyFeaturePage[]>(initialPages);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<ShopifyFeaturePage | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ShopifyFeaturePage>>({});

  const handleToggleVisibility = (id: string) => {
    setPages(pages.map(p => p.id === id ? { ...p, visible: !p.visible } : p));
    toast.success("Visibility updated successfully.");
  };

  const handleDelete = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
    toast.success("Page removed successfully.");
  };

  const handleDuplicate = (page: ShopifyFeaturePage) => {
    const newPage = { ...page, id: Date.now().toString(), name: `${page.name} (Copy)`, route: `${page.route}-copy` };
    setPages([...pages, newPage]);
    toast.success("Page duplicated successfully.");
  };

  const handleSavePage = () => {
    if (selectedPage) {
      // Edit
      setPages(pages.map(p => p.id === selectedPage.id ? { ...p, ...formData, lastUpdated: "Just now" } as ShopifyFeaturePage : p));
      toast.success("Page updated successfully.");
      setIsEditOpen(false);
    } else {
      // Add
      const newPage: ShopifyFeaturePage = {
        id: Date.now().toString(),
        name: formData.name || "New Page",
        route: formData.route || "/new-page",
        type: (formData.type as any) || "Custom",
        status: (formData.status as any) || "Active",
        planAccess: formData.planAccess || "All Plans",
        usageLimit: formData.usageLimit || "-",
        visible: formData.visible !== false,
        contentEditable: formData.contentEditable !== false,
        lastUpdated: "Just now",
        updatedBy: "Admin",
        icon: LayoutTemplate,
      };
      setPages([newPage, ...pages]);
      toast.success("New page created successfully.");
      setIsAddOpen(false);
    }
    setFormData({});
    setSelectedPage(null);
  };

  const openEdit = (page: ShopifyFeaturePage) => {
    setSelectedPage(page);
    setFormData(page);
    setIsEditOpen(true);
  };

  const openAdd = () => {
    setSelectedPage(null);
    setFormData({ type: "Custom", status: "Active", planAccess: "All Plans", visible: true, contentEditable: true });
    setIsAddOpen(true);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newPages = [...pages];
    [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
    setPages(newPages);
  };

  const moveDown = (index: number) => {
    if (index === pages.length - 1) return;
    const newPages = [...pages];
    [newPages[index + 1], newPages[index]] = [newPages[index], newPages[index + 1]];
    setPages(newPages);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Pages & Features Control</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage every page, feature access, limits, content and visibility from one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsReorderOpen(true)} className="h-8 text-xs font-medium">
            <GripVertical className="mr-2 h-3.5 w-3.5" /> Manage Page Order
          </Button>
          <Button size="sm" onClick={openAdd} className="h-8 text-xs font-medium">
            <Plus className="mr-2 h-3.5 w-3.5" /> Add New Page
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <Table className="w-full whitespace-nowrap min-w-[800px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px] text-[11px] font-semibold">Page / Feature</TableHead>
                <TableHead className="text-[11px] font-semibold">File / Route</TableHead>
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
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        {page.icon ? <page.icon className="h-3.5 w-3.5" /> : <LayoutTemplate className="h-3.5 w-3.5" />}
                      </div>
                      <span className="text-xs font-medium">{page.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">{page.route}</TableCell>
                  <TableCell className="py-2.5">
                    <Badge variant="secondary" className="bg-muted/50 text-[10px] font-normal rounded-sm px-1.5">{page.type}</Badge>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge variant="outline" className={`px-1.5 py-0 text-[10px] rounded-sm ${page.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                      {page.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs">{page.planAccess}</TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">{page.usageLimit}</TableCell>
                  <TableCell className="py-2.5 text-center">
                    <button onClick={() => handleToggleVisibility(page.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {page.visible ? <Eye className="h-4 w-4 mx-auto" /> : <EyeOff className="h-4 w-4 mx-auto opacity-50" />}
                    </button>
                  </TableCell>
                  <TableCell className="py-2.5 text-[11px] text-emerald-600 font-medium">
                    {page.contentEditable ? "Editable" : "Locked"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col">
                      <span className="text-[11px]">{page.lastUpdated}</span>
                      <span className="text-[10px] text-muted-foreground">by {page.updatedBy}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-right pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={() => openEdit(page)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={() => handleDuplicate(page)}>
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
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
                          <DropdownMenuItem className="text-xs" onClick={() => openEdit(page)}>Edit Page</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs">Manage Access</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs">Manage Limits</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs" onClick={() => handleToggleVisibility(page.id)}>
                            {page.visible ? "Hide Page" : "Show Page"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs text-rose-600 focus:text-rose-600" onClick={() => handleDelete(page.id)}>
                            Delete Page
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border bg-muted/20 px-4 py-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Showing {pages.length} of {pages.length} pages</span>
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
          <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-card hover:border-primary/50 cursor-pointer transition-colors" onClick={openAdd}>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold">Add New Page</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Create a new custom page</span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-card hover:border-primary/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
                <Download className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold">Import Page</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Import page from template</span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-card hover:border-primary/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
                <Copy className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold">Duplicate Page</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Copy and modify existing</span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-card hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setIsReorderOpen(true)}>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold">Reorder Pages</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Drag and drop to reorder</span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-card hover:border-primary/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
                <LayoutTemplate className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold">Page Templates</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Browse page templates</span>
          </div>
        </div>
      </div>

      {/* Modals */}

      {/* Add / Edit Dialog */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setIsEditOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] rounded-xl p-0 overflow-hidden border-border shadow-lg">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-lg font-semibold">{isEditOpen ? "Edit Page" : "Add New Page"}</DialogTitle>
            <DialogDescription className="text-xs">
              Configure page details, visibility, and access settings.
            </DialogDescription>
          </div>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Page Name</Label>
                <Input className="h-8 text-xs rounded-md" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Analytics" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Route</Label>
                <Input className="h-8 text-xs rounded-md" value={formData.route || ""} onChange={(e) => setFormData({ ...formData, route: e.target.value })} placeholder="e.g. /analytics" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Page Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val as any })}>
                  <SelectTrigger className="h-8 text-xs rounded-md">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Core" className="text-xs">Core</SelectItem>
                    <SelectItem value="Feature" className="text-xs">Feature</SelectItem>
                    <SelectItem value="Custom" className="text-xs">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val as any })}>
                  <SelectTrigger className="h-8 text-xs rounded-md">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Active" className="text-xs">Active</SelectItem>
                    <SelectItem value="Disabled" className="text-xs">Disabled</SelectItem>
                    <SelectItem value="Coming Soon" className="text-xs">Coming Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Plan Access</Label>
                <Select value={formData.planAccess} onValueChange={(val) => setFormData({ ...formData, planAccess: val })}>
                  <SelectTrigger className="h-8 text-xs rounded-md">
                    <SelectValue placeholder="Select access" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="All Plans" className="text-xs">All Plans</SelectItem>
                    <SelectItem value="Starter+" className="text-xs">Starter+</SelectItem>
                    <SelectItem value="Pro+" className="text-xs">Pro+</SelectItem>
                    <SelectItem value="Agency" className="text-xs">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Usage Limit</Label>
                <Input className="h-8 text-xs rounded-md" value={formData.usageLimit || ""} onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })} placeholder="e.g. 500 / mo" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Sidebar Visibility</Label>
                <p className="text-[10px] text-muted-foreground">Show this page in the user sidebar</p>
              </div>
              <Switch checked={formData.visible} onCheckedChange={(val) => setFormData({ ...formData, visible: val })} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Content Editable</Label>
                <p className="text-[10px] text-muted-foreground">Allow admins to edit page content</p>
              </div>
              <Switch checked={formData.contentEditable} onCheckedChange={(val) => setFormData({ ...formData, contentEditable: val })} />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} className="h-8 text-xs rounded-md">Cancel</Button>
            <Button size="sm" onClick={handleSavePage} className="h-8 text-xs rounded-md">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reorder Dialog */}
      <Dialog open={isReorderOpen} onOpenChange={setIsReorderOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl p-0 overflow-hidden border-border shadow-lg">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <DialogTitle className="text-lg font-semibold">Reorder Pages</DialogTitle>
            <DialogDescription className="text-xs">
              Change the order in which pages appear in the sidebar.
            </DialogDescription>
          </div>
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto space-y-2">
            {pages.map((page, index) => (
              <div key={page.id} className="flex items-center justify-between rounded-md border border-border p-2 bg-card">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-xs font-medium">{page.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => moveUp(index)}>
                    &uarr;
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === pages.length - 1} onClick={() => moveDown(index)}>
                    &darr;
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end">
            <Button size="sm" onClick={() => setIsReorderOpen(false)} className="h-8 text-xs rounded-md">Done</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
