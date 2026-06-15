import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getFunctionErrorMessage } from '@repo/api-client/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  is_active: boolean;
  plan_id: string | null;
  settings: Record<string, unknown> | null;
  onboarding_completed: boolean | null;
  platform_access: string[] | null;
  onboarding_status: string | null;
  account_status: string | null;
  ebay_connected: boolean | null;
  mfa_enabled: boolean | null;
  active_sessions_count: number | null;
  api_key_enabled: boolean | null;
  pending_plan_id: string | null;
  selected_plan_id: string | null;
  payment_status: string | null;
  subscription_status: string | null;
}

interface UserRole {
  // NOTE: Some older DBs/extensions may still use 'moderator'. Treat it as admin-like.
  role: 'user' | 'admin' | 'super_admin' | 'moderator' | 'staff';
}

type RoleRow = {
  role: UserRole['role'];
};

type EnsuredProfileResponse = {
  profile?: Profile & { settings?: unknown };
};

const toError = (error: unknown, fallback: string) =>
  error instanceof Error ? error : new Error(fallback);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  signIn: (email: string, password: string, loginContext?: 'user' | 'admin') => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string, goal?: string, planId?: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: (email?: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = roles.some(r => r.role === 'admin' || r.role === 'super_admin' || r.role === 'moderator');
  const isSuperAdmin = roles.some(r => r.role === 'super_admin');
  const isEmailVerified = user?.email_confirmed_at != null;

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      // If the profile doesn't exist yet, create it server-side and retry.
      if (!data) {
        const { data: ensured, error: ensureError } = await supabase.functions.invoke('ensure-profile');

        if (ensureError) {
          console.error('Error ensuring profile:', ensureError);
          return;
        }

        const ensuredProfile = (ensured as EnsuredProfileResponse | null)?.profile;

        if (ensuredProfile) {
          const profileData: Profile = {
            id: ensuredProfile.id,
            full_name: ensuredProfile.full_name,
            avatar_url: ensuredProfile.avatar_url,
            credits: ensuredProfile.credits ?? 0,
            is_active: ensuredProfile.is_active ?? true,
            plan_id: ensuredProfile.plan_id,
            settings:
              typeof ensuredProfile.settings === 'object' &&
              ensuredProfile.settings !== null &&
              !Array.isArray(ensuredProfile.settings)
                ? (ensuredProfile.settings as Record<string, unknown>)
                : null,
            onboarding_completed: (ensuredProfile as any).onboarding_completed ?? null,
            platform_access: (ensuredProfile as any).platform_access ?? null,
            onboarding_status: (ensuredProfile as any).onboarding_status ?? null,
            account_status: (ensuredProfile as any).account_status ?? null,
            ebay_connected: (ensuredProfile as any).ebay_connected ?? null,
            mfa_enabled: (ensuredProfile as any).mfa_enabled ?? null,
            active_sessions_count: (ensuredProfile as any).active_sessions_count ?? null,
            api_key_enabled: (ensuredProfile as any).api_key_enabled ?? null,
            pending_plan_id: (ensuredProfile as any).pending_plan_id ?? null,
            selected_plan_id: (ensuredProfile as any).selected_plan_id ?? null,
            payment_status: (ensuredProfile as any).payment_status ?? null,
            subscription_status: (ensuredProfile as any).subscription_status ?? null,
          };
          setProfile(profileData);
        }

        return;
      }

      // Cast the settings field to the expected type
      const profileData: Profile = {
        id: data.id,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        credits: data.credits ?? 0,
        is_active: data.is_active ?? true,
        plan_id: data.plan_id,
        settings: typeof data.settings === 'object' && data.settings !== null && !Array.isArray(data.settings)
          ? data.settings as Record<string, unknown>
          : null,
        onboarding_completed: (data as any).onboarding_completed ?? null,
        platform_access: (data as any).platform_access ?? null,
        onboarding_status: (data as any).onboarding_status ?? null,
        account_status: (data as any).account_status ?? null,
        ebay_connected: (data as any).ebay_connected ?? null,
        mfa_enabled: (data as any).mfa_enabled ?? null,
        active_sessions_count: (data as any).active_sessions_count ?? null,
        api_key_enabled: (data as any).api_key_enabled ?? null,
        pending_plan_id: (data as any).pending_plan_id ?? null,
        selected_plan_id: (data as any).selected_plan_id ?? null,
        payment_status: (data as any).payment_status ?? null,
        subscription_status: (data as any).subscription_status ?? null,
      };
      setProfile(profileData);
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    }
  };

  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return;
      }

      const rows = (data || []) as RoleRow[];
      const mappedRoles: UserRole[] = rows.map((r) => ({
        role: r.role as UserRole['role'],
      }));
      setRoles(mappedRoles);
    } catch (err) {
      console.error('Error in fetchRoles:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRoles(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let initialSessionHandled = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        // Skip if this is the initial session and we've already handled it
        if (event === 'INITIAL_SESSION' && initialSessionHandled) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Explicitly sync dashboard token to extension after login/session change
          try {
            if (typeof window !== 'undefined') {
              window.postMessage({ type: 'REFRESH_EXTENSION_TOKEN' }, window.location.origin);
            }
          } catch (err) {
            console.warn('Failed to dispatch REFRESH_EXTENSION_TOKEN', err);
          }

          // Defer Supabase calls to avoid potential race conditions
          setTimeout(() => {
            if (isMounted) {
              fetchProfile(session.user.id);
              fetchRoles(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      initialSessionHandled = true;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Explicitly sync dashboard token to extension after initial mount/check
        try {
          if (typeof window !== 'undefined') {
            window.postMessage({ type: 'REFRESH_EXTENSION_TOKEN' }, window.location.origin);
          }
        } catch (err) {
          console.warn('Failed to dispatch REFRESH_EXTENSION_TOKEN', err);
        }

        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdminRole = (role: string) => role === 'admin' || role === 'super_admin' || role === 'moderator' || role === 'staff';

  const signIn = async (email: string, password: string, loginContext: 'user' | 'admin' = 'user') => {
    try {
      const { data: panelCheckData, error: panelCheckError } = await supabase.functions.invoke('auth-otp', {
        body: {
          action: 'validate-login-context',
          email,
          loginContext,
        },
      });

      if (panelCheckError || (panelCheckData && panelCheckData.error)) {
        const rawErrMsg = await getFunctionErrorMessage(panelCheckError);
        const errMsg = panelCheckData?.error || rawErrMsg || 'Unable to validate login access';
        toast.error(errMsg);
        return { error: new Error(errMsg) };
      }
    } catch (err: unknown) {
      const errMsg = toError(err, 'Unable to validate login access').message;
      toast.error(errMsg);
      return { error: new Error(errMsg) };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    const { data: roleRows, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id);

    if (rolesError) {
      await supabase.auth.signOut();
      toast.error('Unable to validate account access.');
      return { error: new Error('Unable to validate account access.') };
    }

    const hasAdminRole = ((roleRows || []) as RoleRow[]).some((row) => isAdminRole(row.role));
    if (loginContext === 'user' && hasAdminRole) {
      await supabase.auth.signOut();
      const errMsg = 'This account cannot be used from the user login panel. Please use the admin login page.';
      toast.error(errMsg);
      return { error: new Error(errMsg) };
    }

    if (loginContext === 'admin' && !hasAdminRole) {
      await supabase.auth.signOut();
      const errMsg = 'This account cannot be used from the admin login panel. Please use the user login page.';
      toast.error(errMsg);
      return { error: new Error(errMsg) };
    }

    // If email is not verified, keep the session so the app can show the verification UI
    // (ProtectedRoute will block access until verified).
    if (!data.user?.email_confirmed_at) {
      toast.error('Please verify your email before continuing.');
      return { error: new Error('Email not verified') };
    }

    toast.success('Welcome back!');
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName?: string, goal?: string, planId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-otp', {
        body: {
          action: 'signup',
          email,
          password,
          fullName,
          goal,
          planId
        }
      });

      if (error || (data && data.error)) {
        const rawErrMsg = await getFunctionErrorMessage(error);
        const errMsg = data?.error || rawErrMsg || 'An error occurred during signup';
        toast.error(errMsg);
        return { error: new Error(errMsg) };
      }

      toast.success('Please check your email for the verification code!');
      return { error: null };
    } catch (err: unknown) {
      const error = toError(err, 'An error occurred during signup');
      toast.error(error.message);
      return { error };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-otp', {
        body: {
          action: 'verify',
          email,
          code: token
        }
      });

      if (error || (data && data.error)) {
        const rawErrMsg = await getFunctionErrorMessage(error);
        const errMsg = data?.error || rawErrMsg || 'Verification failed';
        toast.error(errMsg);
        return { error: new Error(errMsg) };
      }

      toast.success('Email verified successfully!');
      return { error: null };
    } catch (err: unknown) {
      const error = toError(err, 'Verification failed');
      toast.error(error.message);
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    toast.success('Signed out successfully');
  };

  const resendVerificationEmail = async (email?: string) => {
    const targetEmail = email || user?.email;
    if (!targetEmail) {
      return { error: new Error('No email found') };
    }

    try {
      const { data, error } = await supabase.functions.invoke('auth-otp', {
        body: {
          action: 'resend',
          email: targetEmail
        }
      });

      if (error || (data && data.error)) {
        const rawErrMsg = await getFunctionErrorMessage(error);
        const errMsg = rawErrMsg || data?.error || 'Failed to resend code';
        toast.error(errMsg);
        return { error: new Error(errMsg) };
      }

      toast.success('Verification code resent successfully.');
      return { error: null };
    } catch (err: unknown) {
      const error = toError(err, 'Failed to resend code');
      toast.error(error.message);
      return { error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isAdmin,
        isSuperAdmin,
        isLoading,
        isEmailVerified,
        signIn,
        signUp,
        verifyOtp,
        signOut,
        refreshProfile,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
