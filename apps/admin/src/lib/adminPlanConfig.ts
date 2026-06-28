import { supabase } from '@repo/api-client/supabase/client';

type Resource = 'plans' | 'plan_prices' | 'plan_features';
type Action = 'create' | 'update' | 'delete';

interface AdminPlanConfigMutation {
  resource: Resource;
  action: Action;
  id?: string;
  payload?: Record<string, unknown>;
}

export async function mutateAdminPlanConfig<T = unknown>(mutation: AdminPlanConfigMutation): Promise<T | null> {
  const { data, error } = await supabase.functions.invoke('admin-plan-config', {
    body: mutation,
  });

  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return (data?.data ?? null) as T | null;
}
