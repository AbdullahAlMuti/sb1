import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  is_active: boolean;
  plan_id: string | null;
  settings: Record<string, unknown> | null;
}

interface UserRole {
  // NOTE: Some older DBs/extensions may still use 'moderator'. Treat it as admin-like.
  role: 'user' | 'admin' | 'super_admin' | 'moderator';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
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

        const ensuredProfile = (ensured as any)?.profile;

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

      const rows = (data as any[]) || [];
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

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { error };
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

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/verify-email`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
      return { error };
    }

    toast.success('Check your email to confirm your account!');
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    toast.success('Signed out successfully');
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) {
      return { error: new Error('No email found') };
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success('Verification email sent! Check your inbox.');
    return { error: null };
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
