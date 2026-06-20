import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { supabase } from '@repo/api-client/supabase/client';
import { toast } from 'sonner';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'product-research' | 'best-selling' | 'profitable-products';
}

const FEATURE_CONTENT = {
  'product-research': {
    headline: 'Unlock Unlimited AI Product Research',
    subheadline: 'Find high-margin winning products in seconds with our advanced AI analyzer.',
    bullets: [
      'Unlimited AI product and niche research',
      'Reveal top supplier recommendations (Amazon, Walmart, AliExpress)',
      'Access 5,000+ active listings & auto-orders',
      'Priority support + 5,000 credits per month'
    ],
    missingLine: 'Unlock full AI capabilities to analyze wireless earbuds, pet accessories, kitchen niches, and more.'
  },
  'best-selling': {
    headline: 'Unlock All Best Selling Items',
    subheadline: 'Gain access to the full, daily updated catalog of top-selling eBay products.',
    bullets: [
      'Browse all 1,400+ best selling items',
      'Unlock advanced country filters and search tools',
      'Export winning product details straight to the Bulk Lister',
      'Direct supplier source matching and price tracking'
    ],
    missingLine: 'You are currently seeing only 2 out of 1,400+ best-selling items.'
  },
  'profitable-products': {
    headline: 'Unlock Curated Profitable Winners',
    subheadline: 'Gain instant access to our hand-picked, pre-vetted list of dropshipping winners.',
    bullets: [
      'Access all 200+ high-margin profitable products',
      'Instant one-click "Add to eBay" auto-lister tool',
      'Real-time price monitoring and stock tracking',
      'Detailed profit margin, shipping cost, and revenue breakdowns'
    ],
    missingLine: 'You are currently seeing only 2 out of 200+ curated products.'
  }
};

export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  const { createCheckout } = useSubscription();
  const [proPlan, setProPlan] = useState<any>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch Pro Plan details dynamically from database
    supabase
      .from('plans')
      .select('id, name, display_name, price_monthly, stripe_price_id_monthly')
      .eq('name', 'pro')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching pro plan:', error);
        } else if (data) {
          setProPlan(data);
        }
      });
  }, [isOpen]);

  const handleUpgrade = async () => {
    if (!proPlan) {
      toast.error('Plan configuration is loading. Please try again.');
      return;
    }

    setIsUpgrading(true);
    try {
      const res = await createCheckout(
        proPlan.id, 
        'monthly', 
        undefined, 
        proPlan.stripe_price_id_monthly
      );
      
      if (res.url) {
        window.location.href = res.url;
      } else {
        toast.error(res.error || 'Failed to initiate upgrade checkout.');
        setIsUpgrading(false);
      }
    } catch (err: any) {
      console.error('Upgrade error:', err);
      toast.error(err.message || 'An unexpected error occurred during upgrade.');
      setIsUpgrading(false);
    }
  };

  const content = FEATURE_CONTENT[feature];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-card border border-primary/20 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden z-10"
          >
            {/* Header / Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Glowing Accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />

            <div className="p-6 sm:p-8 space-y-6">
              {/* Feature specific headline */}
              <div className="space-y-2 text-center pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium Tool
                </div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  {content.headline}
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {content.subheadline}
                </p>
              </div>

              {/* What you're missing / value framing */}
              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
                <p className="text-xs font-medium text-purple-300">
                  ⚠️ {content.missingLine}
                </p>
              </div>

              {/* Outcome-focused Benefits */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  What you get with Pro:
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {content.bullets.map((bullet, index) => (
                    <div key={index} className="flex items-start gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 text-green-400 mt-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-muted-foreground">{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visible plan card & price */}
              <div className="p-5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-foreground text-base">Pro Plan</h3>
                  <p className="text-xs text-muted-foreground">Unlock all routes & lister tools</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-foreground">$49</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Per Month</p>
                </div>
              </div>

              {/* Single Primary CTA */}
              <div className="space-y-3">
                <Button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-purple-500/10 transition-all hover:scale-[1.01]"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting to Secure Checkout...
                    </>
                  ) : (
                    'Upgrade Plan'
                  )}
                </Button>

                {/* Conversion safety lines */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-green-400" />
                  <span>Cancel anytime. 100% secure Stripe checkout.</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
