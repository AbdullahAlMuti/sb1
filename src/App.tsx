import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Register from "./pages/Register";

import CheckoutSuccess from "./pages/CheckoutSuccess";
import PaymentRequired from "./pages/PaymentRequired";
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/dashboard/Alerts";
import Orders from "./pages/dashboard/Orders";
import EbayOrders from "./pages/dashboard/EbayOrders";
import Listings from "./pages/dashboard/Listings";
import NewListing from "./pages/dashboard/NewListing";
import ExtensionConnect from "./pages/dashboard/ExtensionConnect";
import Subscription from "./pages/dashboard/Subscription";
import BillingUsage from "./pages/dashboard/BillingUsage";
import DashboardSettings from "./pages/dashboard/Settings";
import CalculatorSettings from "./pages/dashboard/CalculatorSettings";
import ProfitableProducts from "./pages/dashboard/ProfitableProducts";
import AdminProfitableProducts from "./pages/admin/AdminProfitableProducts";
import BestSellingItems from "./pages/dashboard/BestSellingItems";
import MustSellItems from "./pages/dashboard/MustSellItems";
import ProductResearch from "./pages/dashboard/ProductResearch";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminUsage from "./pages/admin/AdminUsage";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminPrompts from "./pages/admin/AdminPrompts";
import AdminAISettings from "./pages/admin/AdminAISettings";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminBestSelling from "./pages/admin/AdminBestSelling";
import AdminMustSell from "./pages/admin/AdminMustSell";
import AdminExtension from "./pages/admin/AdminExtension";
import AdminCredits from "./pages/admin/AdminCredits";
import NotFound from "./pages/NotFound";
import Course from "./pages/Course";
import ExtensionViewer from "./pages/ExtensionViewer";
import VerifyEmail from "./pages/VerifyEmail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/course" element={<Course />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/register" element={<Register />} />

              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/payment-required" element={<PaymentRequired />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/refund" element={<RefundPolicy />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="listings" element={<Listings />} />
                <Route path="listings/new" element={<NewListing />} />
                <Route path="ebay-orders" element={<EbayOrders />} />
                <Route path="orders" element={<Orders />} />
                <Route path="alerts" element={<Alerts />} />

                <Route path="subscription" element={<Subscription />} />
                <Route path="billing" element={<BillingUsage />} />
                <Route path="extension" element={<ExtensionConnect />} />
                <Route path="calculator" element={<CalculatorSettings />} />
                <Route path="best-selling" element={<BestSellingItems />} />
                <Route path="must-sell" element={<MustSellItems />} />
                <Route path="profitable-products" element={<ProfitableProducts />} />
                <Route path="product-research" element={<ProductResearch />} />
                <Route path="settings" element={<DashboardSettings />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="plans" element={<AdminPlans />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="usage" element={<AdminUsage />} />
                <Route path="roles" element={<AdminRoles />} />
                <Route path="notices" element={<AdminNotices />} />
                <Route path="prompts" element={<AdminPrompts />} />
                <Route path="extension" element={<AdminExtension />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="best-selling" element={<AdminBestSelling />} />
                <Route path="must-sell" element={<AdminMustSell />} />
                <Route path="profitable-products" element={<AdminProfitableProducts />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="ai-settings" element={<AdminAISettings />} />
                <Route path="credits" element={<AdminCredits />} />
              </Route>

              {/* Temporary Extension Viewer - Safe to Delete */}
              <Route path="/extension-viewer" element={<ExtensionViewer />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
