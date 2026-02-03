import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { checkSubscription, planName, subscribed, isLoading: subscriptionLoading } = useSubscription();
  const [status, setStatus] = useState<'verifying' | 'success' | 'redirecting'>('verifying');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    const verifySubscription = async () => {
      // Refresh subscription status
      await checkSubscription();
      
      // Wait a bit for the state to update
      setTimeout(() => {
        if (subscribed) {
          setStatus('success');
          // Clear any stored plan data
          localStorage.removeItem('selectedPlanId');
          localStorage.removeItem('selectedPlanName');
          localStorage.removeItem('appliedCouponCode');
          
          // Wait a moment to show success, then redirect
          setTimeout(() => {
            setStatus('redirecting');
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else if (retryCount < maxRetries) {
          // Stripe webhook might still be processing - retry
          setRetryCount(prev => prev + 1);
        } else {
          // Max retries reached - redirect anyway, subscription hook will verify
          setStatus('success');
          localStorage.removeItem('selectedPlanId');
          localStorage.removeItem('selectedPlanName');
          localStorage.removeItem('appliedCouponCode');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        }
      }, 500);
    };

    // Initial delay to allow Stripe webhook to process
    const timer = setTimeout(verifySubscription, retryCount === 0 ? 2000 : 1500);
    return () => clearTimeout(timer);
  }, [user, authLoading, checkSubscription, navigate, subscribed, retryCount]);

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
              Verifying Payment...
            </h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your subscription.
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
              Payment Successful!
            </h1>
            <p className="text-muted-foreground mb-6">
              Welcome to the <span className="text-primary font-semibold capitalize">{planName || 'Premium'}</span> plan.
              Your subscription is now active.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecting to dashboard...</span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
