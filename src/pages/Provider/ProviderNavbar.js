// src/components/Provider/ProviderNavbar.jsx
import React, { useState, useCallback, useMemo } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  useMediaQuery,
  useTheme,
  Chip,
  Stack
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Help as HelpIcon,
  Work as WorkIcon,
  Payment as PaymentIcon,
  Star as StarIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";

// ==========================================================
// CONSTANTS
// ==========================================================
const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard/provider", icon: DashboardIcon },
  { label: "My Bookings", path: "/provider/my-bookings", icon: AssignmentIcon },
  { label: "Jobs", path: "/provider/jobs", icon: WorkIcon },
  { label: "Earnings", path: "/provider/earnings", icon: PaymentIcon },
  { label: "Reviews", path: "/provider/reviews", icon: StarIcon },
  { label: "Profile", path: "/provider/create-profile", icon: AccountCircleIcon }
];

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 72;

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const ProviderNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // ==========================================================
  // DERIVED VALUES
  // ==========================================================
  const userName = user?.fullName || user?.name || "Provider";
  const userEmail = user?.email || "";
  const userAvatar = user?.avatar || null;
  const userInitials = useMemo(() => {
    return userName
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [userName]);

  // ==========================================================
  // HANDLERS
  // ==========================================================
  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleCollapseToggle = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const handleNavClick = useCallback((path) => {
    setDrawerOpen(false);
    navigate(path);
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleThemeToggle = () => {
    setDarkMode(prev => !prev);
    document.documentElement.setAttribute("data-theme", darkMode ? "light" : "dark");
  };

  // ==========================================================
  // CHECK IF ROUTE IS ACTIVE
  // ==========================================================
  const isActive = useCallback((path) => {
    if (path === "/dashboard/provider") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // ==========================================================
  // RENDER DESKTOP NAVIGATION
  // ==========================================================
  const renderDesktopNav = () => (
    <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        
        return (
          <Button
            key={item.path}
            startIcon={<Icon />}
            onClick={() => navigate(item.path)}
            sx={{
              color: active ? "primary.main" : "text.secondary",
              fontWeight: active ? 600 : 400,
              textTransform: "none",
              borderRadius: 2,
              px: 2,
              py: 0.8,
              '&:hover': {
                backgroundColor: active ? "primary.light" : "action.hover",
                color: active ? "primary.dark" : "text.primary"
              }
            }}
          >
            {item.label}
          </Button>
        );
      })}
    </Box>
  );

  // ==========================================================
  // RENDER DRAWER CONTENT
  // ==========================================================
  const renderDrawerContent = () => (
    <Box sx={{ width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH, height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Drawer Header */}
      <Box sx={{ 
        p: collapsed ? 2 : 3, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: collapsed ? "center" : "space-between",
        borderBottom: 1,
        borderColor: "divider"
      }}>
        {!collapsed && (
          <Typography variant="h6" fontWeight="bold" color="primary.main">
            Quickks
          </Typography>
        )}
        {!isMobile && (
          <IconButton onClick={handleCollapseToggle} size="small">
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Box>
      
      {/* User Info */}
      {!collapsed && user && (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2, borderBottom: 1, borderColor: "divider" }}>
          <Avatar src={userAvatar} sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
            {userInitials}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {userName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {userEmail}
            </Typography>
            <Chip label="Provider" size="small" color="primary" sx={{ mt: 0.5, height: 20, fontSize: "0.625rem" }} />
          </Box>
        </Box>
      )}
      
      {/* Navigation List */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={collapsed ? item.label : ""} placement="right">
                <ListItemButton
                  selected={active}
                  onClick={() => handleNavClick(item.path)}
                  sx={{
                    borderRadius: 2,
                    justifyContent: collapsed ? "center" : "flex-start",
                    px: collapsed ? 1 : 2,
                    py: 1,
                    '&.Mui-selected': {
                      backgroundColor: "primary.light",
                      '&:hover': { backgroundColor: "primary.light" }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40, justifyContent: "center" }}>
                    <Icon sx={{ color: active ? "primary.main" : "inherit" }} />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={item.label} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
      
      {/* Footer Actions */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Tooltip title={collapsed ? "Settings" : ""} placement="right">
          <ListItemButton
            onClick={() => navigate("/provider/settings")}
            sx={{
              borderRadius: 2,
              justifyContent: collapsed ? "center" : "flex-start",
              px: collapsed ? 1 : 2,
              py: 1,
              mb: 1
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40, justifyContent: "center" }}>
              <SettingsIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Settings" />}
          </ListItemButton>
        </Tooltip>
        
        <Tooltip title={collapsed ? "Help" : ""} placement="right">
          <ListItemButton
            onClick={() => navigate("/provider/help")}
            sx={{
              borderRadius: 2,
              justifyContent: collapsed ? "center" : "flex-start",
              px: collapsed ? 1 : 2,
              py: 1,
              mb: 1
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40, justifyContent: "center" }}>
              <HelpIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Help & Support" />}
          </ListItemButton>
        </Tooltip>
        
        <Tooltip title={collapsed ? "Logout" : ""} placement="right">
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              justifyContent: collapsed ? "center" : "flex-start",
              px: collapsed ? 1 : 2,
              py: 1,
              color: "error.main",
              '&:hover': {
                backgroundColor: "error.light",
                color: "error.contrastText"
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40, justifyContent: "center", color: "inherit" }}>
              <LogoutIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Logout" />}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={1} 
        sx={{ 
          bgcolor: "background.paper", 
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", minHeight: { xs: 56, sm: 64 } }}>
          {/* Left Section */}
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton 
              edge="start" 
              color="inherit" 
              onClick={handleDrawerToggle}
              sx={{ display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                cursor: "pointer",
                letterSpacing: "0.5px"
              }}
              onClick={() => navigate("/dashboard/provider")}
            >
              Quickks Provider
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {renderDesktopNav()}

          {/* Right Section */}
          <Box display="flex" alignItems="center" gap={1}>
            {/* Theme Toggle */}
            <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
              <IconButton onClick={handleThemeToggle} size="small">
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton onClick={handleNotificationOpen} size="small">
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            {/* User Menu */}
            <Tooltip title="Account">
              <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} style={{ width: 32, height: 32, borderRadius: "50%" }} />
                  ) : (
                    userInitials
                  )}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* User Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{ sx: { width: 220, mt: 1 } }}
      >
        <Box px={2} py={1.5}>
          <Typography variant="subtitle2" fontWeight="bold">{userName}</Typography>
          <Typography variant="caption" color="text.secondary">{userEmail}</Typography>
          <Chip label="Provider" size="small" color="primary" sx={{ mt: 1, height: 20 }} />
        </Box>
        <Divider />
        <MenuItem onClick={() => { handleMenuClose(); navigate("/provider/profile"); }}>
          <AccountCircleIcon fontSize="small" sx={{ mr: 1 }} /> Profile
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); navigate("/provider/settings"); }}>
          <SettingsIcon fontSize="small" sx={{ mr: 1 }} /> Settings
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); navigate("/provider/help"); }}>
          <HelpIcon fontSize="small" sx={{ mr: 1 }} /> Help
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
        </Box>
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No new notifications
          </Typography>
        </Box>
      </Menu>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerClose}
        sx={{ display: { md: "none" } }}
      >
        {renderDrawerContent()}
      </Drawer>
      
      {/* Desktop Drawer (Optional - for collapsible sidebar) */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
            flexShrink: 0,
            display: { xs: "none", md: "block" },
            '& .MuiDrawer-paper': {
              width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
              boxSizing: "border-box",
              top: "auto",
              height: "calc(100% - 64px)",
              position: "fixed",
              borderRight: 1,
              borderColor: "divider",
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen
              })
            }
          }}
        >
          {renderDrawerContent()}
        </Drawer>
      )}
    </>
  );
};

export default React.memo(ProviderNavbar);