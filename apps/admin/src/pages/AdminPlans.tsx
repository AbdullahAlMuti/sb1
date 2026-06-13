import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit2,
  Check,
  X,
  DollarSign,
  Sparkles,
  Package,
  ShoppingCart,
  Users,
  RefreshCw,
  Archive,
  List,
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
  stripe_price_id_one_time: string | null;
  feature_flags: Record<string, unknown>;
  sort_order: number;
  is_trial: boolean;
  is_popular: boolean;
  trial_duration_days: number;
  auto_orders_enabled: boolean;
  seo_enabled: boolean;
  max_seo_titles: number;
  max_seo_descriptions: number;
  order_reset_frequency: string;
  // New fields
  slug: string | null;
  short_description: string | null;
  long_description: string | null;
  best_for: string | null;
  badge_text: string | null;
  cta_text: string | null;
  is_public: boolean;
  trial_requires_card: boolean;
  stripe_product_id: string | null;
  archived_at: string | null;
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
  stripe_price_id_one_time: string;
  feature_flags: string;
  sort_order: number;
  is_trial: boolean;
  is_popular: boolean;
  trial_duration_days: number;
  auto_orders_enabled: boolean;
  seo_enabled: boolean;
  max_seo_titles: number;
  max_seo_descriptions: number;
  order_reset_frequency: string;
  // New fields
  slug: string;
  short_description: string;
  long_description: string;
  best_for: string;
  badge_text: string;
  cta_text: string;
  is_public: boolean;
  trial_requires_card: boolean;
  stripe_product_id: string;
}

export default function AdminPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [archivingPlan, setArchivingPlan] = useState<Plan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlansCallback = useCallback(() => {
    fetchPlans();
  }, []);

  useRealtimePlans(fetchPlansCallback);

  useEffect(() => {
    fetchPlans();
  }, [user]);

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
        stripe_price_id_one_time: (p as any).stripe_price_id_one_time ?? null,
        feature_flags: (p as any).feature_flags ?? {},
        sort_order: (p as any).sort_order ?? 0,
        is_trial: (p as any).is_trial ?? false,
        is_popular: (p as any).is_popular ?? false,
        trial_duration_days: (p as any).trial_duration_days ?? 14,
        auto_orders_enabled: (p as any).auto_orders_enabled ?? true,
        seo_enabled: (p as any).seo_enabled ?? true,
        max_seo_titles: (p as any).max_seo_titles ?? 0,
        max_seo_descriptions: (p as any).max_seo_descriptions ?? 0,
        order_reset_frequency: (p as any).order_reset_frequency ?? 'monthly',
        // New fields
        slug: (p as any).slug ?? null,
        short_description: (p as any).short_description ?? null,
        long_description: (p as any).long_description ?? null,
        best_for: (p as any).best_for ?? null,
        badge_text: (p as any).badge_text ?? null,
        cta_text: (p as any).cta_text ?? null,
        is_public: (p as any).is_public ?? true,
        trial_requires_card: (p as any).trial_requires_card ?? false,
        stripe_product_id: (p as any).stripe_product_id ?? null,
        archived_at: (p as any).archived_at ?? null,
      }));

      setPlans(mappedPlans);

      const { data: profiles } = await supabase.from('profiles').select('plan_id');

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
        stripe_price_id_one_time: formData.stripe_price_id_one_time || null,
        feature_flags: (() => { try { return JSON.parse(formData.feature_flags || '{}'); } catch { return {}; } })(),
        sort_order: formData.sort_order,
        is_trial: formData.is_trial,
        is_popular: formData.is_popular,
        trial_duration_days: formData.trial_duration_days,
        auto_orders_enabled: formData.auto_orders_enabled,
        seo_enabled: formData.seo_enabled,
        max_seo_titles: formData.max_seo_titles,
        max_seo_descriptions: formData.max_seo_descriptions,
        order_reset_frequency: formData.order_reset_frequency,
        // New fields
        slug: formData.slug.trim() || null,
        short_description: formData.short_description.trim() || null,
        long_description: formData.long_description.trim() || null,
        best_for: formData.best_for.trim() || null,
        badge_text: formData.badge_text.trim() || null,
        cta_text: formData.cta_text.trim() || null,
        is_public: formData.is_public,
        trial_requires_card: formData.trial_requires_card,
        stripe_product_id: formData.stripe_product_id.trim() || null,
      };

      if (editingPlan?.id) {
        const { error } = await supabase.from('plans').update(planData).eq('id', editingPlan.id);
        if (error) throw error;
        toast.success('Plan updated successfully');
      } else {
        const { error } = await supabase.from('plans').insert([planData]);
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

  const handleDeactivatePlan = async () => {
    if (!deletingPlan) return;
    try {
      const { error } = await supabase.from('plans').update({ is_active: false }).eq('id', deletingPlan.id);
      if (error) throw error;
      setDeletingPlan(null);
      fetchPlans();
      toast.success('Plan deactivated. Existing subscribers are unaffected.');
    } catch (error) {
      console.error('Error deactivating plan:', error);
      toast.error('Failed to deactivate plan');
    }
  };

  const handleArchivePlan = async () => {
    if (!archivingPlan) return;
    try {
      const { error } = await supabase
        .from('plans')
        .update({ archived_at: new Date().toISOString(), is_public: false })
        .eq('id', archivingPlan.id);
      if (error) throw error;
      setArchivingPlan(null);
      fetchPlans();
      toast.success('Plan archived and hidden from pricing page.');
    } catch (error) {
      console.error('Error archiving plan:', error);
      toast.error('Failed to archive plan');
    }
  };

  const togglePlanStatus = async (planId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from('plans').update({ is_active: !isActive }).eq('id', planId);
      if (error) throw error;
      setPlans(plans.map(p => p.id === planId ? { ...p, is_active: !isActive } : p));
      toast.success(`Plan ${!isActive ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    }
  };

  const getUserCount = (planId: string) => planStats.find(s => s.planId === planId)?.userCount || 0;
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
          <p className="text-muted-foreground mt-1">Configure pricing tiers and subscription features</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPlan(null)}>
              <Plus className="h-5 w-5 mr-2" />Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
              <DialogDescription>Configure the plan details and pricing</DialogDescription>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Card className={`relative ${!plan.is_active ? 'opacity-60' : ''} ${plan.archived_at ? 'border-dashed opacity-50' : ''} ${plan.is_popular ? 'border-primary' : ''}`}>
                {plan.badge_text && !plan.archived_at && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-accent">{plan.badge_text}</Badge>
                  </div>
                )}
                {plan.archived_at && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline"><Archive className="h-3 w-3 mr-1" />Archived</Badge>
                  </div>
                )}
                {plan.is_trial && !plan.archived_at && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="secondary">TRIAL</Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{plan.display_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{plan.slug ?? plan.name}</p>
                      {plan.short_description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{plan.short_description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditingPlan(plan); setIsDialogOpen(true); }}
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
                    <p className="text-sm text-muted-foreground">${plan.price_yearly}/year</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>{plan.credits_per_month} AI credits/mo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span>{plan.max_listings === -1 ? 'Unlimited' : plan.max_listings} listings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-amber-500" />
                      <span>{plan.max_auto_orders === -1 ? 'Unlimited' : plan.max_auto_orders} auto-orders/day</span>
                    </div>
                  </div>

                  {/* Sub-page links */}
                  <div className="flex gap-2">
                    <Link to={`/plans/${plan.id}/features`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <List className="h-3.5 w-3.5 mr-1.5" />Features
                      </Button>
                    </Link>
                    <Link to={`/plans/${plan.id}/prices`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />Prices
                      </Button>
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Subscribers</span>
                      <Badge variant="secondary">{getUserCount(plan.id)}</Badge>
                    </div>
                    {!plan.is_public && (
                      <p className="text-xs text-muted-foreground mt-1">Hidden from pricing page</p>
                    )}
                  </div>

                  {!plan.is_active && (
                    <div className="text-center">
                      <Badge variant="destructive">DISABLED</Badge>
                    </div>
                  )}

                  {plan.is_active && !plan.archived_at && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingPlan(plan)}
                      >
                        <X className="h-4 w-4 mr-1" />Deactivate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-muted-foreground hover:text-amber-600"
                        onClick={() => setArchivingPlan(plan)}
                      >
                        <Archive className="h-4 w-4 mr-1" />Archive
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate "{deletingPlan?.display_name}"? It will no longer appear on the pricing page.
              Existing subscribers keep access until their period ends. Plans are never deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivatePlan}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation */}
      <AlertDialog open={!!archivingPlan} onOpenChange={() => setArchivingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Archive "{archivingPlan?.display_name}"? This sets archived_at and hides it from the public pricing page.
              The plan record is preserved and existing subscribers are unaffected.
              You can unarchive by editing and clearing the archived_at field.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchivePlan} className="bg-amber-600 text-white hover:bg-amber-700">
              Archive
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
    stripe_price_id_one_time: plan?.stripe_price_id_one_time || '',
    feature_flags: plan?.feature_flags ? JSON.stringify(plan.feature_flags, null, 2) : '{}',
    sort_order: plan?.sort_order ?? 0,
    is_trial: plan?.is_trial ?? false,
    is_popular: plan?.is_popular ?? false,
    trial_duration_days: plan?.trial_duration_days ?? 14,
    auto_orders_enabled: plan?.auto_orders_enabled ?? true,
    seo_enabled: plan?.seo_enabled ?? true,
    max_seo_titles: plan?.max_seo_titles ?? 0,
    max_seo_descriptions: plan?.max_seo_descriptions ?? 0,
    order_reset_frequency: plan?.order_reset_frequency ?? 'monthly',
    // New fields
    slug: plan?.slug || '',
    short_description: plan?.short_description || '',
    long_description: plan?.long_description || '',
    best_for: plan?.best_for || '',
    badge_text: plan?.badge_text || '',
    cta_text: plan?.cta_text || '',
    is_public: plan?.is_public ?? true,
    trial_requires_card: plan?.trial_requires_card ?? false,
    stripe_product_id: plan?.stripe_product_id || '',
  });
  const [flagsError, setFlagsError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Internal Name</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., starter" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Display Name</Label>
          <Input id="display_name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} placeholder="e.g., Starter Plan" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL-safe)</Label>
          <Input id="slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="e.g., starter" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="badge_text">Badge Text</Label>
          <Input id="badge_text" value={formData.badge_text} onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })} placeholder="e.g., Most Popular, Best Value" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="short_description">Short Description</Label>
        <Input id="short_description" value={formData.short_description} onChange={(e) => setFormData({ ...formData, short_description: e.target.value })} placeholder="One-line plan pitch" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="long_description">Long Description</Label>
        <Textarea id="long_description" value={formData.long_description} onChange={(e) => setFormData({ ...formData, long_description: e.target.value })} rows={2} placeholder="Detailed description (optional)" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="best_for">Best For</Label>
          <Input id="best_for" value={formData.best_for} onChange={(e) => setFormData({ ...formData, best_for: e.target.value })} placeholder="e.g., Growing sellers" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cta_text">CTA Button Text</Label>
          <Input id="cta_text" value={formData.cta_text} onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })} placeholder="e.g., Get Started with Starter" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price_monthly">Monthly Price ($)</Label>
          <Input id="price_monthly" type="number" step="0.01" min="0" value={formData.price_monthly} onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price_yearly">Yearly Price ($)</Label>
          <Input id="price_yearly" type="number" step="0.01" min="0" value={formData.price_yearly} onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="credits">Credits/Month</Label>
          <Input id="credits" type="number" min="0" value={formData.credits_per_month} onChange={(e) => setFormData({ ...formData, credits_per_month: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="listings">Max Listings (-1 = ∞)</Label>
          <Input id="listings" type="number" min="-1" value={formData.max_listings} onChange={(e) => setFormData({ ...formData, max_listings: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="orders">Max Orders/Day</Label>
          <Input id="orders" type="number" min="-1" value={formData.max_auto_orders} onChange={(e) => setFormData({ ...formData, max_auto_orders: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="features">Features (one per line)</Label>
        <Textarea id="features" value={formData.features} onChange={(e) => setFormData({ ...formData, features: e.target.value })} placeholder="Priority support&#10;Advanced analytics" rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stripe_monthly">Stripe Monthly Price ID</Label>
          <Input id="stripe_monthly" value={formData.stripe_price_id_monthly} onChange={(e) => setFormData({ ...formData, stripe_price_id_monthly: e.target.value })} placeholder="price_..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stripe_yearly">Stripe Yearly Price ID</Label>
          <Input id="stripe_yearly" value={formData.stripe_price_id_yearly} onChange={(e) => setFormData({ ...formData, stripe_price_id_yearly: e.target.value })} placeholder="price_..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stripe_one_time">Stripe One-Time Price ID (trial $1)</Label>
          <Input id="stripe_one_time" value={formData.stripe_price_id_one_time} onChange={(e) => setFormData({ ...formData, stripe_price_id_one_time: e.target.value })} placeholder="price_..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stripe_product_id">Stripe Product ID</Label>
          <Input id="stripe_product_id" value={formData.stripe_product_id} onChange={(e) => setFormData({ ...formData, stripe_product_id: e.target.value })} placeholder="prod_..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input id="sort_order" type="number" min="0" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="order_reset">Order Reset Frequency</Label>
          <select id="order_reset" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.order_reset_frequency} onChange={(e) => setFormData({ ...formData, order_reset_frequency: e.target.value })}>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="never">Never (Accumulating)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feature_flags">Feature Flags (JSON)</Label>
        <Textarea
          id="feature_flags"
          value={formData.feature_flags}
          onChange={(e) => {
            setFormData({ ...formData, feature_flags: e.target.value });
            try { JSON.parse(e.target.value); setFlagsError(''); } catch { setFlagsError('Invalid JSON'); }
          }}
          placeholder='{"bulk_lister": true, "ai_product_research": false}'
          rows={5}
          className="font-mono text-xs"
        />
        {flagsError && <p className="text-xs text-destructive">{flagsError}</p>}
        <p className="text-xs text-muted-foreground">Keys: bulk_lister, price_monitoring, top_selling_products, ai_product_research, profitable_products, priority_support</p>
      </div>

      {/* Toggles */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-3">Plan Configuration</h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'is_trial', label: 'Trial Plan', field: 'is_trial' as const },
            { id: 'is_popular', label: 'Most Popular', field: 'is_popular' as const },
            { id: 'is_public', label: 'Publicly visible', field: 'is_public' as const },
            { id: 'trial_requires_card', label: 'Trial requires card', field: 'trial_requires_card' as const },
            { id: 'auto_orders_enabled', label: 'Auto-Orders Enabled', field: 'auto_orders_enabled' as const },
            { id: 'seo_enabled', label: 'SEO Tools Enabled', field: 'seo_enabled' as const },
          ].map(({ id, label, field }) => (
            <div key={id} className="flex items-center gap-2">
              <Switch id={id} checked={Boolean(formData[field])} onCheckedChange={(checked) => setFormData({ ...formData, [field]: checked })} />
              <Label htmlFor={id}>{label}</Label>
            </div>
          ))}
        </div>

        {formData.is_trial && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="trial_duration">Trial Duration (days)</Label>
            <Input id="trial_duration" type="number" min="1" max="365" value={formData.trial_duration_days} onChange={(e) => setFormData({ ...formData, trial_duration_days: parseInt(e.target.value) || 14 })} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
        <Label htmlFor="is_active">Plan is active</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</>
          ) : (
            plan ? 'Update Plan' : 'Create Plan'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
