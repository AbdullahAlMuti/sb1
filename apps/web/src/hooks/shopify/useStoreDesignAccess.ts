import { useState, useEffect } from 'react';
import { supabase } from '@repo/api-client/supabase/client';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { PLAN_HIERARCHY, type PublicStoreDesign } from '@repo/types';

export function useStoreDesignAccess() {
  const { user } = useAuth();
  const [userPlanName, setUserPlanName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserPlan() {
      if (!user) {
        setUserPlanName(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase.rpc as any)('get_user_plan_name', { check_user_id: user.id });
        
        if (error) throw error;
        
        // Ensure plan name maps to the correct hierarchy naming
        // Database plan names might already be correct (e.g. 'growth', 'agency')
        setUserPlanName((data as string) || null);
      } catch (err) {
        console.error('Error fetching user plan:', err);
        setUserPlanName(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserPlan();
  }, [user]);

  const canAccess = (design: PublicStoreDesign): boolean => {
    // 1. Free designs are always accessible
    if (design.is_free || design.access_level === 'free') {
      return true;
    }

    // Default to false if user is unknown (must upgrade)
    if (!userPlanName) {
      return false;
    }

    // 2. Explicit allowed plans
    if (design.allowed_plans && design.allowed_plans.includes(userPlanName)) {
      return true;
    }

    // 3. Hierarchical access (Base Access Level)
    const userPlanLevel = PLAN_HIERARCHY[userPlanName as keyof typeof PLAN_HIERARCHY] ?? -1;
    const requiredPlanLevel = PLAN_HIERARCHY[design.access_level as keyof typeof PLAN_HIERARCHY] ?? 999;

    if (userPlanLevel >= requiredPlanLevel) {
      return true;
    }

    return false;
  };

  return {
    canAccess,
    userPlanName,
    isLoading
  };
}
