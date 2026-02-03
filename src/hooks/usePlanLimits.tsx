import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PlanLimits {
  credits_per_month: number;
  max_listings: number;
  max_auto_orders: number;
  current_credits: number;
  orders_used: number;
  listings_count: number;
  plan_name: string;
  plan_display_name: string;
  current_period_end: string | null;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  limitType: 'credits' | 'listings' | 'orders';
}

export function usePlanLimits() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    if (!user?.id) {
      setLimits(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch user's profile with current credits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits, plan_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch user's plan details (cast for extended schema)
      const { data: userPlan } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      const userPlanData = userPlan as { orders_used?: number; current_period_end?: string; plan_id?: string } | null;

      // Fetch the plan limits from plans table
      const planId = profile?.plan_id || userPlanData?.plan_id;
      let planData = null;

      if (planId) {
        const { data } = await supabase
          .from('plans')
          .select('name, display_name, credits_per_month, max_listings, max_auto_orders')
          .eq('id', planId)
          .single();
        planData = data;
      }

      // If no plan, use free plan defaults
      if (!planData) {
        const { data: freePlan } = await supabase
          .from('plans')
          .select('name, display_name, credits_per_month, max_listings, max_auto_orders')
          .eq('name', 'free')
          .single();
        planData = freePlan;
      }

      // Count user's listings
      const { count: listingsCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active');

      setLimits({
        credits_per_month: planData?.credits_per_month ?? 5,
        max_listings: planData?.max_listings ?? 10,
        max_auto_orders: planData?.max_auto_orders ?? 0,
        current_credits: profile?.credits ?? 0,
        orders_used: userPlanData?.orders_used ?? 0,
        listings_count: listingsCount ?? 0,
        plan_name: planData?.name ?? 'free',
        plan_display_name: planData?.display_name ?? 'Free',
        current_period_end: userPlanData?.current_period_end ?? null,
      });
      setError(null);
    } catch (err: any) {
      console.error('Error fetching plan limits:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  // Real-time subscription for profile/plan changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('plan-limits-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => fetchLimits()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_plans', filter: `user_id=eq.${user.id}` },
        () => fetchLimits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchLimits]);

  const checkCreditLimit = useCallback(
    (creditsNeeded: number = 1): LimitCheckResult => {
      if (!limits) {
        return { allowed: false, reason: 'Loading limits...', current: 0, limit: 0, limitType: 'credits' };
      }

      if (limits.current_credits < creditsNeeded) {
        return {
          allowed: false,
          reason: `Insufficient credits. You have ${limits.current_credits} credits, but need ${creditsNeeded}.`,
          current: limits.current_credits,
          limit: limits.credits_per_month,
          limitType: 'credits',
        };
      }

      return { allowed: true, current: limits.current_credits, limit: limits.credits_per_month, limitType: 'credits' };
    },
    [limits]
  );

  const checkListingLimit = useCallback((): LimitCheckResult => {
    if (!limits) {
      return { allowed: false, reason: 'Loading limits...', current: 0, limit: 0, limitType: 'listings' };
    }

    if (limits.listings_count >= limits.max_listings) {
      return {
        allowed: false,
        reason: `Listing limit reached. You have ${limits.listings_count}/${limits.max_listings} active listings.`,
        current: limits.listings_count,
        limit: limits.max_listings,
        limitType: 'listings',
      };
    }

    return { allowed: true, current: limits.listings_count, limit: limits.max_listings, limitType: 'listings' };
  }, [limits]);

  const checkOrderLimit = useCallback((): LimitCheckResult => {
    if (!limits) {
      return { allowed: false, reason: 'Loading limits...', current: 0, limit: 0, limitType: 'orders' };
    }

    if (limits.max_auto_orders === 0) {
      return {
        allowed: false,
        reason: 'Auto orders are not available on your current plan.',
        current: limits.orders_used,
        limit: limits.max_auto_orders,
        limitType: 'orders',
      };
    }

    if (limits.orders_used >= limits.max_auto_orders) {
      return {
        allowed: false,
        reason: `Order limit reached. You have used ${limits.orders_used}/${limits.max_auto_orders} orders this billing period.`,
        current: limits.orders_used,
        limit: limits.max_auto_orders,
        limitType: 'orders',
      };
    }

    return { allowed: true, current: limits.orders_used, limit: limits.max_auto_orders, limitType: 'orders' };
  }, [limits]);

  return {
    limits,
    isLoading,
    error,
    refetch: fetchLimits,
    checkCreditLimit,
    checkListingLimit,
    checkOrderLimit,
  };
}
