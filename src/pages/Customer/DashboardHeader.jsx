// src/components/DashboardHeader/DashboardHeader.jsx
import React, { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Box,
  Stack,
  Chip,
  Tooltip,
  Divider,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  SwipeableDrawer
} from "@mui/material";
import {
  Add as AddIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  Payment as PaymentIcon,
  Star as StarIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon
} from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// ==========================================================
// STYLED COMPONENTS
// ==========================================================
const StyledAppBar = styled(AppBar)(({ theme, scrolled = false }) => ({
  background: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.background.paper, 0.95)
    : alpha(theme.palette.background.paper, 0.95),
  backdropFilter: 'blur(10px)',
  boxShadow: scrolled 
    ? '0 4px 20px rgba(0, 0, 0, 0.05)'
    : 'none',
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s ease'
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(1, 3),
  },
  gap: theme.spacing(2)
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  cursor: 'pointer'
}));

const LogoIcon = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  borderRadius: theme.shape.borderRadius,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '20px',
  boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`
}));

const UserSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5)
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`
  }
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  textTransform: 'none',
  fontWeight: 600,
  padding: theme.spacing(1, 2.5),
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)'
  }
}));

const MobileMenuButton = styled(IconButton)(({ theme }) => ({
  display: 'none',
  [theme.breakpoints.down('md')]: {
    display: 'inline-flex'
  }
}));

const DesktopMenu = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  [theme.breakpoints.down('md')]: {
    display: 'none'
  }
}));

// ==========================================================
// HELPER COMPONENTS
// ==========================================================
const Greeting = ({ userName }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {getGreeting()}
      </Typography>
      <Typography variant="h6" fontWeight="bold" component="h1">
        {userName}
      </Typography>
    </Box>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const DashboardHeader = ({
  userName = "User",
  userEmail,
  userAvatar,
  onNewBooking,
  onLogout,
  onSettings,
  onHelp,
  onThemeToggle,
  isDarkMode = false,
  notificationCount = 0,
  onNotificationClick,
  showNewBookingButton = true,
  showLogoutButton = true,
  showSettingsButton = true,
  showThemeToggle = true,
  showNotifications = true,
  appName = "QuickServe",
  appLogo,
  navItems = [],
  onNavItemClick,
  className = "",
  elevation = 0,
  position = "sticky",
  color = "default"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('sm'));
  const [scrolled, setScrolled] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Handle scroll effect
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Menu handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    if (onLogout) onLogout();
  };

  const handleSettingsClick = () => {
    handleMenuClose();
    if (onSettings) onSettings();
  };

  const handleHelpClick = () => {
    handleMenuClose();
    if (onHelp) onHelp();
  };

  const handleNavItemClick = (item) => {
    setMobileDrawerOpen(false);
    if (onNavItemClick) onNavItemClick(item);
  };

  // Get user initials
  const getUserInitials = useMemo(() => {
    if (!userName) return "U";
    return userName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [userName]);

  // Format current time
  const formattedTime = useMemo(() => {
    return format(currentTime, 'hh:mm a');
  }, [currentTime]);

  // Mobile drawer content
  const mobileDrawerContent = (
    <Box sx={{ width: 280, pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2 }}>
        <IconButton onClick={() => setMobileDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      <List>
        {navItems.map((item, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton onClick={() => handleNavItemClick(item)}>
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        
        {showNotifications && (
          <ListItem disablePadding>
            <ListItemButton onClick={onNotificationClick}>
              <ListItemIcon>
                <Badge badgeContent={notificationCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Notifications" />
              {notificationCount > 0 && (
                <Chip label={notificationCount} size="small" color="error" />
              )}
            </ListItemButton>
          </ListItem>
        )}
        
        {showSettingsButton && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleSettingsClick}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </ListItem>
        )}
        
        {showThemeToggle && (
          <ListItem disablePadding>
            <ListItemButton onClick={onThemeToggle}>
              <ListItemIcon>
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </ListItemIcon>
              <ListItemText primary={isDarkMode ? "Light Mode" : "Dark Mode"} />
            </ListItemButton>
          </ListItem>
        )}
        
        <ListItem disablePadding>
          <ListItemButton onClick={handleHelpClick}>
            <ListItemIcon>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText primary="Help & Support" />
          </ListItemButton>
        </ListItem>
      </List>
      
      <Divider sx={{ my: 1 }} />
      
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogoutClick}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <StyledAppBar 
        position={position} 
        elevation={elevation}
        scrolled={scrolled}
        color={color}
        className={className}
      >
        <StyledToolbar>
          {/* Logo Section */}
          <LogoContainer onClick={() => window.location.href = '/'}>
            <LogoIcon>
              {appLogo || (
                <Box component="span" sx={{ fontWeight: 'bold' }}>
                  Q
                </Box>
              )}
            </LogoIcon>
            <Typography variant="h6" fontWeight="bold" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {appName}
            </Typography>
          </LogoContainer>

          {/* Mobile Menu Button */}
          <MobileMenuButton onClick={() => setMobileDrawerOpen(true)}>
            <MenuIcon />
          </MobileMenuButton>

          {/* Desktop Navigation */}
          <DesktopMenu>
            {navItems.map((item, index) => (
              <Button
                key={index}
                color="inherit"
                startIcon={item.icon}
                onClick={() => onNavItemClick?.(item)}
                sx={{ textTransform: 'none' }}
              >
                {item.label}
              </Button>
            ))}
          </DesktopMenu>

          {/* Right Section */}
          <UserSection>
            {/* Time Display */}
            {!isTablet && (
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                {formattedTime}
              </Typography>
            )}
            
            {/* Notifications */}
            {showNotifications && (
              <Tooltip title="Notifications">
                <IconButton onClick={onNotificationClick} size="small">
                  <Badge badgeContent={notificationCount} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
            
            {/* Theme Toggle */}
            {showThemeToggle && !isMobile && (
              <Tooltip title={isDarkMode ? "Light Mode" : "Dark Mode"}>
                <IconButton onClick={onThemeToggle} size="small">
                  {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
            )}
            
            {/* New Booking Button */}
            {showNewBookingButton && (
              <StyledButton
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onNewBooking}
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                New Booking
              </StyledButton>
            )}
            
            {/* User Menu */}
            <Tooltip title="Account">
              <StyledAvatar
                src={userAvatar}
                onClick={handleMenuOpen}
                aria-label="user menu"
              >
                {!userAvatar && getUserInitials}
              </StyledAvatar>
            </Tooltip>
          </UserSection>
        </StyledToolbar>
      </StyledAppBar>

      {/* User Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {userName}
          </Typography>
          {userEmail && (
            <Typography variant="caption" color="text.secondary">
              {userEmail}
            </Typography>
          )}
        </Box>
        
        <Divider />
        
        <MenuItem onClick={handleSettingsClick}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleHelpClick}>
          <ListItemIcon>
            <HelpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Help & Support</ListItemText>
        </MenuItem>
        
        {showThemeToggle && isMobile && (
          <MenuItem onClick={onThemeToggle}>
            <ListItemIcon>
              {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{isDarkMode ? "Light Mode" : "Dark Mode"}</ListItemText>
          </MenuItem>
        )}
        
        <Divider />
        
        <MenuItem onClick={handleLogoutClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Mobile Drawer */}
      <SwipeableDrawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpen={() => setMobileDrawerOpen(true)}
        PaperProps={{
          sx: {
            backgroundImage: 'none'
          }
        }}
      >
        {mobileDrawerContent}
      </SwipeableDrawer>
    </>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
DashboardHeader.propTypes = {
  userName: PropTypes.string,
  userEmail: PropTypes.string,
  userAvatar: PropTypes.string,
  onNewBooking: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  onSettings: PropTypes.func,
  onHelp: PropTypes.func,
  onThemeToggle: PropTypes.func,
  isDarkMode: PropTypes.bool,
  notificationCount: PropTypes.number,
  onNotificationClick: PropTypes.func,
  showNewBookingButton: PropTypes.bool,
  showLogoutButton: PropTypes.bool,
  showSettingsButton: PropTypes.bool,
  showThemeToggle: PropTypes.bool,
  showNotifications: PropTypes.bool,
  appName: PropTypes.string,
  appLogo: PropTypes.node,
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      path: PropTypes.string
    })
  ),
  onNavItemClick: PropTypes.func,
  className: PropTypes.string,
  elevation: PropTypes.number,
  position: PropTypes.oneOf(['fixed', 'absolute', 'sticky', 'static', 'relative']),
  color: PropTypes.oneOf(['default', 'primary', 'secondary', 'transparent'])
};

DashboardHeader.defaultProps = {
  userName: 'User',
  userEmail: '',
  userAvatar: '',
  onSettings: () => {},
  onHelp: () => {},
  onThemeToggle: () => {},
  isDarkMode: false,
  notificationCount: 0,
  onNotificationClick: () => {},
  showNewBookingButton: true,
  showLogoutButton: true,
  showSettingsButton: true,
  showThemeToggle: true,
  showNotifications: true,
  appName: 'QuickServe',
  appLogo: null,
  navItems: [],
  onNavItemClick: () => {},
  className: '',
  elevation: 0,
  position: 'sticky',
  color: 'default'
};

// ==========================================================
// MEMOIZED EXPORT
// ==========================================================
export default React.memo(DashboardHeader);