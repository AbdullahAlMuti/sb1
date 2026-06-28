import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@repo/ui/components/ui/toaster";
import { Toaster as Sonner } from "@repo/ui/components/ui/sonner";
import { TooltipProvider } from "@repo/ui/components/ui/tooltip";
import { ErrorBoundary } from "@repo/ui/feedback/ErrorBoundary";
import NotFound from "@repo/ui/feedback/NotFound";
import { ThemeProvider } from "@repo/ui/theme/useTheme";

const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Documentation = lazy(() => import("./pages/Documentation"));
const BlogIndex = lazy(() => import("./pages/blog/BlogIndex"));
const BlogCategory = lazy(() => import("./pages/blog/BlogCategory"));
const BlogPost = lazy(() => import("./pages/blog/BlogPost"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const RefundPolicy = lazy(() => import("./pages/legal/RefundPolicy"));
const LimitedUseDisclosure = lazy(() => import("./pages/legal/LimitedUseDisclosure"));
const PermissionsDisclosure = lazy(() => import("./pages/legal/PermissionsDisclosure"));
const CookieAnalyticsPolicy = lazy(() => import("./pages/legal/CookieAnalyticsPolicy"));
const DataDeletionPolicy = lazy(() => import("./pages/legal/DataDeletionPolicy"));
const SecurityPolicy = lazy(() => import("./pages/legal/SecurityPolicy"));
const ThirdPartyDisclaimer = lazy(() => import("./pages/legal/ThirdPartyDisclaimer"));
const AIFeaturesPolicy = lazy(() => import("./pages/legal/AIFeaturesPolicy"));
const AffiliateAdsDisclosure = lazy(() => import("./pages/legal/AffiliateAdsDisclosure"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Features = lazy(() => import("./pages/Features"));
const Calculator = lazy(() => import("./pages/Calculator"));
const Pricing = lazy(() => import("./pages/Pricing"));
const FAQPage = lazy(() => import("./pages/FAQ"));

const queryClient = new QueryClient();
const APP_ORIGIN = import.meta.env.VITE_APP_URL ?? "https://app.sellersuit.com";
const ADMIN_ORIGIN = import.meta.env.VITE_ADMIN_URL ?? "https://admin.sellersuit.com";

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

function AppRedirect() {
  const location = useLocation();

  return <ExternalRedirect to={`${APP_ORIGIN}${location.pathname}${location.search}${location.hash}`} />;
}

function AdminRedirect() {
  const location = useLocation();
  const adminPath = location.pathname.replace(/^\/admin/, "") || "/";

  return <ExternalRedirect to={`${ADMIN_ORIGIN}${adminPath}${location.search}${location.hash}`} />;
}

// A simple loading fallback for Suspense
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/features" element={<Features />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/blog" element={<BlogIndex />} />
                <Route path="/blog/category/:slug" element={<BlogCategory />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/refund" element={<RefundPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/limited-use" element={<LimitedUseDisclosure />} />
                <Route path="/chrome-limited-use" element={<LimitedUseDisclosure />} />
                <Route path="/permissions" element={<PermissionsDisclosure />} />
                <Route path="/extension-permissions" element={<PermissionsDisclosure />} />
                <Route path="/cookies" element={<CookieAnalyticsPolicy />} />
                <Route path="/cookie-policy" element={<CookieAnalyticsPolicy />} />
                <Route path="/data-deletion" element={<DataDeletionPolicy />} />
                <Route path="/security" element={<SecurityPolicy />} />
                <Route path="/third-party-disclaimer" element={<ThirdPartyDisclaimer />} />
                <Route path="/ai-policy" element={<AIFeaturesPolicy />} />
                <Route path="/affiliate-ads-disclosure" element={<AffiliateAdsDisclosure />} />

                <Route path="/auth" element={<AppRedirect />} />
                <Route path="/register" element={<AppRedirect />} />
                <Route path="/signup" element={<AppRedirect />} />
                <Route path="/checkout/*" element={<AppRedirect />} />
                <Route path="/payment-required" element={<AppRedirect />} />
                <Route path="/verify-email" element={<AppRedirect />} />
                <Route path="/dashboard/*" element={<AppRedirect />} />
                <Route path="/integrations/*" element={<AppRedirect />} />
                <Route path="/orders" element={<AppRedirect />} />
                <Route path="/listings" element={<AppRedirect />} />
                <Route path="/products" element={<AppRedirect />} />
                <Route path="/inventory" element={<AppRedirect />} />
                <Route path="/billing" element={<AppRedirect />} />
                <Route path="/settings" element={<AppRedirect />} />
                <Route path="/admin/*" element={<AdminRedirect />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
