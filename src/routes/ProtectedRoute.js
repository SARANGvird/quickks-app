// src/components/ProtectedRoute.jsx
// ================================================================
// 🚀 PRODUCTION-GRADE PROTECTED ROUTE - v3.0 ENTERPRISE
// ================================================================
// 
// FEATURES:
// ✅ Role-based access control (RBAC)
// ✅ Session management with automatic expiry
// ✅ Multiple role support (PROVIDER ↔ SERVICE_PROVIDER)
// ✅ Comprehensive error handling
// ✅ Analytics integration
// ✅ Accessibility (WCAG 2.1 AA)
// ✅ Performance optimized with memoization
// ✅ Type-safe with PropTypes
// ✅ Complete test coverage ready
// ================================================================

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import PropTypes from "prop-types";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  CircularProgress,
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  Avatar,
  Stack,
  Divider,
  Fade,
  Zoom,
  LinearProgress,
  Skeleton,
} from "@mui/material";
import {
  FaExclamationTriangle,
  FaHome,
  FaSignOutAlt,
  FaLock,
  FaArrowLeft,
  FaUserShield,
  FaClock,
  FaKey,
  FaShieldAlt,
} from "react-icons/fa";

// ================================================================
// CONSTANTS & CONFIGURATION
// ================================================================

/**
 * Role to route mapping for redirects
 */
const ROLE_ROUTES = {
  CUSTOMER: "/customer/dashboard",
  PROVIDER: "/provider/dashboard",
  SERVICE_PROVIDER: "/provider/dashboard",
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
};

/**
 * Role display labels
 */
const ROLE_LABELS = {
  CUSTOMER: "Customer",
  PROVIDER: "Service Provider",
  SERVICE_PROVIDER: "Service Provider",
  ADMIN: "Administrator",
  SUPER_ADMIN: "Super Administrator",
};

/**
 * Role colors for UI indicators
 */
const ROLE_COLORS = {
  CUSTOMER: "#6366f1",
  PROVIDER: "#059669",
  SERVICE_PROVIDER: "#059669",
  ADMIN: "#dc2626",
  SUPER_ADMIN: "#7c3aed",
};

/**
 * Role icons
 */
const ROLE_ICONS = {
  CUSTOMER: "👤",
  PROVIDER: "🔧",
  SERVICE_PROVIDER: "🔧",
  ADMIN: "🛡️",
  SUPER_ADMIN: "⭐",
};

/**
 * Session timeout constants
 */
const SESSION = {
  CHECK_INTERVAL_MS: 30000, // 30 seconds
  EXPIRY_BUFFER_MS: 60000, // 1 minute buffer
  TOKEN_EXPIRY_KEY: "tokenExpiry",
  LAST_ACTIVITY_KEY: "lastActivity",
};

const DEFAULT_REDIRECT = "/login";

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

/**
 * Check if a token is expired
 * @param {string} expiryKey - Key to check in localStorage
 * @param {number} bufferMs - Buffer time in milliseconds
 * @returns {boolean} True if expired
 */
const isTokenExpired = (expiryKey, bufferMs = SESSION.EXPIRY_BUFFER_MS) => {
  try {
    const expiry = localStorage.getItem(expiryKey);
    if (!expiry) return true;
    return Date.now() > parseInt(expiry) + bufferMs;
  } catch {
    return true;
  }
};

/**
 * Update last activity timestamp
 */
const updateLastActivity = () => {
  try {
    localStorage.setItem(
      SESSION.LAST_ACTIVITY_KEY,
      String(Date.now())
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Track analytics events safely
 * @param {string} eventName - Name of the event
 * @param {Object} eventData - Event data payload
 */
const trackAnalytics = (eventName, eventData = {}) => {
  if (typeof window !== "undefined" && window.gtag) {
    try {
      window.gtag("event", eventName, eventData);
    } catch (error) {
      console.debug("Analytics error:", error);
    }
  }
};

// ================================================================
// LOADING SPINNER COMPONENT
// ================================================================

const LoadingSpinner = memo(({ 
  message = "Verifying your credentials...", 
  subMessage = "Please wait while we verify your access" 
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      bgcolor: "#f8fafc",
      px: 3,
    }}
    role="status"
    aria-live="polite"
  >
    <Zoom in timeout={500}>
      <Box sx={{ textAlign: "center" }}>
        <CircularProgress
          size={56}
          thickness={4}
          sx={{
            color: "#6366f1",
            mb: 3,
          }}
          aria-label="Loading"
        />
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ fontWeight: 500, mb: 1 }}
        >
          {message}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ opacity: 0.7 }}
        >
          {subMessage}
        </Typography>
        <LinearProgress
          sx={{
            mt: 3,
            maxWidth: 300,
            mx: "auto",
            width: "100%",
            height: 4,
            borderRadius: 2,
          }}
        />
      </Box>
    </Zoom>
  </Box>
));

LoadingSpinner.propTypes = {
  message: PropTypes.string,
  subMessage: PropTypes.string,
};

LoadingSpinner.displayName = "LoadingSpinner";

// ================================================================
// UNAUTHORIZED PAGE COMPONENT
// ================================================================

const UnauthorizedPage = memo(({
  userRole,
  allowedRoles,
  redirectPath,
  onLogout,
  onGoBack,
}) => {
  const navigate = useNavigate();
  const userRoleDisplay = userRole ? ROLE_LABELS[userRole] || userRole : "Unknown";
  const userRoleIcon = userRole ? ROLE_ICONS[userRole] || "👤" : "👤";
  const userRoleColor = userRole ? ROLE_COLORS[userRole] || "#6366f1" : "#6366f1";

  const handleGoDashboard = () => {
    trackAnalytics("unauthorized_redirect", {
      from: window.location.pathname,
      to: redirectPath,
      role: userRole,
    });
    navigate(redirectPath);
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        p: 3,
      }}
    >
      <Fade in timeout={500}>
        <Paper
          elevation={0}
          sx={{
            maxWidth: 480,
            width: "100%",
            p: { xs: 3, sm: 4 },
            textAlign: "center",
            borderRadius: 4,
            border: "1px solid #e2e8f0",
            bgcolor: "white",
          }}
        >
          {/* Lock Icon */}
          <Box sx={{ mb: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: "#fee2e2",
                mx: "auto",
                mb: 2,
              }}
            >
              <FaLock size={36} color="#dc2626" />
            </Avatar>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "#1e293b",
                mb: 1,
              }}
            >
              Access Denied
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You don't have permission to access this page
            </Typography>
          </Box>

          {/* Role Information */}
          <Stack spacing={2} sx={{ mb: 3 }}>
            <Alert
              severity="info"
              sx={{
                textAlign: "left",
                borderRadius: 2,
                bgcolor: "#eff6ff",
              }}
              icon={<FaShieldAlt />}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Your Role:
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: userRoleColor,
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  <span>{userRoleIcon}</span>
                  {userRoleDisplay}
                </Box>
              </Box>
            </Alert>

            {allowedRoles && allowedRoles.length > 0 && (
              <Alert
                severity="warning"
                sx={{
                  textAlign: "left",
                  borderRadius: 2,
                  bgcolor: "#fffbeb",
                }}
                icon={<FaKey />}
              >
                <AlertTitle sx={{ fontWeight: 600 }}>Required Roles</AlertTitle>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                  {allowedRoles.map((role) => (
                    <Box
                      key={role}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        bgcolor: ROLE_COLORS[role] || "#94a3b8",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      <span>{ROLE_ICONS[role] || "🔑"}</span>
                      {ROLE_LABELS[role] || role}
                    </Box>
                  ))}
                </Box>
              </Alert>
            )}
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* Action Buttons */}
          <Stack spacing={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleGoDashboard}
              startIcon={<FaHome />}
              sx={{
                bgcolor: "#6366f1",
                "&:hover": { bgcolor: "#4f46e5" },
                textTransform: "none",
                borderRadius: 2,
                py: 1.5,
              }}
            >
              Go to Dashboard
            </Button>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={onGoBack}
                startIcon={<FaArrowLeft />}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  py: 1.5,
                }}
              >
                Go Back
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                onClick={onLogout}
                startIcon={<FaSignOutAlt />}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  py: 1.5,
                }}
              >
                Logout
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Fade>
    </Box>
  );
});

UnauthorizedPage.propTypes = {
  userRole: PropTypes.string,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  redirectPath: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
  onGoBack: PropTypes.func.isRequired,
};

UnauthorizedPage.displayName = "UnauthorizedPage";

// ================================================================
// SESSION EXPIRED COMPONENT
// ================================================================

const SessionExpired = memo(({ onLogin }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      bgcolor: "#f8fafc",
      p: 3,
    }}
  >
    <Fade in timeout={500}>
      <Paper
        sx={{
          p: 4,
          textAlign: "center",
          maxWidth: 400,
          borderRadius: 4,
          border: "1px solid #e2e8f0",
          bgcolor: "white",
        }}
      >
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: "#fef3c7",
            mx: "auto",
            mb: 2,
          }}
        >
          <FaClock size={32} color="#d97706" />
        </Avatar>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Session Expired
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your session has expired. Please login again to continue.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          onClick={onLogin}
          sx={{
            bgcolor: "#6366f1",
            "&:hover": { bgcolor: "#4f46e5" },
            textTransform: "none",
            borderRadius: 2,
            py: 1.5,
          }}
        >
          Login Again
        </Button>
      </Paper>
    </Fade>
  </Box>
));

SessionExpired.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

SessionExpired.displayName = "SessionExpired";

// ================================================================
// ✅ MAIN PROTECTED ROUTE COMPONENT
// ================================================================

const ProtectedRoute = ({
  allowedRoles = [],
  children,
  redirectTo = DEFAULT_REDIRECT,
  requireAuth = true,
  showUnauthorized = true,
  requireVerified = true,
  requireActive = true,
}) => {
  // ================================================================
  // HOOKS
  // ================================================================

  const { user, token, loading, isAuthenticated, logout, refreshAuth } =
    useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ================================================================
  // STATE
  // ================================================================

  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // ================================================================
  // REFS
  // ================================================================

  const activityIntervalRef = useRef(null);
  const sessionCheckRef = useRef(null);

  // ================================================================
  // MEMOIZED VALUES
  // ================================================================

  /**
   * Check if user is properly authenticated
   */
  const isUserAuthenticated = useMemo(() => {
    if (!requireAuth) return true;
    if (!isAuthenticated || !token) return false;
    if (sessionExpired) return false;
    if (requireVerified && user && !user.isVerified) return false;
    if (requireActive && user && user.isActive === false) return false;
    return true;
  }, [
    requireAuth,
    isAuthenticated,
    token,
    sessionExpired,
    requireVerified,
    requireActive,
    user,
  ]);

  /**
   * Check if user has required role
   */
  const hasRequiredRole = useMemo(() => {
    if (allowedRoles.length === 0) return true;
    if (!user?.role) return false;

    // Super Admin has access to everything
    if (user.role === "SUPER_ADMIN") return true;

    const userRole = user.role.toUpperCase();

    return allowedRoles.some((role) => {
      const normalizedRole = role.toUpperCase();
      // Handle PROVIDER ↔ SERVICE_PROVIDER mapping
      if (normalizedRole === "PROVIDER" && userRole === "SERVICE_PROVIDER")
        return true;
      if (normalizedRole === "SERVICE_PROVIDER" && userRole === "PROVIDER")
        return true;
      return userRole === normalizedRole;
    });
  }, [allowedRoles, user?.role]);

  /**
   * Determine redirect path based on user role
   */
  const redirectPath = useMemo(() => {
    if (!user?.role) return redirectTo;
    return ROLE_ROUTES[user.role] || redirectTo;
  }, [user?.role, redirectTo]);

  // ================================================================
  // CALLBACKS
  // ================================================================

  /**
   * Handle session expiry check
   */
  const checkSessionExpiry = useCallback(() => {
    try {
      const expiry = localStorage.getItem(SESSION.TOKEN_EXPIRY_KEY);
      if (expiry && Date.now() > parseInt(expiry) + SESSION.EXPIRY_BUFFER_MS) {
        setSessionExpired(true);
        setAuthChecked(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Session check failed:", error);
      return true;
    }
  }, []);

  /**
   * Check inactivity timeout
   */
  const checkInactivity = useCallback(() => {
    try {
      const lastActive = localStorage.getItem(SESSION.LAST_ACTIVITY_KEY);
      if (lastActive) {
        const inactiveTime = Date.now() - parseInt(lastActive);
        // 30 minutes inactivity timeout
        if (inactiveTime > 30 * 60 * 1000) {
          setSessionExpired(true);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  /**
   * Refresh session - update last activity
   */
  const refreshSession = useCallback(() => {
    updateLastActivity();
    setLastActivity(Date.now());
  }, []);

  /**
   * Handle login redirect
   */
  const handleLogin = useCallback(() => {
    const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(
      location.pathname
    )}`;
    navigate(redirectUrl, { state: { from: location } });
  }, [navigate, redirectTo, location]);

  /**
   * Handle logout
   */
  const handleLogout = useCallback(async () => {
    trackAnalytics("logout", {
      user_id: user?.id,
      user_role: user?.role,
      page_path: location.pathname,
    });
    await logout();
    navigate(redirectTo);
  }, [logout, navigate, redirectTo, user, location]);

  /**
   * Handle go back
   */
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // ================================================================
  // EFFECTS
  // ================================================================

  /**
   * Session management - Check expiry and inactivity
   */
  useEffect(() => {
    if (!requireAuth) {
      setAuthChecked(true);
      setCheckingSession(false);
      return;
    }

    // Initial check
    const isExpired = checkSessionExpiry() || checkInactivity();
    if (isExpired) {
      setSessionExpired(true);
      setAuthChecked(true);
      setCheckingSession(false);
      return;
    }

    // Set up periodic checks
    sessionCheckRef.current = setInterval(() => {
      if (checkSessionExpiry() || checkInactivity()) {
        setSessionExpired(true);
        setAuthChecked(true);
      }
    }, SESSION.CHECK_INTERVAL_MS);

    // Set up activity tracking
    const handleActivity = () => {
      refreshSession();
    };

    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);

    setAuthChecked(true);
    setCheckingSession(false);

    return () => {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [requireAuth, checkSessionExpiry, checkInactivity, refreshSession]);

  /**
   * Track page views for authenticated users
   */
  useEffect(() => {
    if (isUserAuthenticated && user && authChecked) {
      trackAnalytics("page_view", {
        page_title: document.title,
        page_location: window.location.href,
        page_path: location.pathname,
        user_role: user.role,
        user_id: user.id,
      });
    }
  }, [location.pathname, isUserAuthenticated, user, authChecked]);

  /**
   * Refresh session on user activity
   */
  useEffect(() => {
    const handleUserActivity = () => {
      if (isUserAuthenticated) {
        refreshSession();
      }
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keypress", handleUserActivity);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keypress", handleUserActivity);
    };
  }, [isUserAuthenticated, refreshSession]);

  // ================================================================
  // LOADING STATE
  // ================================================================

  if (loading || checkingSession || !authChecked) {
    return (
      <LoadingSpinner
        message={checkingSession ? "Checking session..." : "Verifying credentials..."}
        subMessage={checkingSession ? "Please wait" : "Please wait while we verify your access"}
      />
    );
  }

  // ================================================================
  // PUBLIC ROUTE (No auth required)
  // ================================================================

  if (!requireAuth) {
    return children || <Outlet />;
  }

  // ================================================================
  // SESSION EXPIRED
  // ================================================================

  if (sessionExpired) {
    return <SessionExpired onLogin={handleLogin} />;
  }

  // ================================================================
  // NOT AUTHENTICATED
  // ================================================================

  if (!isUserAuthenticated) {
    trackAnalytics("unauthenticated_access", {
      path: location.pathname,
      redirect_to: redirectTo,
    });
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // ================================================================
  // UNAUTHORIZED (Role Mismatch)
  // ================================================================

  if (!hasRequiredRole) {
    trackAnalytics("unauthorized_access", {
      user_id: user?.id,
      user_role: user?.role,
      required_roles: allowedRoles,
      page_path: location.pathname,
    });

    if (showUnauthorized && allowedRoles.length > 0) {
      return (
        <UnauthorizedPage
          userRole={user?.role}
          allowedRoles={allowedRoles}
          redirectPath={redirectPath}
          onLogout={handleLogout}
          onGoBack={handleGoBack}
        />
      );
    }

    return <Navigate to={redirectPath} replace />;
  }

  // ================================================================
  // ✅ RENDER PROTECTED CONTENT
  // ================================================================

  return children || <Outlet />;
};

// ================================================================
// PROP TYPES
// ================================================================

ProtectedRoute.propTypes = {
  /** Array of roles allowed to access this route */
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  /** Child elements to render */
  children: PropTypes.node,
  /** Redirect path for unauthenticated users */
  redirectTo: PropTypes.string,
  /** Whether authentication is required */
  requireAuth: PropTypes.bool,
  /** Whether to show unauthorized page or redirect */
  showUnauthorized: PropTypes.bool,
  /** Whether user must be verified */
  requireVerified: PropTypes.bool,
  /** Whether user must be active */
  requireActive: PropTypes.bool,
};

ProtectedRoute.defaultProps = {
  allowedRoles: [],
  children: null,
  redirectTo: DEFAULT_REDIRECT,
  requireAuth: true,
  showUnauthorized: true,
  requireVerified: true,
  requireActive: true,
};

ProtectedRoute.displayName = "ProtectedRoute";

// ================================================================
// HIGHER-ORDER COMPONENT
// ================================================================

/**
 * HOC to protect a component with role-based access
 * @param {Component} Component - Component to protect
 * @param {Object} options - Protection options
 * @returns {Component} Protected component
 */
export const withProtection = (Component, options = {}) => {
  const ProtectedComponent = (props) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  ProtectedComponent.displayName = `withProtection(${
    Component.displayName || Component.name || "Component"
  })`;

  return ProtectedComponent;
};

// ================================================================
// PERMISSION HOOK
// ================================================================

/**
 * Hook for checking permissions in components
 * @returns {Object} Permission utilities
 */
export const usePermission = () => {
  const { user, isAuthenticated, logout } = useAuth();

  const hasRole = useCallback(
    (role) => {
      if (!isAuthenticated || !user) return false;
      if (user.role === "SUPER_ADMIN") return true;

      const userRole = user.role.toUpperCase();
      const normalizedRole = role.toUpperCase();

      if (normalizedRole === "PROVIDER" && userRole === "SERVICE_PROVIDER")
        return true;
      if (normalizedRole === "SERVICE_PROVIDER" && userRole === "PROVIDER")
        return true;

      return userRole === normalizedRole;
    },
    [isAuthenticated, user]
  );

  const hasAnyRole = useCallback(
    (roles) => {
      if (!isAuthenticated || !user) return false;
      if (user.role === "SUPER_ADMIN") return true;

      const userRole = user.role.toUpperCase();
      return roles.some((role) => {
        const normalizedRole = role.toUpperCase();
        if (normalizedRole === "PROVIDER" && userRole === "SERVICE_PROVIDER")
          return true;
        if (normalizedRole === "SERVICE_PROVIDER" && userRole === "PROVIDER")
          return true;
        return userRole === normalizedRole;
      });
    },
    [isAuthenticated, user]
  );

  const hasAllRoles = useCallback(
    (roles) => {
      if (!isAuthenticated || !user) return false;
      if (user.role === "SUPER_ADMIN") return true;

      const userRole = user.role.toUpperCase();
      return roles.every((role) => {
        const normalizedRole = role.toUpperCase();
        if (normalizedRole === "PROVIDER" && userRole === "SERVICE_PROVIDER")
          return true;
        if (normalizedRole === "SERVICE_PROVIDER" && userRole === "PROVIDER")
          return true;
        return userRole === normalizedRole;
      });
    },
    [isAuthenticated, user]
  );

  const isCustomer = hasRole("CUSTOMER");
  const isProvider = hasRole("PROVIDER") || hasRole("SERVICE_PROVIDER");
  const isAdmin = hasRole("ADMIN") || hasRole("SUPER_ADMIN");
  const isSuperAdmin = hasRole("SUPER_ADMIN");

  return {
    user,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isCustomer,
    isProvider,
    isAdmin,
    isSuperAdmin,
    role: user?.role,
    logout,
  };
};

// ================================================================
// ROLE-BASED ROUTE COMPONENTS
// ================================================================

/** Admin only route */
export const AdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
    {children}
  </ProtectedRoute>
);

AdminRoute.propTypes = {
  children: PropTypes.node,
};

/** Provider only route */
export const ProviderRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={["PROVIDER", "SERVICE_PROVIDER"]}>
    {children}
  </ProtectedRoute>
);

ProviderRoute.propTypes = {
  children: PropTypes.node,
};

/** Customer only route */
export const CustomerRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={["CUSTOMER"]}>
    {children}
  </ProtectedRoute>
);

CustomerRoute.propTypes = {
  children: PropTypes.node,
};

/** Super Admin only route */
export const SuperAdminRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
    {children}
  </ProtectedRoute>
);

SuperAdminRoute.propTypes = {
  children: PropTypes.node,
};

/** Public route - no auth required */
export const PublicRoute = ({ children }) => (
  <ProtectedRoute requireAuth={false}>{children}</ProtectedRoute>
);

PublicRoute.propTypes = {
  children: PropTypes.node,
};

// ================================================================
// ROUTE CONSTANTS
// ================================================================

export const ROUTES = {
  CUSTOMER_DASHBOARD: "/customer/dashboard",
  PROVIDER_DASHBOARD: "/provider/dashboard",
  ADMIN_DASHBOARD: "/admin/dashboard",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  BOOKING: "/booking",
  BOOKINGS: "/bookings",
  NOTIFICATIONS: "/notifications",
};

// ================================================================
// DEFAULT EXPORT
// ================================================================

export default ProtectedRoute;