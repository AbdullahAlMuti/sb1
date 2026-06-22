import { supabase, getFunctionErrorMessage } from "@repo/api-client/supabase/client";

/**
 * Data layer for admin user-management operations.
 *
 * These admin-only Edge Functions verify the caller's role server-side (JWT ->
 * `user_roles` -> 403) and write `audit_logs`. This service centralizes the
 * calls that were previously duplicated inline across AdminUsers and AdminRoles.
 */

export type AppRole = "user" | "admin" | "super_admin";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { token, headers: { Authorization: `Bearer ${token}` } };
}

export interface UsersVerification {
  verificationStatuses: Record<string, boolean>;
  userEmails: Record<string, string>;
}

/** Best-effort batch lookup of email + verification status. Never throws. */
export async function getUsersVerification(userIds: string[]): Promise<UsersVerification> {
  if (userIds.length === 0) return { verificationStatuses: {}, userEmails: {} };
  try {
    const { headers } = await authHeaders();
    const { data } = await supabase.functions.invoke("admin-get-users-verification", {
      body: { userIds },
      headers,
    });
    return {
      verificationStatuses: data?.verificationStatuses ?? {},
      userEmails: data?.userEmails ?? {},
    };
  } catch (e) {
    console.error("Error fetching user verification:", e);
    return { verificationStatuses: {}, userEmails: {} };
  }
}

/** Set a user's role via the server-guarded `admin-update-role` function. */
export async function updateUserRole(userId: string, newRole: AppRole) {
  const { token, headers } = await authHeaders();
  if (!token) throw new Error("You must be signed in as an admin to update roles");

  const { data, error } = await supabase.functions.invoke("admin-update-role", {
    body: { userId, newRole },
    headers,
  });

  if (error) {
    const rawErrMsg = await getFunctionErrorMessage(error);
    throw new Error(rawErrMsg || error.message || "Failed to update role");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export interface VerifyEmailResult {
  success: boolean;
  error?: string;
}

/** Manually confirm a user's email via `admin-verify-email`. */
export async function verifyUserEmail(userId: string): Promise<VerifyEmailResult> {
  const { headers } = await authHeaders();
  const { data, error } = await supabase.functions.invoke("admin-verify-email", {
    body: { userId },
    headers,
  });
  if (error) throw error;
  return (data ?? { success: false }) as VerifyEmailResult;
}
