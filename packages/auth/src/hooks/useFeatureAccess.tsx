import { useSubscription } from './useSubscription';

export type FeatureFlag =
  | 'bulk_lister'
  | 'price_monitoring'
  | 'top_selling_products'
  | 'ai_product_research'
  | 'profitable_products'
  | 'priority_support';

export function useFeatureAccess() {
  const { plan, access, isLoading } = useSubscription();

  const hasFeature = (flag: FeatureFlag | string): boolean => {
    if (isLoading) return false;
    if (access === 'none' || access === 'trial_expired') return false;
    const flags = plan?.feature_flags ?? {};
    const val = flags[flag];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val > 0;
    return Boolean(val);
  };

  return { hasFeature, access, isLoading };
}
