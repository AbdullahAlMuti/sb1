import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { supabase } from '@repo/api-client/supabase/client';
import { clearPlanIntent, getPlanIntent } from '@repo/auth/lib/planIntent';
import { resolveNextStep } from '@repo/auth/lib/resolveNextStep';
import { getDashboardPathForGoal } from '@repo/config/navigation';
import { toast } from 'sonner';

// Roles that must use the admin login panel — mirrors isAdminRole() in
// @repo/auth useAuth.signIn, which OAuth bypasses (no validate-login-context).
const ADMIN_LIKE_ROLES = ['admin', 'super_admin', 'moderator', 'staff'];

/**
 * OAuth landing page (/auth/callback). The Supabase client (flowType: 'pkce',
 * detectSessionInUrl: true) exchanges the ?code= automatically during client
 * initialization — this page never calls exchangeCodeForSession. It only waits
 * for the session + profile to materialize, then routes via resolveNextStep,
 * exactly like the email/password post-login flow in Auth.tsx.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isEmailVerified, isLoading: authLoading, signOut } = useAuth();
  const { access, isLoading: subscriptionLoading } = useSubscription();
  const [timedOut, setTimedOut] = useState(false);
  const routed = useRef(false);

  // Provider-side failure (user denied consent, provider misconfiguration).
  const oauthError = searchParams.get('error_description') || searchParams.get('error');

  useEffect(() => {
    if (oauthError && !routed.current) {
      routed.current = true;
      toast.error(oauthError);
      navigate('/auth', { replace: true });
    }
  }, [oauthError, navigate]);

  // Safety net: if no session materializes (stale/reused code, code verifier
  // missing because the link was opened in another browser, network failure),
  // don't leave the user on a spinner forever.
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (timedOut && !user && !routed.current) {
      routed.current = true;
      toast.error('Sign-in could not be completed. Please try again.');
      navigate('/auth', { replace: true });
    }
  }, [timedOut, user, navigate]);

  useEffect(() => {
    if (routed.current || oauthError || authLoading || !user) return;
    // Wait for the profile: for first-time OAuth users, fetchProfile in
    // AuthProvider invokes ensure-profile and this effect re-runs once the
    // row exists.
    if (!profile) return;

    (async () => {
      // Deterministic role check (context isAdmin races with fetchRoles).
      const { data: roleRows, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (rolesError) {
        routed.current = true;
        toast.error('Unable to validate account access. Please try again.');
        await signOut();
        navigate('/auth', { replace: true });
        return;
      }
      const isAdminAccount = (roleRows ?? []).some((row) =>
        ADMIN_LIKE_ROLES.includes(row.role as string)
      );
      if (isAdminAccount) {
        routed.current = true;
        await signOut();
        toast.error('This account cannot be used from the user login panel. Please use the admin login page.');
        navigate('/auth', { replace: true });
        return;
      }

      // Wait for the authoritative subscription state; effect re-runs when it settles.
      if (subscriptionLoading) return;
      if (routed.current) return;

      const userGoal = (profile.settings as Record<string, unknown> | null)?.goal as string | undefined;
      const planToken = getPlanIntent() || profile.pending_plan_id || null;
      const hasAccess = access === 'active' || access === 'trial';
      const next = resolveNextStep({
        hasUser: true,
        isEmailVerified,
        isAdmin: false,
        access,
        planToken,
        dashboardPath: getDashboardPathForGoal(userGoal),
        onboardingCompleted: profile.onboarding_completed ?? false,
      });
      if (hasAccess) {
        clearPlanIntent();
        localStorage.removeItem('selectedGoal');
      }
      routed.current = true;
      navigate(next, { replace: true });
    })();
  }, [oauthError, authLoading, user, profile, access, subscriptionLoading, isEmailVerified, navigate, signOut]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px]"
      >
        <div className="space-y-4 text-center py-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#0A1128] dark:text-white mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Completing sign-in...</p>
        </div>
      </motion.div>
    </div>
  );
}
