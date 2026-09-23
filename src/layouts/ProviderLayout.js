// src/components/Provider/ProviderSidebar.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Avatar,
  Stack,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Work as WorkIcon,
  Payment as PaymentIcon,
  Star as StarIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Logout as LogoutIcon,
  People as PeopleIcon,
  Chat as ChatIcon,
  Notifications as NotificationsIcon,
  Analytics as AnalyticsIcon
} from "@mui/icons-material";
import { NavLink, useNavigate } from "react-router-dom";

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/provider/dashboard" },
  { text: "My Bookings", icon: <CalendarIcon />, path: "/provider/bookings" },
  { text: "Jobs", icon: <WorkIcon />, path: "/provider/jobs" },
  { text: "Earnings", icon: <PaymentIcon />, path: "/provider/earnings" },
  { text: "Reviews", icon: <StarIcon />, path: "/provider/reviews" },
  { text: "Customers", icon: <PeopleIcon />, path: "/provider/customers" },
  { text: "Messages", icon: <ChatIcon />, path: "/provider/messages" },
  { text: "Analytics", icon: <AnalyticsIcon />, path: "/provider/analytics" },
  { text: "Settings", icon: <SettingsIcon />, path: "/provider/settings" },
  { text: "Help & Support", icon: <HelpIcon />, path: "/provider/help" }
];

const ProviderSidebar = ({ open, onClose, onToggle, variant, user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    // Implement logout logic
    navigate("/provider/login");
  };

  const drawerVariant = isMobile ? "temporary" : variant;

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box
        sx={{
          p: collapsed ? 2 : 3,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: "1px solid",
          borderColor: "divider"
        }}
      >
        {!collapsed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar
              src={user?.avatar}
              sx={{ bgcolor: "primary.main", width: 32, height: 32 }}
            >
              {user?.name?.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight="600">
                {user?.name || "Provider"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email || "provider@quickks.com"}
              </Typography>
            </Box>
          </Box>
        )}
        {!isMobile && (
          <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Box>

      {/* Navigation Menu */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <NavLink
              to={item.path}
              style={({ isActive }) => ({
                textDecoration: "none",
                width: "100%",
                color: isActive ? theme.palette.primary.main : theme.palette.text.primary
              })}
            >
              {({ isActive }) => (
                <Tooltip title={collapsed ? item.text : ""} placement="right">
                  <ListItemButton
                    sx={{
                      borderRadius: 2,
                      justifyContent: collapsed ? "center" : "flex-start",
                      px: collapsed ? 1 : 2,
                      py: 1,
                      backgroundColor: isActive ? "action.selected" : "transparent",
                      "&:hover": {
                        backgroundColor: "action.hover"
                      }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed ? "auto" : 40,
                        justifyContent: "center",
                        color: isActive ? "primary.main" : "inherit"
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: "0.875rem",
                          fontWeight: isActive ? 600 : 400
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              )}
            </NavLink>
          </ListItem>
        ))}
      </List>

      {/* Footer Actions */}
      <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Tooltip title={collapsed ? "Logout" : ""} placement="right">
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              justifyContent: collapsed ? "center" : "flex-start",
              px: collapsed ? 1 : 2,
              py: 1,
              color: "error.main",
              "&:hover": {
                backgroundColor: "error.light",
                color: "error.contrastText"
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40, justifyContent: "center" }}>
              <LogoutIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Logout" />}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={drawerVariant}
      open={open}
      onClose={onClose}
      sx={{
        width: collapsed ? collapsedDrawerWidth : drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: collapsed ? collapsedDrawerWidth : drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid",
          borderColor: "divider",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen
          })
        }
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

ProviderSidebar.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(["permanent", "temporary"]),
  user: PropTypes.object
};

ProviderSidebar.defaultProps = {
  variant: "permanent",
  user: null
};

export default React.memo(ProviderSidebar);