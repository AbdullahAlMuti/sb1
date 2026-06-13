import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { useAuth } from '@repo/auth/hooks/useAuth';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPaymentMode = searchParams.get('mode') === 'payment';

  const { user, profile, isLoading: authLoading } = useAuth();
  const { checkSubscription, planName, access, isLoading: subscriptionLoading } = useSubscription();
  const [status, setStatus] = useState<'verifying' | 'success' | 'redirecting'>('verifying');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 6;

  // Success condition depends on payment mode:
  // - payment mode ($1 trial): access === 'trial'
  // - subscription mode: access === 'active'
  const isSuccess = isPaymentMode ? access === 'trial' : access === 'active';

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    const verifySubscription = async () => {
      await checkSubscription(true);

      setTimeout(() => {
        if (isSuccess) {
          setStatus('success');
          localStorage.removeItem('selectedPlanId');
          localStorage.removeItem('selectedPlanName');
          localStorage.removeItem('selectedPlan');
          localStorage.removeItem('appliedCouponCode');

          const dest = profile?.onboarding_completed ? '/dashboard' : '/onboarding';
          setTimeout(() => {
            setStatus('redirecting');
            navigate(dest, { replace: true });
          }, 2500);
        } else if (retryCount < maxRetries) {
          setRetryCount((prev) => prev + 1);
        } else {
          // Max retries — the webhook is still processing; redirect anyway.
          setStatus('success');
          localStorage.removeItem('selectedPlanId');
          localStorage.removeItem('selectedPlanName');
          localStorage.removeItem('selectedPlan');
          localStorage.removeItem('appliedCouponCode');
          const dest = profile?.onboarding_completed ? '/dashboard' : '/onboarding';
          setTimeout(() => navigate(dest, { replace: true }), 2500);
        }
      }, 500);
    };

    const delay = retryCount === 0 ? 2500 : 2000;
    const timer = setTimeout(verifySubscription, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, retryCount]);

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
        {status === 'verifying' ? (
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
