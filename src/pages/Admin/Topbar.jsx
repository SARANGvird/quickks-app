// src/components/Admin/Topbar.jsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  InputBase,
  alpha,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  SwipeableDrawer,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Popover,
  Tabs,
  Tab
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Help as HelpIcon,
  Feedback as FeedbackIcon,
  AdminPanelSettings as AdminIcon,
  ChevronLeft as ChevronLeftIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsNone as NotificationsNoneIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { format, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";

// ==========================================================
// STYLED COMPONENTS
// ==========================================================
const SearchWrapper = styled(Box)(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(3),
    width: "auto",
  },
}));

const SearchIconWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "20ch",
    },
  },
}));

// ==========================================================
// NOTIFICATION ITEM COMPONENT
// ==========================================================
const NotificationItem = ({ notification, onClose }) => {
  const getIcon = (type) => {
    switch (type) {
      case "success": return <CheckCircleIcon sx={{ color: "#22c55e" }} />;
      case "warning": return <WarningIcon sx={{ color: "#f59e0b" }} />;
      case "error": return <ErrorIcon sx={{ color: "#ef4444" }} />;
      default: return <InfoIcon sx={{ color: "#3b82f6" }} />;
    }
  };

  return (
    <ListItem
      button
      onClick={() => {
        if (notification.onClick) notification.onClick();
        onClose();
      }}
      sx={{
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        '&:hover': { bgcolor: "action.hover" }
      }}
    >
      <ListItemIcon>
        {getIcon(notification.type)}
      </ListItemIcon>
      <ListItemText
        primary={notification.title}
        secondary={
          <React.Fragment>
            <Typography variant="caption" color="text.secondary" display="block">
              {notification.message}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
            </Typography>
          </React.Fragment>
        }
      />
    </ListItem>
  );
};

// ==========================================================
// MAIN TOPBAR COMPONENT
// ==========================================================
const Topbar = ({ onMenuClick, sidebarOpen, theme, onThemeToggle }) => {
  const navigate = useNavigate();
  const themeMui = useTheme();
  const isMobile = useMediaQuery(themeMui.breakpoints.down("md"));
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [searchAnchor, setSearchAnchor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notificationTab, setNotificationTab] = useState(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Refs
  const searchTimeoutRef = useRef(null);

  // ==========================================================
  // FULLSCREEN HANDLER
  // ==========================================================
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // ==========================================================
  // SEARCH HANDLER
  // ==========================================================
  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      // Simulate API call - replace with actual search API
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, handleSearch]);

  // ==========================================================
  // HANDLERS
  // ==========================================================
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

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate("/login");
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate("/dashboard/admin/profile");
  };

  const handleSettings = () => {
    handleMenuClose();
    navigate("/dashboard/admin/settings");
  };

  const handleViewAllNotifications = () => {
    handleNotificationClose();
    navigate("/dashboard/admin/notifications");
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  // ==========================================================
  // MEMOIZED VALUES
  // ==========================================================
  const userInitials = useMemo(() => {
    if (!user?.name) return "AD";
    return user.name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user?.name]);

  const filteredNotifications = useMemo(() => {
    if (notificationTab === 0) return notifications;
    if (notificationTab === 1) return notifications.filter(n => !n.read);
    if (notificationTab === 2) return notifications.filter(n => n.type === "booking");
    if (notificationTab === 3) return notifications.filter(n => n.type === "system");
    return notifications;
  }, [notifications, notificationTab]);

  // ==========================================================
  // RENDER
  // ==========================================================
  const menuItems = [
    { label: "Profile", icon: <PersonIcon />, onClick: handleProfile },
    { label: "Settings", icon: <SettingsIcon />, onClick: handleSettings },
    { divider: true },
    { label: "Help", icon: <HelpIcon />, onClick: () => navigate("/dashboard/admin/help") },
    { label: "Feedback", icon: <FeedbackIcon />, onClick: () => navigate("/dashboard/admin/feedback") },
    { divider: true },
    { label: "Logout", icon: <LogoutIcon />, onClick: handleLogout, color: "error" }
  ];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
        zIndex: themeMui.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", minHeight: { xs: 56, sm: 64 } }}>
        {/* Left Section */}
        <Box display="flex" alignItems="center" gap={1}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={onMenuClick}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(135deg, #6A1B9A, #9C27B0)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: { xs: "none", sm: "block" }
            }}
          >
            Quickks Admin
          </Typography>
        </Box>

        {/* Center Section - Search (Desktop) */}
        {!isMobile && (
          <SearchWrapper>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search…"
              inputProps={{ "aria-label": "search" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchOpen}
            />
          </SearchWrapper>
        )}

        {/* Right Section */}
        <Box display="flex" alignItems="center" gap={0.5}>
          {/* Mobile Search Button */}
          {isMobile && (
            <Tooltip title="Search">
              <IconButton onClick={handleSearchOpen}>
                <SearchIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Theme Toggle */}
          <Tooltip title={theme === "dark" ? "Light Mode" : "Dark Mode"}>
            <IconButton onClick={onThemeToggle} color="inherit">
              {theme === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Fullscreen Toggle */}
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton onClick={toggleFullscreen} color="inherit">
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton onClick={handleNotificationOpen} color="inherit">
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title="Account">
            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} style={{ width: 32, height: 32, borderRadius: "50%" }} />
                ) : (
                  userInitials
                )}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Search Results Popover */}
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
          <InputBase
            autoFocus
            fullWidth
            placeholder="Search users, bookings, providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              <ListItem
                key={index}
                button
                onClick={() => {
                  navigate(result.path);
                  handleSearchClose();
                }}
              >
                <ListItemIcon>
                  {result.icon === "user" && <PersonIcon />}
                  {result.icon === "booking" && <AdminIcon />}
                  {result.icon === "provider" && <AdminIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={result.title}
                  secondary={result.subtitle}
                />
              </ListItem>
            ))
          )}
        </Box>
      </Popover>

      {/* Notifications Popover */}
      <Popover
        open={Boolean(notificationAnchor)}
        anchorEl={notificationAnchor}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 380, maxWidth: "90vw", p: 0 } }}
      >
        <Box p={2} borderBottom={1} borderColor="divider" display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight="bold">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </Box>
        
        <Tabs
          value={notificationTab}
          onChange={(e, v) => setNotificationTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="All" />
          <Tab label={`Unread (${unreadCount})`} />
          <Tab label="Bookings" />
          <Tab label="System" />
        </Tabs>
        
        <Box sx={{ maxHeight: 400, overflow: "auto" }}>
          {filteredNotifications.length === 0 ? (
            <Box p={4} textAlign="center">
              <NotificationsNoneIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
              <Typography color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClose={handleNotificationClose}
                />
              ))}
            </List>
          )}
        </Box>
        
        <Box p={1.5} borderTop={1} borderColor="divider" textAlign="center">
          <Button size="small" onClick={handleViewAllNotifications}>
            View All Notifications
          </Button>
        </Box>
      </Popover>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{ sx: { width: 200 } }}
      >
        <Box px={2} py={1.5}>
          <Typography variant="subtitle2" fontWeight="bold">
            {user?.name || "Admin User"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email || "admin@quickks.com"}
          </Typography>
          <Chip
            label={user?.role || "Admin"}
            size="small"
            color="primary"
            sx={{ mt: 1, height: 20, fontSize: "0.625rem" }}
          />
        </Box>
        <Divider />
        {menuItems.map((item, index) => (
          item.divider ? (
            <Divider key={index} />
          ) : (
            <MenuItem
              key={item.label}
              onClick={item.onClick}
              sx={{ color: item.color }}
            >
              <ListItemIcon sx={{ color: item.color || "inherit" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          )
        ))}
      </Menu>

      {/* Mobile Search Drawer */}
      <SwipeableDrawer
        anchor="top"
        open={Boolean(searchAnchor && isMobile)}
        onClose={handleSearchClose}
        onOpen={() => {}}
        PaperProps={{ sx: { p: 2 } }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <SearchIcon color="action" />
          <InputBase
            autoFocus
            fullWidth
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <IconButton onClick={handleSearchClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
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
            <ListItem
              key={index}
              button
              onClick={() => {
                navigate(result.path);
                handleSearchClose();
              }}
            >
              <ListItemText primary={result.title} secondary={result.subtitle} />
            </ListItem>
          ))
        )}
      </SwipeableDrawer>
    </AppBar>
  );
};

export default React.memo(Topbar);