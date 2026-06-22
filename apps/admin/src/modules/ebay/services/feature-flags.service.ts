import { supabase } from "@repo/api-client/supabase/client";

/**
 * Data layer for the eBay feature-control system (global flags + per-user
 * overrides), backed by SECURITY DEFINER RPCs that enforce admin access
 * server-side. Centralizes the RPC names and the `as any` casts that were
 * previously copy-pasted inside the page component.
 *
 * Boundary: components -> hooks (react-query) -> this service. The service owns
 * all Supabase access; callers only see typed data and thrown errors.
 */

export interface EbayFeatureControl {
  feature_key: string;
  is_enabled: boolean;
}

export interface EbayUserFeatureOverride {
  feature_key: string;
  is_enabled: boolean;
}

// The generated Supabase types don't include these admin RPCs, so we cast once
// here rather than at every call site.
const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase as any).rpc(name, args);

export async function getGlobalFeatureControls(): Promise<EbayFeatureControl[]> {
  const { data, error } = await rpc("get_ebay_feature_controls_admin");
  if (error) throw error;
  return (data ?? []) as EbayFeatureControl[];
}

export async function getUserFeatureOverrides(userId: string): Promise<EbayUserFeatureOverride[]> {
  const { data, error } = await rpc("get_user_feature_overrides_admin", { p_user_id: userId });
  if (error) throw error;
  return (data ?? []) as EbayUserFeatureOverride[];
}

export async function updateGlobalFeatureControl(input: {
  featureKey: string;
  enabled: boolean;
  reason: string;
}): Promise<void> {
  const { error } = await rpc("update_ebay_global_feature_control", {
    p_feature_key: input.featureKey,
    p_enabled: input.enabled,
    p_reason: input.reason,
  });
  if (error) throw error;
}

export async function updateUserFeatureOverride(input: {
  userId: string;
  featureKey: string;
  enabled: boolean;
  reason: string;
}): Promise<void> {
  const { error } = await rpc("update_user_feature_override", {
    p_user_id: input.userId,
    p_feature_key: input.featureKey,
    p_enabled: input.enabled,
    p_reason: input.reason,
  });
  if (error) throw error;
}

export async function removeUserFeatureOverride(input: {
  userId: string;
  featureKey: string;
  reason: string;
}): Promise<void> {
  const { error } = await rpc("remove_user_feature_override", {
    p_user_id: input.userId,
    p_feature_key: input.featureKey,
    p_reason: input.reason,
  });
  if (error) throw error;
}
