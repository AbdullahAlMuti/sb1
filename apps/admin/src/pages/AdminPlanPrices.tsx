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
import { PageHeader } from '@/core/ui/PageHeader';

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

    const { error } = editingPrice
      ? await supabase.from('plan_prices').update(payload).eq('id', editingPrice.id)
      : await supabase.from('plan_prices').insert({ ...payload });

    if (error) { toast.error('Failed to save price: ' + error.message); }
    else {
      toast.success(editingPrice ? 'Price updated' : 'Price created');
      setDialogOpen(false);
      fetchPrices();
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingPrice) return;
    const { error } = await supabase.from('plan_prices').delete().eq('id', deletingPrice.id);
    if (error) { toast.error('Failed to delete price'); }
    else { toast.success('Price deleted'); fetchPrices(); }
    setDeletingPrice(null);
  };

  const fmt = (amount: number, currency = 'usd') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/plans">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <PageHeader
            title="Plan Prices"
            description={`${planName} — normalized price rows per interval`}
            actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Price</Button>}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Price Rows</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : prices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No prices yet. Add the first one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 font-medium">Interval</th>
                  <th className="pb-2 font-medium">Currency</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Compare At</th>
                  <th className="pb-2 font-medium">Stripe Price ID</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4 font-medium">{INTERVAL_LABELS[p.interval]}</td>
                    <td className="py-2 pr-4 uppercase">{p.currency}</td>
                    <td className="py-2 pr-4">{fmt(p.amount, p.currency)}</td>
                    <td className="py-2 pr-4">{p.compare_at_amount != null ? fmt(p.compare_at_amount, p.currency) : '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{p.stripe_price_id ?? '—'}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="py-2 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingPrice(p)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPrice ? 'Edit Price' : 'Add Price'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Interval</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: e.target.value as Interval })}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="usd" />
              </div>
              <div className="space-y-1">
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Compare-at Amount (optional)</Label>
              <Input type="number" step="0.01" min="0" value={form.compare_at_amount} onChange={(e) => setForm({ ...form, compare_at_amount: e.target.value })} placeholder="Strikethrough price" />
            </div>
            <div className="space-y-1">
              <Label>Stripe Price ID</Label>
              <Input value={form.stripe_price_id} onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })} placeholder="price_..." className="font-mono text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} id="price_active" />
              <Label htmlFor="price_active">Active</Label>
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
      <AlertDialog open={!!deletingPrice} onOpenChange={() => setDeletingPrice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Price</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this {INTERVAL_LABELS[deletingPrice?.interval ?? 'monthly']} price row? This won't affect the Stripe price — it only removes the local record.
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
