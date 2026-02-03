import { forwardRef, useRef, useState } from "react";
import { Check, Zap, Rocket, Building2, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlans, Plan } from "@/hooks/usePlans";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckoutDialog } from "./checkout/CheckoutDialog";

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Crown,
  starter: Zap,
  growth: Rocket,
  enterprise: Building2,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    }
  },
};

const PricingSection = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createCheckout, planName: currentPlanName } = useSubscription();
  const { plans, isLoading: plansLoading } = usePlans();
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });
  
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const handlePlanSelect = async (plan: Plan) => {
    if (!user) {
      // Store selected plan info for after auth
      localStorage.setItem('selectedPlanId', plan.id);
      localStorage.setItem('selectedPlanName', plan.name);
      navigate('/auth', { state: { mode: 'signup', selectedPlan: plan } });
      return;
    }

    // For paid plans, open the checkout dialog
    if (plan.stripe_price_id_monthly) {
      setSelectedPlan(plan);
      setCheckoutDialogOpen(true);
    } else {
      navigate('/dashboard/subscription');
    }
  };

  const handleCheckout = async (couponCode?: string) => {
    if (selectedPlan?.stripe_price_id_monthly) {
      const { url } = await createCheckout(selectedPlan.stripe_price_id_monthly, false, couponCode);
      if (url) {
        window.location.href = url;
      }
    }
  };

  if (plansLoading) {
    return (
      <section ref={ref} className="py-24 relative overflow-hidden">
        <div className="container flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
      
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="container relative z-10 px-4">
        {/* Section header */}
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Pricing
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Choose Your
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Automation Level
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free and upgrade as you grow. All plans include core automation features.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div 
          ref={containerRef}
          className={cn(
            "grid gap-4 sm:gap-6 max-w-6xl mx-auto",
            plans.length <= 2 ? "sm:grid-cols-2 max-w-3xl" :
            plans.length === 3 ? "sm:grid-cols-2 md:grid-cols-3 max-w-4xl" :
            "sm:grid-cols-2 lg:grid-cols-4"
          )}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {plans.map((plan) => {
            const Icon = planIcons[plan.name] || Zap;
            const isCurrentPlan = currentPlanName === plan.name && !!user;
            // Use dynamic is_popular flag from database
            const isFeatured = plan.is_popular || (plans.length <= 2 && plan.price_monthly > 0);
            const isPaid = plan.price_monthly > 0;

            return (
              <motion.div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl sm:rounded-3xl p-6 sm:p-8 transition-all duration-300 bg-card border",
                  isFeatured 
                    ? "border-primary shadow-lg shadow-primary/10" 
                    : "border-border",
                  isCurrentPlan && "ring-2 ring-success"
                )}
                variants={cardVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                {/* Featured badge */}
                {isFeatured && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-success text-primary-foreground text-sm font-semibold">
                      Your Plan
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="text-center mb-8">
                  <motion.div 
                    className={cn(
                      "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4",
                      isFeatured ? "bg-primary/20" : "bg-primary/10"
                    )}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Icon className="h-6 w-6 text-primary" />
                  </motion.div>
                  <h3 className="font-display text-xl font-semibold mb-2 text-foreground">{plan.display_name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="font-display text-4xl font-bold text-foreground">${plan.price_monthly}</span>
                    {isPaid && <span className="text-muted-foreground">/month</span>}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <motion.li 
                      key={i} 
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center",
                        isFeatured ? "bg-primary/20" : "bg-success/20"
                      )}>
                        <Check className={cn(
                          "w-3 h-3",
                          isFeatured ? "text-primary" : "text-success"
                        )} />
                      </div>
                      <span className="text-sm text-foreground">{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant={isFeatured ? "default" : "outline"} 
                    className={cn(
                      "w-full h-12",
                      isFeatured && "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                    )}
                    disabled={isCurrentPlan}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    {isCurrentPlan 
                      ? 'Current Plan' 
                      : !isPaid 
                        ? 'Get Started Free' 
                        : 'Upgrade Now'}
                  </Button>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Trust badges */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-muted-foreground text-sm">
            All plans include 14-day money-back guarantee • Cancel anytime • Secure payment via Stripe
          </p>
        </motion.div>
      </div>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        plan={selectedPlan}
        onCheckout={handleCheckout}
      />
    </section>
  );
});

PricingSection.displayName = "PricingSection";

export default PricingSection;
