import { useState } from 'react';
import { Card, CardContent } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import { Badge } from '@repo/ui/components/ui/badge';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@repo/ui/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@repo/ui/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { toast } from '@repo/ui/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, TrendingUp, Package, GripVertical, Download } from 'lucide-react';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';

import { ProfitableProduct } from '@repo/marketplace-core/features/ebay-content-library/types/content-library.types';
import { useProfitableProducts } from '@repo/marketplace-core/features/ebay-content-library/hooks/useProfitableProducts';

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
  tags: '', 
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

export function ProfitableAdminTable({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProfitableProduct | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    items,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
    reorderItems,
    isMutating,
  } = useProfitableProducts({ mode: 'admin', searchQuery });

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

  const handleSubmit = async () => {
    if (!formData.title) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }
    
    const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    const dataToSubmit: Partial<ProfitableProduct> = {
      ...formData,
      tags: tagsArray.length > 0 ? tagsArray : null,
    };

    try {
      if (editingItem) {
        await updateItem({ id: editingItem.id, data: dataToSubmit });
        toast({ title: 'Success', description: 'Product updated' });
      } else {
        await createItem(dataToSubmit);
        toast({ title: 'Success', description: 'Product created' });
      }
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      toast({ title: 'Success', description: 'Product deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    try {
      await updateItem({ id, data: { is_active } });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && items) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reorderedArray = arrayMove(items, oldIndex, newIndex);

      const updates = reorderedArray.map((item, index) => ({
        id: item.id,
        position: index + 1,
      }));

      try {
        await reorderItems(updates);
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  // Custom import mutation keeping the logic
  const importMutation = useMutation({
    mutationFn: async () => {
      const { data: mustSellItems, error: fetchError } = await (supabase.from('must_sell_items' as any) as any).select('*');
      if (fetchError) throw fetchError;

      if (!mustSellItems || mustSellItems.length === 0) {
        throw new Error('No items found in Must Sell Items to import.');
      }

      const { data: maxData } = await (supabase.from('profitable_products' as any) as any)
        .select('position')
        .order('position', { ascending: false })
        .limit(1);
      let currentPosition = (maxData?.[0]?.position ?? 0) + 1;

      const itemsToInsert = mustSellItems.map((item: any) => ({
        title: item.title,
        description: item.title, 
        image_url: item.image_url,
        price: item.price,
        shipping_cost: 0,
        profit: item.profit,
        stock: 0,
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
      queryClient.invalidateQueries({ queryKey: ['profitable-products'] });
      toast({ title: 'Success', description: `Successfully imported ${count} products.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-4 ${hideHeader ? 'justify-end' : 'justify-between'}`}>
        {!hideHeader && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profitable Products</h1>
            <p className="text-muted-foreground">Manage high-margin products. Drag to reorder.</p>
          </div>
        )}
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
                  <Label>Image URL</Label>
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
                <Button onClick={handleSubmit} disabled={isMutating}>
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
                          onDelete={handleDelete}
                          onToggleActive={handleToggleActive}
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
