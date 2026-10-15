// src/components/ProtectedRoute.jsx - v18 PROD SENIOR LIGHT - NO THROTTLING
import React, { useMemo } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Box, Typography, Button, Paper, Avatar, Stack, CircularProgress } from "@mui/material";
import { FaLock, FaHome, FaSignOutAlt, FaArrowLeft } from "react-icons/fa";

// Role -> Dashboard map
const ROLE_ROUTES = {
  CUSTOMER: "/customer/dashboard",
  PROVIDER: "/provider/dashboard",
  SERVICE_PROVIDER: "/provider/dashboard",
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
};

const ROLE_LABELS = {
  CUSTOMER: "Customer",
  PROVIDER: "Provider",
  SERVICE_PROVIDER: "Provider",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

// --- LIGHT LOADING ---
const LoadingSpinner = () => (
  <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#f8fafc" }}>
    <CircularProgress size={48} sx={{ color: "#6366f1", mb: 2 }} />
    <Typography variant="body2" color="text.secondary">Verifying access...</Typography>
  </Box>
);

// --- LIGHT UNAUTHORIZED ---
const UnauthorizedPage = ({ userRole, allowedRoles, redirectPath }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "#f8fafc", p: 3 }}>
      <Paper sx={{ maxWidth: 440, width: "100%", p: 4, textAlign: "center", borderRadius: 4, border: "1px solid #e2e8f0" }}>
        <Avatar sx={{ width: 72, height: 72, bgcolor: "#fee2e2", mx: "auto", mb: 2 }}><FaLock size={32} color="#dc2626" /></Avatar>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Access Denied</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your role: <b>{ROLE_LABELS[userRole] || userRole}</b> - Required: <b>{allowedRoles?.join(", ")}</b>
        </Typography>
        <Stack spacing={1.5}>
          <Button fullWidth variant="contained" onClick={() => navigate(redirectPath)} startIcon={<FaHome />} sx={{ bgcolor: "#6366f1", textTransform: "none", borderRadius: 2, py: 1.3 }}>Go to Dashboard</Button>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button fullWidth variant="outlined" onClick={() => navigate(-1)} startIcon={<FaArrowLeft />} sx={{ textTransform: "none", borderRadius: 2 }}>Back</Button>
            <Button fullWidth variant="outlined" color="error" onClick={async () => { await logout(); navigate("/login"); }} startIcon={<FaSignOutAlt />} sx={{ textTransform: "none", borderRadius: 2 }}>Logout</Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

// --- MAIN - SENIOR PROD ---
export default function ProtectedRoute({ allowedRoles = [], redirectTo = "/login" }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();

  // Role check - memoized - SUPER_ADMIN bypass + PROVIDER mapping
  const { hasRole, redirectPath } = useMemo(() => {
    if (!user?.role) return { hasRole: allowedRoles.length === 0, redirectPath: redirectTo };
    const userRole = user.role.toUpperCase();
    if (userRole === "SUPER_ADMIN") return { hasRole: true, redirectPath: ROLE_ROUTES[userRole] || "/" };
    if (allowedRoles.length === 0) return { hasRole: true, redirectPath: ROLE_ROUTES[userRole] || "/" };
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
    const match = normalizedAllowed.some(r => {
      if (r === "PROVIDER" && (userRole === "PROVIDER" || userRole === "SERVICE_PROVIDER")) return true;
      if (r === "SERVICE_PROVIDER" && (userRole === "PROVIDER" || userRole === "SERVICE_PROVIDER")) return true;
      return r === userRole;
    });
    return { hasRole: match, redirectPath: ROLE_ROUTES[userRole] || redirectTo };
  }, [user?.role, allowedRoles, redirectTo]);

  if (loading) return <LoadingSpinner />;

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role mismatch
  if (!hasRole) {
    return <UnauthorizedPage userRole={user?.role} allowedRoles={allowedRoles} redirectPath={redirectPath} />;
  }

  return <Outlet />;
}

// --- Hooks for components ---
export const usePermission = () => {
  const { user, isAuthenticated } = useAuth();
  const hasRole = (role) => {
    if (!isAuthenticated ||!user) return false;
    const ur = user.role?.toUpperCase();
    if (ur === "SUPER_ADMIN") return true;
    const r = role.toUpperCase();
    if (r === "PROVIDER" && (ur === "PROVIDER" || ur === "SERVICE_PROVIDER")) return true;
    if (r === "SERVICE_PROVIDER" && (ur === "PROVIDER" || ur === "SERVICE_PROVIDER")) return true;
    return ur === r;
  };
  return { user, isAuthenticated, hasRole, role: user?.role, isAdmin: hasRole("ADMIN") || hasRole("SUPER_ADMIN"), isProvider: hasRole("PROVIDER"), isCustomer: hasRole("CUSTOMER") };
};

// Shortcuts
export const AdminRoute = ({ children }) => <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>{children}</ProtectedRoute>;
export const ProviderRoute = ({ children }) => <ProtectedRoute allowedRoles={["PROVIDER", "SERVICE_PROVIDER"]}>{children}</ProtectedRoute>;
export const CustomerRoute = ({ children }) => <ProtectedRoute allowedRoles={["CUSTOMER"]}>{children}</ProtectedRoute>;