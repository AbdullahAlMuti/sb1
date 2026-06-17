import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { supabase } from '@repo/api-client/supabase/client';
import { getDashboardPathForGoal } from '@repo/config/navigation';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleVerification = async () => {
      // Check for hash fragment (Supabase email verification uses hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'signup') {
        try {
          // Set the session with the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) throw error;
          
          setStatus('success');
        } catch (error: any) {
          console.error('Verification error:', error);
          setErrorMessage(error.message || 'Verification failed');
          setStatus('error');
        }
      } else {
        // Check if user is already verified
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at) {
          setStatus('success');
        } else {
          setErrorMessage('Invalid or expired verification link');
          setStatus('error');
        }
      }
    };

    handleVerification();
  }, []);

  const handleContinue = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', session.user.id)
        .single();
        
      const goal = (profile?.settings as any)?.goal as string | undefined;
      navigate(getDashboardPathForGoal(goal), { replace: true });
      return;
    }
    navigate('/auth', { replace: true });
  };

  const handleRetry = () => {
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px]"
      >


        <div className="w-full flex flex-col space-y-6">
          {status === 'loading' && (
            <div className="space-y-4 text-center py-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#0A1128] dark:text-white mx-auto" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Verifying your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center"
            >
              <div className="flex justify-center">
                <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center relative">
                    <ShieldCheck className="h-8 w-8 text-emerald-500" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Email Verified!
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-[320px] mx-auto">
                  Your email has been successfully verified. You can now continue to set up your account.
                </p>
              </div>

              <Button 
                size="lg" 
                onClick={handleContinue}
                className="w-full h-[46px] text-sm font-semibold bg-[#0A1128] hover:bg-[#121E47] text-white dark:bg-white dark:hover:bg-slate-100 dark:text-[#0A1128] rounded-xl flex items-center justify-center gap-2 group transition-all"
              >
                Continue to Dashboard
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center"
            >
              <div className="flex justify-center">
                <div className="relative w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center relative">
                    <ShieldAlert className="h-8 w-8 text-destructive" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Verification Failed
                </h1>
                <p className="text-slate-550 dark:text-slate-400 text-xs leading-relaxed max-w-[320px] mx-auto">
                  {errorMessage || 'The verification link is invalid or has expired.'}
                </p>
              </div>

              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleRetry}
                className="w-full h-[46px] text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-[#0a1128] dark:text-slate-300"
              >
                Back to Sign In
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
