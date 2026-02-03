import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Lock, ArrowRight, Loader2, Check, Zap, Rocket, Building2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlans } from '@/hooks/usePlans';

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Crown,
  trial: Crown,
  starter: Zap,
  growth: Rocket,
  enterprise: Building2,
};

export default function PaymentRequired() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { createCheckout, subscribed, isLoading: subscriptionLoading } = useSubscription();
  const { plans, isLoading: plansLoading, getPlanByName } = usePlans();
  const [isProcessing, setIsProcessing] = useState(false);

  // Get selected plan from localStorage
  const selectedPlanKey = localStorage.getItem('selectedPlan') || 'starter';
  const selectedPlan = getPlanByName(selectedPlanKey) || plans.find(p => p.price_monthly > 0) || null;
  const PlanIcon = planIcons[selectedPlanKey] || Zap;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // If already subscribed, redirect to dashboard
    if (subscribed && !subscriptionLoading) {
      localStorage.removeItem('selectedPlan');
      navigate('/dashboard', { replace: true });
    }
  }, [user, subscribed, subscriptionLoading, navigate]);

  const handlePayNow = async () => {
    if (!selectedPlan?.stripe_price_id_monthly) {
      navigate('/dashboard');
      return;
    }

    setIsProcessing(true);
    try {
      const { url } = await createCheckout(selectedPlan.stripe_price_id_monthly);
      if (url) {
        window.location.href = url;
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePlan = () => {
    navigate('/#pricing');
  };

  const handleSignOut = async () => {
    localStorage.removeItem('selectedPlan');
    await signOut();
    navigate('/');
  };

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Plan not found. Please select a plan.</p>
          <Button onClick={() => navigate('/#pricing')}>View Plans</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="glass-card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-premium/10 mb-4">
              <CreditCard className="h-8 w-8 text-premium" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Get Pro Access
            </h1>
            <p className="text-muted-foreground">
              Unlock premium features and access your dashboard.
            </p>
          </div>

          {/* Selected Plan Card */}
          <div className="rounded-xl border border-premium-border bg-premium-card shadow-glow-premium p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-premium/10 flex items-center justify-center">
                <PlanIcon className="h-6 w-6 text-premium" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {selectedPlan.display_name} Plan
                </h3>
                <p className="text-muted-foreground text-sm">Monthly subscription</p>
              </div>
              <div className="text-right">
                <span className="font-display text-2xl font-bold text-foreground">
                  ${selectedPlan.price_monthly}
                </span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-2">
              {selectedPlan.features.slice(0, 3).map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-success" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="default"
              size="lg"
              className="w-full bg-premium text-premium-foreground hover:bg-premium/90 cta-glow"
              onClick={handlePayNow}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Get Pro Access – ${selectedPlan.price_monthly}/mo
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleChangePlan}
            >
              Change Plan
            </Button>
          </div>

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              🔒 Secure payment via Stripe • 30-day money-back guarantee
            </p>
          </div>

          {/* Sign out option */}
          <div className="mt-4 text-center">
            <button
              onClick={handleSignOut}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out and use a different account
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}