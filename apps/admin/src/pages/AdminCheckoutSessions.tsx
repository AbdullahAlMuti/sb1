import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ShoppingCart, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@repo/api-client/supabase/client';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Card, CardContent } from '@repo/ui/components/ui/card';
import { toast } from 'sonner';

type SessionStatus = 'pending' | 'completed' | 'expired' | 'abandoned';

interface CheckoutSession {
  id: string;
  user_id: string | null;
  email: string | null;
  selected_plan_id: string | null;
  stripe_checkout_session_id: string | null;
  status: SessionStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  plan_name: string | null;
  plan_display_name: string | null;
}

const STATUS_VARIANTS: Record<SessionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  pending: 'secondary',
  abandoned: 'destructive',
  expired: 'outline',
};

const STATUS_ICONS: Record<SessionStatus, React.ElementType> = {
  completed: CheckCircle2,
  pending: Clock,
  abandoned: XCircle,
  expired: XCircle,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminCheckoutSessions() {
  const [sessions, setSessions] = useState<CheckoutSession[]>([]);
  const [filtered, setFiltered] = useState<CheckoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    let result = sessions;
    if (statusFilter !== 'all') result = result.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.email?.toLowerCase().includes(q) ||
        s.stripe_checkout_session_id?.toLowerCase().includes(q) ||
        s.plan_display_name?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [sessions, search, statusFilter]);

  const fetchSessions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('checkout_sessions')
      .select(`
        id, user_id, email, selected_plan_id, stripe_checkout_session_id,
        status, metadata, created_at, updated_at,
        plans:selected_plan_id (name, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      toast.error('Failed to load checkout sessions');
    } else {
      const mapped: CheckoutSession[] = (data ?? []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        email: row.email,
        selected_plan_id: row.selected_plan_id,
        stripe_checkout_session_id: row.stripe_checkout_session_id,
        status: row.status as SessionStatus,
        metadata: row.metadata ?? {},
        created_at: row.created_at,
        updated_at: row.updated_at,
        plan_name: row.plans?.name ?? null,
        plan_display_name: row.plans?.display_name ?? null,
      }));
      setSessions(mapped);
    }
    setIsLoading(false);
  };

  const counts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const statSummary = [
    { label: 'Total', value: sessions.length, icon: ShoppingCart, color: 'text-primary' },
    { label: 'Completed', value: counts['completed'] ?? 0, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Pending', value: counts['pending'] ?? 0, icon: Clock, color: 'text-amber-500' },
    { label: 'Abandoned', value: counts['abandoned'] ?? 0, icon: XCircle, color: 'text-destructive' },
  ];

  const statusButtons: Array<{ label: string; value: SessionStatus | 'all' }> = [
    { label: `All (${sessions.length})`, value: 'all' },
    { label: `Completed (${counts['completed'] ?? 0})`, value: 'completed' },
    { label: `Pending (${counts['pending'] ?? 0})`, value: 'pending' },
    { label: `Abandoned (${counts['abandoned'] ?? 0})`, value: 'abandoned' },
    { label: `Expired (${counts['expired'] ?? 0})`, value: 'expired' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Checkout Sessions</h1>
          <p className="text-muted-foreground mt-1">Audit trail for all Stripe checkout attempts</p>
        </div>
        <Button variant="outline" onClick={fetchSessions} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statSummary.map(({ label, value, icon: Icon, color }) => (
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
          placeholder="Search email, session ID, plan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1.5 flex-wrap">
          {statusButtons.map(({ label, value }) => (
            <Button
              key={value}
              variant={statusFilter === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(value)}
              className="capitalize"
            >
              {label}
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
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Interval</th>
                <th className="px-4 py-3 font-medium">Stripe Session ID</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <RefreshCw className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">No sessions found</td>
                </tr>
              ) : (
                filtered.map((session) => {
                  const StatusIcon = STATUS_ICONS[session.status] ?? Clock;
                  const billingInterval = typeof session.metadata?.billing_interval === 'string'
                    ? session.metadata.billing_interval
                    : '—';
                  return (
                    <tr key={session.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">{session.email ?? '—'}</td>
                      <td className="px-4 py-3">{session.plan_display_name ?? session.plan_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className="h-4 w-4" />
                          <Badge variant={STATUS_VARIANTS[session.status]} className="capitalize">{session.status}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{billingInterval}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {session.stripe_checkout_session_id
                          ? session.stripe_checkout_session_id.slice(0, 24) + '…'
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(session.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
