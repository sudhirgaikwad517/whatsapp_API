import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/auth.store';
import { Layout } from './components/layout/Layout';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { ConfirmDialogHost } from './components/ui/ConfirmDialog';

// Lazy loaded pages
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Inbox = lazy(() => import('./pages/Inbox').then(m => ({ default: m.Inbox })));
const Campaigns = lazy(() => import('./pages/Campaigns').then(m => ({ default: m.Campaigns })));
const Contacts = lazy(() => import('./pages/Contacts').then(m => ({ default: m.Contacts })));
const Templates = lazy(() => import('./pages/Templates').then(m => ({ default: m.Templates })));
const AutoResponder = lazy(() => import('./pages/AutoResponder').then(m => ({ default: m.AutoResponder })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Wallet = lazy(() => import('./pages/Wallet').then(m => ({ default: m.Wallet })));
const Team = lazy(() => import('./pages/Team').then(m => ({ default: m.Team })));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const SuperAdminLogin = lazy(() => import('./pages/SuperAdminLogin').then(m => ({ default: m.SuperAdminLogin })));
const SuperAdminForgotPassword = lazy(() => import('./pages/SuperAdminForgotPassword').then(m => ({ default: m.SuperAdminForgotPassword })));
const SuperAdminResetPassword = lazy(() => import('./pages/SuperAdminResetPassword').then(m => ({ default: m.SuperAdminResetPassword })));
const Flows = lazy(() => import('./pages/Flows').then(m => ({ default: m.Flows })));
const Catalog = lazy(() => import('./pages/Catalog').then(m => ({ default: m.Catalog })));
const Billing = lazy(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireTenantAccess?: boolean; requireSuperAdmin?: boolean }> = ({
  children,
  requireTenantAccess,
  requireSuperAdmin,
}) => {
  const { isAuthenticated, user, isImpersonating } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect SuperAdmin away from tenant view if not explicitly impersonating
  if (requireTenantAccess && user?.role === 'SUPER_ADMIN' && !isImpersonating) {
    return <Navigate to="/superadmin" replace />;
  }

  // Only a genuine Super Admin session may reach the /superadmin layout —
  // otherwise any authenticated tenant user could navigate there directly.
  if (requireSuperAdmin && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const syncUser = useAuthStore(state => state.syncUser);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [sessionChecked, setSessionChecked] = React.useState(false);

  // The dashboard's own "app" session cookie is separate from wabtic-website's
  // "website" cookie (different cookie names — see auth-cookies.ts) precisely
  // so that logging in on the marketing site never silently authenticates the
  // dashboard too. This check only ever succeeds if the user has actually
  // logged in here, on app.wabtic.com, at least once.
  React.useEffect(() => {
    syncUser().finally(() => setSessionChecked(true));
  }, [syncUser]);

  React.useEffect(() => {
    if (isAuthenticated) {
      syncUser();
    }
  }, [isAuthenticated, syncUser]);

  if (!sessionChecked) {
    return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster theme="dark" position="top-right" richColors closeButton />
      <ConfirmDialogHost />
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/superadmin/forgot-password" element={<SuperAdminForgotPassword />} />
            <Route path="/superadmin/reset-password" element={<SuperAdminResetPassword />} />

            {/* Super Admin Dedicated Layout */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<SuperAdminDashboard />} />
            </Route>

            {/* Client Organization Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute requireTenantAccess>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="templates" element={<Templates />} />
              <Route path="auto-reply" element={<AutoResponder />} />
              <Route path="flows" element={<Flows />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="billing" element={<Billing />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="team" element={<Team />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
