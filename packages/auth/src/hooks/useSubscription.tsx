import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@repo/api-client/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type AccessState = 'none' | 'trial' | 'trial_expired' | 'active' | 'past_due';

interface SubscriptionState {
  subscribed: boolean;
  planName: string;
  access: AccessState;
  plan?: {
    id: string;
    name: string;
    display_name: string;
    credits_per_month: number;
    max_listings: number;
    max_auto_orders: number;
    is_trial: boolean;
    feature_flags: Record<string, unknown>;
  } | null;
  limits?: {
    credits_per_month: number;
    max_listings: number;
    max_auto_orders: number;
  } | null;
  usage?: {
    credits_total?: number;
    credits_remaining: number;
    listings_active: number;
    orders_used: number;
    credits_used: number;
    current_period_end: string | null;
    status: string;
  } | null;
  trial: {
    is_trial: boolean;
    trial_end: string | null;
    trial_expired: boolean;
  } | null;
  billingInterval: 'monthly' | 'yearly' | 'one_time' | null;
  cancelAtPeriodEnd: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  stripeSubscriptionId: string | null;
  isLoading: boolean;
}

// No free plan - users must pay to access the system

type BillingInterval = 'monthly' | 'yearly';

// Module-level cache shared across all hook instances so that mounting 13
// components doesn't fire 13 simultaneous requests to check-subscription-v2.
const CACHE_TTL = 300_000; // 5 minutes — for confirmed (active/trial) subscribers
// A just-paid user lands here with access === 'none' while the Stripe webhook is
// still syncing. Caching that for 5 minutes would lock them out of the dashboard
// until a hard refresh, so unpaid/none states get a short TTL and re-poll fast.
const PENDING_TTL = 10_000; // 10 seconds — for none/unpaid, awaiting webhook

function ttlFor(state: SubscriptionState | null): number {
  return state && state.access !== 'none' ? CACHE_TTL : PENDING_TTL;
}
let _cachedState: SubscriptionState | null = null;
let _cacheKey = ''; // userId — invalidate on user change
let _lastFetch = 0;
let _inflight: Promise<void> | null = null;
const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [, rerender] = useState(0);
  const userIdRef = useRef<string | undefined>(undefined);

  // Invalidate cache when user changes
  if (user?.id !== userIdRef.current) {
    userIdRef.current = user?.id;
    if (_cacheKey !== (user?.id ?? '')) {
      _cachedState = null;
      _lastFetch = 0;
      _inflight = null;
      _cacheKey = user?.id ?? '';
    }
  }

  const checkSubscription = useCallback(async (force = false) => {
    if (!session?.access_token) {
      _cachedState = _cachedState
        ? { ..._cachedState, isLoading: false }
        : { subscribed: false, planName: 'none', access: 'none', plan: null, limits: null, usage: null, trial: null, billingInterval: null, cancelAtPeriodEnd: false, productId: null, subscriptionEnd: null, stripeSubscriptionId: null, isLoading: false };
      notifyListeners();
      return;
    }

    const now = Date.now();
    if (!force && _cachedState && now - _lastFetch < ttlFor(_cachedState)) {
      // Already fresh — just rerender this instance if needed
      notifyListeners();
      return;
    }

    // Deduplicate: if a request is already in flight, wait for it
    if (_inflight) {
      await _inflight;
      notifyListeners();
      return;
    }

    _inflight = (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription-v2', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) {
          if (!sessionStorage.getItem('subscription_error_logged')) {
            console.warn('Subscription check unavailable - using profile data as fallback');
            sessionStorage.setItem('subscription_error_logged', 'true');
          }
          if (_cachedState) _cachedState = { ..._cachedState, isLoading: false };
          notifyListeners();
          return;
        }

        sessionStorage.removeItem('subscription_error_logged');

        _cachedState = {
          subscribed: data?.subscribed ?? false,
          planName: data?.plan_name || 'none',
          access: data?.access ?? 'none',
          plan: data?.plan ?? null,
          limits: data?.limits ?? null,
          usage: data?.usage ?? null,
          trial: data?.trial ?? null,
          billingInterval: data?.billing_interval ?? null,
          cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
          productId: data?.product_id ?? null,
          subscriptionEnd: data?.subscription_end ?? null,
          stripeSubscriptionId: data?.stripe_subscription_id ?? null,
          isLoading: false,
        };
        _lastFetch = Date.now();
        notifyListeners();
      } catch {
        if (!sessionStorage.getItem('subscription_error_logged')) {
          console.warn('Subscription check failed - using default state');
          sessionStorage.setItem('subscription_error_logged', 'true');
        }
        if (_cachedState) _cachedState = { ..._cachedState, isLoading: false };
        notifyListeners();
      } finally {
        _inflight = null;
      }
    })();

    await _inflight;
  }, [session?.access_token]);

  // Subscribe to cache updates so all instances rerender together
  useEffect(() => {
    const trigger = () => rerender(n => n + 1);
    _listeners.add(trigger);
    return () => { _listeners.delete(trigger); };
  }, []);

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      _cachedState = { subscribed: false, planName: 'none', access: 'none', plan: null, limits: null, usage: null, trial: null, billingInterval: null, cancelAtPeriodEnd: false, productId: null, subscriptionEnd: null, stripeSubscriptionId: null, isLoading: false };
      _lastFetch = 0;
      notifyListeners();
    }
  }, [user, checkSubscription]);

  // Real-time subscription for subscription/plan changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('subscription-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => {
          checkSubscription(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_plans', filter: `user_id=eq.${user.id}` },
        () => {
          checkSubscription(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, checkSubscription]);


  // Single global poller: only the first mounted instance owns it. Self-reschedules
  // so an unpaid user (access 'none', webhook pending) re-checks every PENDING_TTL
  // while confirmed subscribers fall back to the cheap CACHE_TTL cadence.
  const isFirstRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    // Only set up the poller once across all instances in this tab
    if (_listeners.size > 1) return; // others already have it
    isFirstRef.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(async () => {
        await checkSubscription();
        schedule();
      }, ttlFor(_cachedState));
    };
    schedule();
    return () => { clearTimeout(timer); };
  }, [user, checkSubscription]);

  const subscription: SubscriptionState = _cachedState ?? {
    subscribed: false, planName: 'none', access: 'none', plan: null, limits: null, usage: null,
    trial: null, billingInterval: null, cancelAtPeriodEnd: false,
    productId: null, subscriptionEnd: null, stripeSubscriptionId: null, isLoading: !!user,
  };

  const createCheckout = async (
    planId: string,
    billingInterval: BillingInterval = 'monthly',
    couponCode?: string,
    priceId?: string
  ): Promise<{ url?: string; error?: string }> => {
    if (!session?.access_token) {
      toast.error('Please log in to subscribe');
      return { error: 'Please log in to subscribe' };
    }

    if (!planId) {
      return { error: 'Invalid plan configuration' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          planId,
          billingInterval,
          priceId,
          couponCode: couponCode || undefined,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return { error: data.error };
      }

      if (data?.url) {
        return { url: data.url };
      }

      return { error: 'No checkout URL returned' };
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Failed to create checkout session');
      return { error: error.message || 'Failed to create checkout session' };
    }
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      toast.error('Please log in to manage your subscription');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open billing portal');
    }
  };

  return {
    ...subscription,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
}
