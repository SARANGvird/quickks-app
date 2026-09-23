import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Box, 
  CssBaseline, 
  Toolbar, 
  Alert, 
  CircularProgress, 
  Snackbar,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
  Drawer,
  AppBar,
  Tooltip,
  LinearProgress
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Settings,
  Logout,
  Refresh,
  WifiOff,
  Wifi,
  Close as CloseIcon,
  Brightness4,
  Brightness7,
  Dashboard,
  People,
  Business,
  BookOnline,
  Reviews,
  ReportProblem,
  BarChart,
  SettingsApplications
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Sidebar from "./Sidebar";
import useAdminDashboardSocket from "../hooks/useAdminDashboardSocket";
import { formatDistanceToNow } from "date-fns";

// ==========================================================
// STYLES
// ==========================================================
const styles = {
  appBar: {
    background: "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    borderBottom: "1px solid #e2e8f0",
    zIndex: 1200
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: "64px",
    px: { xs: 2, sm: 3 }
  },
  menuButton: {
    mr: 2,
    display: { xs: "flex", lg: "none" }
  },
  logo: {
    fontWeight: 700,
    fontSize: "20px",
    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  content: {
    flexGrow: 1,
    p: { xs: 2, sm: 3 },
    transition: "all 0.3s ease",
    width: "100%"
  },
  connectionStatus: {
    position: "fixed",
    bottom: 16,
    right: 16,
    zIndex: 1300,
    maxWidth: 320
  }
};

// ==========================================================
// ADMIN LAYOUT COMPONENT
// ==========================================================
const AdminLayout = ({ children, requireAuth = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  
  // State
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // WebSocket connection
  const socketData = useAdminDashboardSocket({ enableRealTime: true });
  
  const { 
    connected: socketConnected, 
    alerts, 
    lastUpdated, 
    markAlertAsRead, 
    markAllAlertsAsRead,
    unreadCount 
  } = socketData;

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Handle user menu
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle notifications
  const handleNotificationOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  // Handle logout
  const handleLogout = async () => {
    handleMenuClose();
    setLoading(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to logout. Please try again.",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
    // Apply dark mode class to body
    if (!darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  };

  // Show toast for new alerts
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const latestAlert = alerts[0];
      if (latestAlert && !latestAlert.read) {
        setSnackbar({
          open: true,
          message: latestAlert.message || latestAlert.title,
          severity: latestAlert.severity === "error" ? "error" : 
                    latestAlert.severity === "warning" ? "warning" : "info"
        });
      }
    }
  }, [alerts]);

  // Auto-close snackbar
  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        setSnackbar({ ...snackbar, open: false });
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [snackbar]);

  // Get user initials
  const getUserInitials = useMemo(() => {
    if (user?.fullName) {
      return user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.name) {
      return user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "A";
  }, [user]);

  // Get current page title
  const getPageTitle = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/admin/users")) return "User Management";
    if (path.includes("/admin/providers")) return "Provider Management";
    if (path.includes("/admin/bookings")) return "Booking Management";
    if (path.includes("/admin/reviews")) return "Review Management";
    if (path.includes("/admin/complaints")) return "Complaint Management";
    if (path.includes("/admin/analytics")) return "Analytics Dashboard";
    if (path.includes("/admin/settings")) return "System Settings";
    if (path.includes("/admin/reports")) return "Reports";
    return "Admin Dashboard";
  }, [location]);

  return (
    <Box sx={{ 
      display: "flex", 
      bgcolor: darkMode ? "#0f172a" : "#f1f5f9", 
      minHeight: "100vh",
      transition: "background-color 0.3s ease"
    }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar position="fixed" sx={styles.appBar} color="default" elevation={0}>
        <Toolbar sx={styles.toolbar}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={styles.menuButton}
            >
              <MenuIcon />
            </IconButton>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Box sx={styles.logo} onClick={() => navigate("/admin/dashboard")}>
                <Dashboard sx={{ color: "#6366f1" }} />
                Quickks Admin
              </Box>
            </motion.div>
          </Box>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Page Title (Desktop) */}
            <Typography 
              variant="body1" 
              sx={{ 
                display: { xs: "none", md: "block" },
                color: "#475569",
                fontWeight: 500,
                mr: 2
              }}
            >
              {getPageTitle}
            </Typography>
            
            {/* Connection Status */}
            <Tooltip title={socketConnected ? "Connected to real-time updates" : "Reconnecting..."}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {socketConnected ? (
                  <Wifi sx={{ color: "#10b981", fontSize: 18 }} />
                ) : (
                  <WifiOff sx={{ color: "#ef4444", fontSize: 18 }} />
                )}
                <Typography variant="caption" sx={{ color: "#64748b", display: { xs: "none", sm: "block" } }}>
                  {lastUpdated ? formatDistanceToNow(lastUpdated, { addSuffix: true }) : "Connecting..."}
                </Typography>
              </Box>
            </Tooltip>
            
            {/* Refresh Button */}
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh sx={{ fontSize: 20, color: "#64748b" }} />
              </IconButton>
            </Tooltip>
            
            {/* Dark Mode Toggle */}
            <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
              <IconButton size="small" onClick={handleDarkModeToggle}>
                {darkMode ? <Brightness7 sx={{ fontSize: 20 }} /> : <Brightness4 sx={{ fontSize: 20 }} />}
              </IconButton>
            </Tooltip>
            
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton size="small" onClick={handleNotificationOpen}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon sx={{ fontSize: 20, color: "#64748b" }} />
                </Badge>
              </IconButton>
            </Tooltip>
            
            {/* User Menu */}
            <Tooltip title="Account">
              <IconButton onClick={handleMenuOpen} size="small">
                <Avatar sx={{ width: 32, height: 32, bgcolor: "#6366f1" }}>
                  {getUserInitials}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
        
        {/* Loading Progress Bar */}
        {loading && <LinearProgress sx={{ position: "absolute", bottom: 0, left: 0, right: 0 }} />}
      </AppBar>
      
      {/* Sidebar */}
      <Sidebar 
        mobileOpen={mobileOpen} 
        onDrawerToggle={handleDrawerToggle}
        darkMode={darkMode}
      />
      
      {/* Main Content */}
      <Box component="main" sx={styles.content}>
        <Toolbar /> {/* Spacer for AppBar */}
        
        {/* Connection Status Banner */}
        <AnimatePresence>
          {!socketConnected && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert 
                severity="warning" 
                sx={{ mb: 2, borderRadius: 2 }}
                icon={<WifiOff />}
                action={
                  <IconButton size="small" onClick={handleRefresh}>
                    <Refresh fontSize="small" />
                  </IconButton>
                }
              >
                Connection lost. Attempting to reconnect...
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Children Content */}
        <Box sx={{ mt: 2 }}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { 
                socketData,
                darkMode,
                user
              });
            }
            return child;
          })}
        </Box>
      </Box>
      
      {/* User Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }
        }}
      >
        <MenuItem onClick={() => { handleMenuClose(); navigate("/admin/profile"); }}>
          <AccountCircle sx={{ mr: 1, fontSize: 18 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); navigate("/admin/settings"); }}>
          <Settings sx={{ mr: 1, fontSize: 18 }} />
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1, fontSize: 18, color: "#ef4444" }} />
          <Typography color="error">Logout</Typography>
        </MenuItem>
      </Menu>
      
      {/* Notifications Dropdown */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 360,
            maxHeight: 480,
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {unreadCount} unread
          </Typography>
        </Box>
        
        <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
          {alerts && alerts.length > 0 ? (
            alerts.slice(0, 10).map((alert, index) => (
              <MenuItem 
                key={alert.id || index}
                onClick={() => { 
                  markAlertAsRead(alert.id); 
                  handleNotificationClose();
                }}
                sx={{ 
                  py: 1.5, 
                  px: 2,
                  borderBottom: "1px solid #f1f5f9",
                  bgcolor: !alert.read ? "rgba(99, 102, 241, 0.05)" : "transparent"
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={!alert.read ? 600 : 400}>
                    {alert.title || "Notification"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    {alert.timestamp ? formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true }) : "Just now"}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          ) : (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          )}
        </Box>
        
        {alerts && alerts.length > 0 && (
          <Box sx={{ p: 1, borderTop: "1px solid #e2e8f0" }}>
            <Button
              fullWidth
              size="small"
              onClick={markAllAlertsAsRead}
              sx={{ textTransform: "none" }}
            >
              Mark all as read
            </Button>
          </Box>
        )}
      </Menu>
      
      {/* Snackbar for alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={styles.connectionStatus}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled"
          action={
            <IconButton size="small" onClick={() => setSnackbar({ ...snackbar, open: false })}>
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default AdminLayout;