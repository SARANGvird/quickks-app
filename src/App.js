// src/App.js - Complete Fixed Version

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketProvider';
import { PaymentProvider } from './contexts/PaymentContext';
import ProtectedRoute from './routes/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import HomePage from './pages/HomePage';

// Lazy load pages - FIX: Use correct paths
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const CustomerDashboard = lazy(() => import('./pages/Customer/CustomerDashboard'));
const ProviderDashboard = lazy(() => import('./pages/Provider/ProviderDashboard'));
const ProviderProfile = lazy(() => import('./pages/Provider/ProviderProfile'));
const ProviderForm = lazy(() => import('./pages/Provider/ProviderForm'));
const ProviderMyBookings = lazy(() => import('./pages/Provider/ProviderMyBookings'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentFailed = lazy(() => import('./pages/PaymentFailed'));
const BookingForm = lazy(() => import('./components/BookingForm'));

// Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// App Routes Component
const AppRoutes = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/booking" element={<BookingForm />} />
        
        {/* Payment Routes */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failed" element={<PaymentFailed />} />

        {/* Customer Routes */}
        <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        </Route>

        {/* Provider Routes */}
        <Route element={<ProtectedRoute allowedRoles={['PROVIDER']} />}>
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/provider/profile" element={<ProviderProfile />} />
          <Route path="/provider/profile/edit" element={<ProviderForm />} />
          <Route path="/provider/bookings" element={<ProviderMyBookings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

// Main App
const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <WebSocketProvider>
              <PaymentProvider>
                <ScrollToTop />
                <AppRoutes />
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
                {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
              </PaymentProvider>
            </WebSocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;