import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Users, CreditCard, Clock } from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Card, CardContent } from '@repo/ui/components/ui/card';
import { toast } from 'sonner';

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  plan_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  orders_used: number;
  credits_used: number;
  email: string | null;
  full_name: string | null;
  plan_name: string | null;
  plan_display_name: string | null;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  trialing: 'secondary',
  past_due: 'destructive',
  canceled: 'outline',
  expired: 'outline',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminSubscriptions() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [filtered, setFiltered] = useState<SubscriptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchSubscriptions(); }, []);

  useEffect(() => {
    let result = rows;
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.email?.toLowerCase().includes(q) ||
        r.full_name?.toLowerCase().includes(q) ||
        r.plan_display_name?.toLowerCase().includes(q) ||
        r.stripe_subscription_id?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [rows, search, statusFilter]);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('user_plans')
      .select(`
        id, user_id, status, plan_id, stripe_subscription_id,
        current_period_end, trial_end, orders_used, credits_used,
        profiles:user_id (email, full_name),
        plans:plan_id (name, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      toast.error('Failed to load subscriptions');
    } else {
      const mapped: SubscriptionRow[] = (data ?? []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        status: row.status ?? 'unknown',
        plan_id: row.plan_id,
        stripe_subscription_id: row.stripe_subscription_id,
        current_period_end: row.current_period_end,
        trial_end: row.trial_end,
        orders_used: row.orders_used ?? 0,
        credits_used: row.credits_used ?? 0,
        email: row.profiles?.email ?? null,
        full_name: row.profiles?.full_name ?? null,
        plan_name: row.plans?.name ?? null,
        plan_display_name: row.plans?.display_name ?? null,
      }));
      setRows(mapped);
    }
    setIsLoading(false);
  };

  const statuses = ['all', ...Array.from(new Set(rows.map((r) => r.status)))];
  const counts = rows.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">All active and historical user plan records</p>
        </div>
        <Button variant="outline" onClick={fetchSubscriptions} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: rows.length, icon: Users, color: 'text-primary' },
          { label: 'Active', value: counts['active'] ?? 0, icon: CreditCard, color: 'text-emerald-500' },
          { label: 'Trialing', value: counts['trialing'] ?? 0, icon: Clock, color: 'text-amber-500' },
          { label: 'Past Due', value: counts['past_due'] ?? 0, icon: RefreshCw, color: 'text-destructive' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <Icon className={`h-7 w-7 ${color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search email, name, plan, subscription ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1.5">
          {statuses.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s === 'all' ? `All (${rows.length})` : `${s} (${counts[s] ?? 0})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Period End</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Credits Used</th>
                <th className="px-4 py-3 font-medium">Stripe Sub ID</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <RefreshCw className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">No subscriptions found</td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.full_name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{row.email ?? row.user_id}</p>
                    </td>
                    <td className="px-4 py-3">{row.plan_display_name ?? row.plan_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[row.status] ?? 'outline'} className="capitalize">{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(row.current_period_end ?? row.trial_end)}</td>
                    <td className="px-4 py-3">{row.orders_used}</td>
                    <td className="px-4 py-3">{row.credits_used}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.stripe_subscription_id ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
