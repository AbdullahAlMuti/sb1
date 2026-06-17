import { QueryClientProvider } from "@tanstack/react-query";
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

import AdminLogin from "./pages/AdminLogin";
import { queryClient } from "./app/queryClient";
import { renderAdminRouteChildren, StripAdminPrefix } from "./app/router";

const adminRouteElement = (
  <ProtectedRoute requireAdmin>
    <AdminLayout />
  </ProtectedRoute>
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
                {/* Public auth */}
                <Route path="/login" element={<AdminLogin />} />
                <Route path="/auth" element={<AdminLogin />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Canonical admin tree — mounted ONCE at root. */}
                <Route path="/" element={adminRouteElement}>
                  {renderAdminRouteChildren()}
                </Route>

                {/* Legacy /admin/* mount → collapse onto the root tree. */}
                <Route path="/admin/*" element={<StripAdminPrefix />} />
                <Route path="/dashboard" element={<Navigate to="/overview" replace />} />

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
