import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'verify-email';

interface SelectedPlan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  stripe_price_id_monthly: string | null;
}

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get mode and selected plan from navigation state
  const initialMode = (location.state as { mode?: AuthMode })?.mode || 'login';
  const selectedPlanFromState = (location.state as { selectedPlan?: SelectedPlan })?.selectedPlan;
  
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  const { signIn, signUp, user, isEmailVerified, isLoading: authLoading } = useAuth();
  const { createCheckout, subscribed, planName, isLoading: subscriptionLoading } = useSubscription();

  // Handle redirect after login/signup
  useEffect(() => {
    if (authLoading || subscriptionLoading) return;
    
    if (user) {
      // If the user exists but hasn't verified their email yet, don't redirect away.
      // Keep them on the verification UI.
      if (!isEmailVerified) {
        setPendingVerificationEmail(user.email ?? null);
        setMode('verify-email');
        return;
      }

      // Check if there's a selected plan in localStorage (new signup flow)
      const selectedPlanId = localStorage.getItem('selectedPlanId');
      const appliedCouponCode = localStorage.getItem('appliedCouponCode');
      
      if (selectedPlanId) {
        // New user with selected plan - proceed to checkout
        processCheckoutForNewUser(selectedPlanId, appliedCouponCode);
      } else if (subscribed) {
        // User has active paid subscription - go to dashboard
        navigate('/dashboard', { replace: true });
      } else {
        // User without paid subscription - must pay first
        navigate('/payment-required', { replace: true });
      }
    }
  }, [user, isEmailVerified, authLoading, subscriptionLoading, subscribed, planName, navigate]);

  const processCheckoutForNewUser = async (planId: string, couponCode: string | null) => {
    if (isProcessingCheckout) return;
    setIsProcessingCheckout(true);
    
    try {
      // Fetch the plan to get stripe_price_id
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('stripe_price_id_monthly')
        .eq('id', planId)
        .single();

      if (planError || !plan?.stripe_price_id_monthly) {
        toast.error('Failed to load plan details. Please select a plan again.');
        localStorage.removeItem('selectedPlanId');
        localStorage.removeItem('selectedPlanName');
        localStorage.removeItem('appliedCouponCode');
        navigate('/#pricing', { replace: true });
        return;
      }

      const { url, error } = await createCheckout(
        plan.stripe_price_id_monthly,
        false,
        couponCode || undefined
      );

      if (error) {
        toast.error(error);
        // Clear stored plan and redirect to pricing
        localStorage.removeItem('selectedPlanId');
        localStorage.removeItem('selectedPlanName');
        localStorage.removeItem('appliedCouponCode');
        navigate('/#pricing', { replace: true });
        return;
      }

      if (url) {
        // Clear stored plan before redirecting to Stripe
        localStorage.removeItem('selectedPlanId');
        localStorage.removeItem('selectedPlanName');
        localStorage.removeItem('appliedCouponCode');
        window.location.href = url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process checkout');
      localStorage.removeItem('selectedPlanId');
      localStorage.removeItem('selectedPlanName');
      localStorage.removeItem('appliedCouponCode');
      navigate('/#pricing', { replace: true });
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (mode !== 'forgot-password') {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        
        if (error) throw error;
        
        setResetEmailSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      } else if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          throw error;
        }
        // Redirect will be handled by useEffect
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          throw error;
        }
        // Show verification pending state
        setPendingVerificationEmail(email);
        setMode('verify-email');
      }
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes('User already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
        setMode('login');
      } else if (error.message?.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message || 'An error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setResetEmailSent(false);
    if (newMode !== 'verify-email') {
      setPendingVerificationEmail(null);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    
    setIsResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingVerificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) throw error;
      toast.success('Verification email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot-password': return 'Reset Password';
      case 'verify-email': return 'Verify Your Email';
    }
  };

  const getDescription = () => {
    if (mode === 'verify-email') {
      return `We've sent a verification link to ${pendingVerificationEmail}`;
    }
    if (mode === 'signup' && selectedPlanFromState) {
      return `Complete your signup to start with the ${selectedPlanFromState.display_name} plan`;
    }
    switch (mode) {
      case 'login': return 'Sign in to access your dashboard';
      case 'signup': return 'Start your dropshipping automation journey';
      case 'forgot-password': return 'Enter your email to receive a reset link';
      default: return '';
    }
  };

  // Show loading while processing checkout
  if (isProcessingCheckout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Setting up your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-2xl font-display font-bold text-foreground">SellerSuit</span>
          </a>
        </div>

        {/* Selected Plan Badge */}
        {mode === 'signup' && selectedPlanFromState && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center"
          >
            <p className="text-sm text-muted-foreground">Selected plan:</p>
            <p className="font-semibold text-primary">{selectedPlanFromState.display_name} - ${selectedPlanFromState.price_monthly}/month</p>
          </motion.div>
        )}

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              {getTitle()}
            </h1>
            <p className="text-muted-foreground">
              {getDescription()}
            </p>
          </div>

          {mode === 'verify-email' ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Click the link in your email to verify your account and complete registration.
                </p>
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or click below to resend.
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={handleResendVerification}
                  disabled={isResendingEmail}
                  className="w-full"
                >
                  {isResendingEmail ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={() => switchMode('login')}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </div>
            </div>
          ) : resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="p-4 rounded-lg bg-success/10 text-success">
                <p>Check your email for a password reset link.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => switchMode('login')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    className={`pl-10 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground ${
                      errors.email ? 'border-destructive' : ''
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {mode !== 'forgot-password' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-foreground">Password</Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot-password')}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      className={`pl-10 pr-10 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground ${
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
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                variant="hero" 
                size="lg" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            {mode === 'forgot-password' ? (
              <p className="text-muted-foreground">
                Remember your password?
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="ml-1 text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="ml-1 text-primary hover:underline font-medium"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Note about email confirmation */}
        {mode === 'signup' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-4 text-sm text-muted-foreground"
          >
            You may need to confirm your email before signing in.
          </motion.p>
        )}

        {/* Back to plan selection for signup mode */}
        {mode === 'signup' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-4"
          >
            <Button
              variant="ghost"
              onClick={() => {
                localStorage.removeItem('selectedPlanId');
                localStorage.removeItem('selectedPlanName');
                localStorage.removeItem('appliedCouponCode');
                navigate('/select-plan');
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Change plan selection
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
