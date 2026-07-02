import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Loader2, Check, ArrowLeft, User, Mail, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { usePlans } from '@repo/api-client/hooks/usePlans';
import { supabase } from '@repo/api-client/supabase/client';
import { getPlanIntent, setPlanIntent, clearPlanIntent, resolvePlanToken, clearCheckoutPending } from '@repo/auth/lib/planIntent';
import { resolveNextStep } from '@repo/auth/lib/resolveNextStep';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@repo/ui/lib/utils';
import { getDashboardPathForGoal } from '@repo/config/navigation';
import { SHOPIFY_ENABLED } from '@repo/config/marketplaceScope';
import SellerSuitLogo from '@repo/ui/brand/SellerSuitLogo';
import { OtpInput } from '@repo/auth/components/auth/OtpInput';
import { TurnstileCaptcha } from '@repo/auth/components/auth/TurnstileCaptcha';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

type SellerGoal = 'ebay' | 'shopify' | 'both';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function Register() {
  // eBay-only scope: with Shopify disabled the goal step offers a single option,
  // so skip it — default the goal to 'ebay' and open straight on the account form.
  const [signUpStep, setSignUpStep] = useState<1 | 2 | 3>(SHOPIFY_ENABLED ? 1 : 2);
  const [selectedGoal, setSelectedGoal] = useState<SellerGoal | null>(SHOPIFY_ENABLED ? null : 'ebay');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const { signUp, verifyOtp, resendVerificationEmail, signIn, user, profile, isAdmin } = useAuth();
  const { access, isLoading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const { plans, isLoading: plansLoading } = usePlans();

  // Selected-plan token: URL ?plan → router state → stored intent → server pending.
  // No default — absence means "no plan yet" (Flow A: choose one after signup).
  const query = new URLSearchParams(location.search);
  const urlPlan = query.get('plan');
  const stateSelectedPlan = (location.state as { selectedPlan?: string })?.selectedPlan;
  const storedPlan = getPlanIntent();
  const planToken = urlPlan || stateSelectedPlan || storedPlan || profile?.pending_plan_id || null;
  const selectedPlan = resolvePlanToken(planToken, plans);

  // Persist any incoming plan token so it survives navigation (e.g. closing the tab).
  useEffect(() => {
    const incoming = urlPlan || stateSelectedPlan;
    if (incoming) setPlanIntent(incoming);
  }, [urlPlan, stateSelectedPlan]);

  // Clear any stale checkout pending state when reaching the registration/signup page
  useEffect(() => {
    clearCheckoutPending();
  }, []);

  // Single post-auth redirect (Flow A/B): once the user is verified and the
  // profile is loaded, route by access → plan → pricing. No /pricing bounce
  // before signup, and no duplicate plan/checkout prompts.
  useEffect(() => {
    if (!user || !profile) return;
    // Wait for the authoritative subscription state so routing is onboarding-
    // aware and consistent with the dashboard guard (admins skip the wait).
    if (subscriptionLoading && !isAdmin) return;
    const goal =
      selectedGoal || (profile.settings as Record<string, unknown> | null)?.goal as string | undefined ||
      localStorage.getItem('selectedGoal') || undefined;
    const hasAccess = access === 'active' || access === 'trial' || isAdmin;
    const next = resolveNextStep({
      hasUser: true,
      isEmailVerified: true,
      isAdmin,
      access,
      planToken,
      dashboardPath: getDashboardPathForGoal(goal),
      onboardingCompleted: profile.onboarding_completed ?? false,
    });
    if (hasAccess) {
      clearPlanIntent();
      localStorage.removeItem('selectedGoal');
    }
    navigate(next, { replace: true });
  }, [user, profile, isAdmin, access, subscriptionLoading, planToken, selectedGoal, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};
    
    if (!fullName.trim()) {
      newErrors.fullName = 'Please enter your name';
    }

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!captchaToken) {
      toast.error('Please complete the security check.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signUp(email, password, fullName, selectedGoal || undefined, selectedPlan?.id);
      if (!res.error) {
        if (selectedPlan) {
          setPlanIntent(selectedPlan.id);
        }
        // Persist selected goal for post-auth redirect
        if (selectedGoal) {
          localStorage.setItem('selectedGoal', selectedGoal);
        }
        navigate('/dashboard', { replace: true });
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'An error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.join('');
    if (token.length < 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await verifyOtp(email, token);
      if (!error) {
        // Automatically sign in the user
        const { error: signInError } = await signIn(email, password, 'user');
        if (signInError) {
          toast.error('Verification succeeded, but auto sign-in failed. Please log in manually.');
          navigate('/auth', { replace: true });
          return;
        }

        toast.success('Email verified successfully!');
        // Redirect is handled by the single post-auth effect once the session
        // and profile have loaded (routeAfterAuth: access → plan → pricing).
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Verification failed'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const res = await resendVerificationEmail(email);
      if (!res.error) {
        toast.success('Verification code resent successfully.');
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to resend code'));
    } finally {
      setResending(false);
    }
  };

  const maskEmail = (str: string) => {
    if (!str) return 'your email';
    const [local, domain] = str.split('@');
    if (local.length <= 3) return `***@${domain}`;
    const firstLetter = local[0];
    const middlePart = '***';
    const lastLetter = local[local.length - 1];
    return `${firstLetter}${middlePart}${lastLetter}@${domain}`;
  };

  const options: Array<{
    id: SellerGoal;
    title: string;
    logoBg: string;
    renderLogo: () => JSX.Element;
  }> = [
    {
      id: 'ebay',
      title: 'eBay Seller',
      logoBg: 'bg-zinc-100 dark:bg-zinc-800/60',
      renderLogo: () => (
        <svg className="w-8 h-4 max-w-full" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
          <path d="M71.474 30.746c-3.794.124-6.165.804-6.165 3.32 0 1.63 1.3 3.382 4.578 3.382 4.392 0 6.743-2.392 6.743-6.33v-.433l-5.155.062zm9.362 5.196l.144 3.505h-3.897c-.103-.887-.144-1.773-.144-2.64-2.103 2.598-4.62 3.34-8.104 3.34-5.155 0-7.918-2.722-7.918-5.877 0-4.578 3.753-6.186 10.3-6.33C73 27.9 75 27.9 76.65 27.9v-.454c0-3.052-1.96-4.3-5.36-4.3-2.516 0-4.392 1.052-4.578 2.846H62.3c.474-4.495 5.196-5.63 9.34-5.63 5 0 9.176 1.773 9.176 7.032v8.557z" fill="#f5af02"/>
          <path d="M35.203 28.52c-.165-3.918-3-5.382-6.02-5.382-3.258 0-5.877 1.65-6.33 5.382zM22.77 31.304c.227 3.815 2.846 6.062 6.454 6.062 2.495 0 4.722-1 5.464-3.237h4.33c-.845 4.495-5.63 6.02-9.733 6.02-7.485 0-10.784-4.124-10.784-9.67 0-6.124 3.423-10.145 10.867-10.145 5.918 0 10.248 3.093 10.248 9.857v1.114z" fill="#e53238"/>
          <path d="M50.36 37.283c3.897 0 6.557-2.804 6.557-7.032s-2.66-7.032-6.557-7.032c-3.877 0-6.557 2.804-6.557 7.032s2.68 7.032 6.557 7.032zM39.615 12.97H43.8v10.537c2.062-2.454 4.887-3.155 7.67-3.155 4.68 0 9.857 3.155 9.857 9.96 0 5.7-4.124 9.857-9.94 9.857-3.052 0-5.897-1.093-7.67-3.258 0 .866-.04 1.732-.144 2.557H39.45l.144-4.33V12.97z" fill="#0064d2"/>
          <path d="M102.178 21.034L89.207 46.5h-4.7l3.732-7.073-9.753-18.393h4.908l7.176 14.372 7.155-14.372z" fill="#86b817"/>
        </svg>
      ),
    },
    {
      id: 'shopify',
      title: 'Shopify Seller',
      logoBg: 'bg-[#95BF47]/10 dark:bg-[#A6DF58]/10 border border-[#95BF47]/20',
      renderLogo: () => (
        <svg className="w-5.5 h-5.5 text-[#95BF47] dark:text-[#A6DF58]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <title>Shopify</title>
          <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z"/>
        </svg>
      ),
    },
    {
      id: 'both',
      title: 'Both eBay & Shopify',
      logoBg: 'bg-zinc-100/50 dark:bg-zinc-800/30',
      renderLogo: () => (
        <div className="relative w-10 h-10 flex items-center justify-center scale-[0.85]">
          <div className="absolute top-0 left-0 w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm z-10 overflow-hidden">
            <svg className="w-5 h-2.5" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
              <path d="M71.474 30.746c-3.794.124-6.165.804-6.165 3.32 0 1.63 1.3 3.382 4.578 3.382 4.392 0 6.743-2.392 6.743-6.33v-.433l-5.155.062zm9.362 5.196l.144 3.505h-3.897c-.103-.887-.144-1.773-.144-2.64-2.103 2.598-4.62 3.34-8.104 3.34-5.155 0-7.918-2.722-7.918-5.877 0-4.578 3.753-6.186 10.3-6.33C73 27.9 75 27.9 76.65 27.9v-.454c0-3.052-1.96-4.3-5.36-4.3-2.516 0-4.392 1.052-4.578 2.846H62.3c.474-4.495 5.196-5.63 9.34-5.63 5 0 9.176 1.773 9.176 7.032v8.557z" fill="#f5af02"/>
              <path d="M35.203 28.52c-.165-3.918-3-5.382-6.02-5.382-3.258 0-5.877 1.65-6.33 5.382zM22.77 31.304c.227 3.815 2.846 6.062 6.454 6.062 2.495 0 4.722-1 5.464-3.237h4.33c-.845 4.495-5.63 6.02-9.733 6.02-7.485 0-10.784-4.124-10.784-9.67 0-6.124 3.423-10.145 10.867-10.145 5.918 0 10.248 3.093 10.248 9.857v1.114z" fill="#e53238"/>
              <path d="M50.36 37.283c3.897 0 6.557-2.804 6.557-7.032s-2.66-7.032-6.557-7.032c-3.877 0-6.557 2.804-6.557 7.032s2.68 7.032 6.557 7.032zM39.615 12.97H43.8v10.537c2.062-2.454 4.887-3.155 7.67-3.155 4.68 0 9.857 3.155 9.857 9.96 0 5.7-4.124 9.857-9.94 9.857-3.052 0-5.897-1.093-7.67-3.258 0 .866-.04 1.732-.144 2.557H39.45l.144-4.33V12.97z" fill="#0064d2"/>
              <path d="M102.178 21.034L89.207 46.5h-4.7l3.732-7.073-9.753-18.393h4.908l7.176 14.372 7.155-14.372z" fill="#86b817"/>
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-lg bg-[#95BF47]/10 dark:bg-[#A6DF58]/10 border border-[#95BF47]/20 flex items-center justify-center shadow-sm overflow-hidden">
            <svg className="w-3.5 h-3.5 text-[#95BF47] dark:text-[#A6DF58]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z"/>
            </svg>
          </div>
        </div>
      ),
    },
  ];

  const handleGoogleSignIn = async () => {
    try {
      // Persist the plan intent so it survives the round-trip to Google.
      if (planToken) setPlanIntent(planToken);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' }
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google sign in failed');
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
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={cn(
            "w-full transition-all duration-300",
            signUpStep === 1 ? "max-w-[440px]" : "max-w-[380px]"
          )}
        >


          {signUpStep === 1 ? (
            <div className="w-full flex flex-col space-y-6">
              {/* Title & Subtitle */}
              <div className="text-center space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  What do you want to grow first?
                </h2>
                <p className="text-slate-555 dark:text-slate-400 text-xs sm:text-sm max-w-[320px] mx-auto">
                  We'll personalize your experience based on your choice.
                </p>
              </div>

              {/* Steps indicator */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold bg-[#0A1128] text-white dark:bg-white dark:text-[#0A1128] shadow-sm">
                    1
                  </div>
                  <span className="text-[11px] sm:text-[12px] font-semibold text-slate-900 dark:text-white border-b border-[#0A1128] dark:border-white pb-0.5">
                    Choose Goal
                  </span>
                </div>
                
                <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800" />
                
                <div className="flex items-center gap-1.5 opacity-55">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-900 text-slate-555 dark:text-slate-400">
                    2
                  </div>
                  <span className="text-[11px] sm:text-[12px] font-semibold text-slate-555 dark:text-slate-400 pb-0.5">
                    Create Account
                  </span>
                </div>
              </div>

              {/* Options list */}
              <div className="space-y-3">
                {options
                  .filter((option) => SHOPIFY_ENABLED || option.id === 'ebay')
                  .map((option) => {
                  const isSelected = selectedGoal === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedGoal(option.id)}
                      className={cn(
                        "w-full flex items-center justify-center gap-3.5 p-4 rounded-xl border transition-all duration-200 bg-transparent hover:border-slate-300 dark:hover:border-slate-700",
                        isSelected 
                          ? "border-[#0A1128] dark:border-white ring-1 ring-[#0A1128]/10 dark:ring-white/20 shadow-sm" 
                          : "border-slate-200 dark:border-slate-800"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-lg shrink-0 flex items-center justify-center shadow-sm overflow-hidden",
                        option.logoBg
                      )}>
                        {option.renderLogo()}
                      </div>

                      <span className="font-semibold text-slate-900 dark:text-white text-[15px] sm:text-[16px] leading-none">
                        {option.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Continue button */}
              <Button
                type="button"
                onClick={() => {
                  setSignUpStep(2);
                }}
                size="lg"
                disabled={!selectedGoal}
                className="w-full h-[46px] text-sm font-semibold bg-[#0A1128] hover:bg-[#121E47] text-white dark:bg-white dark:hover:bg-slate-100 dark:text-[#0A1128] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2 group transition-all"
              >
                Continue
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          ) : signUpStep === 2 ? (
            <div className="w-full flex flex-col space-y-5">
              {/* Title & Subtitle */}
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-[#0a1128] dark:text-white">
                  Create your account
                </h2>
                <p className="text-slate-450 dark:text-slate-500 text-xs font-medium max-w-[280px] mx-auto leading-normal">
                  Start your dropshipping automation journey
                </p>
              </div>

              {/* Google OAuth Button */}
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

              {/* Divider */}
              <div className="relative my-1 select-none">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-800/60" />
                </div>
                <div className="relative flex justify-center text-[12px]">
                  <span className="bg-white dark:bg-slate-950 px-3 text-slate-500 dark:text-slate-400 font-medium normal-case">
                    or sign up with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" strokeWidth={2} />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setErrors(prev => ({ ...prev, fullName: undefined }));
                      }}
                      className={`pl-10 h-[46px] bg-slate-50/20 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 ${
                        errors.fullName ? 'border-destructive' : ''
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs font-medium text-destructive">{errors.fullName}</p>
                  )}
                </div>

                {/* Email */}
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

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-550" strokeWidth={2} />
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
                  {errors.password ? (
                    <p className="text-xs font-medium text-destructive">{errors.password}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Must be at least 8 characters</p>
                  )}
                </div>

                {/* CAPTCHA */}
                <div className="py-1 flex justify-center">
                  <TurnstileCaptcha 
                    onVerify={(token) => setCaptchaToken(token)} 
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-[46px] text-sm font-semibold bg-[#0A1128] hover:bg-[#121E47] text-white dark:bg-white dark:hover:bg-slate-100 dark:text-[#0A1128] rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing up...
                    </>
                  ) : (
                    'Sign up'
                  )}
                </Button>

                {/* Terms of Service */}
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed px-2 pt-2 select-none">
                  By signing up, you agree to our<br />
                  <Link to="/terms" className="text-blue-650 dark:text-blue-405 hover:underline font-medium">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-blue-650 dark:text-blue-405 hover:underline font-medium">Privacy Policy</Link>.
                </p>

                {/* Footer Actions */}
                <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4 select-none">
                  <p className="text-xs font-normal">
                    Already have an account?{' '}
                    <Link
                      to={{ pathname: '/auth', search: location.search }}
                      className="text-blue-650 dark:text-blue-405 hover:underline font-semibold"
                    >
                      Log in
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          ) : (
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
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-[320px] mx-auto leading-relaxed">
                  We've sent a verification code to{' '}
                  <span className="text-slate-900 dark:text-white font-bold">{maskEmail(email)}</span>.
                  Please enter the code below to activate your account.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <OtpInput value={code} onChange={setCode} disabled={isVerifying} />

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-[46px] text-sm font-semibold bg-[#0A1128] hover:bg-[#121E47] text-white dark:bg-white dark:hover:bg-slate-100 dark:text-[#0A1128] rounded-xl flex items-center justify-center gap-2 group transition-all"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
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

                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="text-blue-650 dark:text-blue-405 hover:underline font-semibold"
                  >
                    {resending ? 'Sending...' : 'Resend code'}
                  </button>
                </p>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    );
}
