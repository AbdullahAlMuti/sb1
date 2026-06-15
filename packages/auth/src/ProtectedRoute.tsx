import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { useSubscription } from './hooks/useSubscription';
import { getPlanIntent } from './lib/planIntent';
import { canAccessDashboard, isDashboardAllowed } from './lib/dashboardAccess';
import { resolveNextStep } from './lib/resolveNextStep';
import { getDashboardPathForGoal } from '@repo/config/navigation';
import { SHOPIFY_ENABLED } from '@repo/config/marketplaceScope';
import { Loader2, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { useState } from 'react';

// Re-export for existing importers (e.g. '@repo/auth/ProtectedRoute').
export { canAccessDashboard } from './lib/dashboardAccess';

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
  const { user, profile, isAdmin, isSuperAdmin, isLoading, isEmailVerified, resendVerificationEmail, signOut } = useAuth();
  const { access, isLoading: subscriptionLoading } = useSubscription();
  const location = useLocation();
  const [isResending, setIsResending] = useState(false);

  if (isLoading || (user && !profile)) {
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

  // Redirect based on user's registered goal (eBay vs. Shopify)
  if (profile && !requireAdmin && !requireSuperAdmin && !isAdmin && !isSuperAdmin) {
    const userGoal = (profile.settings as any)?.goal as string | undefined;
    const isShopifyRoute = location.pathname.startsWith('/dashboard/shopify');

    if (!SHOPIFY_ENABLED) {
      // eBay-only scope (see AI_AGENT_SCOPE_EBAY_ONLY.md): Shopify is disabled.
      // Funnel every non-admin user to the eBay workspace regardless of their
      // stored goal, and never route anyone to the Shopify dashboard. This keeps
      // existing goal === 'shopify' / 'both' accounts from being stranded.
      if (isShopifyRoute || location.pathname === '/dashboard') {
        return <Navigate to="/dashboard/ebay" replace />;
      }
    } else if (userGoal === 'shopify') {
      // If goal is shopify and they are trying to access standard/eBay routes under /dashboard,
      // redirect them to the Shopify dashboard.
      if (location.pathname === '/dashboard' || (location.pathname.startsWith('/dashboard/') && !isShopifyRoute)) {
        return <Navigate to="/dashboard/shopify" replace />;
      }
    } else if (userGoal === 'ebay') {
      // If goal is ebay and they are trying to access Shopify routes or the legacy dashboard root,
      // redirect them to the namespaced eBay dashboard.
      if (isShopifyRoute || location.pathname === '/dashboard') {
        return <Navigate to="/dashboard/ebay" replace />;
      }
    } else if (userGoal === 'both') {
      // Both-platform users can use either module. The dashboard root defaults to eBay for now.
      if (location.pathname === '/dashboard') {
        return <Navigate to={getDashboardPathForGoal(userGoal)} replace />;
      }
    } else if (location.pathname === '/dashboard') {
      // Unknown or legacy profiles default to the eBay workspace, matching current app behavior.
      return <Navigate to="/dashboard/ebay" replace />;
    }
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

  // Authoritative subscription gate. Profile flags alone can't detect an expired
  // $1 trial (a one-time payment has no Stripe subscription to cancel), so we
  // wait for check-subscription-v2 and trust its verdict. Profile flags are only
  // a fallback when the server check errors to 'none'. Admins skip the wait.
  if (subscriptionLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const allowed = isDashboardAllowed({
    isAdmin,
    access,
    profileAllows: canAccessDashboard(user, profile, isAdmin),
  });

  if (!allowed) {
    // past_due users keep limited access to the billing/subscription page so they
    // can recover payment — without this the redirect to billing would loop.
    const isBillingRoute =
      location.pathname === '/dashboard/billing' || location.pathname === '/dashboard/subscription';
    if (access === 'past_due' && isBillingRoute) {
      return <>{children}</>;
    }

    const planToken = getPlanIntent() || profile?.pending_plan_id || null;
    const next = resolveNextStep({
      hasUser: true,
      isEmailVerified: true,
      isAdmin,
      access,
      onboardingCompleted: profile?.onboarding_completed === true,
      planToken,
      dashboardPath: getDashboardPathForGoal((profile?.settings as any)?.goal),
    });
    return <Navigate to={next} replace />;
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

  return <>{children}</>;
}
