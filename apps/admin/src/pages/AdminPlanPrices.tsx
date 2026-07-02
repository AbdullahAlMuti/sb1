import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Badge } from '@repo/ui/components/ui/badge';
import { Switch } from '@repo/ui/components/ui/switch';
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

type Interval = 'monthly' | 'yearly' | 'one_time';

interface PlanPrice {
  id: string;
  plan_id: string;
  interval: Interval;
  currency: string;
  amount: number;
  compare_at_amount: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface PriceForm {
  interval: Interval;
  currency: string;
  amount: string;
  compare_at_amount: string;
  stripe_price_id: string;
  is_active: boolean;
}

const DEFAULT_FORM: PriceForm = {
  interval: 'monthly',
  currency: 'usd',
  amount: '',
  compare_at_amount: '',
  stripe_price_id: '',
  is_active: true,
};

const INTERVAL_LABELS: Record<Interval, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  one_time: 'One-time',
};

export default function AdminPlanPrices() {
  const { id: planId } = useParams<{ id: string }>();
  const [planName, setPlanName] = useState('');
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PlanPrice | null>(null);
  const [deletingPrice, setDeletingPrice] = useState<PlanPrice | null>(null);
  const [form, setForm] = useState<PriceForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (planId) {
      fetchPlan();
      fetchPrices();
    }
  }, [planId]);

  const fetchPlan = async () => {
    const { data } = await supabase.from('plans').select('display_name').eq('id', planId!).maybeSingle();
    if (data) setPlanName(data.display_name);
  };

  const fetchPrices = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('plan_prices')
      .select('*')
      .eq('plan_id', planId!)
      .order('interval');
    if (error) { toast.error('Failed to load prices'); }
    else { setPrices((data ?? []) as PlanPrice[]); }
    setIsLoading(false);
  };

  const openCreate = () => {
    setEditingPrice(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: PlanPrice) => {
    setEditingPrice(p);
    setForm({
      interval: p.interval,
      currency: p.currency,
      amount: String(p.amount),
      compare_at_amount: p.compare_at_amount != null ? String(p.compare_at_amount) : '',
      stripe_price_id: p.stripe_price_id ?? '',
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum < 0) { toast.error('Valid amount required'); return; }

    setIsSaving(true);
    const compareAt = form.compare_at_amount.trim() ? parseFloat(form.compare_at_amount) : null;
    const payload = {
      plan_id: planId!,
      interval: form.interval,
      currency: form.currency.toLowerCase().trim() || 'usd',
      amount: amountNum,
      compare_at_amount: compareAt,
      stripe_price_id: form.stripe_price_id.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      await mutateAdminPlanConfig({
        resource: 'plan_prices',
        action: editingPrice ? 'update' : 'create',
        id: editingPrice?.id,
        payload,
      });
      toast.success(editingPrice ? 'Price updated' : 'Price created');
      setDialogOpen(false);
      fetchPrices();
    } catch (error) {
      console.error('Failed to save price:', error);
      toast.error('Failed to save price');
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingPrice) return;
    try {
      await mutateAdminPlanConfig({
        resource: 'plan_prices',
        action: 'delete',
        id: deletingPrice.id,
      });
      toast.success('Price deleted');
      fetchPrices();
    } catch (error) {
      console.error('Failed to delete price:', error);
      toast.error('Failed to delete price');
    }
    setDeletingPrice(null);
  };

  const fmt = (amount: number, currency = 'usd') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6" style={{ fontFamily: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/plans">
            <Button variant="ghost" size="icon" style={{ borderRadius: 6, color: sb.ink }}><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.42, color: sb.ink }} className="tracking-tight">Plan Prices</h2>
            <p style={{ fontSize: 13, color: sb.inkMute }} className="mt-0.5">{planName} — normalized price rows per interval</p>
          </div>
        </div>
        <Button onClick={openCreate} style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6, fontWeight: 500 }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Price
        </Button>
      </div>

      <Card style={{ background: sb.canvas, border: `1px solid ${sb.hairline}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }}>
        <CardHeader className="pb-2" style={{ background: sb.canvasSoft, borderBottom: `1px solid ${sb.hairlineCool}`, padding: "16px 20px" }}>
          <CardTitle style={{ fontSize: 14, color: sb.ink, fontWeight: 500 }}>Price Rows</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin" style={{ color: sb.primary }} />
            </div>
          ) : prices.length === 0 ? (
            <p className="text-center py-16 text-sm" style={{ color: sb.inkMute }}>No prices yet. Add the first one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: sb.canvasSoft }}>
                <tr className="text-left text-muted-foreground border-b" style={{ borderBottom: `1px solid ${sb.hairline}` }}>
                  <th className="py-2.5 px-4 font-medium" style={{ color: sb.ink }}>Interval</th>
                  <th className="py-2.5 px-4 font-medium" style={{ color: sb.ink }}>Currency</th>
                  <th className="py-2.5 px-4 font-medium" style={{ color: sb.ink }}>Amount</th>
                  <th className="py-2.5 px-4 font-medium" style={{ color: sb.ink }}>Compare At</th>
                  <th className="py-2.5 px-4 font-medium" style={{ color: sb.ink }}>Stripe Price ID</th>
                  <th className="py-2.5 px-4 font-medium" style={{ color: sb.ink }}>Status</th>
                  <th className="py-2.5 px-4 text-right" style={{ color: sb.ink }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10" style={{ borderBottom: `1px solid ${sb.hairlineCool}` }}>
                    <td className="py-3 px-4 font-medium" style={{ color: sb.ink }}>{INTERVAL_LABELS[p.interval]}</td>
                    <td className="py-3 px-4 uppercase" style={{ color: sb.ink }}>{p.currency}</td>
                    <td className="py-3 px-4" style={{ color: sb.ink, fontWeight: 500 }}>{fmt(p.amount, p.currency)}</td>
                    <td className="py-3 px-4" style={{ color: sb.inkMute }}>{p.compare_at_amount != null ? fmt(p.compare_at_amount, p.currency) : '—'}</td>
                    <td className="py-3 px-4 font-mono text-xs" style={{ color: sb.ink }}>{p.stripe_price_id ?? '—'}</td>
                    <td className="py-3 px-4">
                      {p.is_active ? (
                        <Badge style={{ background: sb.primary, color: sb.onPrimary, borderRadius: 6 }}>Active</Badge>
                      ) : (
                        <Badge variant="secondary" style={{ borderRadius: 6 }}>Inactive</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" style={{ borderRadius: 6 }} onClick={() => openEdit(p)}>
                        <Edit2 className="h-3.5 w-3.5" style={{ color: sb.ink }} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-650" style={{ borderRadius: 6 }} onClick={() => setDeletingPrice(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" style={{ borderRadius: 12, borderColor: sb.hairline }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, fontWeight: 500, color: sb.ink }}>{editingPrice ? 'Edit Price' : 'Add Price'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Interval</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: e.target.value as Interval })}
                style={{ borderRadius: 6, borderColor: sb.hairline, color: sb.ink }}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="usd" style={{ borderRadius: 6, borderColor: sb.hairline }} />
              </div>
              <div className="space-y-1">
                <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Amount ($)</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={{ borderRadius: 6, borderColor: sb.hairline }} />
              </div>
            </div>
            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Compare-at Amount (optional)</Label>
              <Input type="number" step="0.01" min="0" value={form.compare_at_amount} onChange={(e) => setForm({ ...form, compare_at_amount: e.target.value })} placeholder="Strikethrough price" style={{ borderRadius: 6, borderColor: sb.hairline }} />
            </div>
            <div className="space-y-1">
              <Label style={{ fontSize: 13, fontWeight: 500, color: sb.ink }}>Stripe Price ID</Label>
              <Input value={form.stripe_price_id} onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })} placeholder="price_..." className="font-mono text-sm" style={{ borderRadius: 6, borderColor: sb.hairline }} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} id="price_active" />
              <Label htmlFor="price_active" style={{ fontSize: 13, color: sb.ink }}>Active</Label>
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
      <AlertDialog open={!!deletingPrice} onOpenChange={() => setDeletingPrice(null)}>
        <AlertDialogContent style={{ borderRadius: 12, borderColor: sb.hairline }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: sb.ink }}>Delete Price</AlertDialogTitle>
            <AlertDialogDescription style={{ color: sb.inkMute }}>
              Delete this {INTERVAL_LABELS[deletingPrice?.interval ?? 'monthly']} price row? This won't affect the Stripe price — it only removes the local record.
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
