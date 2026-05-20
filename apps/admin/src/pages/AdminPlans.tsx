import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  DollarSign,
  Sparkles,
  Package,
  ShoppingCart,
  Users,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CreditCard,
} from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Badge } from '@repo/ui/components/ui/badge';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Switch } from '@repo/ui/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useRealtimePlans } from '@repo/api-client/hooks/useRealtimeSync';
import { useAuth } from '@repo/auth/hooks/useAuth';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  credits_per_month: number;
  max_listings: number;
  max_auto_orders: number;
  features: string[] | null;
  is_active: boolean;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  // New dynamic fields
  is_trial: boolean;
  is_popular: boolean;
  trial_duration_days: number;
  auto_orders_enabled: boolean;
  seo_enabled: boolean;
  max_seo_titles: number;
  max_seo_descriptions: number;
  order_reset_frequency: string;
}

interface PlanStats {
  planId: string;
  userCount: number;
}

interface PlanFormData {
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  credits_per_month: number;
  max_listings: number;
  max_auto_orders: number;
  features: string;
  is_active: boolean;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
  // New dynamic fields
  is_trial: boolean;
  is_popular: boolean;
  trial_duration_days: number;
  auto_orders_enabled: boolean;
  seo_enabled: boolean;
  max_seo_titles: number;
  max_seo_descriptions: number;
  order_reset_frequency: string;
}

export default function AdminPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);
  const [adminCredits, setAdminCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlansCallback = useCallback(() => {
    fetchPlans();
  }, []);

  // Subscribe to realtime plan changes
  useRealtimePlans(fetchPlansCallback);

  useEffect(() => {
    fetchPlans();
    fetchAdminCredits();
  }, [user]);

  const fetchAdminCredits = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setAdminCredits(data.credits ?? 0);
      }
    } catch (error) {
      console.error('Error fetching admin credits:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      
      const mappedPlans: Plan[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        display_name: p.display_name,
        price_monthly: p.price_monthly ?? 0,
        price_yearly: p.price_yearly ?? 0,
        credits_per_month: p.credits_per_month ?? 0,
        max_listings: p.max_listings ?? 10,
        max_auto_orders: p.max_auto_orders ?? 0,
        features: Array.isArray(p.features) ? p.features as string[] : null,
        is_active: p.is_active ?? true,
        stripe_price_id_monthly: p.stripe_price_id_monthly,
        stripe_price_id_yearly: p.stripe_price_id_yearly,
        // New dynamic fields
        is_trial: (p as any).is_trial ?? false,
        is_popular: (p as any).is_popular ?? false,
        trial_duration_days: (p as any).trial_duration_days ?? 14,
        auto_orders_enabled: (p as any).auto_orders_enabled ?? true,
        seo_enabled: (p as any).seo_enabled ?? true,
        max_seo_titles: (p as any).max_seo_titles ?? 0,
        max_seo_descriptions: (p as any).max_seo_descriptions ?? 0,
        order_reset_frequency: (p as any).order_reset_frequency ?? 'monthly',
      }));
      
      setPlans(mappedPlans);

      // Fetch user counts per plan
      const { data: profiles } = await supabase
        .from('profiles')
        .select('plan_id');

      if (profiles) {
        const stats: PlanStats[] = mappedPlans.map(plan => ({
          planId: plan.id,
          userCount: profiles.filter(p => p.plan_id === plan.id).length
        }));
        setPlanStats(stats);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to fetch plans');
    } finally {
      setIsLoading(false);
    }
  };

  // Deduct 1 credit from admin and log usage
  const deductCreditForEdit = async (planId: string, planName: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Get current credits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const currentCredits = profile?.credits ?? 0;
      
      if (currentCredits < 1) {
        toast.error('Insufficient credits. You need at least 1 credit to edit a plan.');
        return false;
      }

      // Deduct 1 credit
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: currentCredits - 1 })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Log the usage
      const { error: logError } = await supabase
        .from('usage_logs')
        .insert({
          user_id: user.id,
          action: 'plan_edit',
          resource: `plan:${planId}`,
          metadata: {
            plan_name: planName,
            credits_deducted: 1,
            credits_remaining: currentCredits - 1,
            timestamp: new Date().toISOString()
          }
        });

      if (logError) {
        console.error('Failed to log usage:', logError);
        // Don't fail the operation if logging fails
      }

      // Update local state
      setAdminCredits(currentCredits - 1);
      
      return true;
    } catch (error) {
      console.error('Error deducting credit:', error);
      toast.error('Failed to deduct credit');
      return false;
    }
  };

  const handleSavePlan = async (formData: PlanFormData) => {
    setIsSaving(true);
    try {
      const featuresArray = formData.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const planData = {
        name: formData.name,
        display_name: formData.display_name,
        price_monthly: formData.price_monthly,
        price_yearly: formData.price_yearly,
        credits_per_month: formData.credits_per_month,
        max_listings: formData.max_listings,
        max_auto_orders: formData.max_auto_orders,
        features: featuresArray,
        is_active: formData.is_active,
        stripe_price_id_monthly: formData.stripe_price_id_monthly || null,
        stripe_price_id_yearly: formData.stripe_price_id_yearly || null,
        // New dynamic fields
        is_trial: formData.is_trial,
        is_popular: formData.is_popular,
        trial_duration_days: formData.trial_duration_days,
        auto_orders_enabled: formData.auto_orders_enabled,
        seo_enabled: formData.seo_enabled,
        max_seo_titles: formData.max_seo_titles,
        max_seo_descriptions: formData.max_seo_descriptions,
        order_reset_frequency: formData.order_reset_frequency,
      };

      if (editingPlan?.id) {
        // Deduct credit for editing
        const creditDeducted = await deductCreditForEdit(editingPlan.id, formData.name);
        if (!creditDeducted) {
          setIsSaving(false);
          return;
        }

        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        toast.success('Plan updated successfully (1 credit deducted)');
      } else {
        const { error } = await supabase
          .from('plans')
          .insert([planData]);

        if (error) throw error;
        toast.success('Plan created successfully');
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!deletingPlan) return;

    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', deletingPlan.id);

      if (error) throw error;

      setDeletingPlan(null);
      fetchPlans();
      toast.success('Plan deleted successfully');
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const togglePlanStatus = async (planId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({ is_active: !isActive })
        .eq('id', planId);

      if (error) throw error;

      setPlans(plans.map(p => 
        p.id === planId ? { ...p, is_active: !isActive } : p
      ));

      toast.success(`Plan ${!isActive ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    }
  };

  const getUserCount = (planId: string) => {
    return planStats.find(s => s.planId === planId)?.userCount || 0;
  };

  const totalUsers = planStats.reduce((sum, s) => sum + s.userCount, 0);
  const totalMRR = plans.reduce((sum, p) => sum + (p.price_monthly * getUserCount(p.id)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Plan Management</h1>
          <p className="text-muted-foreground mt-1">
            Configure pricing tiers and subscription features
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPlan(null)}>
              <Plus className="h-5 w-5 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </DialogTitle>
              <DialogDescription>
                Configure the plan details and pricing
              </DialogDescription>
            </DialogHeader>
            <PlanForm
              plan={editingPlan}
              onSave={handleSavePlan}
              onCancel={() => setIsDialogOpen(false)}
              isSaving={isSaving}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Plans</p>
                <p className="text-3xl font-bold">{plans.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subscribed Users</p>
                <p className="text-3xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated MRR</p>
                <p className="text-3xl font-bold">${totalMRR.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Credits</p>
                <p className="text-3xl font-bold">{adminCredits ?? 0}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">1 credit per edit</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-2">No plans created yet</p>
          </div>
        ) : (
          plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative ${!plan.is_active ? 'opacity-60' : ''} ${plan.is_popular ? 'border-primary' : ''}`}>
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-accent">POPULAR</Badge>
                  </div>
                )}
                {plan.is_trial && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="secondary">TRIAL</Badge>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{plan.display_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{plan.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingPlan(plan);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                      >
                        {plan.is_active ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <Check className="h-4 w-4 text-success" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">${plan.price_monthly}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${plan.price_yearly}/year
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>{plan.credits_per_month} AI credits/mo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span>
                        {plan.max_listings === -1 ? 'Unlimited' : plan.max_listings} listings
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-amber-500" />
                      <span>
                        {plan.max_auto_orders === -1 ? 'Unlimited' : plan.max_auto_orders} auto-orders/day
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Subscribers</span>
                      <Badge variant="secondary">{getUserCount(plan.id)}</Badge>
                    </div>
                  </div>

                  {!plan.is_active && (
                    <div className="text-center">
                      <Badge variant="destructive">DISABLED</Badge>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => setDeletingPlan(plan)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Plan
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPlan?.display_name}"? 
              This action cannot be undone. Users on this plan will need to be migrated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Plan Form Component
function PlanForm({
  plan,
  onSave,
  onCancel,
  isSaving,
}: {
  plan: Plan | null;
  onSave: (formData: PlanFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<PlanFormData>({
    name: plan?.name || '',
    display_name: plan?.display_name || '',
    price_monthly: plan?.price_monthly || 0,
    price_yearly: plan?.price_yearly || 0,
    credits_per_month: plan?.credits_per_month || 5,
    max_listings: plan?.max_listings || 10,
    max_auto_orders: plan?.max_auto_orders || 0,
    features: plan?.features?.join('\n') || '',
    is_active: plan?.is_active ?? true,
    stripe_price_id_monthly: plan?.stripe_price_id_monthly || '',
    stripe_price_id_yearly: plan?.stripe_price_id_yearly || '',
    // New dynamic fields
    is_trial: plan?.is_trial ?? false,
    is_popular: plan?.is_popular ?? false,
    trial_duration_days: plan?.trial_duration_days ?? 14,
    auto_orders_enabled: plan?.auto_orders_enabled ?? true,
    seo_enabled: plan?.seo_enabled ?? true,
    max_seo_titles: plan?.max_seo_titles ?? 0,
    max_seo_descriptions: plan?.max_seo_descriptions ?? 0,
    order_reset_frequency: plan?.order_reset_frequency ?? 'monthly',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Internal Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., starter"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Display Name</Label>
          <Input
            id="display_name"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="e.g., Starter Plan"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price_monthly">Monthly Price ($)</Label>
          <Input
            id="price_monthly"
            type="number"
            step="0.01"
            min="0"
            value={formData.price_monthly}
            onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_yearly">Yearly Price ($)</Label>
          <Input
            id="price_yearly"
            type="number"
            step="0.01"
            min="0"
            value={formData.price_yearly}
            onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="credits">Credits/Month</Label>
          <Input
            id="credits"
            type="number"
            min="0"
            value={formData.credits_per_month}
            onChange={(e) => setFormData({ ...formData, credits_per_month: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="listings">Max Listings (-1 = ∞)</Label>
          <Input
            id="listings"
            type="number"
            min="-1"
            value={formData.max_listings}
            onChange={(e) => setFormData({ ...formData, max_listings: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="orders">Max Orders/Day</Label>
          <Input
            id="orders"
            type="number"
            min="-1"
            value={formData.max_auto_orders}
            onChange={(e) => setFormData({ ...formData, max_auto_orders: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="features">Features (one per line)</Label>
        <Textarea
          id="features"
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
          placeholder="Priority support&#10;Advanced analytics&#10;Custom integrations"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stripe_monthly">Stripe Monthly Price ID</Label>
          <Input
            id="stripe_monthly"
            value={formData.stripe_price_id_monthly}
            onChange={(e) => setFormData({ ...formData, stripe_price_id_monthly: e.target.value })}
            placeholder="price_..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stripe_yearly">Stripe Yearly Price ID</Label>
          <Input
            id="stripe_yearly"
            value={formData.stripe_price_id_yearly}
            onChange={(e) => setFormData({ ...formData, stripe_price_id_yearly: e.target.value })}
            placeholder="price_..."
          />
        </div>
      </div>

      {/* New Dynamic Fields Section */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">Plan Configuration</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Switch
              id="is_trial"
              checked={formData.is_trial}
              onCheckedChange={(checked) => setFormData({ ...formData, is_trial: checked })}
            />
            <Label htmlFor="is_trial">Trial Plan</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="is_popular"
              checked={formData.is_popular}
              onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
            />
            <Label htmlFor="is_popular">Most Popular</Label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto_orders_enabled"
              checked={formData.auto_orders_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_orders_enabled: checked })}
            />
            <Label htmlFor="auto_orders_enabled">Auto-Orders Enabled</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="seo_enabled"
              checked={formData.seo_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, seo_enabled: checked })}
            />
            <Label htmlFor="seo_enabled">SEO Tools Enabled</Label>
          </div>
        </div>

        {formData.is_trial && (
          <div className="space-y-2 mb-4">
            <Label htmlFor="trial_duration">Trial Duration (days)</Label>
            <Input
              id="trial_duration"
              type="number"
              min="1"
              max="365"
              value={formData.trial_duration_days}
              onChange={(e) => setFormData({ ...formData, trial_duration_days: parseInt(e.target.value) || 14 })}
            />
          </div>
        )}

        {formData.seo_enabled && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="max_seo_titles">Max SEO Titles</Label>
              <Input
                id="max_seo_titles"
                type="number"
                min="0"
                value={formData.max_seo_titles}
                onChange={(e) => setFormData({ ...formData, max_seo_titles: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_seo_descriptions">Max SEO Descriptions</Label>
              <Input
                id="max_seo_descriptions"
                type="number"
                min="0"
                value={formData.max_seo_descriptions}
                onChange={(e) => setFormData({ ...formData, max_seo_descriptions: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="order_reset">Order Reset Frequency</Label>
          <select
            id="order_reset"
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.order_reset_frequency}
            onChange={(e) => setFormData({ ...formData, order_reset_frequency: e.target.value })}
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="never">Never (Accumulating)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Plan is active</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            plan ? 'Update Plan' : 'Create Plan'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
