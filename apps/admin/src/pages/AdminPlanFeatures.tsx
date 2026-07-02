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
import { mutateAdminPlanConfig } from '../lib/adminPlanConfig';

/* ─── Supabase Design Tokens ─── */
const sb = {
  primary: "#3ecf8e",
  primaryDeep: "#24b47e",
  ink: "#171717",
  inkMute: "#707070",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  hairline: "#dfdfdf",
  hairlineCool: "#ededed",
  onPrimary: "#171717",
} as const;

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

    try {
      await mutateAdminPlanConfig({
        resource: 'plan_features',
        action: editingFeature ? 'update' : 'create',
        id: editingFeature?.id,
        payload,
      });
      toast.success(editingFeature ? 'Feature updated' : 'Feature created');
      setDialogOpen(false);
      fetchFeatures();
    } catch (error) {
      console.error('Failed to save feature:', error);
      toast.error('Failed to save feature');
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingFeature) return;
    try {
      await mutateAdminPlanConfig({
        resource: 'plan_features',
        action: 'delete',
        id: deletingFeature.id,
      });
      toast.success('Feature deleted');
      fetchFeatures();
    } catch (error) {
      console.error('Failed to delete feature:', error);
      toast.error('Failed to delete feature');
    }
    setDeletingFeature(null);
  };

  // Group features by group_name for display
  const groups = features.reduce<Record<string, PlanFeature[]>>((acc, f) => {
    (acc[f.group_name] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/plans">
            <Button variant="ghost" size="icon" style={{ borderRadius: 6, color: sb.ink }}><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.42, color: sb.ink }} className="tracking-tight">Plan Features</h2>
            <p style={{ fontSize: 13, color: sb.inkMute }} className="mt-0.5">{planName} — feature rows shown on pricing page</p>
          </div>
        </div>
        <Button onClick={openCreate} style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6, fontWeight: 500 }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Feature
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin" style={{ color: sb.primary }} />
        </div>
      ) : features.length === 0 ? (
        <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12 }}>
          <CardContent className="py-16 text-center">
            <p style={{ color: sb.inkMute }}>No features yet. Add the first one.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groups).map(([group, rows]) => (
          <Card key={group} style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}>
            <CardHeader className="pb-2" style={{ background: sb.canvasSoft, borderBottom: `1px solid ${sb.hairlineCool}`, padding: "16px 20px" }}>
              <CardTitle style={{ fontSize: 13, color: sb.inkMute, fontWeight: 600 }} className="uppercase tracking-wider">{group}</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: 0 }}>
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/10" style={{ borderBottom: `1px solid ${sb.hairlineCool}` }}>
                      <td className="py-3 px-4 min-w-[200px]">
                        <span style={{ fontWeight: 500, fontSize: 14, color: sb.ink }}>{f.title}</span>
                        {f.description && <p style={{ fontSize: 12, color: sb.inkMute }} className="mt-0.5">{f.description}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono" style={{ color: sb.ink }}>{f.display_value ?? '—'}</td>
                      <td className="py-3 px-4">
                        {f.included ? (
                          <Badge style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6 }}>Yes</Badge>
                        ) : (
                          <Badge variant="secondary" style={{ borderRadius: 6 }}>No</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {f.is_highlighted && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono" style={{ color: sb.inkMute }}>{f.sort_order}</td>
                      <td className="py-3 px-4 flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" style={{ borderRadius: 6 }} onClick={() => openEdit(f)}>
                          <Edit2 className="h-3.5 w-3.5" style={{ color: sb.ink }} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-650" style={{ borderRadius: 6 }} onClick={() => setDeletingFeature(f)}>
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
        <DialogContent className="max-w-lg" style={{ borderRadius: 12, borderColor: sb.hairline }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, fontWeight: 500, color: sb.ink }}>{editingFeature ? 'Edit Feature' : 'Add Feature'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Group</Label>
                <Input value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} placeholder="e.g., Listings, Orders" style={{ borderRadius: 6, borderColor: sb.hairline }} />
              </div>
              <div className="space-y-1">
                <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} style={{ borderRadius: 6, borderColor: sb.hairline }} />
              </div>
            </div>
            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Active listings" style={{ borderRadius: 6, borderColor: sb.hairline }} />
            </div>
            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Display Value</Label>
              <Input value={form.display_value} onChange={(e) => setForm({ ...form, display_value: e.target.value })} placeholder="e.g., 500, Unlimited, 5 accounts" style={{ borderRadius: 6, borderColor: sb.hairline }} />
            </div>
            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional short description" style={{ borderRadius: 6, borderColor: sb.hairline }} />
            </div>
            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Tooltip</Label>
              <Input value={form.tooltip} onChange={(e) => setForm({ ...form, tooltip: e.target.value })} placeholder="Shown on hover" style={{ borderRadius: 6, borderColor: sb.hairline }} />
            </div>
            <div className="flex gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.included} onCheckedChange={(v) => setForm({ ...form, included: v })} id="included" />
                <Label htmlFor="included" style={{ fontSize: 13, color: sb.ink }}>Included</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_highlighted} onCheckedChange={(v) => setForm({ ...form, is_highlighted: v })} id="highlighted" />
                <Label htmlFor="highlighted" style={{ fontSize: 13, color: sb.ink }}>Highlighted (shown in card)</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6, fontWeight: 500 }}>
              {isSaving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFeature} onOpenChange={() => setDeletingFeature(null)}>
        <AlertDialogContent style={{ borderRadius: 12, borderColor: sb.hairline }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: sb.ink }}>Delete Feature</AlertDialogTitle>
            <AlertDialogDescription style={{ color: sb.inkMute }}>
              Delete "{deletingFeature?.title}"? This will remove it from the pricing page immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: "#ff2201", color: "#ffffff", borderRadius: 6 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
