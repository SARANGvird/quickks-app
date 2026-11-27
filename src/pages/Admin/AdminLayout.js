import React, { useState, useMemo, useCallback } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Divider, Chip, Tooltip,
  useMediaQuery, useTheme, Badge,
} from "@mui/material";
import {
  FaBolt, FaTachometerAlt, FaUsers, FaShieldAlt, FaClipboardList, FaExclamationTriangle,
  FaChartBar, FaStar, FaCog, FaBars, FaTimes, FaSignOutAlt, FaUserCircle, FaBell, FaHome,
} from "react-icons/fa";

const DRAWER_WIDTH = 260;
const COLORS = { primary: "#6366f1", bg: "#f8fafc", border: "#e2e8f0", muted: "#64748b", danger: "#ef4444" };

const NAV = [
  { label: "Dashboard", path: "/admin/dashboard", icon: FaTachometerAlt, end: true },
  { label: "Users", path: "/admin/users", icon: FaUsers },
  { label: "Providers", path: "/admin/providers", icon: FaShieldAlt },
  { label: "Bookings", path: "/admin/bookings", icon: FaClipboardList },
  { label: "Complaints", path: "/admin/complaints", icon: FaExclamationTriangle },
  { label: "Analytics", path: "/admin/analytics", icon: FaChartBar },
  { label: "Reviews", path: "/admin/reviews", icon: FaStar },
  { label: "Settings", path: "/admin/settings", icon: FaCog },
];

const PAGE_TITLES = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Users",
  "/admin/providers": "Providers",
  "/admin/bookings": "Bookings",
  "/admin/complaints": "Complaints",
  "/admin/analytics": "Analytics",
  "/admin/reviews": "Reviews",
  "/admin/settings": "Settings",
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorUser, setAnchorUser] = useState(null);

  const currentTitle = useMemo(() => {
    const p = location.pathname;
    if (PAGE_TITLES[p]) return PAGE_TITLES[p];
    // /admin/users/123 -> Users, /admin/bookings/5 -> Bookings
    const base = NAV.find((n) => p.startsWith(n.path));
    return base ? base.label : "Admin";
  }, [location.pathname]);

  const handleSignOut = useCallback(async () => {
    setAnchorUser(null);
    setMobileOpen(false);
    try { await logout?.(); } catch { /* logout locally anyway */ }
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const goHome = useCallback(() => navigate("/"), [navigate]);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${COLORS.border}` }}>
        <Avatar sx={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", width: 36, height: 36 }}><FaBolt size={15} color="white" /></Avatar>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1 }}>Quickks Admin</Typography>
          <Typography variant="caption" color={COLORS.muted}>v10.3 • Admin Panel</Typography>
        </Box>
        {isMobile && (<IconButton size="small" onClick={closeMobile} sx={{ ml: "auto" }} aria-label="Close menu"><FaTimes size={14} /></IconButton>)}
      </Box>

      {/* Nav */}
      <List sx={{ flex: 1, overflowY: "auto", py: 1, px: 1 }}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              end={item.end}
              onClick={closeMobile}
              sx={{
                borderRadius: 2, mb: 0.5, py: 1,
                bgcolor: active ? "#eef2ff" : "transparent",
                color: active ? COLORS.primary : "#334155",
                borderLeft: active ? `3px solid ${COLORS.primary}` : "3px solid transparent",
                "&:hover": { bgcolor: active ? "#e0e7ff" : "#f1f5f9" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? COLORS.primary : COLORS.muted }}><Icon size={16} /></ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }} />
            </ListItemButton>
          );
        })}
      </List>

      {/* Bottom */}
      <Box sx={{ p: 2, borderTop: `1px solid ${COLORS.border}` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ bgcolor: COLORS.primary, width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
            {String(user?.fullName || user?.name || user?.email || "A")[0].toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{user?.fullName || user?.name || "Admin"}</Typography>
            <Typography variant="caption" color={COLORS.muted} noWrap>{user?.email || ""}</Typography>
          </Box>
          <Chip label={String(user?.role || "ADMIN").replace(/^ROLE_/, "")} size="small" sx={{ height: 20, fontSize: 9, fontWeight: 700 }} />
        </Box>
        <ListItemButton onClick={goHome} sx={{ borderRadius: 2, py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 32 }}><FaHome size={14} /></ListItemIcon>
          <ListItemText primary="View Site" primaryTypographyProps={{ fontSize: 13 }} />
        </ListItemButton>
        <ListItemButton onClick={handleSignOut} sx={{ borderRadius: 2, py: 0.75, color: COLORS.danger }}>
          <ListItemIcon sx={{ minWidth: 32, color: COLORS.danger }}><FaSignOutAlt size={14} /></ListItemIcon>
          <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: COLORS.bg }}>
      {/* Topbar */}
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: "#fff", color: "#0f172a", borderBottom: `1px solid ${COLORS.border}`, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` } }}>
        <Toolbar sx={{ gap: 1 }}>
          {isMobile && (<IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open menu"><FaBars size={16} /></IconButton>)}
          <Typography variant="subtitle1" fontWeight={800} sx={{ flex: 1 }}>{currentTitle}</Typography>
          <Tooltip title="Notifications"><IconButton size="small" onClick={() => navigate("/admin/dashboard")} aria-label="Notifications"><Badge badgeContent={0} color="error"><FaBell size={15} /></Badge></IconButton></Tooltip>
          <Tooltip title="Account"><IconButton size="small" onClick={(e) => setAnchorUser(e.currentTarget)} aria-label="Account menu"><Avatar sx={{ width: 32, height: 32, bgcolor: COLORS.primary, fontSize: 13, fontWeight: 700 }}>{String(user?.fullName || user?.name || user?.email || "A")[0].toUpperCase()}</Avatar></IconButton></Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar - Desktop */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={closeMobile} ModalProps={{ keepMounted: true }} sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" } }}>{drawerContent}</Drawer>
        <Drawer variant="permanent" sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", borderRight: `1px solid ${COLORS.border}` } }} open>{drawerContent}</Drawer>
      </Box>

      {/* Page Content - Outlet MUST be here, this was missing in old minimal layout */}
      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, p: { xs: 1.5, sm: 2, md: 2.5 }, pt: { xs: 9, md: 10 }, minWidth: 0 }}>
        <Outlet />
        <Box sx={{ mt: 4, textAlign: "center" }}><Typography variant="caption" color={COLORS.muted}>© {new Date().getFullYear()} Quickks Technologies — Admin Panel</Typography></Box>
      </Box>

      {/* Account Menu */}
      <Menu anchorEl={anchorUser} open={Boolean(anchorUser)} onClose={() => setAnchorUser(null)}>
        <Box sx={{ px: 2, py: 1 }}><Typography variant="body2" fontWeight={700}>{user?.fullName || user?.name || "Admin"}</Typography><Typography variant="caption" color={COLORS.muted}>{user?.email || ""}</Typography></Box>
        <Divider />
        <MenuItem onClick={() => { setAnchorUser(null); navigate("/admin/settings"); }}><FaUserCircle style={{ marginRight: 8 }} />Settings</MenuItem>
        <MenuItem onClick={handleSignOut}><FaSignOutAlt style={{ marginRight: 8 }} />Sign out</MenuItem>
      </Menu>
    </Box>
  );
}