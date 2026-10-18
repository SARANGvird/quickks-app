import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, Link, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import { PaymentProvider } from './contexts/PaymentContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AnalyticsTracker from './components/AnalyticsTracker';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import HomePage from './pages/HomePage';

const RELEASE = import.meta.env.VITE_VERSION || '1.0.0';
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
const PROVIDER_ROLES = ['PROVIDER', 'SERVICE_PROVIDER'];

const normalizeRole = (r) => String(r || '').toUpperCase().replace(/^ROLE_/, '');

const wait = (ms) => new Promise((res) => setTimeout(res, ms));
const lazyWithRetry = (factory, { retries = 2, delay = 800 } = {}) =>
  lazy(async () => {
    let lastErr;
    for (let i = 0; i <= retries; i++) {
      try {
        const mod = await factory();
        return mod;
      } catch (e) {
        lastErr = e;
        if (i < retries) await wait(delay * (i + 1));
      }
    }
    console.error('[App] Chunk load failed after retry', lastErr);
    throw lastErr;
  });

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
};

const DashboardRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const role = useMemo(() => normalizeRole(user?.role), [user?.role]);
  if (loading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (ADMIN_ROLES.includes(role)) return <Navigate to="/admin/dashboard" replace />;
  if (PROVIDER_ROLES.includes(role)) return <Navigate to="/provider/dashboard" replace />;
  return <Navigate to="/customer/dashboard" replace />;
};

const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage'));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage'));
const SupportPage = lazyWithRetry(() => import('./pages/SupportPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));
const BookingForm = lazyWithRetry(() => import('./components/BookingForm'));
const PaymentSuccess = lazyWithRetry(() => import('./pages/PaymentSuccess'));
const PaymentFailed = lazyWithRetry(() => import('./pages/PaymentFailed'));
const ServicesPage = lazyWithRetry(() => import('./pages/ServicesPage'));
const DynamicServicePage = lazyWithRetry(() => import('./pages/DynamicServicePage'));
const CustomerDashboard = lazyWithRetry(() => import('./pages/Customer/CustomerDashboard'));
const ProviderDashboard = lazyWithRetry(() => import('./pages/Provider/ProviderDashboard'));
const ProviderProfile = lazyWithRetry(() => import('./pages/Provider/ProviderProfile'));
const ProviderForm = lazyWithRetry(() => import('./pages/Provider/ProviderForm'));
const ProviderMyBookings = lazyWithRetry(() => import('./pages/Provider/ProviderMyBookings'));
const ProviderStrikesPage = lazyWithRetry(() => import('./pages/Provider/StrikesPage'));
const AdminDashboard = lazyWithRetry(() => import('./components/admin/AdminDashboard'));
const AdminLayout = lazyWithRetry(() => import('./pages/Admin/AdminLayout'));
const AdminUsersPage = lazyWithRetry(() => import('./pages/Admin/UsersPage'));
const AdminProvidersPage = lazyWithRetry(() => import('./pages/Admin/ProvidersPage'));
const AdminBookingsPage = lazyWithRetry(() => import('./pages/Admin/BookingsPage'));
const AdminComplaintsPage = lazyWithRetry(() => import('./pages/Admin/ComplaintsPage'));
const AdminAnalyticsPage = lazyWithRetry(() => import('./pages/Admin/Analytics'));
const AdminReviewsPage = lazyWithRetry(() => import('./pages/Admin/ReviewsPage'));
const AdminSettingsPage = lazyWithRetry(() => import('./pages/Admin/SettingsPage'));

const AdminShell = () => (
  <AdminLayout>
    <Outlet />
  </AdminLayout>
);

const Unauthorized = () => (
  <div style={{ textAlign: 'center', marginTop: 100, padding: 24 }}>
    <h2 style={{ fontWeight: 800 }}>403 - Access Denied</h2>
    <p style={{ color: '#64748b', marginTop: 8 }}>You don't have permission to view this page</p>
    <Link to="/" style={{ color: '#6366f1', fontWeight: 700, marginTop: 16, display: 'inline-block' }}>Go Home</Link>
  </div>
);

const RouteFallback = () => <LoadingSpinner fullScreen text="Loading..." />;

const AppRoutes = () => {
  const { loading } = useAuth();
  if (loading) return <RouteFallback />;

  return (
    <Suspense fallback={<RouteFallback />}>
      <ScrollToTop />
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:serviceName" element={<DynamicServicePage />} />
        <Route path="/booking" element={<BookingForm />} />
        <Route path="/book" element={<BookingForm />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failed" element={<PaymentFailed />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/dashboard/*" element={<Navigate to="/dashboard" replace />} />

        <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={PROVIDER_ROLES} />}>
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/provider/profile" element={<ProviderProfile />} />
          <Route path="/provider/profile/edit" element={<ProviderForm />} />
          <Route path="/provider/create" element={<ProviderForm />} />
          <Route path="/provider/bookings" element={<ProviderMyBookings />} />
          <Route path="/provider/strikes" element={<ProviderStrikesPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route element={<AdminShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/*" element={<AdminUsersPage />} />
            <Route path="/admin/providers" element={<AdminProvidersPage />} />
            <Route path="/admin/providers/*" element={<AdminProvidersPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route path="/admin/bookings/*" element={<AdminBookingsPage />} />
            <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
            <Route path="/admin/complaints/*" element={<AdminComplaintsPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/analytics/*" element={<AdminAnalyticsPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/reviews/*" element={<AdminReviewsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/settings/*" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        <Route path="/:slug" element={<DynamicServicePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary variant="page" release={RELEASE}>
    <PaymentProvider>
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#111827', color: '#fff', borderRadius: 12, fontWeight: 600, fontSize: 13 } }} />
    </PaymentProvider>
  </ErrorBoundary>
);

export default App;