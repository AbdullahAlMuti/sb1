import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { getPlanIntent } from '@repo/auth/lib/planIntent';

/**
 * Shown when the user returns from Stripe without completing payment
 * (cancel_url). No charge was made. We keep the plan intent so "Try again"
 * resumes the exact plan they were checking out.
 */
export default function PaymentCancelled() {
  const navigate = useNavigate();
  const intent = getPlanIntent();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-card border border-border rounded-2xl p-10 text-center max-w-md w-full shadow-lg"
      >
        <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="font-display text-2xl font-bold text-foreground mb-3">
          Checkout cancelled
        </h1>
        <p className="text-muted-foreground mb-8">
          No payment was taken. You can pick up right where you left off whenever
          you're ready.
        </p>

        <div className="flex flex-col gap-3">
          {intent && (
            <Button
              className="h-11 w-full rounded-lg"
              onClick={() => navigate(`/checkout?plan=${encodeURIComponent(intent)}`)}
            >
              Try again
            </Button>
          )}
          <Button
            variant={intent ? 'outline' : 'default'}
            className="h-11 w-full rounded-lg"
            onClick={() => navigate('/pricing')}
          >
            Choose a plan
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
