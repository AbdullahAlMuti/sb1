import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, ArrowLeft, RefreshCw, ShieldCheck, Check } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { supabase } from '@repo/api-client/supabase/client';
import { clearPlanIntent, getPlanIntent, clearCheckoutPending } from '@repo/auth/lib/planIntent';
import { resolveNextStep } from '@repo/auth/lib/resolveNextStep';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
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

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'verify-email' | 'reset';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode resolution order: ?mode= URL param (used by the password-reset email
  // link → /auth?mode=reset) → navigation state → default login.
  const urlMode = searchParams.get('mode');
  const initialMode: AuthMode =
    urlMode === 'reset' || urlMode === 'forgot-password' || urlMode === 'login' || urlMode === 'signup'
      ? (urlMode as AuthMode)
      : (location.state as { mode?: AuthMode })?.mode || 'login';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [newPassword, setNewPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);
  // Single-screen credentials layout is used, so loginStep and detectedGoal states are no longer required.
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
  const { access, isLoading: subscriptionLoading } = useSubscription();

  // Legacy: /auth reached with signup intent → canonical /signup page.
  // Preserve the query string so a ?plan token survives the redirect.
  useEffect(() => {
    if (mode === 'signup') {
      navigate({ pathname: '/signup', search: location.search }, { replace: true });
    }
  }, [mode, navigate, location.search]);

  // Clear any stale checkout pending state when reaching the login/auth page
  useEffect(() => {
    clearCheckoutPending();
  }, []);

  // Single post-login redirect (Flow C/D/E): verified + profile loaded →
  // access ? dashboard : checkout(plan)/pricing. Plan intent is preserved for
  // unpaid users (only cleared once they actually reach the dashboard).
  useEffect(() => {
    if (authLoading || !user) return;

    // Password-recovery session: the user is authenticated only to set a new
    // password. Do NOT redirect them to the dashboard/checkout before they do.
    if (mode === 'reset') return;

    // Not verified yet — keep them on the verification UI.
    if (!isEmailVerified) {
      setPendingVerificationEmail(user.email ?? null);
      setMode('verify-email');
      return;
    }

    // Wait for profile so the access check is meaningful (avoids a dashboard
    // bounce on a stale/empty profile).
    if (!authProfile) return;
    // Wait for the authoritative subscription state (admins skip the wait).
    if (subscriptionLoading && !isAdmin) return;

    const userGoal = (authProfile.settings as Record<string, unknown> | null)?.goal as string | undefined;
    const planToken = getPlanIntent() || authProfile.pending_plan_id || null;
    const hasAccess = access === 'active' || access === 'trial' || isAdmin;
    const next = resolveNextStep({
      hasUser: true,
      isEmailVerified: true,
      isAdmin,
      access,
      planToken,
      dashboardPath: getDashboardPathForGoal(userGoal),
      onboardingCompleted: authProfile.onboarding_completed ?? false,
    });
    if (hasAccess) {
      clearPlanIntent();
      localStorage.removeItem('selectedGoal');
    }
    navigate(next, { replace: true });
  }, [user, authProfile, isEmailVerified, authLoading, isAdmin, access, subscriptionLoading, navigate, mode]);

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

    if (mode === 'login' || mode === 'signup') {
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = passwordSchema.safeParse(newPassword);
    if (!result.success) {
      setErrors({ password: result.error.errors[0].message });
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      // The recovery link established a session, so updateUser sets the new
      // password for the authenticated (recovering) user.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated. Please sign in with your new password.');
      setNewPassword('');
      // Drop the ?mode=reset param and return to the login form.
      navigate('/auth', { replace: true });
      switchMode('login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password. The reset link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setResetEmailSent(false);
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
    switch (mode) {
      case 'login': return 'Welcome back';
      case 'signup': return 'Create Account';
      case 'forgot-password': return 'Reset Password';
      case 'verify-email': return 'Verify Your Email';
    }
  };

  const getDescription = () => {
    if (mode === 'verify-email') {
      return `We've sent a 6-digit verification code to ${pendingVerificationEmail}`;
    }
    switch (mode) {
      case 'login': return 'Sign in to manage your store, products, and orders.';
      case 'signup': return 'Start your dropshipping automation journey';
      case 'forgot-password': return 'Enter your email to receive a reset link';
      default: return '';
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google sign in failed');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px]"
      >


        {mode === 'reset' ? (
          <div className="w-full flex flex-col space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#0a1128] dark:text-white">
                Set a new password
              </h1>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-medium max-w-[280px] mx-auto leading-normal">
                Choose a strong password to finish resetting your account.
              </p>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-1.5">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className={`pl-10 pr-10 h-[46px] bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-450 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 ${
                      errors.password ? 'border-destructive' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-550 hover:text-slate-650 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-[46px] text-sm font-semibold bg-[#0A1128] hover:bg-[#121E47] text-white dark:bg-white dark:hover:bg-slate-100 dark:text-[#0A1128] rounded-xl flex items-center justify-center gap-2 group transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-4">
              <button
                type="button"
                onClick={() => { navigate('/auth', { replace: true }); switchMode('login'); }}
                className="text-blue-650 dark:text-blue-405 hover:underline font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : mode === 'verify-email' ? (
          <div className="w-full flex flex-col space-y-6">
            <div className="flex justify-center">
              <div className="relative w-20 h-20 rounded-full bg-[#0A1128]/5 dark:bg-white/10 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#0A1128]/10 dark:bg-white/20 flex items-center justify-center relative">
                  <Mail className="h-8 w-8 text-[#0A1128] dark:text-white" />
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-950 rounded-full p-1 shadow-sm">
                    <ShieldCheck className="h-4 w-4 text-[#0A1128] dark:text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Verify your email
              </h2>
              <p className="text-slate-550 dark:text-slate-400 text-xs max-w-[320px] mx-auto leading-relaxed">
                We've sent a verification code to{' '}
                <span className="text-slate-900 dark:text-white font-bold">{maskEmail(pendingVerificationEmail || '')}</span>.
                Please enter the code below to activate your account.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <OtpInput value={code} onChange={setCode} disabled={isVerifyingOtp} />

              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-[46px] text-sm font-semibold bg-[#0A1128] hover:bg-[#121E47] text-white dark:bg-white dark:hover:bg-slate-100 dark:text-[#0A1128] rounded-xl flex items-center justify-center gap-2 group transition-all"
                disabled={isVerifyingOtp}
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify email'
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-150 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-slate-950 px-3 text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 text-center text-xs text-slate-550 dark:text-slate-400">
                <p>
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingEmail}
                    className="text-blue-650 dark:text-blue-405 hover:underline font-semibold"
                  >
                    {isResendingEmail ? 'Sending...' : 'Resend code'}
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium underline mt-1"
                >
                  Back to Log in
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="w-full flex flex-col space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[#0a1128] dark:text-white">
                {getTitle()}
              </h1>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-medium max-w-[340px] mx-auto leading-normal">
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
                  className="w-full h-[46px] rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <div className="flex flex-col space-y-5">
                {/* Google Sign In - Show on login mode */}
                {mode === 'login' && (
                  <>
                    <Button
                      type="button"
                      onClick={handleGoogleSignIn}
                      variant="outline"
                      className="w-full h-[46px] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-[#0a1128] dark:text-slate-300 font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all bg-transparent"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </Button>

                    <div className="relative select-none my-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200 dark:border-slate-800/60" />
                      </div>
                      <div className="relative flex justify-center text-[12px]">
                        <span className="bg-white dark:bg-slate-950 px-3 text-slate-500 dark:text-slate-400 font-medium normal-case">
                          or sign in with email
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email input field - Show on signup, forgot-password, and login */}
                  {(mode === 'login' || mode === 'signup' || mode === 'forgot-password') && (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-550" strokeWidth={2} />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setErrors(prev => ({ ...prev, email: undefined }));
                          }}
                          className={`pl-10 h-[46px] bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 ${
                            errors.email ? 'border-destructive' : ''
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-xs font-medium text-destructive">{errors.email}</p>
                      )}
                    </div>
                  )}

                  {/* Password field - Show on signup, or login */}
                  {(mode === 'login' || mode === 'signup') && (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-555" strokeWidth={2} />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setErrors(prev => ({ ...prev, password: undefined }));
                          }}
                          className={`pl-10 pr-10 h-[46px] bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 ${
                            errors.password ? 'border-destructive' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-550 hover:text-slate-650 dark:hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                      {mode === 'login' && (
                        <div className="flex justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => switchMode('forgot-password')}
                            className="text-xs text-blue-650 dark:text-blue-405 hover:underline font-medium"
                          >
                            Forgot password?
                          </button>
                        </div>
                      )}
                      {errors.password && (
                        <p className="text-xs font-medium text-destructive">{errors.password}</p>
                      )}
                    </div>
                  )}

                  {/* CAPTCHA - Show before submit on signup or login */}
                  {(mode === 'login' || mode === 'signup') && (
                    <div className="py-1 flex justify-center">
                      <TurnstileCaptcha 
                        onVerify={(token) => setCaptchaToken(token)} 
                        onExpire={() => setCaptchaToken(null)}
                      />
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-[46px] text-sm font-semibold bg-[#0A1128] hover:bg-[#121E47] text-white dark:bg-white dark:hover:bg-slate-100 dark:text-[#0A1128] rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {mode === 'login' ? 'Signing in...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        {mode === 'login' ? 'Log in' : 'Send Reset Link'}
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* Terms of Service */}
            <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed px-2 select-none">
              By signing in, you agree to our<br />
              <Link to="/terms" className="text-blue-650 dark:text-blue-405 hover:underline font-medium">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-blue-650 dark:text-blue-405 hover:underline font-medium">Privacy Policy</Link>.
            </p>

            <div className="text-center text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-4 select-none">
              <p className="text-xs">
                {mode === 'login' ? "New to SellerSuit?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'login') {
                      navigate({ pathname: '/signup', search: location.search });
                    } else {
                      switchMode('login');
                    }
                  }}
                  className="ml-1 text-blue-650 dark:text-blue-405 hover:underline font-semibold"
                >
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
