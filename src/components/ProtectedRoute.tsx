import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireSuperAdmin = false,
}: ProtectedRouteProps) {
  const { user, isAdmin, isSuperAdmin, isLoading, isEmailVerified, resendVerificationEmail, signOut } = useAuth();
  const { subscribed, isLoading: subscriptionLoading, planName } = useSubscription();
  const location = useLocation();
  const [isResending, setIsResending] = useState(false);

  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if email is verified
  if (!isEmailVerified) {
    const handleResend = async () => {
      setIsResending(true);
      await resendVerificationEmail();
      setIsResending(false);
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-10 w-10 text-primary" />
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Verify Your Email</h1>
            <p className="text-muted-foreground">
              We've sent a verification link to <span className="font-medium text-foreground">{user.email}</span>
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link in your email to verify your account and access the dashboard. 
              Check your spam folder if you don't see it.
            </p>
            
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={handleResend}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
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
                onClick={signOut}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Sign Out & Try Different Email
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check admin/super_admin requirements first
  if (requireSuperAdmin && !isSuperAdmin) {
    // Non-super-admins trying to access super-admin routes go to dashboard
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  if (requireAdmin && !isAdmin) {
    // Non-admins trying to access admin routes go to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect admins away from user dashboard to admin dashboard
  // Only applies when NOT on admin-required routes (to avoid redirect loops)
  if ((isAdmin || isSuperAdmin) && !requireAdmin && !requireSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // PAYMENT REQUIRED: Block access if user has no active paid subscription (admins bypass)
  // Free plan no longer exists - all users must pay
  if (!subscribed && !isAdmin && !isSuperAdmin) {
    return <Navigate to="/payment-required" replace />;
  }

  return <>{children}</>;
}
