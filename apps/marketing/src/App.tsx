import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@repo/ui/components/ui/toaster";
import { Toaster as Sonner } from "@repo/ui/components/ui/sonner";
import { TooltipProvider } from "@repo/ui/components/ui/tooltip";
import { ErrorBoundary } from "@repo/ui/feedback/ErrorBoundary";
import NotFound from "@repo/ui/feedback/NotFound";
import { ThemeProvider } from "@repo/ui/theme/useTheme";

import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Documentation from "./pages/Documentation";
import BlogIndex from "./pages/blog/BlogIndex";
import BlogCategory from "./pages/blog/BlogCategory";
import BlogPost from "./pages/blog/BlogPost";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import RefundPolicy from "./pages/legal/RefundPolicy";
import HowItWorks from "./pages/HowItWorks";
import Features from "./pages/Features";
import Calculator from "./pages/Calculator";
import Pricing from "./pages/Pricing";
import FAQPage from "./pages/FAQ";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
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
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
