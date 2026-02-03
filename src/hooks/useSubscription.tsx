import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface SubscriptionState {
  subscribed: boolean;
  planName: string;
  plan?: {
    id: string;
    name: string;
    display_name: string;
    credits_per_month: number;
    max_listings: number;
    max_auto_orders: number;
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
  productId: string | null;
  subscriptionEnd: string | null;
  stripeSubscriptionId: string | null;
  isLoading: boolean;
}

// No free plan - users must pay to access the system

export function useSubscription() {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    planName: 'free',
    plan: null,
    limits: null,
    usage: null,
    productId: null,
    subscriptionEnd: null,
    stripeSubscriptionId: null,
    isLoading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription-v2', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        // Only log once per session to reduce noise
        if (!sessionStorage.getItem('subscription_error_logged')) {
          console.warn('Subscription check unavailable - using profile data as fallback');
          sessionStorage.setItem('subscription_error_logged', 'true');
        }
        // Fallback: Use profile data from useAuth instead
        setSubscription(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Clear error flag on success
      sessionStorage.removeItem('subscription_error_logged');

      // Handle both success and error responses from the edge function
      if (data?.error) {
        console.warn('Subscription check returned error:', data.error);
        setSubscription({
          subscribed: data.subscribed ?? false,
          planName: data.plan_name ?? 'free',
          plan: data.plan ?? null,
          limits: data.limits ?? null,
          usage: data.usage ?? null,
          productId: null,
          subscriptionEnd: null,
          stripeSubscriptionId: null,
          isLoading: false,
        });
        return;
      }

      setSubscription({
        subscribed: data.subscribed ?? false,
        planName: data.plan_name || 'free',
        plan: data.plan ?? null,
        limits: data.limits ?? null,
        usage: data.usage ?? null,
        productId: data.product_id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        stripeSubscriptionId: data.stripe_subscription_id ?? null,
        isLoading: false,
      });
    } catch (error) {
      // Only log once per session to reduce noise
      if (!sessionStorage.getItem('subscription_error_logged')) {
        console.warn('Subscription check failed - using default state');
        sessionStorage.setItem('subscription_error_logged', 'true');
      }
      // Gracefully handle errors - don't break the app
      setSubscription(prev => ({ ...prev, isLoading: false }));
    }
  }, [session?.access_token]);

  const createCheckout = async (priceId: string, isYearly: boolean = false, couponCode?: string): Promise<{ url?: string; error?: string }> => {
    if (!session?.access_token) {
      toast.error('Please log in to subscribe');
      return { error: 'Please log in to subscribe' };
    }

    if (!priceId) {
      return { error: 'Invalid plan configuration' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
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

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setSubscription({
        subscribed: false,
        planName: 'free',
        plan: null,
        limits: null,
        usage: null,
        productId: null,
        subscriptionEnd: null,
        stripeSubscriptionId: null,
        isLoading: false,
      });
    }
  }, [user, checkSubscription]);

  // Refresh subscription status less frequently (every 5 minutes) to reduce API calls
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 300000); // Every 5 minutes instead of every minute

    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return {
    ...subscription,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
}
