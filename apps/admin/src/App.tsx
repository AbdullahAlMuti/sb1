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
  CreditCard,
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

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminPlans from "./pages/AdminPlans";
import AdminNotices from "./pages/AdminNotices";
import AdminAudit from "./pages/AdminAudit";
import AdminSettings from "./pages/AdminSettings";
import AdminPayments from "./pages/AdminPayments";
import AdminUsage from "./pages/AdminUsage";
import AdminRoles from "./pages/AdminRoles";
import AdminPrompts from "./pages/AdminPrompts";
import AdminAISettings from "./pages/AdminAISettings";
import AdminCoupons from "./pages/AdminCoupons";
import AdminBestSelling from "./pages/AdminBestSelling";
import AdminMustSell from "./pages/AdminMustSell";
import AdminExtension from "./pages/AdminExtension";
import AdminCredits from "./pages/AdminCredits";
import AdminProfitableProducts from "./pages/AdminProfitableProducts";
import AdminModulePage from "./pages/AdminModulePage";
import AdminShopifyApp from "./pages/AdminShopifyApp";

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
    <Route path="workspaces" element={<AdminModulePage title="Workspaces" description="Manage tenants, members, ownership, store counts, billing state, and tenant health from one place." icon={Boxes} primaryAction="Create workspace" moduleType="users" />} />
    <Route path="workspaces/:workspaceId" element={<AdminModulePage title="Workspace Details" description="Inspect workspace members, stores, integrations, usage, billing, audit history, and support actions." icon={Boxes} primaryAction="Add member" moduleType="users" />} />
    <Route path="stores" element={<AdminModulePage title="Stores" description="Monitor connected seller stores, provider accounts, store health, sync coverage, and operational status." icon={Store} primaryAction="Add store" moduleType="commerce" />} />
    <Route path="stores/:storeId" element={<AdminModulePage title="Store Details" description="Inspect store integrations, products, listings, orders, sync jobs, and recent operational history." icon={Store} primaryAction="Run store check" moduleType="commerce" />} />
    <Route path="integrations" element={<AdminModulePage title="Integrations" description="Manage marketplace accounts across eBay, Shopify, Amazon, and future providers with provider-aware filters." icon={PlugZap} primaryAction="Connect provider" moduleType="operations" />} />
    <Route path="integrations/:marketplaceAccountId" element={<AdminModulePage title="Integration Details" description="Inspect OAuth status, scopes, webhooks, sync jobs, errors, and audit history for a marketplace account." icon={PlugZap} primaryAction="Retry sync" moduleType="operations" />} />
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
    <Route path="billing" element={<AdminPayments />} />
    <Route path="plans" element={<AdminPlans />} />
    <Route path="subscriptions" element={<AdminPayments />} />
    <Route path="payments" element={<AdminPayments />} />
    <Route path="usage" element={<AdminUsage />} />
    <Route path="credits" element={<AdminCredits />} />
    <Route path="coupons" element={<AdminCoupons />} />
    <Route path="ai" element={<AdminAISettings />} />
    <Route path="ai-settings" element={<AdminAISettings />} />
    <Route path="automation" element={<AdminPrompts />} />
    <Route path="prompts" element={<AdminPrompts />} />
    <Route path="extension" element={<AdminExtension />} />
    <Route path="notifications" element={<AdminNotices />} />
    <Route path="notices" element={<AdminNotices />} />
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
