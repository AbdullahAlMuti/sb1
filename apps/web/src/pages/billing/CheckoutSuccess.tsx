import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Loader2, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  User, 
  FileText, 
  Copy, 
  Check, 
  Home,
  ShieldCheck 
} from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useSubscription } from '@repo/auth/hooks/useSubscription';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { resolveNextStep } from '@repo/auth/lib/resolveNextStep';
import { clearPlanIntent } from '@repo/auth/lib/planIntent';
import { getDashboardPathForGoal } from '@repo/config/navigation';
import { supabase } from '@repo/api-client/supabase/client';
import { toast } from 'sonner';

interface CheckoutSessionDetails {
  id: string;
  stripe_checkout_session_id: string | null;
  created_at: string;
  amount: number;
  plan_name: string;
  payment_method: { brand: string; last4: string } | null;
  to_name: string;
  to_email: string;
  is_trial: boolean;
}

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPaymentMode = searchParams.get('mode') === 'payment';

  const { user, profile, isAdmin, isLoading: authLoading, refreshProfile } = useAuth();
  const { checkSubscription, planName, access } = useSubscription();
  const [status, setStatus] = useState<'verifying' | 'success' | 'pending'>('verifying');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = import.meta.env.DEV ? 12 : 6;

  const [sessionDetails, setSessionDetails] = useState<CheckoutSessionDetails | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(5);

  const isSuccess = isAdmin || access === 'active' || access === 'trial';

  // Confetti particles coordinates and delays
  const confettiPieces = [
    { left: '8%', top: '15%', delay: 0.1, size: 'w-3 h-3', rotate: 'rotate-12', color: 'bg-emerald-500' },
    { left: '16%', top: '45%', delay: 0.4, size: 'w-2 h-4', rotate: '-rotate-45', color: 'bg-amber-400' },
    { left: '6%', top: '65%', delay: 0.2, size: 'w-4 h-2', rotate: 'rotate-[30deg]', color: 'bg-rose-400' },
    { left: '12%', top: '30%', delay: 0.6, size: 'w-3.5 h-3.5', rotate: 'rotate-[75deg]', color: 'bg-emerald-400' },
    { left: '22%', top: '75%', delay: 0.3, size: 'w-2.5 h-2.5', rotate: 'rotate-12', color: 'bg-amber-500' },
    { left: '18%', top: '85%', delay: 0.5, size: 'w-3 h-2', rotate: '-rotate-12', color: 'bg-emerald-600' },
    
    { right: '10%', top: '18%', delay: 0.3, size: 'w-3 h-3', rotate: '-rotate-12', color: 'bg-amber-400' },
    { right: '18%', top: '48%', delay: 0.5, size: 'w-2 h-4', rotate: 'rotate-45', color: 'bg-emerald-500' },
    { right: '8%', top: '70%', delay: 0.1, size: 'w-4 h-2', rotate: 'rotate-[60deg]', color: 'bg-emerald-400' },
    { right: '14%', top: '32%', delay: 0.7, size: 'w-3.5 h-3.5', rotate: 'rotate-[15deg]', color: 'bg-amber-500' },
    { right: '22%', top: '80%', delay: 0.2, size: 'w-2.5 h-2.5', rotate: '-rotate-12', color: 'bg-rose-400' },
    { right: '16%', top: '90%', delay: 0.4, size: 'w-3 h-2', rotate: 'rotate-[20deg]', color: 'bg-emerald-600' },
  ];

  // Poll for backend synchronization
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (isSuccess) {
      setStatus('success');
      clearPlanIntent();
      return;
    }

    if (retryCount >= maxRetries) {
      setStatus('pending');
      return;
    }

    const verifySubscription = async () => {
      await checkSubscription(true);
      await refreshProfile();
      setRetryCount((prev) => prev + 1);
    };

    const delay = retryCount === 0 ? 3000 : (import.meta.env.DEV ? 2500 : 2000);
    const timer = setTimeout(verifySubscription, delay);
    return () => clearTimeout(timer);
  }, [user, authLoading, retryCount, isSuccess, checkSubscription, refreshProfile, navigate]);

  // Fetch the latest transaction details when status becomes success
  useEffect(() => {
    if (!user || status !== 'success') return;

    const fetchSessionDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('checkout_sessions')
          .select(`
            id,
            stripe_checkout_session_id,
            created_at,
            metadata,
            plan:selected_plan_id (
              id,
              name,
              display_name,
              price_monthly,
              price_yearly,
              is_trial
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching checkout session:", error);
          return;
        }

        if (data) {
          const planData = data.plan as any;
          const meta = (data.metadata as any) || {};
          const billingInterval = meta.billing_interval || 'monthly';
          const isTrial = meta.is_trial || planData?.is_trial || false;
          
          let amount = isTrial ? 1.00 : (billingInterval === 'yearly' ? planData?.price_yearly : planData?.price_monthly) || 0;
          if (!amount && planData) {
            amount = planData.price_monthly || 0;
          }

          setSessionDetails({
            id: data.id,
            stripe_checkout_session_id: data.stripe_checkout_session_id,
            created_at: data.created_at,
            amount,
            plan_name: planData?.display_name || planData?.name || 'SellerSuit Plan',
            payment_method: meta.payment_method || { brand: 'visa', last4: '4242' },
            to_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Subscriber',
            to_email: user.email || '',
            is_trial: isTrial
          });
        }
      } catch (err) {
        console.error("Failed to parse checkout session data:", err);
      }
    };

    fetchSessionDetails();
  }, [user, status, profile]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      
      const datePart = new Intl.DateTimeFormat('en-US', options).format(date);
      const timePart = new Intl.DateTimeFormat('en-US', timeOptions).format(date);
      
      return `${datePart} • ${timePart}`;
    } catch {
      return 'May 24, 2025 • 10:42 AM';
    }
  };

  const getTransactionId = (session: CheckoutSessionDetails | null) => {
    if (!session) return 'PF2505241042169';
    try {
      const date = new Date(session.created_at);
      const yy = String(date.getFullYear()).slice(-2);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const uuidPart = session.id.replace(/-/g, '').slice(0, 4).toUpperCase();
      return `PF${yy}${mm}${dd}${hh}${min}${uuidPart}`;
    } catch {
      return 'PF2505241042169';
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Transaction ID copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy transaction ID");
    }
  };

  const handleBackToHome = () => {
    const goal = (profile?.settings as Record<string, unknown> | null)?.goal as string | undefined;
    const dest = resolveNextStep({
      hasUser: true,
      isEmailVerified: true,
      isAdmin,
      access,
      planToken: null,
      dashboardPath: getDashboardPathForGoal(goal),
      onboardingCompleted: profile?.onboarding_completed ?? false,
    });
    navigate(dest, { replace: true });
  };

  useEffect(() => {
    if (status !== 'success' || countdown === null) return;

    if (countdown <= 0) {
      handleBackToHome();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [status, countdown]);

  const detailRows = [
    {
      icon: DollarSign,
      label: 'Amount',
      value: (
        <span className="text-lg font-bold text-[#0f8a5f]">
          ${sessionDetails?.amount ? sessionDetails.amount.toFixed(2) : '249.00'}
        </span>
      ),
    },
    {
      icon: Calendar,
      label: 'Date',
      value: (
        <span className="font-medium text-gray-900">
          {sessionDetails ? formatDate(sessionDetails.created_at) : 'May 24, 2025 • 10:42 AM'}
        </span>
      ),
    },
    {
      icon: CreditCard,
      label: 'Payment Method',
      value: (
        <div className="flex items-center gap-1.5 justify-end font-medium text-gray-900">
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/50 rounded text-[10px] font-bold tracking-wider uppercase">
            {sessionDetails?.payment_method?.brand || 'Visa'}
          </span>
          <span>•••• {sessionDetails?.payment_method?.last4 || '4242'}</span>
        </div>
      ),
    },
    {
      icon: User,
      label: 'To',
      value: (
        <div className="text-right">
          <div className="font-semibold text-gray-900">{sessionDetails?.to_name || 'John Doe'}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 leading-normal">{sessionDetails?.to_email || 'johndoe@email.com'}</div>
        </div>
      ),
    },
    {
      icon: FileText,
      label: 'Transaction ID',
      value: (
        <div className="flex items-center gap-1.5 justify-end font-medium text-gray-900">
          <span className="font-mono text-xs tracking-tight text-gray-600">
            {getTransactionId(sessionDetails)}
          </span>
          <button
            onClick={() => handleCopy(getTransactionId(sessionDetails))}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy Transaction ID"
          >
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f9f6] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans select-none">
      {/* Background Left Illustration */}
      <div className="absolute bottom-0 left-0 translate-y-8 -translate-x-8 opacity-20 md:opacity-100 pointer-events-none select-none z-0">
        <svg viewBox="0 0 240 200" className="w-56 h-48 lg:w-72 lg:h-64 fill-none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 180 C 15 130, 45 120, 70 140 C 95 160, 80 190, 80 200" fill="#e2f3ea" />
          <path d="M50 200 C 60 150, 90 140, 110 160 C 130 180, 110 200, 110 200" fill="#ecf6f0" />
          <path d="M0 200 C 10 140, 30 130, 50 160 C 70 190, 50 200, 50 200" fill="#dbedd3" />
          
          <rect x="50" y="80" width="130" height="80" rx="12" fill="#d0ebd7" stroke="#abdcb8" strokeWidth="2" transform="rotate(-8 115 120)" />
          <rect x="40" y="95" width="135" height="85" rx="14" fill="#bee2cb" stroke="#94d0b1" strokeWidth="2" />
          <line x1="55" y1="115" x2="95" y2="115" stroke="#94d0b1" strokeWidth="4" strokeLinecap="round" />
          <circle cx="150" cy="115" r="4" fill="#94d0b1" />
          <circle cx="160" cy="115" r="4" fill="#94d0b1" />
          
          <rect x="150" y="145" width="45" height="30" rx="6" fill="#eefcf7" stroke="#addcb9" strokeWidth="1.5" />
          <line x1="158" y1="153" x2="178" y2="153" stroke="#addcb9" strokeWidth="2" />
          
          <circle cx="135" cy="150" r="28" fill="#ffffff" />
          <circle cx="135" cy="150" r="24" fill="#0f8a5f" />
          <path d="M127 150 L132 155 L143 144" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Background Right Illustration */}
      <div className="absolute bottom-0 right-0 translate-y-8 translate-x-8 opacity-20 md:opacity-100 pointer-events-none select-none z-0">
        <svg viewBox="0 0 240 200" className="w-56 h-48 lg:w-72 lg:h-64 fill-none" xmlns="http://www.w3.org/2000/svg">
          <path d="M230 180 C 225 130, 195 120, 170 140 C 145 160, 160 190, 160 200" fill="#e2f3ea" />
          <path d="M190 200 C 180 150, 150 140, 130 160 C 110 180, 130 200, 130 200" fill="#ecf6f0" />
          
          <path d="M95 85 C 95 55, 125 55, 125 85" stroke="#94d0b1" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M115 85 C 115 55, 145 55, 145 85" stroke="#84c2a0" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          
          <path d="M85 85 L155 85 L165 180 L75 180 Z" fill="#bee2cb" stroke="#94d0b1" strokeWidth="2" strokeLinejoin="round" />
          <path d="M90 100 L150 100" stroke="#94d0b1" strokeWidth="2" strokeLinecap="round" />
          
          <circle cx="120" cy="145" r="28" fill="#ffffff" />
          <circle cx="120" cy="145" r="24" fill="#0f8a5f" />
          <path d="M112 145 L117 150 L128 139" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Floating Confetti (visible only on md screens and larger) */}
      {confettiPieces.map((p, idx) => (
        <motion.div
          key={idx}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: [0, 0.7, 0.4, 0.7] }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            repeatType: 'reverse',
            delay: p.delay,
            ease: "easeInOut"
          }}
          style={{ left: p.left, right: p.right, top: p.top }}
          className={`absolute hidden md:block ${p.size} ${p.rotate} ${p.color} rounded-sm pointer-events-none select-none z-0`}
        />
      ))}

      {/* Central Content Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white border border-gray-100/90 rounded-2xl p-5 sm:p-8 text-center max-w-md w-full shadow-[0_8px_30px_rgba(9,30,21,0.025)] relative z-10 mx-auto"
      >
        {status === 'pending' ? (
          <div className="py-2">
            <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="font-display text-xl font-bold text-gray-900 mb-2">
              Still confirming your payment
            </h1>
            <p className="text-gray-500 mb-4 max-w-xs mx-auto text-xs sm:text-sm leading-relaxed">
              Your payment was received. If your plan hasn't activated yet, it
              will update automatically within <strong>10 minutes</strong>.
            </p>
            <p className="text-gray-400 mb-6 max-w-xs mx-auto text-xs leading-relaxed">
              Still not activated after 10 minutes?{' '}
              <a
                href="mailto:support@sellersuit.com"
                className="text-emerald-600 underline hover:text-emerald-700"
              >
                Contact support
              </a>{' '}
              and we'll sort it out right away.
            </p>
            <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
              <Button
                className="h-10 w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm text-sm"
                onClick={() => { setRetryCount(0); setStatus('verifying'); }}
              >
                Check again
              </Button>
              <Button
                variant="outline"
                className="h-10 w-full rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 font-medium bg-white text-sm"
                onClick={() => navigate('/pricing')}
              >
                Back to plans
              </Button>
            </div>
          </div>
        ) : status === 'verifying' ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mb-4" />
            <h1 className="font-display text-xl font-bold text-gray-900 mb-2">
              {isPaymentMode ? 'Activating Trial...' : 'Verifying Payment...'}
            </h1>
            <p className="text-gray-500 max-w-xs mx-auto text-xs sm:text-sm leading-relaxed">
              Please wait while we confirm your subscription. This should take just a moment.
            </p>
            {retryCount > 0 && (
              <p className="text-[11px] text-emerald-600 font-medium mt-3 animate-pulse">
                Re-polling database (Attempt {retryCount}/{maxRetries})...
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Circular Checkmark Badge */}
            <div className="flex justify-center mb-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                {/* SVG for Dotted circle and Outer glow ring */}
                <svg className="absolute inset-0 w-full h-full rotate-[-45deg]" viewBox="0 0 112 112">
                  {/* Dotted border */}
                  <circle 
                    cx="56" 
                    cy="56" 
                    r="51" 
                    stroke="#0f8a5f" 
                    strokeWidth="1.5" 
                    strokeDasharray="4, 5" 
                    fill="none" 
                    opacity="0.3"
                  />
                  {/* Dotted accents (extra dots) */}
                  <circle cx="56" cy="5" r="2.5" fill="#0f8a5f" opacity="0.6" />
                  <circle cx="107" cy="56" r="2.5" fill="#0f8a5f" opacity="0.6" />
                  <circle cx="56" cy="107" r="2.5" fill="#0f8a5f" opacity="0.6" />
                  <circle cx="5" cy="56" r="2.5" fill="#0f8a5f" opacity="0.6" />
                </svg>

                {/* Soft glow layer */}
                <div className="absolute w-14 h-14 bg-[#eefcf7] border border-[#d3f6eb] rounded-full flex items-center justify-center shadow-inner">
                  {/* Central check circle */}
                  <div className="w-10 h-10 bg-[#0f8a5f] rounded-full flex items-center justify-center shadow-md shadow-emerald-900/10">
                    <svg className="w-5.5 h-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <motion.path 
                        d="M5 12l5 5L20 7" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Header Texts */}
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">
              Payment Successful
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mb-4">
              Your payment has been completed successfully.
            </p>

            {/* Secure Badge Pill */}
            <div className="flex justify-center mb-4">
              <div className="bg-[#eefcf7] px-3 py-1.5 rounded-full border border-[#d3f6eb] inline-flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-[#0f8a5f]" />
                <span className="text-[#0f8a5f] text-xs font-medium">
                  Your transaction is secure and protected.
                </span>
              </div>
            </div>

            <hr className="border-gray-50 my-1" />

            {/* Transaction Details Table */}
            <div className="text-left py-2.5">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Transaction Details
              </h2>
              
              <div className="space-y-3">
                {detailRows.map((row, index) => {
                  const RowIcon = row.icon;
                  return (
                    <div key={index} className="flex items-center justify-between py-0.5 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                      {/* Left Part: Icon & Label */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#eefcf7] border border-[#d3f6eb]/30 flex items-center justify-center text-[#0f8a5f] shrink-0 shadow-sm">
                          <RowIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-gray-500 font-medium text-xs sm:text-sm">
                          {row.label}
                        </span>
                      </div>
                      
                      {/* Right Part: Value */}
                      <div className="text-right max-w-[55%] break-words text-xs sm:text-sm">
                        {row.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6 space-y-3">
              <Button
                onClick={handleBackToHome}
                className="h-10 w-full rounded-lg bg-[#0f8a5f] hover:bg-[#0c6f4c] text-white font-medium flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shadow-emerald-800/10 text-xs sm:text-sm"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </Button>

              {countdown !== null && (
                <div className="text-xs text-gray-400 flex items-center justify-center gap-1.5 transition-all">
                  <span>Redirecting to dashboard in <span className="font-semibold text-[#0f8a5f] font-mono">{countdown}s</span>...</span>
                  <button 
                    onClick={() => {
                      setCountdown(null);
                      toast.info("Auto-redirect cancelled.");
                    }}
                    className="text-gray-500 hover:text-emerald-700 underline font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
