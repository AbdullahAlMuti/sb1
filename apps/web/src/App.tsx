import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Toaster } from "@repo/ui/components/ui/toaster";
import { Toaster as Sonner } from "@repo/ui/components/ui/sonner";
import { TooltipProvider } from "@repo/ui/components/ui/tooltip";
import { ErrorBoundary } from "@repo/ui/feedback/ErrorBoundary";
import NotFound from "@repo/ui/feedback/NotFound";
import { ThemeProvider } from "@repo/ui/theme/useTheme";
import { AuthProvider, useAuth } from "@repo/auth/hooks/useAuth";
import { ProtectedRoute } from "@repo/auth/ProtectedRoute";

import Auth from "./pages/auth/Auth";
import AuthCallback from "./pages/auth/AuthCallback";
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
import EbayProfitCalculator from "./pages/dashboard/EbayProfitCalculator";
import CalculatorSettings from "./pages/dashboard/CalculatorSettings";
import ProfitableProducts from "./pages/dashboard/ProfitableProducts";
import MustSellItems from "./pages/dashboard/MustSellItems";
import ProductResearch from "./pages/dashboard/ProductResearch";
import ExtensionViewer from "./pages/extension/ExtensionViewer";
import CheckoutSuccess from "./pages/billing/CheckoutSuccess";
import Checkout from "./pages/billing/Checkout";
import PaymentCancelled from "./pages/billing/PaymentCancelled";
import ChoosePlan from "./pages/billing/PaymentRequired";
import Subscription from "./pages/dashboard/Subscription";
import ListingTemplates from "./pages/dashboard/ListingTemplates";

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

// Internal redirect that preserves the query string, hash, and router state —
// used for legacy → canonical path aliases (e.g. /register → /signup) so a
// plan token like ?plan=pro and any nav state survive the redirect.
function RedirectPreserve({ to }: { to: string }) {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: to, search: location.search, hash: location.hash }}
      state={location.state}
      replace
    />
  );
}

function LegacySettingsRedirect() {
  const { tab } = useParams();
  return <Navigate to={`/dashboard/ebay/settings/${tab || 'general'}`} replace />;
}

function AdminRedirect() {
  const location = useLocation();
  const adminPath = location.pathname.replace(/^\/admin/, "") || "/";

  return <ExternalRedirect to={`${ADMIN_ORIGIN}${adminPath}${location.search}${location.hash}`} />;
}

const MARKETING_ORIGIN = import.meta.env.VITE_MARKETING_URL ?? "https://sellersuit.com";

function MarketingRedirect() {
  const location = useLocation();
  return <ExternalRedirect to={`${MARKETING_ORIGIN}${location.pathname}${location.search}${location.hash}`} />;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Prevents layout flashing while checking session
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/auth" replace />;
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
      {/* Legacy generic-dashboard alias for eBay orders */}
      <Route path="ebay-orders" element={<Navigate to="../orders" replace />} />
      <Route path="auto-orders" element={<Orders />} />
      <Route path="product-research" element={<ProductResearch />} />
      <Route path="must-sell" element={<MustSellItems />} />
      <Route path="profitable-products" element={<ProfitableProducts />} />
      <Route path="calculator" element={<EbayProfitCalculator />} />
      <Route path="calculator/:supplier" element={<EbayProfitCalculator />} />
      {/* Supplier-wise pricing-rule config (feeds the extension overlay + backend sync).
          Kept reachable by URL; not in the sidebar to avoid a duplicate nav entry. */}
      <Route path="supplier-pricing" element={<CalculatorSettings />} />
      <Route path="extension" element={<ExtensionConnect />} />
      <Route path="alerts" element={<Alerts />} />
      <Route path="subscription" element={<Subscription />} />
      <Route path="billing" element={<Subscription />} />
      <Route path="settings" element={<Navigate to="/dashboard/ebay/settings/general" replace />} />
      <Route path="settings/:tab" element={<DashboardSettings />} />
      <Route path="templates" element={<ListingTemplates />} />
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
                <Route path="/" element={<RootRedirect />} />
                <Route path="/about" element={<MarketingRedirect />} />
                <Route path="/contact" element={<MarketingRedirect />} />
                <Route path="/documentation" element={<MarketingRedirect />} />
                <Route path="/pricing" element={<MarketingRedirect />} />
                <Route path="/privacy" element={<MarketingRedirect />} />
                <Route path="/privacy-policy" element={<MarketingRedirect />} />
                <Route path="/terms" element={<MarketingRedirect />} />
                <Route path="/terms-of-service" element={<MarketingRedirect />} />
                <Route path="/refund" element={<MarketingRedirect />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/signup" element={<Register />} />
                {/* Legacy alias → canonical /signup (preserves ?plan + nav state) */}
                <Route path="/register" element={<RedirectPreserve to="/signup" />} />

                {/* Canonical checkout entry: validates ?plan and starts a Stripe session */}
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/billing" element={<Navigate to="/choose-plan" replace />} />
                {/* Canonical payment-result pages */}
                <Route path="/payment-success" element={<CheckoutSuccess />} />
                <Route path="/payment-cancelled" element={<PaymentCancelled />} />
                <Route path="/payment-failed" element={<Navigate to="/payment-cancelled" replace />} />

                {/* Legacy aliases → canonical payment pages (preserve query) */}
                <Route path="/checkout/success" element={<RedirectPreserve to="/payment-success" />} />
                <Route path="/checkout/*" element={<Navigate to="/dashboard" replace />} />

                <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
                <Route path="/choose-plan" element={<ChoosePlan />} />
                <Route path="/payment-required" element={<Navigate to="/choose-plan" replace />} />
                <Route path="/verify-email" element={<VerifyEmail />} />


                <Route path="/admin/*" element={<AdminRedirect />} />

                {/* Canonical workspace is /dashboard/ebay/* (single eBay layout).
                    The legacy generic /dashboard/* paths now redirect into it so
                    there is no split-brain between two dashboard layouts. The bare
                    /dashboard is also funnelled to /dashboard/ebay by the guard. */}
                <Route path="/dashboard" element={<Navigate to="/dashboard/ebay" replace />} />
                <Route path="/dashboard/listings/new" element={<Navigate to="/dashboard/ebay/listings/new" replace />} />
                <Route path="/dashboard/listings" element={<Navigate to="/dashboard/ebay/listings" replace />} />
                <Route path="/dashboard/ebay-orders" element={<Navigate to="/dashboard/ebay/orders" replace />} />
                <Route path="/dashboard/orders" element={<Navigate to="/dashboard/ebay/auto-orders" replace />} />
                <Route path="/dashboard/alerts" element={<Navigate to="/dashboard/ebay/alerts" replace />} />
                <Route path="/dashboard/subscription" element={<Navigate to="/dashboard/ebay/subscription" replace />} />
                <Route path="/dashboard/billing" element={<Navigate to="/dashboard/ebay/billing" replace />} />
                <Route path="/dashboard/extension" element={<Navigate to="/dashboard/ebay/extension" replace />} />
                <Route path="/dashboard/calculator" element={<Navigate to="/dashboard/ebay/calculator" replace />} />
                <Route path="/dashboard/best-selling" element={<Navigate to="/dashboard/ebay" replace />} />
                <Route path="/dashboard/must-sell" element={<Navigate to="/dashboard/ebay/must-sell" replace />} />
                <Route path="/dashboard/profitable-products" element={<Navigate to="/dashboard/ebay/profitable-products" replace />} />
                <Route path="/dashboard/product-research" element={<Navigate to="/dashboard/ebay/product-research" replace />} />
                <Route path="/dashboard/settings/:tab?" element={<LegacySettingsRedirect />} />
                <Route path="/dashboard/templates" element={<Navigate to="/dashboard/ebay/templates" replace />} />

                <Route path="/dashboard/ebay/*" element={<EbayRoutes />} />
                <Route path="/dashboard/shopify/*" element={<ShopifyRoutes />} />
                <Route path="/integrations/shopify/*" element={<ShopifyRoutes />} />
                <Route path="/integrations/ebay" element={<Navigate to="/dashboard/ebay" replace />} />
                <Route path="/integrations/amazon" element={<Navigate to="/dashboard/settings" replace />} />
                <Route path="/orders" element={<Navigate to="/dashboard/orders" replace />} />
                <Route path="/listings" element={<Navigate to="/dashboard/listings" replace />} />
                <Route path="/products" element={<Navigate to="/dashboard/product-research" replace />} />
                <Route path="/inventory" element={<Navigate to="/dashboard/listings" replace />} />
                <Route path="/settings/:tab?" element={<LegacySettingsRedirect />} />

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
