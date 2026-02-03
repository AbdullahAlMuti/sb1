import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
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

  const handleContinue = () => {
    navigate('/#pricing', { replace: true });
  };

  const handleRetry = () => {
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        {/* Logo */}
        <div className="mb-8">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-2xl font-display font-bold text-foreground">SellerSuit</span>
          </a>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h1>
                <p className="text-muted-foreground">
                  Your email has been successfully verified. You can now continue to set up your account.
                </p>
              </div>

              <Button 
                variant="hero" 
                size="lg" 
                onClick={handleContinue}
                className="w-full"
              >
                Continue to Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Verification Failed</h1>
                <p className="text-muted-foreground">
                  {errorMessage || 'Something went wrong during verification.'}
                </p>
              </div>

              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleRetry}
                className="w-full"
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
