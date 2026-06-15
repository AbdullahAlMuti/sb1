import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, ArrowLeft, RefreshCw, ShieldCheck, Check } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { supabase } from '@repo/api-client/supabase/client';
import { clearPlanIntent, getPlanIntent } from '@repo/auth/lib/planIntent';
import { routeAfterAuth } from '@repo/auth/lib/routeAfterAuth';
import { canAccessDashboard } from '@repo/auth/ProtectedRoute';
import { getDashboardPathForGoal } from '@repo/config/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { OtpInput } from '@repo/auth/components/auth/OtpInput';
import { TurnstileCaptcha } from '@repo/auth/components/auth/TurnstileCaptcha';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'verify-email';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get mode from navigation state
  const initialMode = (location.state as { mode?: AuthMode })?.mode || 'login';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [loginStep, setLoginStep] = useState<'email' | 'password'>('email');
  const [detectedGoal, setDetectedGoal] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(
    (location.state as { pendingEmail?: string })?.pendingEmail || null
  );
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const maskEmail = (str: string) => {
    if (!str) return 'your email';
    const [local, domain] = str.split('@');
    if (local.length <= 3) return `***@${domain}`;
    const firstLetter = local[0];
    const middlePart = '***';
    const lastLetter = local[local.length - 1];
    return `${firstLetter}${middlePart}${lastLetter}@${domain}`;
  };

  const { signIn, signUp, verifyOtp, resendVerificationEmail, user, profile: authProfile, isAdmin, isEmailVerified, isLoading: authLoading } = useAuth();

  // Legacy: /auth reached with signup intent → canonical /signup page.
  useEffect(() => {
    if (mode === 'signup') {
      navigate('/signup', { replace: true });
    }
  }, [mode, navigate]);

  // Single post-login redirect (Flow C/D/E): verified + profile loaded →
  // access ? dashboard : checkout(plan)/pricing. Plan intent is preserved for
  // unpaid users (only cleared once they actually reach the dashboard).
  useEffect(() => {
    if (authLoading || !user) return;

    // Not verified yet — keep them on the verification UI.
    if (!isEmailVerified) {
      setPendingVerificationEmail(user.email ?? null);
      setMode('verify-email');
      return;
    }

    // Wait for profile so the access check is meaningful (avoids a dashboard
    // bounce on a stale/empty profile).
    if (!authProfile) return;

    const userGoal = (authProfile.settings as Record<string, unknown> | null)?.goal as string | undefined;
    const canAccess = canAccessDashboard(user, authProfile, isAdmin);
    const planToken = getPlanIntent() || authProfile.pending_plan_id || null;
    const next = routeAfterAuth({
      canAccess,
      planToken,
      dashboardPath: getDashboardPathForGoal(userGoal),
    });
    if (canAccess) {
      clearPlanIntent();
      localStorage.removeItem('selectedGoal');
    }
    navigate(next, { replace: true });
  }, [user, authProfile, isEmailVerified, authLoading, isAdmin, navigate]);

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
    
    // Step 1: Email check for login mode
    if (mode === 'login' && loginStep === 'email') {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        setErrors({ email: emailResult.error.errors[0].message });
        return;
      }
      setErrors({});
      setIsSubmitting(true);

      // eBay-only product: proceed straight to the password step. We previously
      // called get_user_goal(email) here, but that RPC leaked account existence
      // (and the user's goal) to anonymous callers — its grants are now revoked
      // (see migration: revoke anon PII function grants). Goal defaults to 'ebay'.
      setDetectedGoal('ebay');
      setLoginStep('password');
      setIsSubmitting(false);
      return;
    }

    if (!validateForm()) return;

    if ((mode === 'login' && loginStep === 'password') || mode === 'signup') {
      if (!captchaToken) {
        toast.error('Please complete the security check.');
        return;
      }
    }

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
        const { error } = await signIn(email, password, 'user');
        if (error) {
          throw error;
        }
        // Redirect will be handled by useEffect
      } else {
        // Duplicate emails are rejected by signUp() below. We removed an anon
        // get_user_goal(email) pre-check that leaked account existence to
        // anonymous callers (grants now revoked).
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
      if (
        error.message?.includes('User already registered') || 
        error.message?.includes('non-2xx status code') || 
        error.message?.includes('already exists')
      ) {
        setErrors({ email: 'This email is already registered. Please sign in instead.' });
        toast.error('This email is already registered.');
      } else if (error.message?.includes('Invalid login credentials')) {
        setErrors({ password: 'Invalid email or password. Please try again.' });
        toast.error('Invalid email or password. Please try again.');
      } else if (error.message?.includes('login panel')) {
        setErrors({ password: error.message });
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
    setLoginStep('email');
    setDetectedGoal(null);
    setCaptchaToken(null);
    if (newMode !== 'verify-email') {
      setPendingVerificationEmail(null);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    
    setIsResendingEmail(true);
    try {
      const { error } = await resendVerificationEmail(pendingVerificationEmail);
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.join('');
    if (!pendingVerificationEmail || token.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    
    setIsVerifyingOtp(true);
    try {
      const { error } = await verifyOtp(pendingVerificationEmail, token);
      if (error) {
        // Error toast is handled by useAuth
        return;
      }
      // On success, we must sign the user in so the auth session is established
      const { error: signInError } = await signIn(pendingVerificationEmail, password, 'user');
      if (signInError) {
        toast.error('Verification succeeded, but auto sign-in failed. Please log in manually.');
        setMode('login');
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const getTitle = () => {
    if (mode === 'login' && loginStep === 'password') {
      if (detectedGoal === 'shopify') return 'Shopify Tools Sign In';
      if (detectedGoal === 'ebay') return 'eBay Tools Sign In';
      if (detectedGoal === 'both') return 'SellerSuit Sign In';
    }
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot-password': return 'Reset Password';
      case 'verify-email': return 'Verify Your Email';
    }
  };

  const getDescription = () => {
    if (mode === 'verify-email') {
      return `We've sent a 6-digit verification code to ${pendingVerificationEmail}`;
    }
    if (mode === 'login' && loginStep === 'password') {
      if (detectedGoal === 'shopify') return 'Access your winning products, spy tools, and ad library';
      if (detectedGoal === 'ebay') return 'Access your listings, orders, and dashboard';
      if (detectedGoal === 'both') return 'Access your multi-platform dashboard';
      return 'Enter your password to access your dashboard';
    }
    switch (mode) {
      case 'login': return 'Sign in to access your dashboard';
      case 'signup': return 'Start your dropshipping automation journey';
      case 'forgot-password': return 'Enter your email to receive a reset link';
      default: return '';
    }
  };

  if (mode === 'verify-email') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[440px]"
        >
          <div className="bg-card border border-border/80 p-6 sm:p-8 rounded-[20px] shadow-md flex flex-col space-y-6">
            {/* Illustrated Envelope Badge */}
            <div className="flex justify-center">
              <div className="relative w-20 h-20 rounded-full bg-primary/5 dark:bg-primary/10 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center relative">
                  <Mail className="h-8 w-8 text-primary" />
                  <div className="absolute -bottom-1 -right-1 bg-card border-2 border-background dark:border-zinc-900 rounded-full p-1 shadow-sm">
                    <ShieldCheck className="h-4 w-4 text-primary fill-primary/10" />
                  </div>
                </div>
              </div>
            </div>

            {/* Headline & Subtitle */}
            <div className="text-center space-y-2">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Verify your email
              </h2>
              <p className="text-muted-foreground text-xs max-w-[320px] mx-auto leading-relaxed">
                We've sent a verification code to{' '}
                <span className="text-primary font-bold">{maskEmail(pendingVerificationEmail || '')}</span>.
                Please enter the code below to activate your account.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* Digit Inputs */}
              <OtpInput value={code} onChange={setCode} disabled={isVerifyingOtp} />

              {/* Verify Email Button */}
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-11 text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-2 group transition-all"
                disabled={isVerifyingOtp}
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify email
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              {/* Separator line with Lock Shield icon */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/75" />
                  </span>
                </div>
              </div>

              {/* Resend Code */}
              <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
                <p>
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingEmail}
                    className="text-primary hover:underline font-semibold"
                  >
                    {isResendingEmail ? 'Sending...' : 'Resend code'}
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-muted-foreground hover:text-foreground font-medium underline mt-1"
                >
                  Back to Log in
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <a href="/" className="inline-flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
              mode === 'login' && loginStep === 'password' && detectedGoal === 'shopify' 
                ? 'bg-emerald-600 dark:bg-emerald-500' 
                : mode === 'login' && loginStep === 'password' && detectedGoal === 'ebay'
                ? 'bg-blue-600 dark:bg-blue-500'
                : 'bg-primary'
            }`}>
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-2xl font-display font-bold text-foreground">
              {mode === 'login' && loginStep === 'password' && detectedGoal === 'shopify' ? (
                <span>Shopify<span className="text-emerald-600 dark:text-emerald-500 font-normal">Suit</span></span>
              ) : mode === 'login' && loginStep === 'password' && detectedGoal === 'ebay' ? (
                <span>eBay<span className="text-blue-600 dark:text-blue-500 font-normal">Suit</span></span>
              ) : (
                'SellerSuit'
              )}
            </span>
          </a>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border/80 p-6 sm:p-8 rounded-[20px] shadow-md flex flex-col space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-display font-extrabold tracking-tight text-foreground">
              {getTitle()}
            </h1>
            <p className="text-muted-foreground text-xs max-w-[280px] mx-auto">
              {getDescription()}
            </p>
          </div>

          {resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 text-sm">
                <p>Check your email for a password reset link.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => switchMode('login')}
                className="w-full h-11 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-foreground text-xs font-semibold">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-11 bg-transparent border-border/70 text-foreground placeholder:text-muted-foreground/60 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Email input field - Show on signup, forgot-password, and step 1 of login */}
              {((mode === 'login' && loginStep === 'email') || mode === 'signup' || mode === 'forgot-password') && (
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground text-xs font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors(prev => ({ ...prev, email: undefined }));
                      }}
                      className={`pl-10 h-11 bg-transparent border-border/70 text-foreground placeholder:text-muted-foreground/60 rounded-xl ${
                        errors.email ? 'border-destructive' : ''
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-destructive">{errors.email}</p>
                  )}
                  {mode === 'signup' && errors.email && errors.email.includes('registered') && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs space-y-1 mt-2 animate-slide-in">
                      <p className="font-semibold">Email already registered</p>
                      <p>
                        This email is already registered. Would you like to{' '}
                        <button type="button" onClick={() => switchMode('login')} className="underline font-bold text-primary">
                          Sign in
                        </button>{' '}
                        instead?
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 of Login: Compact display of selected Email and custom warning if email is not registered */}
              {mode === 'login' && loginStep === 'password' && (
                <div className="space-y-4">
                  <div className="bg-secondary/50 border border-border/80 px-4 py-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground/75" />
                      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoginStep('email')}
                      className="text-xs text-primary hover:underline font-semibold animate-fade-in"
                    >
                      Change
                    </button>
                  </div>

                  {detectedGoal === 'none' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-xl text-xs space-y-1 animate-slide-in">
                      <p className="font-semibold">Email not registered</p>
                      <p>We couldn't find an account for this email. Would you like to <button type="button" onClick={() => switchMode('signup')} className="underline font-bold text-primary">Sign up</button> instead?</p>
                    </div>
                  )}
                </div>
              )}

              {/* Password field - Show on signup, or step 2 of login */}
              {((mode === 'login' && loginStep === 'password') || mode === 'signup') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-foreground text-xs font-semibold">Password</Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot-password')}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      className={`pl-10 pr-10 h-11 bg-transparent border-border/70 text-foreground placeholder:text-muted-foreground/60 rounded-xl ${
                        errors.password ? 'border-destructive' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-destructive">{errors.password}</p>
                  )}
                </div>
              )}

              {/* CAPTCHA - Show before submit on signup or step 2 of login */}
              {((mode === 'login' && loginStep === 'password') || mode === 'signup') && (
                <TurnstileCaptcha 
                  onVerify={(token) => setCaptchaToken(token)} 
                  onExpire={() => setCaptchaToken(null)}
                />
              )}

              <Button 
                type="submit" 
                size="lg" 
                className={`w-full h-11 text-xs sm:text-sm font-semibold text-primary-foreground rounded-xl flex items-center justify-center gap-2 group transition-all duration-300 ${
                  mode === 'login' && loginStep === 'password' && detectedGoal === 'shopify'
                    ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                    : mode === 'login' && loginStep === 'password' && detectedGoal === 'ebay'
                    ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                    : 'bg-primary hover:bg-primary/90'
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === 'login' 
                      ? (loginStep === 'email' ? 'Checking...' : 'Signing in...') 
                      : mode === 'signup' 
                      ? 'Creating account...' 
                      : 'Sending...'}
                  </>
                ) : (
                  <>
                    {mode === 'login' 
                      ? (loginStep === 'email' ? 'Continue' : 'Sign In') 
                      : mode === 'signup' 
                      ? 'Create Account' 
                      : 'Send Reset Link'}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="text-center text-xs text-muted-foreground border-t border-border/60 pt-4">
            {mode === 'forgot-password' ? (
              <p>
                Remember your password?
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="ml-1 text-primary hover:underline font-semibold"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'login') {
                      navigate('/signup');
                    } else {
                      switchMode('login');
                    }
                  }}
                  className="ml-1 text-primary hover:underline font-semibold"
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
            className="text-center mt-4 text-xs text-muted-foreground/80"
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
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground h-8"
              onClick={() => {
                localStorage.removeItem('selectedPlanId');
                localStorage.removeItem('selectedPlanName');
                localStorage.removeItem('appliedCouponCode');
                navigate('/#pricing');
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
