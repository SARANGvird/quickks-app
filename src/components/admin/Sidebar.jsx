import React, { useState, useMemo } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Toolbar,
  Typography,
  Divider,
  Box,
  Avatar,
  Collapse,
  IconButton,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
  alpha
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Handyman as HandymanIcon,
  BookOnline as BookOnlineIcon,
  Reviews as ReviewsIcon,
  ReportProblem as ComplaintIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Notifications as NotificationsIcon,
  VerifiedUser as VerifiedUserIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Payment as PaymentIcon,
  Email as EmailIcon,
  Backup as BackupIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
  Feedback as FeedbackIcon
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// ==========================================================
// CONSTANTS
// ==========================================================
const drawerWidth = 280;
const collapsedDrawerWidth = 72;

// Menu Configuration
const MENU_ITEMS = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: DashboardIcon,
    path: "/admin/dashboard",
    badge: null
  },
  {
    id: "users",
    title: "Users",
    icon: PeopleIcon,
    path: "/admin/users",
    badge: null
  },
  {
    id: "providers",
    title: "Providers",
    icon: HandymanIcon,
    path: "/admin/providers",
    badge: null
  },
  {
    id: "bookings",
    title: "Bookings",
    icon: BookOnlineIcon,
    path: "/admin/bookings",
    badge: null
  },
  {
    id: "reviews",
    title: "Reviews",
    icon: ReviewsIcon,
    path: "/admin/reviews",
    badge: null
  },
  {
    id: "complaints",
    title: "Complaints",
    icon: ComplaintIcon,
    path: "/admin/complaints",
    badge: null
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: AnalyticsIcon,
    path: "/admin/analytics",
    badge: null,
    children: [
      { id: "overview", title: "Overview", path: "/admin/analytics" },
      { id: "reports", title: "Reports", path: "/admin/reports" },
      { id: "insights", title: "Insights", path: "/admin/insights" }
    ]
  },
  {
    id: "payments",
    title: "Payments",
    icon: PaymentIcon,
    path: "/admin/payments",
    badge: null
  },
  {
    id: "settings",
    title: "Settings",
    icon: SettingsIcon,
    path: "/admin/settings",
    badge: null,
    children: [
      { id: "general", title: "General", path: "/admin/settings" },
      { id: "security", title: "Security", path: "/admin/security" },
      { id: "notifications", title: "Notifications", path: "/admin/notifications" },
      { id: "backup", title: "Backup", path: "/admin/backup" }
    ]
  }
];

// Bottom Menu Items
const BOTTOM_MENU_ITEMS = [
  {
    id: "help",
    title: "Help & Support",
    icon: HelpIcon,
    path: "/admin/help"
  },
  {
    id: "feedback",
    title: "Feedback",
    icon: FeedbackIcon,
    path: "/admin/feedback"
  }
];

// ==========================================================
// SIDEBAR COMPONENT
// ==========================================================
const Sidebar = ({ mobileOpen = false, onDrawerToggle, darkMode = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  // Handle menu toggle for nested items
  const handleMenuToggle = (menuId) => {
    setOpenMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile && onDrawerToggle) {
      onDrawerToggle();
    }
  };

  // Check if path is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Get user initials
  const userInitials = useMemo(() => {
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

  // Get user display name
  const userDisplayName = useMemo(() => {
    return user?.fullName || user?.name || user?.email?.split("@")[0] || "Admin";
  }, [user]);

  // Get user role badge color
  const roleColor = useMemo(() => {
    const role = user?.role?.toLowerCase();
    if (role === "super_admin") return "#ef4444";
    if (role === "admin") return "#6366f1";
    if (role === "manager") return "#10b981";
    return "#64748b";
  }, [user]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Render menu items
  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openMenus[item.id];

    if (hasChildren) {
      return (
        <React.Fragment key={item.id}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleMenuToggle(item.id)}
              sx={{
                minHeight: 48,
                px: 2.5,
                borderRadius: 2,
                mx: 1,
                mb: 0.5,
                bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : "transparent",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.08)
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? "primary.main" : "text.secondary" }}>
                <Icon />
              </ListItemIcon>
              <ListItemText 
                primary={item.title} 
                primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }}
              />
              {isOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => (
                <ListItemButton
                  key={child.id}
                  onClick={() => handleNavigation(child.path)}
                  sx={{
                    pl: 4,
                    py: 1,
                    borderRadius: 2,
                    mx: 1,
                    mb: 0.5,
                    bgcolor: isActive(child.path) ? alpha(theme.palette.primary.main, 0.1) : "transparent",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.08)
                    }
                  }}
                >
                  <ListItemText 
                    primary={child.title} 
                    primaryTypographyProps={{ 
                      fontSize: 13, 
                      fontWeight: isActive(child.path) ? 500 : 400 
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return (
      <ListItem key={item.id} disablePadding>
        <ListItemButton
          onClick={() => handleNavigation(item.path)}
          sx={{
            minHeight: 48,
            px: 2.5,
            borderRadius: 2,
            mx: 1,
            mb: 0.5,
            bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : "transparent",
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.08)
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: active ? "primary.main" : "text.secondary" }}>
            <Icon />
          </ListItemIcon>
          <ListItemText 
            primary={item.title} 
            primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }}
          />
          {item.badge && (
            <Badge badgeContent={item.badge} color="error" />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  // Drawer content
  const drawerContent = (
    <Box sx={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      bgcolor: darkMode ? "#0f172a" : "#ffffff",
      transition: "background-color 0.3s ease"
    }}>
      {/* Logo Area */}
      <Toolbar sx={{ 
        px: collapsed ? 1 : 2,
        justifyContent: collapsed ? "center" : "space-between"
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              bgcolor: "primary.main",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Typography variant="h6" sx={{ color: "white", fontWeight: "bold", fontSize: 18 }}>
              Q
            </Typography>
          </Box>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Quickks
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Admin Portal
              </Typography>
            </motion.div>
          )}
        </Box>
        {!isMobile && (
          <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Toolbar>
      
      <Divider sx={{ my: 1 }} />

      {/* User Profile */}
      <Box sx={{ 
        px: collapsed ? 1 : 2, 
        py: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 2
      }}>
        <Avatar 
          sx={{ 
            width: collapsed ? 40 : 48, 
            height: collapsed ? 40 : 48,
            bgcolor: roleColor,
            transition: "all 0.2s ease"
          }}
        >
          {userInitials}
        </Avatar>
        {!collapsed && (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {userDisplayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role || "Administrator"}
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Main Menu */}
      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {MENU_ITEMS.map(renderMenuItem)}
      </List>

      <Divider />

      {/* Bottom Menu */}
      <List sx={{ px: 1, py: 1 }}>
        {BOTTOM_MENU_ITEMS.map(renderMenuItem)}
        
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              minHeight: 48,
              px: 2.5,
              borderRadius: 2,
              mx: 1,
              mt: 1,
              "&:hover": {
                bgcolor: alpha(theme.palette.error.main, 0.08)
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
              <LogoutIcon />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText 
                primary="Logout" 
                primaryTypographyProps={{ fontSize: 14, color: "error.main" }}
              />
            )}
          </ListItemButton>
        </ListItem>
      </List>

      {/* Version Info */}
      {!collapsed && (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Version 3.0.0
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": { 
            width: drawerWidth, 
            boxSizing: "border-box",
            bgcolor: darkMode ? "#0f172a" : "#ffffff"
          }
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop drawer
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? collapsedDrawerWidth : drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: collapsed ? collapsedDrawerWidth : drawerWidth,
          boxSizing: "border-box",
          transition: "width 0.2s ease",
          bgcolor: darkMode ? "#0f172a" : "#ffffff",
          borderRight: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "#e2e8f0"}`
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;