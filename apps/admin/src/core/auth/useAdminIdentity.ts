import { useAuth } from "@repo/auth/hooks/useAuth";

export interface AdminIdentity {
  name: string;
  email: string;
  role: "Super Admin" | "Admin" | "User";
  initial: string;
  signOut: () => Promise<void>;
}

/**
 * Real operator identity for the admin chrome — replaces the hardcoded
 * "Admin User / Super Admin" placeholder so it is always clear who is acting.
 */
export function useAdminIdentity(): AdminIdentity {
  const { user, profile, isAdmin, isSuperAdmin, signOut } = useAuth();

  const name = profile?.full_name || user?.email?.split("@")[0] || "Admin";
  const email = user?.email ?? "";
  const role = isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "User";
  const initial = (name?.charAt(0) || email.charAt(0) || "A").toUpperCase();

  return { name, email, role, initial, signOut };
}
