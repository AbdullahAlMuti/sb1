import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  max_listings: number;
  max_auto_orders: number;
  credits_per_month: number;
  is_active: boolean;
  // New dynamic fields
  is_trial: boolean;
  is_popular: boolean;
  trial_duration_days: number;
  auto_orders_enabled: boolean;
  seo_enabled: boolean;
  max_seo_titles: number;
  max_seo_descriptions: number;
  order_reset_frequency: string;
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const formattedPlans: Plan[] = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        display_name: plan.display_name || plan.name,
        price_monthly: plan.price_monthly || 0,
        price_yearly: plan.price_yearly || 0,
        features: Array.isArray(plan.features) 
          ? (plan.features as unknown as string[]) 
          : [],
        stripe_price_id_monthly: plan.stripe_price_id_monthly,
        stripe_price_id_yearly: plan.stripe_price_id_yearly,
        max_listings: (plan as any).max_listings ?? 0,
        max_auto_orders: (plan as any).max_auto_orders ?? 0,
        credits_per_month: (plan as any).credits_per_month ?? 0,
        is_active: plan.is_active ?? true,
        // New dynamic fields
        is_trial: (plan as any).is_trial ?? false,
        is_popular: (plan as any).is_popular ?? false,
        trial_duration_days: (plan as any).trial_duration_days ?? 14,
        auto_orders_enabled: (plan as any).auto_orders_enabled ?? true,
        seo_enabled: (plan as any).seo_enabled ?? true,
        max_seo_titles: (plan as any).max_seo_titles ?? 0,
        max_seo_descriptions: (plan as any).max_seo_descriptions ?? 0,
        order_reset_frequency: (plan as any).order_reset_frequency ?? 'monthly',
      }));

      setPlans(formattedPlans);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Realtime subscription for immediate updates when plans change
  useEffect(() => {
    const channel = supabase
      .channel('plans-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plans'
        },
        (payload) => {
          console.log('Plans changed:', payload.eventType);
          // Refetch plans on any change (INSERT, UPDATE, DELETE)
          fetchPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlans]);

  const getPlanByName = (name: string) => plans.find(p => p.name === name);
  const getPlanById = (id: string) => plans.find(p => p.id === id);

  return {
    plans,
    isLoading,
    error,
    getPlanByName,
    getPlanById,
    refetch: fetchPlans,
  };
}
