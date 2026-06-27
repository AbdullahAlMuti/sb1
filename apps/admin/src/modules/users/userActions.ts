import { useQuery } from "@tanstack/react-query";
import { useAdminMutation } from "@/core/data/mutate";
import { rpc, invokeFn, list } from "@/core/data/resource";
import { keys } from "@/core/data/keys";

/**
 * All operator actions on a user, each wired to the existing audited admin RPC
 * or edge function. Every mutation invalidates the user list + that user's
 * detail snapshot so the UI never drifts.
 */
function userInvalidation(userId: string) {
  return [keys.users.all, keys.users.detail(userId)];
}

export function usePlansList() {
  return useQuery({
    queryKey: keys.plans.list({ active: true }),
    queryFn: async () => {
      const { rows } = await list<{ id: string; display_name: string; credits_per_month: number | null }>("plans", {
        select: "id, display_name, credits_per_month",
        filters: { is_active: true },
        order: { column: "price_monthly", ascending: true },
      });
      return rows;
    },
  });
}

export function useAdjustCredits(userId: string) {
  return useAdminMutation<{ amount: number; reason: string }, unknown>(
    ({ amount, reason }) =>
      rpc("adjust_user_credits_admin", {
        p_user_id: userId,
        p_amount: amount,
        p_adjustment_type: amount > 0 ? "grant" : "revoke",
        p_reason: reason,
      }),
    { invalidate: userInvalidation(userId), successMessage: "Credits adjusted" },
  );
}

export function useChangePlan(userId: string) {
  return useAdminMutation<{ planId: string; reason: string }, unknown>(
    ({ planId, reason }) => rpc("update_user_plan_admin", { p_user_id: userId, p_plan_id: planId, p_reason: reason }),
    { invalidate: userInvalidation(userId), successMessage: "Plan updated" },
  );
}

export function useToggleStatus(userId: string) {
  return useAdminMutation<{ isActive: boolean; reason: string }, unknown>(
    ({ isActive, reason }) =>
      rpc("toggle_user_status_admin", { p_user_id: userId, p_is_active: isActive, p_reason: reason }),
    { invalidate: userInvalidation(userId), successMessage: "Account status updated" },
  );
}

export function useExtendSubscription(userId: string) {
  return useAdminMutation<{ days: number; reason: string }, unknown>(
    ({ days, reason }) => rpc("extend_user_subscription_admin", { p_user_id: userId, p_days: days, p_reason: reason }),
    { invalidate: userInvalidation(userId), successMessage: "Subscription extended" },
  );
}

export function useUpdateLimits(userId: string) {
  return useAdminMutation<
    { maxListings: number; maxAutoOrders: number; creditsPerMonth: number; reason: string },
    unknown
  >(
    ({ maxListings, maxAutoOrders, creditsPerMonth, reason }) =>
      rpc("update_user_limits_admin", {
        p_user_id: userId,
        p_max_listings: maxListings,
        p_max_auto_orders: maxAutoOrders,
        p_credits_per_month: creditsPerMonth,
        p_reason: reason,
      }),
    { invalidate: userInvalidation(userId), successMessage: "Limits overridden" },
  );
}

export function useChangeRole(userId: string) {
  return useAdminMutation<{ newRole: string }, unknown>(
    ({ newRole }) => invokeFn("admin-update-role", { userId, newRole }),
    { invalidate: userInvalidation(userId), successMessage: "Role updated" },
  );
}

export function useVerifyEmail(userId: string) {
  return useAdminMutation<void, unknown>(() => invokeFn("admin-verify-email", { userId }), {
    invalidate: userInvalidation(userId),
    successMessage: "Email verified",
  });
}

/**
 * Queue a server-side order resync for the user by enqueuing a job in the
 * background_jobs queue (drained by queue-worker). This is the real mechanism —
 * not a no-op — though delivery depends on a worker picking up the job type.
 */
export function useQueueResync(userId: string) {
  return useAdminMutation<void, unknown>(
    () => rpc("queue_user_order_resync_admin", { p_user_id: userId }),
    { invalidate: userInvalidation(userId), successMessage: "Resync queued" },
  );
}
