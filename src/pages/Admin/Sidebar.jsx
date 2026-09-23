// src/components/Admin/Sidebar.jsx
import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  Stack,
  Chip,
  Tooltip,
  Collapse,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  Badge
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Handyman as HandymanIcon,
  BookOnline as BookOnlineIcon,
  Settings as SettingsIcon,
  BarChart as BarChartIcon,
  UploadFile as UploadFileIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
  Notifications as NotificationsIcon,
  Star as StarIcon,
  Payment as PaymentIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
  Support as SupportIcon,
  Reviews as ReviewsIcon,
  Warning as WarningIcon,
  AdminPanelSettings as AdminIcon,
  Analytics as AnalyticsIcon
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";

// ==========================================================
// MENU CONFIGURATION
// ==========================================================
const MENU_ITEMS = [
  {
    label: "Dashboard",
    icon: <DashboardIcon />,
    path: "/dashboard/admin",
    end: true
  },
  {
    label: "User Management",
    icon: <PeopleIcon />,
    path: "/dashboard/admin/users",
    subItems: [
      { label: "All Users", path: "/dashboard/admin/users" },
      { label: "Customers", path: "/dashboard/admin/users/customers" },
      { label: "Providers", path: "/dashboard/admin/users/providers" },
      { label: "Admins", path: "/dashboard/admin/users/admins" }
    ]
  },
  {
    label: "Provider Management",
    icon: <HandymanIcon />,
    path: "/dashboard/admin/providers",
    badge: true,
    subItems: [
      { label: "All Providers", path: "/dashboard/admin/providers" },
      { label: "Pending Approval", path: "/dashboard/admin/providers/pending" },
      { label: "Verified Providers", path: "/dashboard/admin/providers/verified" },
      { label: "Suspended Providers", path: "/dashboard/admin/providers/suspended" }
    ]
  },
  {
    label: "Booking Management",
    icon: <BookOnlineIcon />,
    path: "/dashboard/admin/bookings",
    subItems: [
      { label: "All Bookings", path: "/dashboard/admin/bookings" },
      { label: "Pending Bookings", path: "/dashboard/admin/bookings/pending" },
      { label: "Active Bookings", path: "/dashboard/admin/bookings/active" },
      { label: "Completed Bookings", path: "/dashboard/admin/bookings/completed" },
      { label: "Cancelled Bookings", path: "/dashboard/admin/bookings/cancelled" }
    ]
  },
  {
    label: "Reviews & Ratings",
    icon: <StarIcon />,
    path: "/dashboard/admin/reviews",
    subItems: [
      { label: "All Reviews", path: "/dashboard/admin/reviews" },
      { label: "Flagged Reviews", path: "/dashboard/admin/reviews/flagged" },
      { label: "Pending Moderation", path: "/dashboard/admin/reviews/pending" }
    ]
  },
  {
    label: "Complaints",
    icon: <WarningIcon />,
    path: "/dashboard/admin/complaints",
    badge: true,
    subItems: [
      { label: "All Complaints", path: "/dashboard/admin/complaints" },
      { label: "Pending", path: "/dashboard/admin/complaints/pending" },
      { label: "In Review", path: "/dashboard/admin/complaints/in-review" },
      { label: "Resolved", path: "/dashboard/admin/complaints/resolved" }
    ]
  },
  {
    label: "Payments & Earnings",
    icon: <PaymentIcon />,
    path: "/dashboard/admin/payments",
    subItems: [
      { label: "All Transactions", path: "/dashboard/admin/payments" },
      { label: "Provider Payouts", path: "/dashboard/admin/payments/payouts" },
      { label: "Refunds", path: "/dashboard/admin/payments/refunds" },
      { label: "Platform Fees", path: "/dashboard/admin/payments/fees" }
    ]
  },
  {
    label: "Analytics",
    icon: <AnalyticsIcon />,
    path: "/dashboard/admin/analytics",
    subItems: [
      { label: "Overview", path: "/dashboard/admin/analytics" },
      { label: "User Analytics", path: "/dashboard/admin/analytics/users" },
      { label: "Revenue Analytics", path: "/dashboard/admin/analytics/revenue" },
      { label: "Performance Metrics", path: "/dashboard/admin/analytics/performance" }
    ]
  },
  {
    label: "Import Providers",
    icon: <UploadFileIcon />,
    path: "/dashboard/admin/import-providers"
  },
  {
    label: "System Settings",
    icon: <SettingsIcon />,
    path: "/dashboard/admin/settings",
    subItems: [
      { label: "General", path: "/dashboard/admin/settings" },
      { label: "Security", path: "/dashboard/admin/settings/security" },
      { label: "Notifications", path: "/dashboard/admin/settings/notifications" },
      { label: "API Settings", path: "/dashboard/admin/settings/api" }
    ]
  }
];

const BOTTOM_MENU_ITEMS = [
  { label: "Help & Support", icon: <HelpIcon />, path: "/dashboard/admin/help" },
  { label: "Documentation", icon: <SupportIcon />, path: "/dashboard/admin/docs" }
];

// ==========================================================
// SIDEBAR COMPONENT
// ==========================================================
const Sidebar = ({ open = true, onToggle, variant = "permanent" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user, logout, hasPermission } = useAuth();
  const { unreadCount } = useNotifications();
  
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  // ==========================================================
  // HELPER FUNCTIONS
  // ==========================================================
  const isActive = useCallback((path, end = false) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const isSubItemActive = useCallback((subItems) => {
    return subItems?.some(subItem => location.pathname === subItem.path);
  }, [location.pathname]);

  const toggleSubmenu = useCallback((label) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const handleNavigation = useCallback((path) => {
    navigate(path);
    if (isMobile && onToggle) {
      onToggle();
    }
  }, [navigate, isMobile, onToggle]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  // ==========================================================
  // FILTER MENU ITEMS BY PERMISSIONS
  // ==========================================================
  const filteredMenuItems = useMemo(() => {
    return MENU_ITEMS.filter(item => {
      if (item.permission && !hasPermission(item.permission)) return false;
      return true;
    });
  }, [hasPermission]);

  // ==========================================================
  // RENDER MENU ITEMS
  // ==========================================================
  const renderMenuItem = (item, depth = 0) => {
    const active = isActive(item.path, item.end);
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isOpen = openSubmenus[item.label];
    const isSubActive = hasSubItems && isSubItemActive(item.subItems);
    
    return (
      <React.Fragment key={item.label}>
        <ListItemButton
          onClick={() => {
            if (hasSubItems) {
              toggleSubmenu(item.label);
            } else {
              handleNavigation(item.path);
            }
          }}
          selected={active || isSubActive}
          sx={{
            pl: depth === 0 ? 2 : 4,
            mb: 0.5,
            borderRadius: 2,
            minHeight: 48,
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.light',
              },
              '& .MuiListItemIcon-root': {
                color: 'primary.main',
              },
            },
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'inherit' }}>
            {item.icon}
            {item.badge && !collapsed && (
              <Badge
                badgeContent={item.label === "Complaints" ? 3 : item.label === "Provider Management" ? 5 : 0}
                color="error"
                sx={{ position: 'absolute', top: -4, right: -4 }}
              />
            )}
          </ListItemIcon>
          {!collapsed && (
            <>
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: active ? 600 : 400
                }}
              />
              {hasSubItems && (isOpen ? <ExpandLess /> : <ExpandMore />)}
            </>
          )}
        </ListItemButton>
        
        {hasSubItems && !collapsed && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.subItems.map(subItem => (
                <ListItemButton
                  key={subItem.label}
                  onClick={() => handleNavigation(subItem.path)}
                  selected={location.pathname === subItem.path}
                  sx={{
                    pl: 6,
                    py: 1,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      color: 'primary.main',
                    },
                  }}
                >
                  <ListItemText 
                    primary={subItem.label}
                    primaryTypographyProps={{
                      fontSize: '0.8125rem'
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  // ==========================================================
  // SIDEBAR CONTENT
  // ==========================================================
  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header / Logo */}
      <Box
        sx={{
          p: collapsed ? 2 : 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 64,
        }}
      >
        {!collapsed && (
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar
              src="/logo192.png"
              sx={{ width: 32, height: 32 }}
            />
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(135deg, #6A1B9A, #9C27B0)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Quickks Admin
            </Typography>
          </Box>
        )}
        {variant === "permanent" && (
          <Tooltip title={collapsed ? "Expand" : "Collapse"}>
            <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* User Info Section */}
      {!collapsed && user && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Avatar
            src={user.avatar}
            sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}
          >
            {user.name?.charAt(0) || 'A'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight="600" noWrap>
              {user.name || "Admin User"}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.email || "admin@quickks.com"}
            </Typography>
            <Chip
              label={user.role || "Admin"}
              size="small"
              color="primary"
              sx={{ mt: 0.5, height: 20, fontSize: '0.625rem' }}
            />
          </Box>
          <Tooltip title="Notifications">
            <IconButton size="small">
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Menu Items */}
      <List sx={{ flex: 1, px: 1, py: 2, overflowY: 'auto' }}>
        {filteredMenuItems.map(item => renderMenuItem(item))}
      </List>

      {/* Bottom Menu Items */}
      <List sx={{ px: 1, pb: 2, borderTop: 1, borderColor: 'divider' }}>
        {BOTTOM_MENU_ITEMS.map(item => (
          <ListItemButton
            key={item.label}
            onClick={() => handleNavigation(item.path)}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            {!collapsed && <ListItemText primary={item.label} />}
          </ListItemButton>
        ))}
        <ListItemButton
          onClick={handleLogout}
          sx={{ borderRadius: 2, color: 'error.main' }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
            <LogoutIcon />
          </ListItemIcon>
          {!collapsed && <ListItemText primary="Logout" />}
        </ListItemButton>
      </List>
    </Box>
  );

  // ==========================================================
  // RENDER
  // ==========================================================
  if (variant === "temporary") {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onToggle}
        PaperProps={{
          sx: {
            width: collapsed ? 80 : 280,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Box
      component="nav"
      sx={{
        width: collapsed ? 80 : 280,
        flexShrink: 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        overflowX: 'hidden',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {sidebarContent}
    </Box>
  );
};

export default React.memo(Sidebar);