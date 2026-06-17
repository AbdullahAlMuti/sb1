import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Edit2, Trash2, RefreshCw, Star } from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Badge } from '@repo/ui/components/ui/badge';
import { Switch } from '@repo/ui/components/ui/switch';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { PageHeader } from '@/core/ui/PageHeader';

interface PlanFeature {
  id: string;
  plan_id: string;
  group_name: string;
  title: string;
  description: string | null;
  display_value: string | null;
  included: boolean;
  tooltip: string | null;
  is_highlighted: boolean;
  sort_order: number;
}

interface FeatureForm {
  group_name: string;
  title: string;
  description: string;
  display_value: string;
  included: boolean;
  tooltip: string;
  is_highlighted: boolean;
  sort_order: number;
}

const DEFAULT_FORM: FeatureForm = {
  group_name: 'General',
  title: '',
  description: '',
  display_value: '',
  included: true,
  tooltip: '',
  is_highlighted: false,
  sort_order: 0,
};

export default function AdminPlanFeatures() {
  const { id: planId } = useParams<{ id: string }>();
  const [planName, setPlanName] = useState('');
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<PlanFeature | null>(null);
  const [deletingFeature, setDeletingFeature] = useState<PlanFeature | null>(null);
  const [form, setForm] = useState<FeatureForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (planId) {
      fetchPlan();
      fetchFeatures();
    }
  }, [planId]);

  const fetchPlan = async () => {
    const { data } = await supabase.from('plans').select('display_name').eq('id', planId!).maybeSingle();
    if (data) setPlanName(data.display_name);
  };

  const fetchFeatures = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('plan_features')
      .select('*')
      .eq('plan_id', planId!)
      .order('group_name')
      .order('sort_order');
    if (error) { toast.error('Failed to load features'); }
    else { setFeatures(data ?? []); }
    setIsLoading(false);
  };

  const openCreate = () => {
    setEditingFeature(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (f: PlanFeature) => {
    setEditingFeature(f);
    setForm({
      group_name: f.group_name,
      title: f.title,
      description: f.description ?? '',
      display_value: f.display_value ?? '',
      included: f.included,
      tooltip: f.tooltip ?? '',
      is_highlighted: f.is_highlighted,
      sort_order: f.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setIsSaving(true);
    const payload = {
      plan_id: planId!,
      group_name: form.group_name.trim() || 'General',
      title: form.title.trim(),
      description: form.description.trim() || null,
      display_value: form.display_value.trim() || null,
      included: form.included,
      tooltip: form.tooltip.trim() || null,
      is_highlighted: form.is_highlighted,
      sort_order: form.sort_order,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingFeature
      ? await supabase.from('plan_features').update(payload).eq('id', editingFeature.id)
      : await supabase.from('plan_features').insert({ ...payload });

    if (error) { toast.error('Failed to save feature'); }
    else {
      toast.success(editingFeature ? 'Feature updated' : 'Feature created');
      setDialogOpen(false);
      fetchFeatures();
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingFeature) return;
    const { error } = await supabase.from('plan_features').delete().eq('id', deletingFeature.id);
    if (error) { toast.error('Failed to delete feature'); }
    else { toast.success('Feature deleted'); fetchFeatures(); }
    setDeletingFeature(null);
  };

  // Group features by group_name for display
  const groups = features.reduce<Record<string, PlanFeature[]>>((acc, f) => {
    (acc[f.group_name] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/plans">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <PageHeader
            title="Plan Features"
            description={`${planName} — feature rows shown on pricing page`}
            actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Feature</Button>}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : features.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No features yet. Add the first one.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groups).map(([group, rows]) => (
          <Card key={group}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-muted-foreground uppercase tracking-wider">{group}</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 font-medium">Included</th>
                    <th className="pb-2 font-medium">Highlighted</th>
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{f.title}</span>
                        {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                      </td>
                      <td className="py-2 pr-4">{f.display_value ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={f.included ? 'default' : 'secondary'}>{f.included ? 'Yes' : 'No'}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {f.is_highlighted && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                      </td>
                      <td className="py-2 pr-4">{f.sort_order}</td>
                      <td className="py-2 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingFeature(f)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFeature ? 'Edit Feature' : 'Add Feature'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Group</Label>
                <Input value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} placeholder="e.g., Listings, Orders" />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Active listings" />
            </div>
            <div className="space-y-1">
              <Label>Display Value</Label>
              <Input value={form.display_value} onChange={(e) => setForm({ ...form, display_value: e.target.value })} placeholder="e.g., 500, Unlimited, 5 accounts" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional short description" />
            </div>
            <div className="space-y-1">
              <Label>Tooltip</Label>
              <Input value={form.tooltip} onChange={(e) => setForm({ ...form, tooltip: e.target.value })} placeholder="Shown on hover" />
            </div>
            <div className="flex gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={form.included} onCheckedChange={(v) => setForm({ ...form, included: v })} id="included" />
                <Label htmlFor="included">Included</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_highlighted} onCheckedChange={(v) => setForm({ ...form, is_highlighted: v })} id="highlighted" />
                <Label htmlFor="highlighted">Highlighted (shown in card)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFeature} onOpenChange={() => setDeletingFeature(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deletingFeature?.title}"? This will remove it from the pricing page immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
