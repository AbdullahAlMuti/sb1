import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  RefreshCw,
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserPlan {
  id: string;
  user_id: string;
  plan_id: string;
  status: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  created_at: string | null;
  updated_at: string | null;
  profile?: {
    full_name: string | null;
  };
  plan?: {
    name: string;
    display_name: string;
    price_monthly: number | null;
    price_yearly: number | null;
  };
}

interface PaymentStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  estimatedMRR: number;
}

const ITEMS_PER_PAGE = 10;

export default function AdminPayments() {
  const [subscriptions, setSubscriptions] = useState<UserPlan[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    estimatedMRR: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSubscription, setSelectedSubscription] = useState<UserPlan | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, [currentPage, filterStatus]);

  // Real-time subscription updates
  useEffect(() => {
    const channel = supabase
      .channel('user-plans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_plans',
        },
        () => {
          fetchSubscriptions();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      // Total subscriptions
      const { count: total } = await (supabase
        .from('user_plans' as any)
        .select('*', { count: 'exact', head: true }) as any);

      // Active subscriptions
      const { count: active } = await (supabase
        .from('user_plans' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active') as any);

      // Trial subscriptions
      const now = new Date().toISOString();
      const { count: trial } = await (supabase
        .from('user_plans' as any)
        .select('*', { count: 'exact', head: true })
        .gt('trial_end', now) as any);

      // Estimated MRR (from active subscriptions)
      const { data: activePlans } = await (supabase
        .from('user_plans' as any)
        .select(`
          id,
          plans:plan_id (
            price_monthly
          )
        `)
        .eq('status', 'active') as any);

      const mrr = activePlans?.reduce((sum, sub) => {
        const plan = sub.plans as unknown as { price_monthly: number | null };
        return sum + (plan?.price_monthly || 0);
      }, 0) || 0;

      setStats({
        totalSubscriptions: total || 0,
        activeSubscriptions: active || 0,
        trialSubscriptions: trial || 0,
        estimatedMRR: mrr,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);

      // Fetch user_plans with plan relation (plan_id has FK)
      let query = (supabase
        .from('user_plans' as any)
        .select(`
          *,
          plans:plan_id (
            name,
            display_name,
            price_monthly,
            price_yearly
          )
        `, { count: 'exact' }) as any);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fetch profiles separately since there's no FK relationship
      const userIds = (data as any[])?.map(item => item.user_id).filter(Boolean) || [];
      let profilesMap: Record<string, { full_name: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name };
          return acc;
        }, {} as Record<string, { full_name: string | null }>);
      }

      const formattedData = (data as any[])?.map((item: any) => ({
        ...item,
        profile: profilesMap[item.user_id] || { full_name: null },
        plan: item.plans as unknown as UserPlan['plan'],
      })) || [];

      setSubscriptions(formattedData as UserPlan[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to fetch subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const exportSubscriptions = () => {
    const headers = ['User Name', 'User ID', 'Plan', 'Status', 'Stripe ID', 'Period Start', 'Period End', 'Created'];
    const csvContent = [
      headers.join(','),
      ...subscriptions.map((sub) => [
        sub.profile?.full_name || '',
        sub.user_id || '',
        sub.plan?.display_name || '',
        sub.status || '',
        sub.stripe_subscription_id || '',
        sub.current_period_start ? format(new Date(sub.current_period_start), 'yyyy-MM-dd') : '',
        sub.current_period_end ? format(new Date(sub.current_period_end), 'yyyy-MM-dd') : '',
        sub.created_at ? format(new Date(sub.created_at), 'yyyy-MM-dd') : '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Subscriptions exported successfully');
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.stripe_subscription_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.user_id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/20 text-emerald-400">Active</Badge>;
      case 'canceled':
        return <Badge className="bg-destructive/20 text-destructive">Canceled</Badge>;
      case 'past_due':
        return <Badge className="bg-amber-500/20 text-amber-400">Past Due</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/20 text-blue-400">Trial</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Payments & Subscriptions</h1>
          <p className="text-muted-foreground mt-1">
            Manage subscriptions and view payment history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportSubscriptions}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchSubscriptions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary uppercase tracking-wide">Total Subs</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.totalSubscriptions}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/20">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-400 uppercase tracking-wide">Active</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.activeSubscriptions}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-400 uppercase tracking-wide">Trials</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.trialSubscriptions}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Receipt className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-400 uppercase tracking-wide">Est. MRR</p>
                  <p className="text-3xl font-bold text-foreground mt-1">${stats.estimatedMRR}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <DollarSign className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or subscription ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Subscriptions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">User</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Plan</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Period End</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Created</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">Loading subscriptions...</p>
                      </td>
                    </tr>
                  ) : filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground mt-2">No subscriptions found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium text-foreground">
                              {sub.profile?.full_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-muted-foreground font-mono">{sub.user_id?.slice(0, 8)}...</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-foreground">{sub.plan?.display_name || 'Unknown'}</span>
                          {sub.plan?.price_monthly && (
                            <p className="text-sm text-muted-foreground">${sub.plan.price_monthly}/mo</p>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(sub.status)}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {sub.current_period_end
                            ? format(new Date(sub.current_period_end), 'MMM dd, yyyy')
                            : '-'}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {sub.created_at
                            ? format(new Date(sub.created_at), 'MMM dd, yyyy')
                            : '-'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSubscription(sub);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Subscription Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium text-foreground">{selectedSubscription.profile?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground font-mono">{selectedSubscription.user_id?.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium text-foreground">{selectedSubscription.plan?.display_name}</p>
                  {selectedSubscription.plan?.price_monthly && (
                    <p className="text-sm text-muted-foreground">${selectedSubscription.plan.price_monthly}/month</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedSubscription.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stripe Subscription ID</p>
                  {selectedSubscription.stripe_subscription_id ? (
                    <a
                      href={`https://dashboard.stripe.com/subscriptions/${selectedSubscription.stripe_subscription_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {selectedSubscription.stripe_subscription_id.slice(0, 20)}...
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Period Start</p>
                  <p className="font-medium text-foreground">
                    {selectedSubscription.current_period_start
                      ? format(new Date(selectedSubscription.current_period_start), 'MMM dd, yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Period End</p>
                  <p className="font-medium text-foreground">
                    {selectedSubscription.current_period_end
                      ? format(new Date(selectedSubscription.current_period_end), 'MMM dd, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedSubscription.trial_end && (
                <div>
                  <p className="text-sm text-muted-foreground">Trial Ends</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(selectedSubscription.trial_end), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium text-foreground">
                    {selectedSubscription.created_at
                      ? format(new Date(selectedSubscription.created_at), 'MMM dd, yyyy HH:mm')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium text-foreground">
                    {selectedSubscription.updated_at
                      ? format(new Date(selectedSubscription.updated_at), 'MMM dd, yyyy HH:mm')
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
