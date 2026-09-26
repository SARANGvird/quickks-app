// src/routes/AdminRoutes.jsx - PROD v3.0
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import AdminGuard from "../guards/AdminGuard";
import RouteErrorBoundary from "../components/RouteErrorBoundary";

const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const UsersPage = lazy(() => import("../pages/admin/UsersPage"));
const ProvidersPage = lazy(() => import("../pages/admin/ProvidersPage"));
const BookingsPage = lazy(() => import("../pages/admin/BookingsPage"));
const RevenuePage = lazy(() => import("../pages/admin/RevenuePage"));
const AnalyticsPage = lazy(() => import("../pages/admin/AnalyticsPage"));
const ReportsPage = lazy(() => import("../pages/admin/ReportsPage"));
const ComplaintsPage = lazy(() => import("../pages/admin/ComplaintsPage"));
const SupportTicketsPage = lazy(() => import("../pages/admin/SupportTicketsPage"));
const SettingsPage = lazy(() => import("../pages/admin/SettingsPage"));
const SystemHealthPage = lazy(() => import("../pages/admin/SystemHealthPage"));
const StrikesPage = lazy(() => import("../pages/admin/StrikesPage"));
const RolesPage = lazy(() => import("../pages/admin/RolesPage"));
const PermissionsPage = lazy(() => import("../pages/admin/PermissionsPage"));

const Loader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

const AdminRoutes = () => (
  <RouteErrorBoundary>
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          
          {/* ekach wildcard - 3 route chi garaj nahi */}
          <Route path="users/*" element={<UsersPage />} />
          <Route path="providers/*" element={<ProvidersPage />} />
          <Route path="bookings/*" element={<BookingsPage />} />
          <Route path="revenue/*" element={<RevenuePage />} />
          <Route path="analytics/*" element={<AnalyticsPage />} />
          <Route path="reports/*" element={<ReportsPage />} />
          <Route path="complaints/*" element={<ComplaintsPage />} />
          <Route path="support-tickets/*" element={<SupportTicketsPage />} />
          <Route path="strikes/*" element={<StrikesPage />} />
          
          <Route path="system-health" element={<SystemHealthPage />} />
          <Route path="settings/*" element={<SettingsPage />} />

          {/* Super Admin only */}
          <Route path="roles/*" element={<AdminGuard requiredRoles={['SUPER_ADMIN']}><RolesPage /></AdminGuard>} />
          <Route path="permissions" element={<AdminGuard requiredRoles={['SUPER_ADMIN']}><PermissionsPage /></AdminGuard>} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  </RouteErrorBoundary>
);

export default AdminRoutes;