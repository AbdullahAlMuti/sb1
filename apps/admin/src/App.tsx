import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@repo/ui/components/ui/toaster";
import { Toaster as Sonner } from "@repo/ui/components/ui/sonner";
import { TooltipProvider } from "@repo/ui/components/ui/tooltip";
import { ErrorBoundary } from "@repo/ui/feedback/ErrorBoundary";
import NotFound from "@repo/ui/feedback/NotFound";
import { ThemeProvider } from "@repo/ui/theme/useTheme";
import { AuthProvider } from "@repo/auth/hooks/useAuth";
import { ProtectedRoute } from "@repo/auth/ProtectedRoute";
import { AdminLayout } from "@/components/admin-layout/AdminLayout";

// Route-level code splitting: each admin page is its own chunk, loaded on demand
// under the <Suspense> boundary below (was one ~1.77 MB eager bundle).
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminNotices = lazy(() => import("./pages/AdminNotices"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const AdminBlogEditor = lazy(() => import("./pages/AdminBlogEditor"));
const AdminAudit = lazy(() => import("./pages/AdminAudit"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminUsage = lazy(() => import("./pages/AdminUsage"));
const AdminRoles = lazy(() => import("./pages/AdminRoles"));
const AdminPrompts = lazy(() => import("./pages/AdminPrompts"));
// AdminAISettings and AdminDescriptionConfig are embedded inside AdminExtension; no top-level lazy needed.
const AdminBestSelling = lazy(() => import("./pages/AdminBestSelling"));
const AdminMustSell = lazy(() => import("./pages/AdminMustSell"));
const AdminExtension = lazy(() => import("./pages/AdminExtension"));
// AdminExtensionControl is embedded inside AdminExtension; no top-level lazy needed.
const AdminProfitableProducts = lazy(() => import("./pages/AdminProfitableProducts"));
const AdminShopifyApp = lazy(() => import("./pages/AdminShopifyApp"));
const AdminEbayApp = lazy(() => import("./pages/AdminEbayApp"));
const AdminIntegrationDetail = lazy(() => import("./pages/AdminIntegrationDetail"));
const AdminPlans = lazy(() => import("./pages/AdminPlans"));
const AdminPlanFeatures = lazy(() => import("./pages/AdminPlanFeatures"));
const AdminPlanPrices = lazy(() => import("./pages/AdminPlanPrices"));
const AdminSubscriptions = lazy(() => import("./pages/AdminSubscriptions"));
const AdminCheckoutSessions = lazy(() => import("./pages/AdminCheckoutSessions"));

const queryClient = new QueryClient();

// Shown while a lazily-loaded admin route chunk is in flight.
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

const adminRouteElement = (
  <ProtectedRoute requireAdmin>
    <AdminLayout />
  </ProtectedRoute>
);

const AdminRouteChildren = () => (
  <>
    <Route index element={<AdminDashboard />} />
    <Route path="overview" element={<AdminDashboard />} />
    <Route path="users" element={<AdminUsers />} />
    <Route path="users/:userId" element={<AdminUsers />} />
    <Route path="integrations/:marketplaceAccountId" element={<AdminIntegrationDetail />} />
    <Route path="plans" element={<AdminPlans />} />
    <Route path="plans/:id/features" element={<AdminPlanFeatures />} />
    <Route path="plans/:id/prices" element={<AdminPlanPrices />} />
    <Route path="subscriptions" element={<AdminSubscriptions />} />
    <Route path="checkout-sessions" element={<AdminCheckoutSessions />} />
    <Route path="usage" element={<AdminUsage />} />
    {/* Extension-related routes: old direct paths redirect into the unified Extension Setup tab */}
    <Route path="ai" element={<Navigate to="/extension?tab=ai-automation" replace />} />
    <Route path="ai-settings" element={<Navigate to="/extension?tab=ai-automation" replace />} />
    <Route path="description-config" element={<Navigate to="/extension?tab=description-config" replace />} />
    <Route path="extension-control" element={<Navigate to="/extension?tab=extension-control" replace />} />
    <Route path="automation" element={<AdminPrompts />} />
    <Route path="prompts" element={<AdminPrompts />} />
    <Route path="extension" element={<AdminExtension />} />
    <Route path="notifications" element={<AdminNotices />} />
    <Route path="notices" element={<AdminNotices />} />
    <Route path="blog" element={<AdminBlog />} />
    <Route path="blog/new" element={<AdminBlogEditor />} />
    <Route path="blog/:id/edit" element={<AdminBlogEditor />} />
    <Route path="audit" element={<AdminAudit />} />
    <Route path="audit-logs" element={<AdminAudit />} />
    <Route path="roles" element={<AdminRoles />} />
    <Route path="settings" element={<AdminSettings />} />
    <Route path="best-selling" element={<AdminBestSelling />} />
    <Route path="must-sell" element={<AdminMustSell />} />
    <Route path="profitable-products" element={<AdminProfitableProducts />} />
    <Route path="product-intelligence" element={<AdminProfitableProducts />} />
    <Route path="shopify-app" element={<AdminShopifyApp />} />
    <Route path="ebay-app" element={<AdminEbayApp />} />
  </>
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
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<AdminLogin />} />
                <Route path="/auth" element={<AdminLogin />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/" element={adminRouteElement}>
                  {AdminRouteChildren()}
                </Route>
                <Route path="/admin" element={adminRouteElement}>
                  {AdminRouteChildren()}
                </Route>
                <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
