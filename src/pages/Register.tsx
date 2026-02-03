import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Loader2, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { usePlans } from '@/hooks/usePlans';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Register() {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; confirmEmail?: string; password?: string; terms?: string }>({});

  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { plans, isLoading: plansLoading, getPlanByName } = usePlans();

  // Get selected plan from location state or localStorage
  const stateSelectedPlan = (location.state as { selectedPlan?: string })?.selectedPlan;
  const storedPlan = localStorage.getItem('selectedPlan');
  const selectedPlanKey = stateSelectedPlan || storedPlan || 'starter';
  const selectedPlan = getPlanByName(selectedPlanKey) || plans.find(p => p.price_monthly > 0);

  // Store selected plan in localStorage for persistence
  useEffect(() => {
    if (stateSelectedPlan) {
      localStorage.setItem('selectedPlan', stateSelectedPlan);
    }
  }, [stateSelectedPlan]);

  useEffect(() => {
    if (user && selectedPlan) {
      // User is already logged in, redirect to payment if paid plan selected
      if (selectedPlan.price_monthly > 0) {
        navigate('/payment-required', { replace: true });
      } else {
        localStorage.removeItem('selectedPlan');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate, selectedPlan]);

  const validateForm = () => {
    const newErrors: { email?: string; confirmEmail?: string; password?: string; terms?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (email !== confirmEmail) {
      newErrors.confirmEmail = 'Emails do not match';
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the Terms & Conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { error } = await signUp(email, password, fullName);
      if (!error) {
        toast.success('Account created! Redirecting to payment...');
        // Redirect to payment required page for paid plans
        if (selectedPlan && selectedPlan.price_monthly > 0) {
          navigate('/payment-required');
        } else {
          // Free plan - go directly to dashboard
          localStorage.removeItem('selectedPlan');
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl"
      >
        {/* Back button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/#pricing')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Registration Form - Step One */}
          <div className="glass-card p-8">
            {/* Steps indicator */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Step One</span>
                  <span className="font-semibold text-foreground border-b-2 border-primary pb-1">Create Account</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Step Two</span>
                  <span className="font-semibold text-muted-foreground">Payment Details</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  className={`bg-primary/5 border-border/50 text-foreground placeholder:text-muted-foreground ${
                    errors.email ? 'border-destructive' : ''
                  }`}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Confirm Email */}
              <div className="space-y-2">
                <Label htmlFor="confirmEmail" className="text-foreground">Confirm Email Address</Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  placeholder="Confirm Email"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    setErrors(prev => ({ ...prev, confirmEmail: undefined }));
                  }}
                  className={`bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground ${
                    errors.confirmEmail ? 'border-destructive' : ''
                  }`}
                />
                {errors.confirmEmail && (
                  <p className="text-sm text-destructive">{errors.confirmEmail}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    className={`pr-10 bg-primary/5 border-border/50 text-foreground placeholder:text-muted-foreground ${
                      errors.password ? 'border-destructive' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-sm text-destructive">{errors.password}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Must be 6 characters</p>
                )}
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="terms" 
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => {
                    setAgreedToTerms(checked as boolean);
                    setErrors(prev => ({ ...prev, terms: undefined }));
                  }}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                  I agree to SellerSuit's{' '}
                  <a href="/terms" className="text-primary hover:underline">Terms & Conditions</a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                </Label>
              </div>
              {errors.terms && (
                <p className="text-sm text-destructive">{errors.terms}</p>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                variant="hero" 
                size="lg" 
                className="w-full uppercase tracking-wide"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Proceed to Secure Payment
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Google Sign Up */}
              <Button variant="outline" type="button" className="w-full" disabled>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign up with Google
              </Button>

              {/* Already have account */}
              <p className="text-center text-muted-foreground mt-4">
                Already a member?{' '}
                <a href="/auth" className="text-primary hover:underline font-medium">
                  Login
                </a>
              </p>
            </form>
          </div>

          {/* Plan Details - Right Side */}
          {selectedPlan && (
            <div className="glass-card p-8">
              <div className="mb-6">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Your Subscription</span>
                <h2 className="font-display text-3xl font-bold text-foreground mt-2">
                  {selectedPlan.display_name} Plan
                </h2>
              </div>

              {/* Features List */}
              <ul className="space-y-4 mb-8">
                {selectedPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-success" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Price Summary */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-foreground">Total Due Today</span>
                  <span className="font-display text-3xl font-bold text-foreground">
                    ${selectedPlan.price_monthly} <span className="text-lg font-normal text-muted-foreground">USD</span>
                  </span>
                </div>

                {/* Guarantee Badge */}
                <div className="bg-secondary/50 rounded-lg px-4 py-3 text-center mb-4">
                  <span className="text-sm font-medium text-foreground">30-Day Money-Back Guarantee</span>
                </div>

                {/* Subscription note */}
                <p className="text-xs text-muted-foreground text-center">
                  Starting next month, you'll be billed ${selectedPlan.price_monthly}/month for the {selectedPlan.display_name} subscription unless you cancel. You can cancel anytime.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}