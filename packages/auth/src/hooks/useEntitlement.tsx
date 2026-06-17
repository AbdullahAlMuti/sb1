import { useSubscription } from './useSubscription';

export interface EntitlementState {
  isPaid: boolean;
  isTrialing: boolean;
  tier: string;
  status: string;
  isLoading: boolean;
  refresh: (force?: boolean) => Promise<void>;
}

export function useEntitlement(): EntitlementState {
  const { access, planName, isLoading, checkSubscription } = useSubscription();

  const isPaid = access === 'active';
  const isTrialing = access === 'trial';
  const tier = planName || 'none';
  const status = access;

  return {
    isPaid,
    isTrialing,
    tier,
    status,
    isLoading,
    refresh: checkSubscription,
  };
}
