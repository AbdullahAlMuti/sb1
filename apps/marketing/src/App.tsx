import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@repo/ui/components/ui/toaster";
import { Toaster as Sonner } from "@repo/ui/components/ui/sonner";
import { TooltipProvider } from "@repo/ui/components/ui/tooltip";
import { ErrorBoundary } from "@repo/ui/feedback/ErrorBoundary";
import NotFound from "@repo/ui/feedback/NotFound";
import { ThemeProvider } from "@repo/ui/theme/useTheme";
import { AuthProvider } from "@repo/auth/hooks/useAuth";

import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Documentation from "./pages/Documentation";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import RefundPolicy from "./pages/legal/RefundPolicy";

const queryClient = new QueryClient();
const APP_ORIGIN = import.meta.env.VITE_APP_URL ?? "https://sellersuit.com";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/refund" element={<RefundPolicy />} />

                <Route path="/auth" element={<AppRedirect />} />
                <Route path="/register" element={<AppRedirect />} />
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
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
