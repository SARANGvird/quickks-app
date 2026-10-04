// src/App.js - v14 PRODUCTION FINAL
import React, { Suspense, lazy, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Link,
  Outlet,
  useLocation,
  useParams
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import { PaymentProvider } from './contexts/PaymentContext';
import ProtectedRoute from './routes/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import HomePage from './pages/HomePage';

/* VITE FIX */
const env = import.meta.env || {};
const ERROR_ENDPOINT = env.VITE_ERROR_ENDPOINT || env.REACT_APP_ERROR_ENDPOINT || null;
const RELEASE = env.VITE_VERSION || env.REACT_APP_VERSION || env.VITE_VERCEL_GIT_COMMIT_SHA || '1.0.0';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const lazyWithRetry = (factory, { retries = 2, delay = 800 } = {}) =>
  lazy(async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (attempt < retries) await wait(delay * (attempt + 1));
      }
    }
    throw lastError;
  });

const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage'));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage'));
const SupportPage = lazyWithRetry(() => import('./pages/SupportPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));
const DashboardLandingPage = lazyWithRetry(() => import('./pages/DashboardLandingPage'));
const BookingForm = lazyWithRetry(() => import('./components/BookingForm'));
const PaymentSuccess = lazyWithRetry(() => import('./pages/PaymentSuccess'));
const PaymentFailed = lazyWithRetry(() => import('./pages/PaymentFailed'));

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

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const RouteErrorBoundary = ({ children }) => {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary
      variant="page"
      resetKeys={[pathname]}
      release={RELEASE}
      logToService={Boolean(ERROR_ENDPOINT)}
      serviceEndpoint={ERROR_ENDPOINT}
    >
      {children}
    </ErrorBoundary>
  );
};

const AdminShell = () => (
  <AdminLayout>
    <Outlet />
  </AdminLayout>
);

const LegacyAdminRedirect = () => {
  const { '*': rest } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/admin/${rest || 'dashboard'}${search}`} replace />;
};

const Unauthorized = () => (
  <div style={{ textAlign: 'center', marginTop: 100, padding: 16 }}>
    <h2>Access denied</h2>
    <p>You do not have permission to view this page.</p>
    <Link to="/">Go to Home</Link>{' | '}<Link to="/login">Sign in</Link>
  </div>
);

const AppRoutes = () => {
  const { loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/booking" element={<BookingForm />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failed" element={<PaymentFailed />} />
        <Route path="/dashboard" element={<DashboardLandingPage />} />
        <Route path="/dashboard/customer" element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="/dashboard/provider" element={<Navigate to="/provider/dashboard" replace />} />
        <Route path="/dashboard/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/dashboard/admin/*" element={<LegacyAdminRedirect />} />
        <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['PROVIDER']} />}>
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/provider/profile" element={<ProviderProfile />} />
          <Route path="/provider/profile/edit" element={<ProviderForm />} />
          <Route path="/provider/create" element={<ProviderForm />} />
          <Route path="/provider/bookings" element={<ProviderMyBookings />} />
          <Route path="/provider/strikes" element={<ProviderStrikesPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route element={<AdminShell />}>
            <Route path="/admin/users/*" element={<AdminUsersPage />} />
            <Route path="/admin/providers/*" element={<AdminProvidersPage />} />
            <Route path="/admin/bookings/*" element={<AdminBookingsPage />} />
            <Route path="/admin/complaints/*" element={<AdminComplaintsPage />} />
            <Route path="/admin/analytics/*" element={<AdminAnalyticsPage />} />
            <Route path="/admin/reviews/*" element={<AdminReviewsPage />} />
            <Route path="/admin/settings/*" element={<AdminSettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <RouteErrorBoundary>
    <PaymentProvider>
      <ScrollToTop />
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#363636', color: '#fff' } }} />
    </PaymentProvider>
  </RouteErrorBoundary>
);

export default App;