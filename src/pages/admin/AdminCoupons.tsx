import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Edit, 
  Copy, 
  Check,
  Calendar,
  Percent,
  DollarSign,
  Users,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_one_time_per_user: boolean;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  applicable_plans: string[];
  created_at: string;
}

interface CouponFormData {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number;
  usage_limit: number;
  is_one_time_per_user: boolean;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  applicable_plans: string[];
}

const defaultFormData: CouponFormData = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: 0,
  max_discount_amount: 0,
  usage_limit: 0,
  is_one_time_per_user: true,
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
  is_active: true,
  applicable_plans: [],
};

export default function AdminCoupons() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(defaultFormData);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [plans, setPlans] = useState<{ id: string; name: string; display_name: string }[]>([]);

  useEffect(() => {
    fetchCoupons();
    fetchPlans();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data as Coupon[]) || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: "Error",
        description: "Failed to fetch coupons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, display_name')
        .eq('is_active', true);

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SS';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const couponData = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        min_order_amount: formData.min_order_amount || null,
        max_discount_amount: formData.max_discount_amount || null,
        usage_limit: formData.usage_limit || null,
        is_one_time_per_user: formData.is_one_time_per_user,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active,
        applicable_plans: formData.applicable_plans.length > 0 ? formData.applicable_plans : null,
      };

      if (editingCoupon) {
        const { error } = await (supabase as any)
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;
        toast({ title: "Success", description: "Coupon updated successfully" });
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await (supabase as any)
          .from('coupons')
          .insert({ ...couponData, created_by: userData.user?.id });

        if (error) throw error;
        toast({ title: "Success", description: "Coupon created successfully" });
      }

      setDialogOpen(false);
      setEditingCoupon(null);
      setFormData(defaultFormData);
      fetchCoupons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save coupon",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type as 'percentage' | 'fixed',
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || 0,
      max_discount_amount: coupon.max_discount_amount || 0,
      usage_limit: coupon.usage_limit || 0,
      is_one_time_per_user: coupon.is_one_time_per_user,
      valid_from: coupon.valid_from.split('T')[0],
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      is_active: coupon.is_active,
      applicable_plans: coupon.applicable_plans || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const { error } = await (supabase as any)
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Coupon deleted successfully" });
      fetchCoupons();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete coupon",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('coupons')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchCoupons();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update coupon status",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) return { label: 'Inactive', variant: 'secondary' as const };
    
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    if (now < validFrom) return { label: 'Scheduled', variant: 'outline' as const };
    if (validUntil && now > validUntil) return { label: 'Expired', variant: 'destructive' as const };
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return { label: 'Limit Reached', variant: 'destructive' as const };
    }
    return { label: 'Active', variant: 'default' as const };
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Ticket className="h-8 w-8 text-primary" />
                Coupon Management
              </h1>
              <p className="text-muted-foreground">Create and manage discount coupons</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingCoupon(null);
              setFormData(defaultFormData);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Coupon Code */}
                <div className="space-y-2">
                  <Label htmlFor="code">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., SAVE20"
                      required
                      className="uppercase"
                    />
                    <Button type="button" variant="outline" onClick={generateCouponCode}>
                      Generate
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Holiday special discount"
                  />
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: 'percentage' | 'fixed') => 
                        setFormData(prev => ({ ...prev, discount_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_value">
                      Discount Value {formData.discount_type === 'percentage' ? '(%)' : '($)'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>

                {/* Min Order & Max Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_order_amount">Min Order Amount ($)</Label>
                    <Input
                      id="min_order_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.min_order_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_order_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0 = No minimum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_discount_amount">Max Discount ($)</Label>
                    <Input
                      id="max_discount_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.max_discount_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_discount_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0 = No cap"
                    />
                  </div>
                </div>

                {/* Usage Limit */}
                <div className="space-y-2">
                  <Label htmlFor="usage_limit">Total Usage Limit</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    min="0"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: parseInt(e.target.value) || 0 }))}
                    placeholder="0 = Unlimited"
                  />
                </div>

                {/* One-time per user */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>One-time per user</Label>
                    <p className="text-sm text-muted-foreground">Each user can only use this coupon once</p>
                  </div>
                  <Switch
                    checked={formData.is_one_time_per_user}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_one_time_per_user: checked }))}
                  />
                </div>

                {/* Validity Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valid_from">Valid From</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Valid Until (Optional)</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">Enable or disable this coupon</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Coupons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coupons.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {coupons.filter(c => c.is_active && (!c.valid_until || new Date(c.valid_until) > new Date())).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Redemptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {coupons.reduce((sum, c) => sum + c.used_count, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {coupons.filter(c => c.valid_until && new Date(c.valid_until) < new Date()).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coupons Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No coupons yet. Create your first coupon!</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                              {coupon.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(coupon.code)}
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {coupon.description && (
                            <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {coupon.discount_type === 'percentage' ? (
                              <>
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                <span>{coupon.discount_value}%</span>
                              </>
                            ) : (
                              <>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span>${coupon.discount_value}</span>
                              </>
                            )}
                          </div>
                          {coupon.max_discount_amount && (
                            <p className="text-xs text-muted-foreground">Max: ${coupon.max_discount_amount}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{coupon.used_count}</span>
                            {coupon.usage_limit && (
                              <span className="text-muted-foreground">/ {coupon.usage_limit}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(coupon.valid_from).toLocaleDateString()}</span>
                            {coupon.valid_until && (
                              <>
                                <span>-</span>
                                <span>{new Date(coupon.valid_until).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Switch
                              checked={coupon.is_active}
                              onCheckedChange={() => handleToggleActive(coupon.id, coupon.is_active)}
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
