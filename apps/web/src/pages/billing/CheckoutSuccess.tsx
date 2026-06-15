import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { resolveNextStep } from '@repo/auth/lib/resolveNextStep';
import { clearPlanIntent } from '@repo/auth/lib/planIntent';
import { getDashboardPathForGoal } from '@repo/config/navigation';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPaymentMode = searchParams.get('mode') === 'payment';

  const { user, profile, isAdmin, isLoading: authLoading, refreshProfile } = useAuth();
  const { checkSubscription, planName, access } = useSubscription();
  const [status, setStatus] = useState<'verifying' | 'success' | 'redirecting' | 'pending'>('verifying');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 6;

  // Authoritative success: trust the server access state (live Stripe + reconciled
  // trial), never profile flags or the mere fact that Stripe redirected back here.
  const isSuccess = isAdmin || access === 'active' || access === 'trial';

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (isSuccess) {
      setStatus('success');
      clearPlanIntent();

      const goal = (profile?.settings as Record<string, unknown> | null)?.goal as string | undefined;
      const dest = resolveNextStep({
        hasUser: true,
        isEmailVerified: true,
        isAdmin,
        access,
        onboardingCompleted: profile?.onboarding_completed === true,
        planToken: null,
        dashboardPath: getDashboardPathForGoal(goal),
      });
      const redirectTimer = setTimeout(() => {
        setStatus('redirecting');
        navigate(dest, { replace: true });
      }, 2500);
      return () => clearTimeout(redirectTimer);
    }

    // Not confirmed after exhausting retries. Do NOT fake success or push to the
    // dashboard (the guard would bounce them anyway). Show a pending state and
    // keep the plan intent so they can retry or revisit checkout.
    if (retryCount >= maxRetries) {
      setStatus('pending');
      return;
    }

    const verifySubscription = async () => {
      await checkSubscription(true);
      await refreshProfile();
      setRetryCount((prev) => prev + 1);
    };

    const delay = retryCount === 0 ? 2500 : 2000;
    const timer = setTimeout(verifySubscription, delay);
    return () => clearTimeout(timer);
  }, [user, authLoading, retryCount, isSuccess, access, isAdmin, profile?.onboarding_completed, checkSubscription, refreshProfile, navigate]);

  const headingText = isPaymentMode ? 'Trial Activated!' : 'Payment Successful!';
  const bodyText = isPaymentMode
    ? `Your ${planName || 'trial'} plan is active. Enjoy your 7-day trial.`
    : `Welcome to the ${planName || 'plan'}. Your subscription is now active.`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-card border border-border rounded-2xl p-12 text-center max-w-md w-full shadow-lg"
      >
        {status === 'pending' ? (
          <>
            <Clock className="h-16 w-16 text-amber-500 mx-auto mb-6" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">
              Still confirming your payment
            </h1>
            <p className="text-muted-foreground mb-6">
              If you completed payment, it may still be processing — this can take
              a minute. You can check again, or revisit your plan.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                className="h-11 w-full rounded-lg"
                onClick={() => { setRetryCount(0); setStatus('verifying'); }}
              >
                Check again
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full rounded-lg"
                onClick={() => navigate('/choose-plan')}
              >
                Back to plans
              </Button>
            </div>
          </>
        ) : status === 'verifying' ? (
          <>
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">
              {isPaymentMode ? 'Activating Trial...' : 'Verifying Payment...'}
            </h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your {isPaymentMode ? 'trial' : 'subscription'}.
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                This may take a moment...
              </p>
            )}
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
            </motion.div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-3">
              {headingText}
            </h1>
            <p className="text-muted-foreground mb-6 capitalize">
              {bodyText}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{profile?.onboarding_completed ? "Redirecting to dashboard..." : "Setting up your workspace..."}</span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
