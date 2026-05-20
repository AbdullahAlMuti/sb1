import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CreditCard, FileText, RefreshCcw, Sparkles } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { useSubscription } from '@repo/auth/hooks/useSubscription';

export default function BillingUsage() {
  const navigate = useNavigate();
  const {
    subscribed,
    plan,
    planName,
    limits,
    usage,
    subscriptionEnd,
    isLoading,
    openCustomerPortal,
    checkSubscription,
  } = useSubscription();

  useEffect(() => {
    if (isLoading) return;
    if (!subscribed) navigate('/dashboard/subscription', { replace: true });
  }, [isLoading, subscribed, navigate]);

  const creditsTotal = useMemo(() => usage?.credits_total ?? limits?.credits_per_month ?? 0, [usage, limits]);
  const creditsRemaining = useMemo(() => usage?.credits_remaining ?? 0, [usage]);
  const creditsUsed = useMemo(
    () => usage?.credits_used ?? Math.max(creditsTotal - creditsRemaining, 0),
    [usage, creditsTotal, creditsRemaining]
  );

  const renewalDate = useMemo(() => {
    const raw = usage?.current_period_end ?? subscriptionEnd;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [usage?.current_period_end, subscriptionEnd]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-muted-foreground">Loading billing details…</div>
      </div>
    );
  }

  // Redirect will happen in effect; keep render safe.
  if (!subscribed) return null;

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Billing &amp; Usage</h1>
            <p className="text-muted-foreground mt-1">Track your credits, renewal date, and manage billing.</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => checkSubscription()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => openCustomerPortal()}>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Plan &amp; Renewal</span>
            <Badge variant="secondary">{plan?.display_name ?? planName}</Badge>
          </CardTitle>
          <CardDescription>
            {renewalDate ? (
              <span>
                Renews on <span className="font-medium text-foreground">{format(renewalDate, 'MMMM d, yyyy')}</span>
              </span>
            ) : (
              'Renewal date will appear once Stripe confirms your current period.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Total credits</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{creditsTotal}</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Used</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{creditsUsed}</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{creditsRemaining}</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Credits reset on renewal. Invoices and payment methods are managed securely in Stripe.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Invoices
          </CardTitle>
          <CardDescription>
            View and download invoices in the Stripe billing portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Stripe keeps invoices and receipts in one place.
          </div>
          <Button variant="outline" onClick={() => openCustomerPortal()}>
            <FileText className="h-4 w-4 mr-2" />
            View invoices
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            Need to change your plan?
          </CardTitle>
          <CardDescription>Upgrade, downgrade, or cancel from the subscription page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate('/dashboard/subscription')}>
            Go to Subscription
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
