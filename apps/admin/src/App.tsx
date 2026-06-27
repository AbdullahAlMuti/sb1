import React, { Suspense } from "react";
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
import {
  Activity,
  Bell,
  Bot,
  Boxes,
  ClipboardList,
  Lock,
  Package,
  PlugZap,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tags,
  Users,
  Webhook,
} from "lucide-react";

const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = React.lazy(() => import("./pages/AdminUsers"));
const AdminNotices = React.lazy(() => import("./pages/AdminNotices"));
const AdminBlog = React.lazy(() => import("./pages/AdminBlog"));
const AdminBlogEditor = React.lazy(() => import("./pages/AdminBlogEditor"));
const AdminAudit = React.lazy(() => import("./pages/AdminAudit"));
const AdminSettings = React.lazy(() => import("./pages/AdminSettings"));
const AdminUsage = React.lazy(() => import("./pages/AdminUsage"));
const AdminRoles = React.lazy(() => import("./pages/AdminRoles"));
const AdminPrompts = React.lazy(() => import("./pages/AdminPrompts"));
const AdminAISettings = React.lazy(() => import("./pages/AdminAISettings"));
const AdminDescriptionConfig = React.lazy(() => import("./pages/AdminDescriptionConfig"));
const AdminBestSelling = React.lazy(() => import("./pages/AdminBestSelling"));
const AdminMustSell = React.lazy(() => import("./pages/AdminMustSell"));
const AdminExtension = React.lazy(() => import("./pages/AdminExtension"));
const AdminExtensionControl = React.lazy(() => import("./pages/AdminExtensionControl"));
const AdminProfitableProducts = React.lazy(() => import("./pages/AdminProfitableProducts"));
const AdminModulePage = React.lazy(() => import("./pages/AdminModulePage"));
const AdminShopifyApp = React.lazy(() => import("./pages/AdminShopifyApp"));
const AdminEbayApp = React.lazy(() => import("./pages/AdminEbayApp"));
const AdminIntegrationDetail = React.lazy(() => import("./pages/AdminIntegrationDetail"));
const AdminPlans = React.lazy(() => import("./pages/AdminPlans"));
const AdminPlanFeatures = React.lazy(() => import("./pages/AdminPlanFeatures"));
const AdminPlanPrices = React.lazy(() => import("./pages/AdminPlanPrices"));
const AdminSubscriptions = React.lazy(() => import("./pages/AdminSubscriptions"));
const AdminCheckoutSessions = React.lazy(() => import("./pages/AdminCheckoutSessions"));

const queryClient = new QueryClient();

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
    <Route path="workspaces" element={<AdminModulePage title="Workspaces" description="Manage tenants, members, ownership, store counts, usage state, and tenant health from one place." icon={Boxes} primaryAction="Create workspace" moduleType="users" />} />
    <Route path="workspaces/:workspaceId" element={<AdminModulePage title="Workspace Details" description="Inspect workspace members, stores, integrations, usage, audit history, and support actions." icon={Boxes} primaryAction="Add member" moduleType="users" />} />
    <Route path="stores" element={<AdminModulePage title="Stores" description="Monitor connected seller stores, provider accounts, store health, sync coverage, and operational status." icon={Store} primaryAction="Add store" moduleType="commerce" />} />
    <Route path="stores/:storeId" element={<AdminModulePage title="Store Details" description="Inspect store integrations, products, listings, orders, sync jobs, and recent operational history." icon={Store} primaryAction="Run store check" moduleType="commerce" />} />
    <Route path="integrations" element={<AdminModulePage title="Integrations" description="Manage marketplace accounts across eBay, Shopify, Amazon, and future providers with provider-aware filters." icon={PlugZap} primaryAction="Connect provider" moduleType="operations" />} />
    <Route path="integrations/:marketplaceAccountId" element={<AdminIntegrationDetail />} />
    <Route path="products" element={<AdminModulePage title="Products / Services" description="Review normalized products, variants, source data, listing coverage, and marketplace readiness." icon={Package} primaryAction="Add product" moduleType="commerce" />} />
    <Route path="products/:productId" element={<AdminModulePage title="Product Details" description="Inspect variants, listing mappings, provider metadata, inventory, and sync history." icon={Package} primaryAction="Sync product" moduleType="commerce" />} />
    <Route path="listings" element={<AdminModulePage title="Listings" description="Operate marketplace listings across eBay, Shopify, and future Amazon with sync status and issue handling." icon={Tags} primaryAction="Create listing" moduleType="commerce" />} />
    <Route path="listings/:listingId" element={<AdminModulePage title="Listing Details" description="Inspect provider listing data, errors, inventory state, pricing, and audit history." icon={Tags} primaryAction="Retry listing" moduleType="commerce" />} />
    <Route path="orders" element={<AdminModulePage title="Orders / Transactions" description="Review orders across providers, fulfillment status, payment status, sync state, and protected buyer details." icon={ShoppingCart} primaryAction="Export orders" moduleType="commerce" />} />
    <Route path="orders/:orderId" element={<AdminModulePage title="Order Details" description="Inspect order lines, payment state, fulfillment state, provider payloads, and support actions." icon={ShoppingCart} primaryAction="Retry order sync" moduleType="commerce" />} />
    <Route path="customers" element={<AdminModulePage title="Customers" description="Review customer records, order history, provider relationships, and protected PII access flows." icon={ShoppingBag} primaryAction="Export customers" moduleType="users" />} />
    <Route path="customers/:customerId" element={<AdminModulePage title="Customer Details" description="Inspect customer profile, orders, support notes, PII access, and audit trail." icon={ShoppingBag} primaryAction="Add note" moduleType="users" />} />
    <Route path="inventory" element={<AdminModulePage title="Inventory" description="Monitor inventory items, locations, movements, reservations, and marketplace inventory sync status." icon={Boxes} primaryAction="Sync inventory" moduleType="commerce" />} />
    <Route path="sync-health" element={<AdminModulePage title="Sync Health" description="Operate sync jobs, failed retries, error categories, provider issues, and worker health." icon={Activity} primaryAction="Retry failed jobs" moduleType="operations" />} />
    <Route path="sync-jobs/:jobId" element={<AdminModulePage title="Sync Job Details" description="Inspect job attempts, logs, provider errors, linked records, and replay options." icon={Activity} primaryAction="Retry job" moduleType="operations" />} />
    <Route path="webhook-events" element={<AdminModulePage title="Webhook Events" description="Inspect webhook deliveries, signatures, idempotency keys, replay options, and payload access." icon={Webhook} primaryAction="Replay event" moduleType="operations" />} />
    <Route path="webhook-events/:eventId" element={<AdminModulePage title="Webhook Event Details" description="Review protected payload, linked sync job, delivery status, and replay audit trail." icon={Webhook} primaryAction="Replay webhook" moduleType="operations" />} />
    <Route path="billing" element={<Navigate to="/overview" replace />} />
    <Route path="plans" element={<AdminPlans />} />
    <Route path="plans/:id/features" element={<AdminPlanFeatures />} />
    <Route path="plans/:id/prices" element={<AdminPlanPrices />} />
    <Route path="subscriptions" element={<AdminSubscriptions />} />
    <Route path="checkout-sessions" element={<AdminCheckoutSessions />} />
    <Route path="payments" element={<Navigate to="/overview" replace />} />
    <Route path="usage" element={<AdminUsage />} />
    <Route path="credits" element={<Navigate to="/usage" replace />} />
    <Route path="coupons" element={<Navigate to="/overview" replace />} />
    <Route path="ai" element={<AdminAISettings />} />
    <Route path="ai-settings" element={<AdminAISettings />} />
    <Route path="description-config" element={<AdminDescriptionConfig />} />
    <Route path="automation" element={<AdminPrompts />} />
    <Route path="prompts" element={<AdminPrompts />} />
    <Route path="extension" element={<AdminExtension />} />
    <Route path="extension-control" element={<AdminExtensionControl />} />
    <Route path="notifications" element={<AdminNotices />} />
    <Route path="notices" element={<AdminNotices />} />
    <Route path="blog" element={<AdminBlog />} />
    <Route path="blog/new" element={<AdminBlogEditor />} />
    <Route path="blog/:id/edit" element={<AdminBlogEditor />} />
    <Route path="support" element={<AdminModulePage title="Support / Tickets" description="Prioritize customer tickets, failed workflows, support notes, and escalation paths." icon={Bell} primaryAction="Create ticket" moduleType="general" />} />
    <Route path="reports" element={<AdminModulePage title="Reports / Analytics" description="Analyze growth, revenue, sync health, provider performance, usage, and operational trends." icon={Receipt} primaryAction="Export report" moduleType="general" />} />
    <Route path="audit" element={<AdminAudit />} />
    <Route path="audit-logs" element={<AdminAudit />} />
    <Route path="security" element={<AdminModulePage title="Security" description="Manage admin roles, suspicious activity, sessions, PII access, and sensitive action approvals." icon={Lock} primaryAction="Review alerts" moduleType="security" />} />
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
              <Suspense fallback={
                <div className="flex h-screen items-center justify-center bg-slate-50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                </div>
              }>
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
