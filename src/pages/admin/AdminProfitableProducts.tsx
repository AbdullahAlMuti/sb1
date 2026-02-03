import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, TrendingUp, Package, GripVertical, Tag, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProfitableProduct {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
  shipping_cost: number;
  profit: number;
  stock: number;
  sales_count: number;
  total_sold: number;
  sku: string | null;
  tags: string[] | null;
  discount: number | null;
  country: string;
  category: string | null;
  ebay_url: string | null;
  is_active: boolean;
  created_at: string;
  position: number;
}

const emptyFormData = {
  title: '',
  description: '',
  image_url: '',
  price: 0,
  shipping_cost: 0,
  profit: 0,
  stock: 0,
  sales_count: 0,
  total_sold: 0,
  sku: '',
  tags: '', // Managed as comma-separated string in form
  discount: 0,
  country: 'US',
  category: '',
  ebay_url: '',
  is_active: true,
};

interface SortableRowProps {
  item: ProfitableProduct;
  onEdit: (item: ProfitableProduct) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, is_active: boolean) => void;
}

function SortableRow({ item, onEdit, onDelete, onToggleActive }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : ''}>
      <TableCell>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-12 h-10 rounded overflow-hidden bg-muted flex items-center justify-center">
            {item.image_url ? (
              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="h-4 w-4" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium line-clamp-1 max-w-[200px]">{item.title}</span>
            {item.sku && <span className="text-xs text-muted-foreground">{item.sku}</span>}
          </div>
        </div>
      </TableCell>
      <TableCell>${item.price.toFixed(2)}</TableCell>
      <TableCell className="text-green-600">${item.profit.toFixed(2)}</TableCell>
      <TableCell>{item.stock}</TableCell>
      <TableCell>{item.total_sold}</TableCell>
      <TableCell>
        <Badge variant="outline">{item.country}</Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={item.is_active}
          onCheckedChange={(checked) => onToggleActive(item.id, checked)}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-destructive">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AdminProfitableProducts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProfitableProduct | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-profitable-products', searchQuery],
    queryFn: async () => {
      let query = (supabase.from('profitable_products' as any) as any)
        .select('*')
        .order('position', { ascending: true });
      if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as ProfitableProduct[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Get max position to add at the end
      const { data: maxData } = await (supabase.from('profitable_products' as any) as any)
        .select('position')
        .order('position', { ascending: false })
        .limit(1);
      const maxPosition = maxData?.[0]?.position ?? 0;

      const tagsArray = data.tags.split(',').map(t => t.trim()).filter(Boolean);

      const { error } = await (supabase.from('profitable_products' as any) as any).insert({
        title: data.title,
        description: data.description || null,
        image_url: data.image_url || null,
        price: data.price,
        shipping_cost: data.shipping_cost,
        profit: data.profit,
        stock: data.stock,
        sales_count: data.sales_count, // Keeping logic same as original "items sold"
        total_sold: data.total_sold,
        sku: data.sku || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        discount: data.discount || 0,
        country: data.country,
        category: data.category || null,
        ebay_url: data.ebay_url || null,
        is_active: data.is_active,
        position: maxPosition + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profitable-products'] });
      toast({ title: 'Success', description: 'Product created successfully' });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const tagsArray = data.tags.split(',').map(t => t.trim()).filter(Boolean);

      const { error } = await (supabase.from('profitable_products' as any) as any).update({
        title: data.title,
        description: data.description || null,
        image_url: data.image_url || null,
        price: data.price,
        shipping_cost: data.shipping_cost,
        profit: data.profit,
        stock: data.stock,
        sales_count: data.sales_count,
        total_sold: data.total_sold,
        sku: data.sku || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        discount: data.discount || 0,
        country: data.country,
        category: data.category || null,
        ebay_url: data.ebay_url || null,
        is_active: data.is_active,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profitable-products'] });
      toast({ title: 'Success', description: 'Product updated' });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('profitable_products' as any) as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profitable-products'] });
      toast({ title: 'Success', description: 'Product deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from('profitable_products' as any) as any).update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profitable-products'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedItems: { id: string; position: number }[]) => {
      // Update positions in batch
      const promises = reorderedItems.map(({ id, position }) =>
        (supabase.from('profitable_products' as any) as any).update({ position }).eq('id', id)
      );
      const results = await Promise.all(promises);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey: ['admin-profitable-products'] });
    },
  });

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: ProfitableProduct) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      image_url: item.image_url || '',
      price: item.price,
      shipping_cost: item.shipping_cost,
      profit: item.profit,
      stock: item.stock,
      sales_count: item.sales_count,
      total_sold: item.total_sold,
      sku: item.sku || '',
      tags: item.tags ? item.tags.join(', ') : '',
      discount: item.discount || 0,
      country: item.country,
      category: item.category || '',
      ebay_url: item.ebay_url || '',
      is_active: item.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const { data: mustSellItems, error: fetchError } = await (supabase.from('must_sell_items' as any) as any).select('*');
      if (fetchError) throw fetchError;

      if (!mustSellItems || mustSellItems.length === 0) {
        throw new Error('No items found in Must Sell Items to import.');
      }

      // Get max position
      const { data: maxData } = await (supabase.from('profitable_products' as any) as any)
        .select('position')
        .order('position', { ascending: false })
        .limit(1);
      let currentPosition = (maxData?.[0]?.position ?? 0) + 1;

      // Prepare items for insertion
      const itemsToInsert = mustSellItems.map((item: any) => ({
        title: item.title,
        description: item.title, // Default description to title
        image_url: item.image_url,
        price: item.price,
        shipping_cost: 0, // Default
        profit: item.profit,
        stock: 0, // Default
        sales_count: item.sales_count,
        total_sold: item.total_sold,
        sku: null,
        tags: null,
        discount: 0,
        country: item.country,
        category: item.category,
        ebay_url: item.ebay_url,
        is_active: item.is_active,
        position: currentPosition++,
      }));

      const { error: insertError } = await (supabase.from('profitable_products' as any) as any).insert(itemsToInsert);
      if (insertError) throw insertError;

      return itemsToInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profitable-products'] });
      toast({ title: 'Success', description: `Successfully imported ${count} products.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && items) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);

      // Optimistically update the cache
      queryClient.setQueryData(['admin-profitable-products', searchQuery], reorderedItems);

      // Prepare position updates
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        position: index + 1,
      }));

      reorderMutation.mutate(updates);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profitable Products</h1>
          <p className="text-muted-foreground">Manage high-margin products. Drag to reorder.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm('Are you sure you want to import all items from Must Sell Items? This will create duplicates if they already exist.')) {
                importMutation.mutate();
              }
            }}
            disabled={importMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {importMutation.isPending ? 'Importing...' : 'Import Must-Sell'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>

                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[80px]"
                    placeholder="Product highlights and details..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Image URL (or upload logic if available)</Label>
                  <div className="flex gap-2">
                    <Input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
                    {formData.image_url && <img src={formData.image_url} alt="Preview" className="w-10 h-10 object-cover rounded border" />}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Price ($)</Label>
                    <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Profit ($)</Label>
                    <Input type="number" step="0.01" value={formData.profit} onChange={(e) => setFormData({ ...formData, profit: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Shipping ($)</Label>
                    <Input type="number" step="0.01" value={formData.shipping_cost} onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Stock Qty</Label>
                    <Input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Items Sold</Label>
                    <Input type="number" value={formData.sales_count} onChange={(e) => setFormData({ ...formData, sales_count: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Total Sold</Label>
                    <Input type="number" value={formData.total_sold} onChange={(e) => setFormData({ ...formData, total_sold: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>SKU</Label>
                    <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="e.g. PROD-001" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Discount (%)</Label>
                    <Input type="number" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} placeholder="Optional" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Tags</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Comma separated tags e.g. Best Seller, Summer, New"
                  />
                  <p className="text-[10px] text-muted-foreground">Separate multiple tags with commas</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Country</Label>
                    <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">🇺🇸 US</SelectItem>
                        <SelectItem value="UK">🇬🇧 UK</SelectItem>
                        <SelectItem value="DE">🇩🇪 DE</SelectItem>
                        <SelectItem value="AU">🇦🇺 AU</SelectItem>
                        <SelectItem value="CA">🇨🇦 CA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>eBay URL</Label>
                  <Input value={formData.ebay_url} onChange={(e) => setFormData({ ...formData, ebay_url: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label>Publish to Dashboard</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? 'Update Product' : 'Create Product'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No products found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={items?.map((item) => item.id) ?? []}
                      strategy={verticalListSortingStrategy}
                    >
                      {items?.map((item) => (
                        <SortableRow
                          key={item.id}
                          item={item}
                          onEdit={handleEdit}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onToggleActive={(id, is_active) => toggleActiveMutation.mutate({ id, is_active })}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
