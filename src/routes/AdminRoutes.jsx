// src/routes/AdminRoutes.jsx
// ✅ COMPLETE PRODUCTION-LEVEL ADMIN ROUTES - META ENGINEERING v2.0
// ✅ OPTIMIZED: Memoized guards, better error handling, performance optimized

import React, { Suspense, lazy, useEffect, useCallback, useMemo } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { trackPageView, trackEvent } from "../utils/analytics";

// ==========================================================
// LAZY LOADING WITH ERROR BOUNDARY
// ==========================================================

// Layout & Core Pages
const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const ProvidersPage = lazy(() => import("../pages/admin/ProvidersPage"));
const StrikesPage = lazy(() => import("../pages/admin/StrikesPage"));

// User Management
const UsersPage = lazy(() => import("../pages/admin/UsersPage"));

// Booking Management
const BookingsPage = lazy(() => import("../pages/admin/BookingsPage"));

// Finance & Revenue
const RevenuePage = lazy(() => import("../pages/admin/RevenuePage"));

// Analytics & Reports
const AnalyticsPage = lazy(() => import("../pages/admin/AnalyticsPage"));
const ReportsPage = lazy(() => import("../pages/admin/ReportsPage"));

// Support & Complaints
const ComplaintsPage = lazy(() => import("../pages/admin/ComplaintsPage"));
const SupportTicketsPage = lazy(() => import("../pages/admin/SupportTicketsPage"));

// System Management
const SettingsPage = lazy(() => import("../pages/admin/SettingsPage"));
const NotificationsPage = lazy(() => import("../pages/admin/NotificationsPage"));
const AuditLogsPage = lazy(() => import("../pages/admin/AuditLogsPage"));
const SystemHealthPage = lazy(() => import("../pages/admin/SystemHealthPage"));
const BackupPage = lazy(() => import("../pages/admin/BackupPage"));

// Role & Permission Management (Super Admin only)
const RolesPage = lazy(() => import("../pages/admin/RolesPage"));
const PermissionsPage = lazy(() => import("../pages/admin/PermissionsPage"));

// ==========================================================
// LOADING COMPONENT WITH SKELETON
// ==========================================================
const PageLoader = React.memo(() => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }}>
    <div style={{
      padding: '30px 50px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      textAlign: 'center',
      animation: 'fadeInUp 0.5s ease-out'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <h3 style={{ margin: 0, color: '#333', fontSize: '20px' }}>Loading Admin Panel</h3>
      <p style={{ margin: '10px 0 0', color: '#666', fontSize: '14px' }}>
        Please wait while we prepare your dashboard...
      </p>
    </div>
  </div>
));

PageLoader.displayName = 'PageLoader';

// ==========================================================
// ✅ OPTIMIZED: ERROR BOUNDARY COMPONENT
// ==========================================================
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.navigate = props.navigate || (() => {});
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route Error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // ✅ Safe analytics tracking
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.trackError('route_error', {
        error: error.message,
        path: window.location.pathname
      });
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    if (this.navigate) {
      this.navigate('/admin/dashboard');
    } else {
      window.location.href = '/admin/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f5f5f5'
        }}>
          <div style={{
            padding: '40px',
            background: 'white',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h1 style={{ fontSize: '48px', margin: 0, color: '#ef4444' }}>⚠️</h1>
            <h2 style={{ margin: '20px 0', color: '#333' }}>Something Went Wrong</h2>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              An error occurred while loading this page. Please try refreshing or contact support if the issue persists.
            </p>
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={this.handleRefresh}
                style={{
                  padding: '10px 30px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginRight: '10px'
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleGoDashboard}
                style={{
                  padding: '10px 30px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Go to Dashboard
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#ef4444' }}>Error Details</summary>
                <pre style={{ fontSize: '12px', marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px', overflow: 'auto' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ==========================================================
// ✅ OPTIMIZED: FORBIDDEN COMPONENT
// ==========================================================
const ForbiddenPage = React.memo(() => {
  const navigate = useNavigate();
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        padding: '40px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        textAlign: 'center',
        maxWidth: '500px',
        animation: 'fadeInUp 0.5s ease-out'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
        <h1 style={{ fontSize: '48px', margin: 0, color: '#ef4444' }}>403</h1>
        <h2 style={{ margin: '20px 0', color: '#333' }}>Access Forbidden</h2>
        <p style={{ color: '#666', lineHeight: '1.6' }}>
          You don't have permission to access this page. 
          This area is restricted to authorized administrators only.
        </p>
        <div style={{ 
          background: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '8px', 
          margin: '20px 0',
          fontSize: '14px',
          color: '#666'
        }}>
          <strong>Required Access Level:</strong> Admin or Super Admin
        </div>
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 30px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
});

ForbiddenPage.displayName = 'ForbiddenPage';

// ==========================================================
// ✅ OPTIMIZED: NOT FOUND COMPONENT
// ==========================================================
const NotFoundPage = React.memo(() => {
  const navigate = useNavigate();
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f5f5f5'
    }}>
      <div style={{
        padding: '40px',
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{ fontSize: '48px', margin: 0, color: '#667eea' }}>404</h1>
        <h2 style={{ margin: '20px 0', color: '#333' }}>Page Not Found</h2>
        <p style={{ color: '#666', lineHeight: '1.6' }}>
          The admin page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{
            marginTop: '20px',
            padding: '10px 30px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
});

NotFoundPage.displayName = 'NotFoundPage';

// ==========================================================
// ✅ OPTIMIZED: ADMIN GUARD COMPONENT WITH ENHANCED SECURITY
// ==========================================================
const AdminGuard = React.memo(({ 
  children, 
  requiredPermissions = [], 
  requiredRoles = [], 
  redirectTo = '/login' 
}) => {
  const { 
    user, 
    loading, 
    isAuthenticated, 
    hasRole, 
    hasAnyRole, 
    hasAllRoles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    logout 
  } = useAuth();
  
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  // ✅ OPTIMIZED: Memoized role check functions
  const checkHasAllRoles = useCallback((roles) => {
    if (typeof hasAllRoles === 'function') {
      return hasAllRoles(roles);
    }
    if (typeof hasAnyRole === 'function') {
      return hasAnyRole(roles);
    }
    return false;
  }, [hasAllRoles, hasAnyRole]);

  const checkHasAllPermissions = useCallback((permissions) => {
    if (typeof hasAllPermissions === 'function') {
      return hasAllPermissions(permissions);
    }
    if (typeof hasAnyPermission === 'function') {
      return hasAnyPermission(permissions);
    }
    return false;
  }, [hasAllPermissions, hasAnyPermission]);

  // ✅ OPTIMIZED: Memoized admin check
  const isAdmin = useMemo(() => {
    if (typeof hasRole === 'function') {
      return hasRole('ADMIN') || hasRole('SUPER_ADMIN');
    }
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  }, [hasRole, user?.role]);

  // ✅ OPTIMIZED: Memoized role requirements check
  const hasRequiredRoles = useMemo(() => {
    if (requiredRoles.length === 0) return true;
    return checkHasAllRoles(requiredRoles);
  }, [requiredRoles, checkHasAllRoles]);

  // ✅ OPTIMIZED: Memoized permission requirements check
  const hasRequiredPermissions = useMemo(() => {
    if (requiredPermissions.length === 0) return true;
    return checkHasAllPermissions(requiredPermissions);
  }, [requiredPermissions, checkHasAllPermissions]);

  // Track page view for analytics
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      trackPageView(location.pathname);
    }
  }, [location.pathname, loading, isAuthenticated, user]);

  // Show loading state
  if (loading) {
    return <PageLoader />;
  }

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    console.warn("🚫 Unauthorized access attempt to Admin Panel:", location.pathname);
    
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('redirectAfterLogin', location.pathname);
    }
    
    if (addNotification) {
      addNotification({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Please login to access the admin panel'
      });
    }
    
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check if user has admin role
  if (!isAdmin) {
    console.warn("🚫 Non-admin user attempted to access Admin Panel:", {
      userId: user.id,
      email: user.email,
      role: user.role,
      path: location.pathname
    });
    
    if (addNotification) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have administrator privileges'
      });
    }
    
    if (typeof trackEvent === 'function') {
      trackEvent('unauthorized_admin_access', {
        userId: user.id,
        role: user.role,
        path: location.pathname
      });
    }
    
    return <ForbiddenPage />;
  }

  // Check for specific role requirements
  if (!hasRequiredRoles) {
    console.warn("🚫 User missing required roles:", {
      userRoles: user.role,
      required: requiredRoles,
      path: location.pathname
    });
    
    if (addNotification) {
      addNotification({
        type: 'error',
        title: 'Insufficient Permissions',
        message: `You need the following roles: ${requiredRoles.join(', ')}`
      });
    }
    
    return <ForbiddenPage />;
  }

  // Check for permission requirements
  if (!hasRequiredPermissions) {
    console.warn("🚫 User missing required permissions:", {
      userPermissions: user.permissions || [],
      required: requiredPermissions,
      path: location.pathname
    });
    
    if (addNotification) {
      addNotification({
        type: 'error',
        title: 'Insufficient Permissions',
        message: `You need additional permissions to access this page`
      });
    }
    
    return <ForbiddenPage />;
  }

  // Check if session is expired
  if (typeof localStorage !== 'undefined') {
    const sessionExpiry = localStorage.getItem('sessionExpiry');
    if (sessionExpiry && Date.now() > parseInt(sessionExpiry)) {
      console.warn("⚠️ Admin session expired");
      if (typeof logout === 'function') {
        logout();
      }
      if (addNotification) {
        addNotification({
          type: 'warning',
          title: 'Session Expired',
          message: 'Your session has expired. Please login again.'
        });
      }
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
  }

  // Log successful access (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log("✅ Admin access granted:", {
      userId: user.id,
      email: user.email,
      role: user.role,
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
  }

  return children;
});

AdminGuard.displayName = 'AdminGuard';

// ==========================================================
// ✅ OPTIMIZED: LAZY LOAD WRAPPER WITH ERROR BOUNDARY
// ==========================================================
const LazyLoadWrapper = React.memo(({ children }) => {
  const navigate = useNavigate();
  
  return (
    <RouteErrorBoundary navigate={navigate}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
});

LazyLoadWrapper.displayName = 'LazyLoadWrapper';

// ==========================================================
// ✅ OPTIMIZED: MAIN ADMIN ROUTES COMPONENT
// ==========================================================
const AdminRoutes = React.memo(() => {
  const location = useLocation();
  
  // Track route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <LazyLoadWrapper>
      <Routes>
        {/* Main Admin Layout with nested routes */}
        <Route
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          {/* Dashboard Routes */}
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="" element={<Navigate to="dashboard" replace />} />
          
          {/* User Management */}
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UsersPage />} />
          <Route path="users/:id/edit" element={<UsersPage />} />
          
          {/* Provider Management */}
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="providers/:id" element={<ProvidersPage />} />
          <Route path="providers/:id/edit" element={<ProvidersPage />} />
          <Route path="providers/pending" element={<ProvidersPage />} />
          <Route path="providers/verified" element={<ProvidersPage />} />
          <Route path="providers/suspended" element={<ProvidersPage />} />
          <Route path="providers/rejected" element={<ProvidersPage />} />
          
          {/* Booking Management */}
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingsPage />} />
          <Route path="bookings/active" element={<BookingsPage />} />
          <Route path="bookings/completed" element={<BookingsPage />} />
          <Route path="bookings/cancelled" element={<BookingsPage />} />
          <Route path="bookings/pending" element={<BookingsPage />} />
          
          {/* Revenue & Finance */}
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="revenue/transactions" element={<RevenuePage />} />
          <Route path="revenue/payouts" element={<RevenuePage />} />
          <Route path="revenue/refunds" element={<RevenuePage />} />
          <Route path="revenue/summary" element={<RevenuePage />} />
          
          {/* Analytics & Reports */}
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="analytics/users" element={<AnalyticsPage />} />
          <Route path="analytics/bookings" element={<AnalyticsPage />} />
          <Route path="analytics/revenue" element={<AnalyticsPage />} />
          <Route path="analytics/providers" element={<AnalyticsPage />} />
          
          {/* Reports */}
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/generate" element={<ReportsPage />} />
          <Route path="reports/scheduled" element={<ReportsPage />} />
          <Route path="reports/templates" element={<ReportsPage />} />
          
          {/* Complaints & Support */}
          <Route path="complaints" element={<ComplaintsPage />} />
          <Route path="complaints/:id" element={<ComplaintsPage />} />
          <Route path="complaints/open" element={<ComplaintsPage />} />
          <Route path="complaints/resolved" element={<ComplaintsPage />} />
          <Route path="complaints/escalated" element={<ComplaintsPage />} />
          
          {/* Support Tickets */}
          <Route path="support-tickets" element={<SupportTicketsPage />} />
          <Route path="support-tickets/:id" element={<SupportTicketsPage />} />
          <Route path="support-tickets/open" element={<SupportTicketsPage />} />
          <Route path="support-tickets/closed" element={<SupportTicketsPage />} />
          
          {/* Strike Management */}
          <Route path="strikes" element={<StrikesPage />} />
          <Route path="strikes/providers" element={<StrikesPage />} />
          <Route path="strikes/users" element={<StrikesPage />} />
          <Route path="strikes/:id" element={<StrikesPage />} />
          <Route path="strikes/appeals" element={<StrikesPage />} />
          
          {/* System Management */}
          <Route path="system-health" element={<SystemHealthPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="audit-logs/:id" element={<AuditLogsPage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="backup/restore" element={<BackupPage />} />
          <Route path="backup/schedule" element={<BackupPage />} />
          
          {/* Role & Permission Management (Super Admin only) */}
          <Route
            path="roles"
            element={
              <AdminGuard requiredRoles={['SUPER_ADMIN']}>
                <RolesPage />
              </AdminGuard>
            }
          />
          <Route
            path="roles/:id"
            element={
              <AdminGuard requiredRoles={['SUPER_ADMIN']}>
                <RolesPage />
              </AdminGuard>
            }
          />
          <Route
            path="permissions"
            element={
              <AdminGuard requiredRoles={['SUPER_ADMIN']}>
                <PermissionsPage />
              </AdminGuard>
            }
          />
          
          {/* Notifications */}
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="notifications/:id" element={<NotificationsPage />} />
          <Route path="notifications/settings" element={<NotificationsPage />} />
          <Route path="notifications/templates" element={<NotificationsPage />} />
          
          {/* Settings */}
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/general" element={<SettingsPage />} />
          <Route path="settings/security" element={<SettingsPage />} />
          <Route path="settings/email" element={<SettingsPage />} />
          <Route path="settings/integrations" element={<SettingsPage />} />
          <Route path="settings/api" element={<SettingsPage />} />
          <Route path="settings/notifications" element={<SettingsPage />} />
          <Route path="settings/branding" element={<SettingsPage />} />
          
          {/* Profile & Account */}
          <Route path="profile" element={<SettingsPage />} />
          <Route path="change-password" element={<SettingsPage />} />
          <Route path="two-factor" element={<SettingsPage />} />
          <Route path="sessions" element={<SettingsPage />} />
          
          {/* Catch-all route for admin - show 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </LazyLoadWrapper>
  );
});

AdminRoutes.displayName = 'AdminRoutes';

// ==========================================================
// ✅ EXPORT ROUTE CONSTANTS FOR EASY REFERENCE
// ==========================================================
export const ADMIN_ROUTES = {
  // Dashboard
  DASHBOARD: '/admin/dashboard',
  
  // Users
  USERS: '/admin/users',
  USERS_DETAIL: (id) => `/admin/users/${id}`,
  USERS_EDIT: (id) => `/admin/users/${id}/edit`,
  
  // Providers
  PROVIDERS: '/admin/providers',
  PROVIDERS_DETAIL: (id) => `/admin/providers/${id}`,
  PROVIDERS_EDIT: (id) => `/admin/providers/${id}/edit`,
  PROVIDERS_PENDING: '/admin/providers/pending',
  PROVIDERS_VERIFIED: '/admin/providers/verified',
  PROVIDERS_SUSPENDED: '/admin/providers/suspended',
  PROVIDERS_REJECTED: '/admin/providers/rejected',
  
  // Bookings
  BOOKINGS: '/admin/bookings',
  BOOKINGS_DETAIL: (id) => `/admin/bookings/${id}`,
  BOOKINGS_ACTIVE: '/admin/bookings/active',
  BOOKINGS_COMPLETED: '/admin/bookings/completed',
  BOOKINGS_CANCELLED: '/admin/bookings/cancelled',
  BOOKINGS_PENDING: '/admin/bookings/pending',
  
  // Revenue
  REVENUE: '/admin/revenue',
  REVENUE_TRANSACTIONS: '/admin/revenue/transactions',
  REVENUE_PAYOUTS: '/admin/revenue/payouts',
  REVENUE_REFUNDS: '/admin/revenue/refunds',
  REVENUE_SUMMARY: '/admin/revenue/summary',
  
  // Analytics
  ANALYTICS: '/admin/analytics',
  ANALYTICS_USERS: '/admin/analytics/users',
  ANALYTICS_BOOKINGS: '/admin/analytics/bookings',
  ANALYTICS_REVENUE: '/admin/analytics/revenue',
  ANALYTICS_PROVIDERS: '/admin/analytics/providers',
  
  // Reports
  REPORTS: '/admin/reports',
  REPORTS_GENERATE: '/admin/reports/generate',
  REPORTS_SCHEDULED: '/admin/reports/scheduled',
  REPORTS_TEMPLATES: '/admin/reports/templates',
  
  // Complaints
  COMPLAINTS: '/admin/complaints',
  COMPLAINTS_DETAIL: (id) => `/admin/complaints/${id}`,
  COMPLAINTS_OPEN: '/admin/complaints/open',
  COMPLAINTS_RESOLVED: '/admin/complaints/resolved',
  COMPLAINTS_ESCALATED: '/admin/complaints/escalated',
  
  // Support
  SUPPORT_TICKETS: '/admin/support-tickets',
  SUPPORT_TICKETS_DETAIL: (id) => `/admin/support-tickets/${id}`,
  SUPPORT_TICKETS_OPEN: '/admin/support-tickets/open',
  SUPPORT_TICKETS_CLOSED: '/admin/support-tickets/closed',
  
  // Strikes
  STRIKES: '/admin/strikes',
  STRIKES_PROVIDERS: '/admin/strikes/providers',
  STRIKES_USERS: '/admin/strikes/users',
  STRIKES_DETAIL: (id) => `/admin/strikes/${id}`,
  STRIKES_APPEALS: '/admin/strikes/appeals',
  
  // System
  SYSTEM_HEALTH: '/admin/system-health',
  AUDIT_LOGS: '/admin/audit-logs',
  AUDIT_LOGS_DETAIL: (id) => `/admin/audit-logs/${id}`,
  BACKUP: '/admin/backup',
  BACKUP_RESTORE: '/admin/backup/restore',
  BACKUP_SCHEDULE: '/admin/backup/schedule',
  
  // Roles & Permissions
  ROLES: '/admin/roles',
  ROLES_DETAIL: (id) => `/admin/roles/${id}`,
  PERMISSIONS: '/admin/permissions',
  
  // Notifications
  NOTIFICATIONS: '/admin/notifications',
  NOTIFICATIONS_DETAIL: (id) => `/admin/notifications/${id}`,
  NOTIFICATIONS_SETTINGS: '/admin/notifications/settings',
  NOTIFICATIONS_TEMPLATES: '/admin/notifications/templates',
  
  // Settings
  SETTINGS: '/admin/settings',
  SETTINGS_GENERAL: '/admin/settings/general',
  SETTINGS_SECURITY: '/admin/settings/security',
  SETTINGS_EMAIL: '/admin/settings/email',
  SETTINGS_INTEGRATIONS: '/admin/settings/integrations',
  SETTINGS_API: '/admin/settings/api',
  SETTINGS_NOTIFICATIONS: '/admin/settings/notifications',
  SETTINGS_BRANDING: '/admin/settings/branding',
  
  // Profile
  PROFILE: '/admin/profile',
  CHANGE_PASSWORD: '/admin/change-password',
  TWO_FACTOR: '/admin/two-factor',
  SESSIONS: '/admin/sessions',
  
  // Helper function to check if path is admin route
  isAdminRoute: (path) => path?.startsWith('/admin'),
  
  // Helper function to get route title
  getRouteTitle: (path) => {
    const titles = {
      '/admin/dashboard': 'Admin Dashboard',
      '/admin/users': 'User Management',
      '/admin/providers': 'Provider Management',
      '/admin/bookings': 'Booking Management',
      '/admin/revenue': 'Revenue Overview',
      '/admin/analytics': 'Analytics Dashboard',
      '/admin/reports': 'Reports Center',
      '/admin/complaints': 'Complaints Management',
      '/admin/support-tickets': 'Support Tickets',
      '/admin/strikes': 'Strike Management',
      '/admin/system-health': 'System Health',
      '/admin/audit-logs': 'Audit Logs',
      '/admin/backup': 'Backup Management',
      '/admin/roles': 'Role Management',
      '/admin/permissions': 'Permission Management',
      '/admin/notifications': 'Notifications',
      '/admin/settings': 'System Settings',
      '/admin/profile': 'My Profile'
    };
    return titles[path] || 'Admin Panel';
  }
};

export default AdminRoutes;