import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

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
      if (goal === 'shopify') {
        navigate('/dashboard/shopify', { replace: true });
        return;
      }
      navigate('/dashboard', { replace: true });
      return;
    }
    navigate('/auth', { replace: true });
  };

  const handleRetry = () => {
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[440px]"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-2xl font-display font-bold text-foreground">SellerSuit</span>
          </a>
        </div>

        <div className="bg-card border border-border/80 p-6 sm:p-8 rounded-[20px] shadow-md flex flex-col space-y-6">
          {status === 'loading' && (
            <div className="space-y-4 text-center py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground text-sm font-medium">Verifying your email address...</p>
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
                <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-foreground">
                  Email Verified!
                </h1>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-[320px] mx-auto">
                  Your email has been successfully verified. You can now continue to set up your account.
                </p>
              </div>

              <Button 
                size="lg" 
                onClick={handleContinue}
                className="w-full h-11 text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-2 group transition-all"
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
                <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-foreground">
                  Verification Failed
                </h1>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-[320px] mx-auto">
                  {errorMessage || 'The verification link is invalid or has expired.'}
                </p>
              </div>

              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleRetry}
                className="w-full h-11 text-xs sm:text-sm font-semibold rounded-xl border border-border/80"
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
