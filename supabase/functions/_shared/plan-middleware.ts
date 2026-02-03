// =====================================================
// SHARED PLAN MIDDLEWARE - Backend Enforcement Layer
// =====================================================
// This module provides centralized plan validation for all edge functions.
// NO hardcoded limits - everything comes from the database.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type LimitAction = 
  | 'credit' 
  | 'listing' 
  | 'order' 
  | 'seo_title' 
  | 'seo_description';

export interface PlanLimits {
  credits_per_month: number;
  max_listings: number;
  max_auto_orders: number;
  max_seo_titles: number;
  max_seo_descriptions: number;
  auto_orders_enabled: boolean;
  seo_enabled: boolean;
  order_reset_frequency: string;
  is_trial: boolean;
  trial_duration_days: number;
}

export interface UserUsage {
  credits: number;
  orders_used: number;
  credits_used: number;
  seo_titles_used: number;
  seo_descriptions_used: number;
  listings_count: number;
}

export interface PlanValidation {
  allowed: boolean;
  reason?: string;
  limitType?: LimitAction;
  current: number;
  limit: number;
  isBlocked: boolean;
  blockedReason?: string;
  isExpired: boolean;
  isTrial: boolean;
  planName: string;
  planDisplayName: string;
  adminOverride?: Record<string, number>;
}

export interface FullPlanStatus {
  isBlocked: boolean;
  blockedReason?: string;
  isExpired: boolean;
  isTrial: boolean;
  trialEndsAt?: string;
  planName: string;
  planDisplayName: string;
  limits: PlanLimits;
  usage: UserUsage;
  adminOverride?: Record<string, number>;
  subscriptionEnd?: string;
}

/**
 * Fetches complete plan status for a user - use for dashboard/status checks
 */
export async function getFullPlanStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<FullPlanStatus | null> {
  try {
    // Fetch profile with credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, plan_id')
      .eq('id', userId)
      .single();

    if (!profile) {
      return null;
    }

    // Fetch user_plan with all usage data
    const { data: userPlan } = await supabase
      .from('user_plans')
      .select(`
        orders_used,
        credits_used,
        seo_titles_used,
        seo_descriptions_used,
        is_blocked,
        blocked_reason,
        trial_end,
        current_period_end,
        status,
        admin_override_limits,
        plan_id
      `)
      .eq('user_id', userId)
      .maybeSingle();

    // Determine plan_id (profile takes precedence)
    const planId = profile.plan_id || userPlan?.plan_id;

    // Fetch plan limits
    let planData: any = null;
    if (planId) {
      const { data } = await supabase
        .from('plans')
        .select(`
          name,
          display_name,
          credits_per_month,
          max_listings,
          max_auto_orders,
          max_seo_titles,
          max_seo_descriptions,
          auto_orders_enabled,
          seo_enabled,
          order_reset_frequency,
          is_trial,
          trial_duration_days
        `)
        .eq('id', planId)
        .single();
      planData = data;
    }

    // Count active listings
    const { count: listingsCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Determine if expired
    // IMPORTANT: do NOT allow a stale "active" string to bypass an ended period.
    const now = new Date();
    let isExpired = false;

    if (userPlan) {
      const statusStr = (userPlan.status ?? '').toLowerCase();
      if (statusStr === 'canceled') {
        isExpired = true;
      }

      // Trials: expired if trial_end is in the past (regardless of status string)
      if (!isExpired && planData?.is_trial && userPlan.trial_end) {
        isExpired = new Date(userPlan.trial_end) < now;
      }

      // Subscriptions: expired if current_period_end is in the past (regardless of status string)
      if (!isExpired && userPlan.current_period_end) {
        isExpired = new Date(userPlan.current_period_end) < now;
      }
    }

    // Default limits for free/missing plan
    const defaultLimits: PlanLimits = {
      credits_per_month: 0,
      max_listings: 10,
      max_auto_orders: 0,
      max_seo_titles: 0,
      max_seo_descriptions: 0,
      auto_orders_enabled: false,
      seo_enabled: false,
      order_reset_frequency: 'monthly',
      is_trial: false,
      trial_duration_days: 0,
    };

    const limits: PlanLimits = planData ? {
      credits_per_month: planData.credits_per_month ?? 0,
      max_listings: planData.max_listings ?? 10,
      max_auto_orders: planData.max_auto_orders ?? 0,
      max_seo_titles: planData.max_seo_titles ?? 0,
      max_seo_descriptions: planData.max_seo_descriptions ?? 0,
      auto_orders_enabled: planData.auto_orders_enabled ?? false,
      seo_enabled: planData.seo_enabled ?? false,
      order_reset_frequency: planData.order_reset_frequency ?? 'monthly',
      is_trial: planData.is_trial ?? false,
      trial_duration_days: planData.trial_duration_days ?? 0,
    } : defaultLimits;

    return {
      isBlocked: userPlan?.is_blocked ?? false,
      blockedReason: userPlan?.blocked_reason ?? undefined,
      isExpired,
      isTrial: limits.is_trial,
      trialEndsAt: userPlan?.trial_end ?? undefined,
      planName: planData?.name ?? 'free',
      planDisplayName: planData?.display_name ?? 'Free',
      limits,
      usage: {
        credits: profile.credits ?? 0,
        orders_used: userPlan?.orders_used ?? 0,
        credits_used: userPlan?.credits_used ?? 0,
        seo_titles_used: userPlan?.seo_titles_used ?? 0,
        seo_descriptions_used: userPlan?.seo_descriptions_used ?? 0,
        listings_count: listingsCount ?? 0,
      },
      adminOverride: userPlan?.admin_override_limits ?? undefined,
      subscriptionEnd: userPlan?.current_period_end ?? undefined,
    };
  } catch (error) {
    console.error('[plan-middleware] getFullPlanStatus error:', error);
    return null;
  }
}

/**
 * Validates if a user can perform a specific action based on their plan limits.
 * Returns 402 Payment Required compatible response if limit exceeded.
 */
export async function validateUserPlan(
  supabase: SupabaseClient,
  userId: string,
  action: LimitAction,
  amount: number = 1
): Promise<PlanValidation> {
  const status = await getFullPlanStatus(supabase, userId);

  if (!status) {
    return {
      allowed: false,
      reason: 'User not found',
      current: 0,
      limit: 0,
      isBlocked: false,
      isExpired: false,
      isTrial: false,
      planName: 'free',
      planDisplayName: 'Free',
    };
  }

  // Check if user is blocked
  if (status.isBlocked) {
    return {
      allowed: false,
      reason: status.blockedReason || 'Account is blocked. Please contact support.',
      current: 0,
      limit: 0,
      isBlocked: true,
      blockedReason: status.blockedReason,
      isExpired: status.isExpired,
      isTrial: status.isTrial,
      planName: status.planName,
      planDisplayName: status.planDisplayName,
    };
  }

  // Check if subscription is expired
  if (status.isExpired) {
    return {
      allowed: false,
      reason: 'Subscription expired. Please renew your plan.',
      current: 0,
      limit: 0,
      isBlocked: false,
      isExpired: true,
      isTrial: status.isTrial,
      planName: status.planName,
      planDisplayName: status.planDisplayName,
    };
  }

  // Get effective limits (admin override takes precedence)
  const getEffectiveLimit = (limitName: string, defaultValue: number): number => {
    if (status.adminOverride && status.adminOverride[limitName] !== undefined) {
      return status.adminOverride[limitName];
    }
    return defaultValue;
  };

  let current: number;
  let limit: number;
  let allowed: boolean;
  let reason: string | undefined;

  switch (action) {
    case 'credit':
      current = status.usage.credits;
      limit = getEffectiveLimit('credits_per_month', status.limits.credits_per_month);
      allowed = current >= amount;
      if (!allowed) {
        reason = `Insufficient credits. You have ${current}, need ${amount}.`;
      }
      break;

    case 'listing':
      current = status.usage.listings_count;
      limit = getEffectiveLimit('max_listings', status.limits.max_listings);
      allowed = current + amount <= limit;
      if (!allowed) {
        // Trial-specific message for the default trial cap (admin override may exceed)
        if (status.isTrial && limit === 10) {
          reason = 'Trial plan listing limit reached (10 max)';
        } else {
          reason = `Listing limit reached (${current}/${limit}). Upgrade your plan.`;
        }
      }
      break;

    case 'order':
      if (!status.limits.auto_orders_enabled) {
        return {
          allowed: false,
          reason: 'Auto-orders are not available on your plan.',
          limitType: action,
          current: 0,
          limit: 0,
          isBlocked: false,
          isExpired: false,
          isTrial: status.isTrial,
          planName: status.planName,
          planDisplayName: status.planDisplayName,
        };
      }
      current = status.usage.orders_used;
      limit = getEffectiveLimit('max_auto_orders', status.limits.max_auto_orders);
      allowed = current + amount <= limit;
      if (!allowed) {
        reason = `Order limit reached (${current}/${limit}). Upgrade your plan.`;
      }
      break;

    case 'seo_title':
      if (!status.limits.seo_enabled) {
        return {
          allowed: false,
          reason: 'SEO tools are not available on your plan.',
          limitType: action,
          current: 0,
          limit: 0,
          isBlocked: false,
          isExpired: false,
          isTrial: status.isTrial,
          planName: status.planName,
          planDisplayName: status.planDisplayName,
        };
      }
      current = status.usage.seo_titles_used;
      limit = getEffectiveLimit('max_seo_titles', status.limits.max_seo_titles);
      allowed = current + amount <= limit;
      if (!allowed) {
        reason = `SEO title limit reached (${current}/${limit}). Upgrade your plan.`;
      }
      break;

    case 'seo_description':
      if (!status.limits.seo_enabled) {
        return {
          allowed: false,
          reason: 'SEO tools are not available on your plan.',
          limitType: action,
          current: 0,
          limit: 0,
          isBlocked: false,
          isExpired: false,
          isTrial: status.isTrial,
          planName: status.planName,
          planDisplayName: status.planDisplayName,
        };
      }
      current = status.usage.seo_descriptions_used;
      limit = getEffectiveLimit('max_seo_descriptions', status.limits.max_seo_descriptions);
      allowed = current + amount <= limit;
      if (!allowed) {
        reason = `SEO description limit reached (${current}/${limit}). Upgrade your plan.`;
      }
      break;

    default:
      return {
        allowed: false,
        reason: 'Unknown action type',
        current: 0,
        limit: 0,
        isBlocked: false,
        isExpired: false,
        isTrial: status.isTrial,
        planName: status.planName,
        planDisplayName: status.planDisplayName,
      };
  }

  return {
    allowed,
    reason,
    limitType: action,
    current,
    limit,
    isBlocked: false,
    isExpired: false,
    isTrial: status.isTrial,
    planName: status.planName,
    planDisplayName: status.planDisplayName,
    adminOverride: status.adminOverride,
  };
}

/**
 * Deducts usage after a successful action. Call this AFTER the action succeeds.
 */
export async function deductUsage(
  supabase: SupabaseClient,
  userId: string,
  action: LimitAction,
  amount: number = 1,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    switch (action) {
      case 'credit':
        // Deduct from profiles.credits
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single();
        
        if (profile) {
          const newCredits = Math.max(0, (profile.credits ?? 0) - amount);
          await supabase
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', userId);

          // Log transaction
          await supabase.from('credit_transactions').insert({
            user_id: userId,
            amount: -amount,
            balance_after: newCredits,
            transaction_type: 'usage',
            description: metadata?.description || 'AI credit usage',
            metadata,
          });

          // Also update credits_used in user_plans
          try {
            const { data: upCredits } = await supabase
              .from('user_plans')
              .select('credits_used')
              .eq('user_id', userId)
              .single();
            if (upCredits) {
              await supabase
                .from('user_plans')
                .update({ credits_used: (upCredits.credits_used ?? 0) + amount })
                .eq('user_id', userId);
            }
          } catch {
            // Ignore if user_plans record doesn't exist
          }
        }
        break;

      case 'order':
        try {
          const { data: orderData } = await supabase
            .from('user_plans')
            .select('orders_used')
            .eq('user_id', userId)
            .single();
          if (orderData) {
            await supabase
              .from('user_plans')
              .update({ orders_used: (orderData.orders_used ?? 0) + amount })
              .eq('user_id', userId);
          }
        } catch {
          // Ignore if user_plans record doesn't exist
        }
        break;

      case 'seo_title':
        const { data: upTitle } = await supabase
          .from('user_plans')
          .select('seo_titles_used')
          .eq('user_id', userId)
          .single();
        if (upTitle) {
          await supabase
            .from('user_plans')
            .update({ seo_titles_used: (upTitle.seo_titles_used ?? 0) + amount })
            .eq('user_id', userId);
        }
        break;

      case 'seo_description':
        const { data: upDesc } = await supabase
          .from('user_plans')
          .select('seo_descriptions_used')
          .eq('user_id', userId)
          .single();
        if (upDesc) {
          await supabase
            .from('user_plans')
            .update({ seo_descriptions_used: (upDesc.seo_descriptions_used ?? 0) + amount })
            .eq('user_id', userId);
        }
        break;

      case 'listing':
        // Listings are counted dynamically, no deduction needed
        break;
    }

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: userId,
      action: action,
      credits_used: action === 'credit' ? amount : 0,
      metadata: {
        ...metadata,
        action_type: action,
        amount,
        timestamp: new Date().toISOString(),
      },
    });

    return true;
  } catch (error) {
    console.error('[plan-middleware] deductUsage error:', error);
    return false;
  }
}

/**
 * Creates a standard 402 Payment Required response for limit exceeded
 */
export function createLimitExceededResponse(
  validation: PlanValidation,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: validation.reason,
      limitType: validation.limitType,
      current: validation.current,
      limit: validation.limit,
      upgradeRequired: true,
      isBlocked: validation.isBlocked,
      isExpired: validation.isExpired,
      planName: validation.planName,
    }),
    {
      status: validation.isBlocked ? 403 : 402,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
