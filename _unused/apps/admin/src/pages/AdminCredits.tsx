import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, RefreshCw, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { supabase } from '@repo/api-client/supabase/client';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Badge } from '@repo/ui/components/ui/badge';
import { toast } from 'sonner';

type ActionType = 'grant' | 'set' | 'reset_to_plan';

type ProfileRow = {
  id: string;
  full_name: string | null;
  credits: number | null;
  created_at: string | null;
};

type CreditTransactionRow = {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string | null;
  metadata: any;
  created_at: string;
};

export default function AdminCredits() {
  const { session } = useAuth();

  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<ProfileRow[]>([]);
  const [candidateEmails, setCandidateEmails] = useState<Record<string, string>>({});
  const [isSearching, setIsSearching] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [action, setAction] = useState<ActionType>('grant');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [timeline, setTimeline] = useState<CreditTransactionRow[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  const selectedProfile = useMemo(
    () => candidates.find((c) => c.id === selectedUserId) ?? null,
    [candidates, selectedUserId]
  );

  const selectedEmail = useMemo(() => {
    if (!selectedUserId) return '';
    return candidateEmails[selectedUserId] || '';
  }, [candidateEmails, selectedUserId]);

  const fetchCandidates = async () => {
    try {
      setIsSearching(true);
      setCandidates([]);
      setCandidateEmails({});

      // Note: profiles doesn't contain email. We'll fetch emails via admin edge function.
      let query = supabase.from('profiles').select('id, full_name, credits, created_at').limit(20);

      if (search.trim()) {
        query = query.ilike('full_name', `%${search.trim()}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data || []) as ProfileRow[];
      setCandidates(rows);

      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const { data: verificationData } = await supabase.functions.invoke('admin-get-users-verification', {
        body: { userIds: ids },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      const emails = (verificationData?.userEmails || {}) as Record<string, string>;
      setCandidateEmails(emails);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchTimeline = async (userId: string) => {
    try {
      setIsLoadingTimeline(true);
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, user_id, amount, balance_after, transaction_type, description, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTimeline((data || []) as CreditTransactionRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load credit timeline');
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setTimeline([]);
      return;
    }
    fetchTimeline(selectedUserId);
  }, [selectedUserId]);

  const submit = async () => {
    if (!selectedUserId) {
      toast.error('Select a user');
      return;
    }

    if (action !== 'reset_to_plan') {
      if (!Number.isFinite(amount) || amount === 0) {
        toast.error('Enter a non-zero amount');
        return;
      }
    }

    if (!reason.trim()) {
      toast.error('Reason is required (for auditing)');
      return;
    }

    if (!session?.access_token) {
      toast.error('Not authenticated');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-adjust-credits', {
        body: {
          userId: selectedUserId,
          action,
          amount: action === 'reset_to_plan' ? undefined : amount,
          reason,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Credits updated');

      // Refresh local state
      await fetchCandidates();
      await fetchTimeline(selectedUserId);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update credits');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold text-foreground">Credits Tool</h1>
        <p className="text-muted-foreground mt-1">Admin-only: grant/reset credits and inspect the credit timeline.</p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            Select user
          </CardTitle>
          <CardDescription>Search by full name (emails are fetched via admin API).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="userSearch">Search</Label>
              <Input
                id="userSearch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a name…"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={fetchCandidates} disabled={isSearching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isSearching ? 'animate-spin' : ''}`} />
                Search
              </Button>
            </div>
          </div>

          <div>
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {(u.full_name || u.id.slice(0, 8)) + (candidateEmails[u.id] ? ` — ${candidateEmails[u.id]}` : '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedUserId && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary" className="font-mono">{selectedUserId}</Badge>
                {selectedEmail && <Badge variant="outline">{selectedEmail}</Badge>}
                <span className="text-muted-foreground">
                  Current credits: <span className="font-medium text-foreground">{selectedProfile?.credits ?? '—'}</span>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-muted-foreground" />
            Grant / Set / Reset
          </CardTitle>
          <CardDescription>
            Writes are performed via a secure Edge Function (service-role) and logged to <code>credit_transactions</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Action</Label>
              <Select value={action} onValueChange={(v) => setAction(v as ActionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grant">Grant (add/subtract)</SelectItem>
                  <SelectItem value="set">Set exact balance</SelectItem>
                  <SelectItem value="reset_to_plan">Reset to plan total</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={Number.isFinite(amount) ? String(amount) : ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={action === 'reset_to_plan'}
                placeholder={action === 'grant' ? 'e.g. 50 (or -10)' : action === 'set' ? 'e.g. 100' : 'N/A'}
              />
              {action === 'reset_to_plan' && (
                <div className="mt-1 text-xs text-muted-foreground">Sets remaining credits to the user’s plan monthly total and resets usage counters.</div>
              )}
            </div>
          </div>

          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you making this change? (Required)"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={isSubmitting || !selectedUserId}>
              {isSubmitting ? 'Applying…' : 'Apply change'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit timeline</CardTitle>
          <CardDescription>Most recent 100 entries from <code>credit_transactions</code>.</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedUserId ? (
            <div className="text-sm text-muted-foreground">Select a user to view their timeline.</div>
          ) : isLoadingTimeline ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading timeline…
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground">No credit transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 text-muted-foreground font-medium">When</th>
                    <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Type</th>
                    <th className="text-right py-3 pr-4 text-muted-foreground font-medium">Amount</th>
                    <th className="text-right py-3 pr-4 text-muted-foreground font-medium">Balance after</th>
                    <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((t) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{t.transaction_type}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-foreground">{t.amount}</td>
                      <td className="py-3 pr-4 text-right font-medium text-foreground">{t.balance_after}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{t.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
