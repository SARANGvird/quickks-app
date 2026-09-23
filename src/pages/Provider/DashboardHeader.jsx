// src/components/Provider/DashboardHeader.jsx
import React, { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Button,
  Popover,
  TextField,
  InputAdornment
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Help as HelpIcon,
  Feedback as FeedbackIcon,
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  Work as WorkIcon,
  Payment as PaymentIcon,
  Star as StarIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Edit as EditIcon,
  Settings
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import AvailabilityToggle from "./AvailabilityToggle";

// ==========================================================
// CONSTANTS
// ==========================================================
const MENU_ITEMS = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/provider/dashboard" },
  { label: "My Bookings", icon: <CalendarIcon />, path: "/provider/bookings" },
  { label: "Jobs", icon: <WorkIcon />, path: "/provider/jobs" },
  { label: "Earnings", icon: <PaymentIcon />, path: "/provider/earnings" },
  { label: "Reviews", icon: <StarIcon />, path: "/provider/reviews" }
];

// ==========================================================
// NOTIFICATION POPOVER
// ==========================================================
const NotificationPopover = ({ open, anchorEl, onClose, notifications, onMarkRead, onViewAll }) => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={{ sx: { width: 360, maxHeight: 480, borderRadius: 2 } }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
        <Button size="small" onClick={onViewAll}>View All</Button>
      </Box>
      
      <Box sx={{ maxHeight: 360, overflow: "auto" }}>
        {notifications?.length > 0 ? (
          notifications.slice(0, 5).map((notif, index) => (
            <MenuItem key={index} onClick={() => onMarkRead?.(notif.id)} sx={{ whiteSpace: "normal", py: 1.5 }}>
              <Box>
                <Typography variant="body2" fontWeight="medium">{notif.title}</Typography>
                <Typography variant="caption" color="text.secondary">{notif.message}</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {new Date(notif.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </MenuItem>
          ))
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">No notifications</Typography>
          </Box>
        )}
      </Box>
    </Popover>
  );
};

// ==========================================================
// SIDEBAR DRAWER
// ==========================================================
const SidebarDrawer = ({ open, onClose, onNavigate }) => {
  const navigate = useNavigate();
  
  const handleNavigation = (path) => {
    navigate(path);
    onNavigate?.();
    onClose();
  };

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 280, p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {MENU_ITEMS.map((item) => (
            <ListItem
              key={item.label}
              button
              onClick={() => handleNavigation(item.path)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 2 }} />
        <List>
          <ListItem button onClick={() => handleNavigation("/provider/settings")}>
            <ListItemIcon><SettingsIcon /></ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItem>
          <ListItem button onClick={() => handleNavigation("/provider/help")}>
            <ListItemIcon><HelpIcon /></ListItemIcon>
            <ListItemText primary="Help & Support" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const DashboardHeader = ({
  darkMode = false,
  toggleDarkMode,
  available = true,
  toggleAvailability,
  onEditProfile,
  onSettings,
  onLogout,
  userName = "Provider",
  userAvatar = null,
  userEmail = "",
  notificationCount = 0,
  notifications = [],
  onNotificationClick,
  onViewAllNotifications,
  showSearch = true,
  showNotifications = true,
  showThemeToggle = true,
  showAvailabilityToggle = true,
  variant = "default"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount, markAsRead } = useNotifications();
  
  // State
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [searchAnchor, setSearchAnchor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Handlers
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  
  const handleNotificationOpen = (event) => setNotificationAnchor(event.currentTarget);
  const handleNotificationClose = () => setNotificationAnchor(null);
  
  const handleSearchOpen = (event) => setSearchAnchor(event.currentTarget);
  const handleSearchClose = () => {
    setSearchAnchor(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleProfile = () => {
    handleMenuClose();
    onEditProfile?.();
  };

  const handleSettings = () => {
    handleMenuClose();
    onSettings?.();
  };

  const handleLogout = () => {
    handleMenuClose();
    if (onLogout) {
      onLogout();
    } else {
      logout();
      navigate("/login");
    }
  };

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      // Implement search API call
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Get user initials
  const getUserInitials = useMemo(() => {
    const name = userName || user?.name || "Provider";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [userName, user?.name]);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: darkMode ? "#1e293b" : "white",
          color: darkMode ? "white" : "#1e293b",
          borderBottom: 1,
          borderColor: "divider",
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", minHeight: { xs: 56, sm: 64 } }}>
          {/* Left Section */}
          <Box display="flex" alignItems="center" gap={1}>
            {isMobile && (
              <IconButton edge="start" color="inherit" onClick={() => setSidebarOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 700,
                background: darkMode ? "none" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: darkMode ? "white" : "transparent",
                cursor: "pointer"
              }}
              onClick={() => navigate("/provider/dashboard")}
            >
              Quickks Provider
            </Typography>
          </Box>

          {/* Center Section - Search */}
          {showSearch && !isMobile && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9",
                borderRadius: 2,
                px: 2,
                py: 0.5,
                width: 300
              }}
            >
              <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
              <input
                type="text"
                placeholder="Search bookings, customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  width: "100%",
                  padding: "8px 0",
                  color: "inherit",
                  fontSize: "0.875rem"
                }}
                onFocus={handleSearchOpen}
              />
            </Box>
          )}

          {/* Right Section */}
          <Box display="flex" alignItems="center" gap={0.5}>
            {/* Mobile Search Button */}
            {showSearch && isMobile && (
              <Tooltip title="Search">
                <IconButton onClick={handleSearchOpen} color="inherit">
                  <SearchIcon />
                </IconButton>
              </Tooltip>
            )}

            {/* Availability Toggle */}
            {showAvailabilityToggle && (
              <AvailabilityToggle
                available={available}
                onToggle={toggleAvailability}
                variant="badge"
                size="small"
                showLabel={false}
              />
            )}

            {/* Theme Toggle */}
            {showThemeToggle && (
              <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"}>
                <IconButton onClick={toggleDarkMode} color="inherit">
                  {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
            )}

            {/* Notifications */}
            {showNotifications && (
              <Tooltip title="Notifications">
                <IconButton onClick={handleNotificationOpen} color="inherit">
                  <Badge badgeContent={unreadCount || notificationCount} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}

            {/* User Menu */}
            <Tooltip title="Account">
              <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
                <Avatar
                  src={userAvatar || user?.avatar}
                  sx={{ width: 32, height: 32, bgcolor: "#6366f1" }}
                >
                  {getUserInitials}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Search Popover */}
      <Popover
        open={Boolean(searchAnchor)}
        anchorEl={searchAnchor}
        onClose={handleSearchClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { width: 400, maxWidth: "90vw", p: 0 } }}
      >
        <Box p={2} borderBottom={1} borderColor="divider" display="flex" alignItems="center" gap={1}>
          <SearchIcon color="action" />
          <input
            autoFocus
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "0.875rem",
              background: "none"
            }}
          />
          {searchQuery && (
            <IconButton size="small" onClick={() => setSearchQuery("")}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        
        <Box sx={{ maxHeight: 400, overflow: "auto" }}>
          {searching ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress size={32} />
            </Box>
          ) : searchResults.length === 0 && searchQuery ? (
            <Box p={4} textAlign="center">
              <Typography color="text.secondary">No results found</Typography>
            </Box>
          ) : (
            searchResults.map((result, index) => (
              <MenuItem
                key={index}
                onClick={() => {
                  navigate(result.path);
                  handleSearchClose();
                }}
              >
                <ListItemIcon>
                  {result.icon === "booking" && <CalendarIcon />}
                  {result.icon === "customer" && <PersonIcon />}
                  {result.icon === "payment" && <PaymentIcon />}
                </ListItemIcon>
                <ListItemText primary={result.title} secondary={result.subtitle} />
              </MenuItem>
            ))
          )}
        </Box>
      </Popover>

      {/* Notifications Popover */}
      <NotificationPopover
        open={Boolean(notificationAnchor)}
        anchorEl={notificationAnchor}
        onClose={handleNotificationClose}
        notifications={notifications}
        onMarkRead={onNotificationClick}
        onViewAll={onViewAllNotifications}
      />

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{ sx: { width: 220 } }}
      >
        <Box px={2} py={1.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            {userName || user?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {userEmail || user?.email}
          </Typography>
          <Chip
            label="Provider"
            size="small"
            color="primary"
            sx={{ mt: 1, height: 20, fontSize: "0.625rem" }}
          />
        </Box>
        <Divider />
        <MenuItem onClick={handleProfile}>
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSettings}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Sidebar Drawer (Mobile) */}
      <SidebarDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={() => setSidebarOpen(false)}
      />
    </>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
DashboardHeader.propTypes = {
  darkMode: PropTypes.bool,
  toggleDarkMode: PropTypes.func.isRequired,
  available: PropTypes.bool,
  toggleAvailability: PropTypes.func.isRequired,
  onEditProfile: PropTypes.func,
  onSettings: PropTypes.func,
  onLogout: PropTypes.func,
  userName: PropTypes.string,
  userAvatar: PropTypes.string,
  userEmail: PropTypes.string,
  notificationCount: PropTypes.number,
  notifications: PropTypes.array,
  onNotificationClick: PropTypes.func,
  onViewAllNotifications: PropTypes.func,
  showSearch: PropTypes.bool,
  showNotifications: PropTypes.bool,
  showThemeToggle: PropTypes.bool,
  showAvailabilityToggle: PropTypes.bool,
  variant: PropTypes.oneOf(["default", "compact"])
};

DashboardHeader.defaultProps = {
  darkMode: false,
  available: true,
  showSearch: true,
  showNotifications: true,
  showThemeToggle: true,
  showAvailabilityToggle: true,
  variant: "default",
  notificationCount: 0,
  notifications: [],
  userName: "",
  userAvatar: null,
  userEmail: ""
};

export default React.memo(DashboardHeader);