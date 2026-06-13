import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@repo/ui/components/ui/toaster";
import { Toaster as Sonner } from "@repo/ui/components/ui/sonner";
import { TooltipProvider } from "@repo/ui/components/ui/tooltip";
import { ErrorBoundary } from "@repo/ui/feedback/ErrorBoundary";
import NotFound from "@repo/ui/feedback/NotFound";
import { ThemeProvider } from "@repo/ui/theme/useTheme";
import { AuthProvider } from "@repo/auth/hooks/useAuth";
import { ProtectedRoute } from "@repo/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Documentation from "./pages/Documentation";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import RefundPolicy from "./pages/legal/RefundPolicy";

import Pricing from "./pages/Pricing";
import Auth from "./pages/auth/Auth";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Dashboard from "./pages/dashboard/Dashboard";
import Alerts from "./pages/dashboard/Alerts";
import Orders from "./pages/dashboard/Orders";
import EbayOrders from "./pages/dashboard/EbayOrders";
import Listings from "./pages/dashboard/Listings";
import NewListing from "./pages/dashboard/NewListing";
import BulkLister from "./pages/dashboard/BulkLister";
import ExtensionConnect from "./pages/dashboard/ExtensionConnect";
import DashboardSettings from "./pages/dashboard/Settings";
import CalculatorSettings from "./pages/dashboard/CalculatorSettings";
import ProfitableProducts from "./pages/dashboard/ProfitableProducts";
import BestSellingItems from "./pages/dashboard/BestSellingItems";
import MustSellItems from "./pages/dashboard/MustSellItems";
import ProductResearch from "./pages/dashboard/ProductResearch";
import ExtensionViewer from "./pages/extension/ExtensionViewer";
import CheckoutSuccess from "./pages/billing/CheckoutSuccess";
import ChoosePlan from "./pages/billing/PaymentRequired";
import Onboarding from "./pages/onboarding/Onboarding";
import Subscription from "./pages/dashboard/Subscription";

import ShopifyLayout from "./pages/integrations/shopify/ShopifyLayout";
import ShopifyDashboard from "./pages/integrations/shopify/ShopifyDashboard";
import WinningProductsPage from "./pages/integrations/shopify/WinningProductsPage";
import ProductResearchPage from "./pages/integrations/shopify/ProductResearchPage";
import StoreExplorerPage from "./pages/integrations/shopify/StoreExplorerPage";
import StoreDesignsPage from "./pages/integrations/shopify/StoreDesignsPage";
import AdLibraryPage from "./pages/integrations/shopify/AdLibraryPage";
import AiCopyStudio from "./pages/integrations/shopify/AiCopyStudio";
import SavedItemsPage from "./pages/integrations/shopify/SavedItemsPage";
import SettingsPage from "./pages/integrations/shopify/SettingsPage";
import HelpPage from "./pages/integrations/shopify/HelpPage";
import EbayLayout from "./pages/integrations/ebay/EbayLayout";
import { SHOPIFY_ENABLED } from "@repo/config/marketplaceScope";

const queryClient = new QueryClient();
const ADMIN_ORIGIN = import.meta.env.VITE_ADMIN_URL ?? "https://admin.sellersuit.com";

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

function AdminRedirect() {
  const location = useLocation();
  const adminPath = location.pathname.replace(/^\/admin/, "") || "/";

  return <ExternalRedirect to={`${ADMIN_ORIGIN}${adminPath}${location.search}${location.hash}`} />;
}

// eBay-only scope (see AI_AGENT_SCOPE_EBAY_ONLY.md): while Shopify is disabled,
// every Shopify route redirects to the eBay dashboard. The page components stay
// imported and recoverable — re-enabling is a flag flip in marketplaceScope.
const ShopifyRoutes = () =>
  SHOPIFY_ENABLED ? <ShopifyRoutesInner /> : <Navigate to="/dashboard/ebay" replace />;

const ShopifyRoutesInner = () => (
  <Routes>
    <Route
      element={
        <ProtectedRoute>
          <ShopifyLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<ShopifyDashboard />} />
      <Route path="winning-products" element={<WinningProductsPage />} />
      <Route path="product-research" element={<ProductResearchPage />} />
      <Route path="store-explorer" element={<StoreExplorerPage />} />
      <Route path="store-designs" element={<StoreDesignsPage />} />
      <Route path="store-analytics" element={<StoreExplorerPage />} />
      <Route path="ad-library" element={<AdLibraryPage />} />
      <Route path="copy-studio" element={<AiCopyStudio />} />
      <Route path="ai-ad-generator" element={<AiCopyStudio />} />
      <Route path="ai-product-tools" element={<AiCopyStudio />} />
      <Route path="saved-items" element={<SavedItemsPage />} />
      <Route path="billing" element={<Navigate to="../settings" replace />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="help" element={<HelpPage />} />
    </Route>
  </Routes>
);

const EbayRoutes = () => (
  <Routes>
    <Route
      element={
        <ProtectedRoute>
          <EbayLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="overview" element={<Dashboard />} />
      <Route path="listings" element={<Listings />} />
      <Route path="listings/new" element={<NewListing />} />
      <Route path="bulk-lister" element={<BulkLister />} />
      <Route path="orders" element={<EbayOrders />} />
      <Route path="auto-orders" element={<Orders />} />
      <Route path="product-research" element={<ProductResearch />} />
      <Route path="best-selling" element={<BestSellingItems />} />
      <Route path="must-sell" element={<MustSellItems />} />
      <Route path="profitable-products" element={<ProfitableProducts />} />
      <Route path="calculator" element={<CalculatorSettings />} />
      <Route path="extension" element={<ExtensionConnect />} />
      <Route path="settings" element={<DashboardSettings />} />
    </Route>
  </Routes>
);

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
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/register" element={<Register />} />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />
                <Route path="/checkout/*" element={<Navigate to="/dashboard" replace />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/choose-plan" element={<ChoosePlan />} />
                <Route path="/payment-required" element={<Navigate to="/choose-plan" replace />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/refund" element={<RefundPolicy />} />
                <Route path="/admin/*" element={<AdminRedirect />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="listings" element={<Listings />} />
                  <Route path="listings/new" element={<NewListing />} />
                  <Route path="ebay-orders" element={<EbayOrders />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="alerts" element={<Alerts />} />
                  <Route path="subscription" element={<Subscription />} />
                  <Route path="billing" element={<Subscription />} />
                  <Route path="extension" element={<ExtensionConnect />} />
                  <Route path="calculator" element={<CalculatorSettings />} />
                  <Route path="best-selling" element={<BestSellingItems />} />
                  <Route path="must-sell" element={<MustSellItems />} />
                  <Route path="profitable-products" element={<ProfitableProducts />} />
                  <Route path="product-research" element={<ProductResearch />} />
                  <Route path="settings" element={<DashboardSettings />} />
                </Route>

                <Route path="/dashboard/ebay/*" element={<EbayRoutes />} />
                <Route path="/dashboard/shopify/*" element={<ShopifyRoutes />} />
                <Route path="/integrations/shopify/*" element={<ShopifyRoutes />} />
                <Route path="/integrations/ebay" element={<Navigate to="/dashboard/ebay" replace />} />
                <Route path="/integrations/amazon" element={<Navigate to="/dashboard/settings" replace />} />
                <Route path="/orders" element={<Navigate to="/dashboard/orders" replace />} />
                <Route path="/listings" element={<Navigate to="/dashboard/listings" replace />} />
                <Route path="/products" element={<Navigate to="/dashboard/product-research" replace />} />
                <Route path="/inventory" element={<Navigate to="/dashboard/listings" replace />} />
                <Route path="/billing" element={<Navigate to="/dashboard/settings" replace />} />
                <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />

                <Route path="/extension-viewer" element={<ExtensionViewer />} />
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
