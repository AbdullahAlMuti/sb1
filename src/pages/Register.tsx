import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Loader2, Check, ArrowLeft, User, Mail, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { usePlans } from '@/hooks/usePlans';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import SellerSuitLogo from '@/components/SellerSuitLogo';
import { OtpInput } from '@/components/auth/OtpInput';
import { TurnstileCaptcha } from '@/components/auth/TurnstileCaptcha';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export default function Register() {
  const [signUpStep, setSignUpStep] = useState<1 | 2 | 3>(1);
  const [selectedGoal, setSelectedGoal] = useState<'ebay' | 'shopify' | 'both' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [sandboxOtp, setSandboxOtp] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const { signUp, verifyOtp, resendVerificationEmail, signIn, user } = useAuth();
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
    if (user && user.email_confirmed_at) {
      localStorage.removeItem('selectedPlan');
      const goal = selectedGoal || localStorage.getItem('selectedGoal');
      if (goal === 'shopify') {
        navigate('/dashboard/shopify', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate, selectedGoal]);

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
      const res = await signUp(email, password, fullName, selectedGoal || undefined);
      if (!res.error) {
        if (res.isSandbox && res.otpCode) {
          setSandboxOtp(res.otpCode);
          toast.success('Sandbox mode: Verification code generated!');
        } else {
          toast.success('Account created! Please check your email for the verification code.');
        }
        if (selectedPlan) {
          localStorage.setItem('selectedPlanId', selectedPlan.id);
        }
        // Persist selected goal for post-verification redirect
        if (selectedGoal) {
          localStorage.setItem('selectedGoal', selectedGoal);
        }
        setSignUpStep(3);
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
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
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          toast.error('Verification succeeded, but auto sign-in failed. Please log in manually.');
          navigate('/auth', { replace: true });
          return;
        }

        toast.success('Email verified successfully!');
        localStorage.removeItem('selectedPlan');
        const goal = selectedGoal || localStorage.getItem('selectedGoal');
        localStorage.removeItem('selectedGoal');
        if (goal === 'shopify') {
          navigate('/dashboard/shopify', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const res = await resendVerificationEmail(email);
      if (!res.error) {
        if (res.isSandbox && res.otpCode) {
          setSandboxOtp(res.otpCode);
          toast.success('Sandbox mode: New verification code generated!');
        } else {
          toast.success('Verification code resent successfully.');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
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

  const options = [
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

  if (plansLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (signUpStep === 1) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[440px]"
        >
          <div className="bg-card border border-border/80 p-6 sm:p-8 rounded-[20px] shadow-md flex flex-col space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <SellerSuitLogo size="md" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-1.5">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                What do you want to grow first?
              </h2>
              <p className="text-muted-foreground text-[13px] sm:text-sm max-w-[320px] mx-auto">
                We'll personalize your experience based on your choice.
              </p>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold bg-primary text-primary-foreground shadow-sm">
                  1
                </div>
                <span className="text-[11px] sm:text-[12px] font-semibold text-foreground border-b border-primary pb-0.5">
                  Choose Goal
                </span>
              </div>
              
              <div className="w-8 h-[1px] bg-border" />
              
              <div className="flex items-center gap-1.5 opacity-55">
                <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold bg-muted text-muted-foreground">
                  2
                </div>
                <span className="text-[11px] sm:text-[12px] font-semibold text-muted-foreground pb-0.5">
                  Create Account
                </span>
              </div>
            </div>

            {/* Options list */}
            <div className="space-y-3">
              {options.map((option) => {
                const isSelected = selectedGoal === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedGoal(option.id as any)}
                    className={cn(
                      "w-full flex items-center justify-center gap-3.5 p-4 rounded-xl border transition-all duration-200 bg-card hover:border-primary/50",
                      isSelected 
                        ? "border-primary ring-1 ring-primary/20 dark:ring-primary/40 shadow-sm" 
                        : "border-border/60"
                    )}
                  >
                    {/* Logo container */}
                    <div className={cn(
                      "w-9 h-9 rounded-lg shrink-0 flex items-center justify-center shadow-sm overflow-hidden",
                      option.logoBg
                    )}>
                      {option.renderLogo()}
                    </div>

                    {/* Content */}
                    <span className="font-semibold text-foreground text-[15px] sm:text-[16px] leading-none">
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
              className="w-full h-12 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2 group transition-all"
            >
              Continue
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (signUpStep === 2) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[440px]"
        >
          <div className="bg-card border border-border/80 p-6 sm:p-8 rounded-[20px] shadow-md flex flex-col space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <SellerSuitLogo size="md" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-1.5">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Create your account
              </h2>
              <p className="text-muted-foreground text-[13px] sm:text-sm max-w-[320px] mx-auto">
                Get started with your personalized {selectedGoal === 'shopify' ? 'Shopify' : selectedGoal === 'both' ? 'eBay & Shopify' : 'eBay'} workspace.
              </p>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold bg-emerald-500 text-emerald-foreground shadow-sm">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wide leading-none">Step One</span>
                  <span className="font-semibold text-muted-foreground text-[11px] sm:text-xs leading-tight">Choose Goal</span>
                </div>
              </div>
              
              <div className="w-8 h-[1px] bg-border" />
              
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-sm">
                  2
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] text-primary uppercase font-bold tracking-wide leading-none">Step Two</span>
                  <span className="font-semibold text-foreground text-[11px] sm:text-xs border-b border-primary pb-0.5 leading-tight">Create Account</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-foreground/80 text-[13px] sm:text-sm font-semibold">Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setErrors(prev => ({ ...prev, fullName: undefined }));
                    }}
                    className={`pl-10 h-12 bg-transparent border-border/70 text-foreground text-sm sm:text-[15px] placeholder:text-muted-foreground/60 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30 ${
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
                <Label htmlFor="email" className="text-foreground/80 text-[13px] sm:text-sm font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    className={`pl-10 h-12 bg-transparent border-border/70 text-foreground text-sm sm:text-[15px] placeholder:text-muted-foreground/60 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30 ${
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
                <Label htmlFor="password" className="text-foreground/80 text-[13px] sm:text-sm font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    className={`pl-10 pr-10 h-12 bg-transparent border-border/70 text-foreground text-sm sm:text-[15px] placeholder:text-muted-foreground/60 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30 ${
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
                {errors.password ? (
                  <p className="text-xs font-medium text-destructive">{errors.password}</p>
                ) : (
                  <p className="text-xs text-muted-foreground/70">Must be at least 8 characters</p>
                )}
              </div>

              {/* CAPTCHA */}
              <TurnstileCaptcha 
                onVerify={(token) => setCaptchaToken(token)} 
                onExpire={() => setCaptchaToken(null)}
              />

              {/* Submit Button */}
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-12 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-2 group transition-all mt-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing up...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>

              {/* Footer Actions */}
              <div className="flex flex-col items-center gap-2 mt-4 pt-2 text-[13px] sm:text-sm">
                <p className="text-muted-foreground">
                  Already a member?{' '}
                  <a href="/auth" className="text-primary hover:underline font-semibold">
                    Log in
                  </a>
                </p>
                <button
                  type="button"
                  onClick={() => setSignUpStep(1)}
                  className="text-muted-foreground/80 hover:text-foreground transition-colors font-medium flex items-center gap-1 mt-1 text-xs"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Change Goal Selection
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Fallback / Step 3
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
              <span className="text-primary font-bold">{maskEmail(email)}</span>.
              Please enter the code below to activate your account.
            </p>
          </div>

          {sandboxOtp && (
            <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center space-y-2">
              <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                Developer Sandbox Mode
              </div>
              <p className="text-xs text-muted-foreground">
                Resend key sandbox limitation activated. Use the code below to verify:
              </p>
              <div className="text-2xl font-mono font-extrabold tracking-widest text-amber-600 dark:text-amber-400">
                {sandboxOtp}
              </div>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            {/* Digit Inputs */}
            <OtpInput value={code} onChange={setCode} disabled={isVerifying} />

            {/* Verify Email Button */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full h-11 text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-2 group transition-all"
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
            <p className="text-center text-xs text-muted-foreground">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="text-primary hover:underline font-semibold"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}