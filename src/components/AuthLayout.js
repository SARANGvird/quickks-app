// src/components/AuthLayout.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Fade,
  Grow,
  Slide,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
  Snackbar
} from "@mui/material";
import {
  Close as CloseIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import { motion } from "framer-motion";

// Constants
const DEFAULT_BG_IMAGES = [
  "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1470&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1470&q=80",
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1470&q=80",
  "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1470&q=80"
];

const ANIMATION_DURATION = 300;
const BG_ROTATION_INTERVAL = 5000; // 5 seconds

const AuthLayout = ({
  title = "Quickks",
  subtitle,
  children,
  showLogo = true,
  showThemeToggle = true,
  backgroundImages = DEFAULT_BG_IMAGES,
  enableBgRotation = false,
  maxWidth = "sm",
  className = "",
  style = {},
  onThemeChange,
  onClose,
  showCloseButton = false,
  loading = false,
  error = null,
  successMessage = null,
  showBackdrop = true,
  backdropBlur = "sm",
  cardElevation = 10,
  cardRadius = 3,
  animation = "fade",
  logoUrl = process.env.REACT_APP_LOGO_URL || "/logo.png",
  logoAlt = "Quickks Logo",
  logoHeight = 64,
  logoWidth = 64,
  customLogo = null,
  footerContent = null,
  headerContent = null,
  testId = "auth-layout"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  
  // State Management
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [bgImageLoaded, setBgImageLoaded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [darkMode, setDarkMode] = useState(prefersDarkMode);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // Memoized Values
  const currentBgImage = useMemo(() => {
    if (backgroundImages && backgroundImages.length > 0) {
      return backgroundImages[currentBgIndex % backgroundImages.length];
    }
    return DEFAULT_BG_IMAGES[0];
  }, [backgroundImages, currentBgIndex]);

  const backdropBlurValue = useMemo(() => {
    switch (backdropBlur) {
      case "none": return 0;
      case "sm": return 4;
      case "md": return 8;
      case "lg": return 12;
      default: return 4;
    }
  }, [backdropBlur]);

  const cardBackground = useMemo(() => {
    if (darkMode) {
      return "rgba(30, 30, 30, 0.95)";
    }
    return "rgba(255, 255, 255, 0.95)";
  }, [darkMode]);

  const textColor = useMemo(() => {
    return darkMode ? "#f9fafb" : "#111827";
  }, [darkMode]);

  const secondaryTextColor = useMemo(() => {
    return darkMode ? "#9ca3af" : "#6b7280";
  }, [darkMode]);

  // Handle success message
  useEffect(() => {
    if (successMessage) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle error message
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Background image rotation
  useEffect(() => {
    if (!enableBgRotation || !backgroundImages.length) return;
    
    const interval = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % backgroundImages.length);
      setBgImageLoaded(false);
    }, BG_ROTATION_INTERVAL);
    
    return () => clearInterval(interval);
  }, [enableBgRotation, backgroundImages.length]);

  // Handle dark mode change
  const handleThemeToggle = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (onThemeChange) {
      onThemeChange(newDarkMode);
    }
    // Apply dark mode class to document
    if (newDarkMode) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
  }, [darkMode, onThemeChange]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setBgImageLoaded(true);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Show snackbar notification
  const showNotification = useCallback((message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Get animation component based on prop
  const getAnimationComponent = useCallback((children) => {
    switch (animation) {
      case "fade":
        return (
          <Fade in timeout={ANIMATION_DURATION}>
            {children}
          </Fade>
        );
      case "grow":
        return (
          <Grow in timeout={ANIMATION_DURATION}>
            {children}
          </Grow>
        );
      case "slide":
        return (
          <Slide direction="up" in timeout={ANIMATION_DURATION}>
            {children}
          </Slide>
        );
      default:
        return children;
    }
  }, [animation]);

  // Render logo
  const renderLogo = () => {
    if (!showLogo) return null;
    
    if (customLogo) {
      return customLogo;
    }
    
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <img
          src={logoUrl}
          alt={logoAlt}
          height={logoHeight}
          width={logoWidth}
          style={{
            height: logoHeight,
            width: logoWidth,
            objectFit: "contain",
            marginBottom: "8px"
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/fallback-logo.png";
            showNotification("Logo failed to load", "warning");
          }}
        />
      </motion.div>
    );
  };

  // Render header
  const renderHeader = () => {
    if (headerContent) return headerContent;
    
    return (
      <Box textAlign="center" mb={3}>
        {renderLogo()}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            color: textColor,
            mb: 1,
            fontSize: isMobile ? "1.75rem" : "2rem",
            background: darkMode ? "linear-gradient(135deg, #818cf8, #c084fc)" : "linear-gradient(135deg, #4f46e5, #a855f7)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ color: secondaryTextColor, mt: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    );
  };

  // Render alerts
  const renderAlerts = () => (
    <>
      {showSuccess && successMessage && (
        <Fade in={showSuccess}>
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            sx={{
              mb: 2,
              borderRadius: 2,
              animation: "slideDown 0.3s ease"
            }}
            onClose={() => setShowSuccess(false)}
          >
            {successMessage}
          </Alert>
        </Fade>
      )}
      
      {showError && error && (
        <Fade in={showError}>
          <Alert
            severity="error"
            icon={<WarningIcon />}
            sx={{
              mb: 2,
              borderRadius: 2,
              animation: "slideDown 0.3s ease"
            }}
            onClose={() => setShowError(false)}
          >
            {error}
          </Alert>
        </Fade>
      )}
    </>
  );

  // Render loading overlay
  const renderLoadingOverlay = () => {
    if (!loading) return null;
    
    return (
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
          zIndex: 10,
          backdropFilter: "blur(4px)"
        }}
      >
        <CircularProgress />
      </Box>
    );
  };

  // Render theme toggle
  const renderThemeToggle = () => {
    if (!showThemeToggle) return null;
    
    return (
      <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
        <IconButton
          onClick={handleThemeToggle}
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            backgroundColor: cardBackground,
            backdropFilter: "blur(8px)",
            "&:hover": {
              backgroundColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"
            }
          }}
        >
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Tooltip>
    );
  };

  // Render close button
  const renderCloseButton = () => {
    if (!showCloseButton) return null;
    
    return (
      <Tooltip title="Close">
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            backgroundColor: cardBackground,
            backdropFilter: "blur(8px)",
            "&:hover": {
              backgroundColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Tooltip>
    );
  };

  // Render footer
  const renderFooter = () => {
    if (footerContent) return footerContent;
    
    return (
      <Box
        sx={{
          mt: 3,
          pt: 2,
          borderTop: `1px solid ${darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
          textAlign: "center"
        }}
      >
        <Typography variant="caption" sx={{ color: secondaryTextColor }}>
          © {new Date().getFullYear()} Quickks. All rights reserved.
        </Typography>
      </Box>
    );
  };

  return (
    <Box
      data-testid={testId}
      sx={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: darkMode ? "#121212" : "#f5f5f5",
        overflow: "hidden",
        ...style
      }}
      className={className}
    >
      {/* Background Image with Overlay */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${currentBgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transition: "background-image 0.5s ease-in-out",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: darkMode ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",
            backdropFilter: `blur(${backdropBlurValue}px)`
          }
        }}
      >
        {!bgImageLoaded && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)"
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <img
          src={currentBgImage}
          alt="Background"
          style={{ display: "none" }}
          onLoad={handleImageLoad}
        />
      </Box>

      {/* Main Content Container */}
      <Container
        maxWidth={maxWidth}
        sx={{
          position: "relative",
          zIndex: 2,
          px: isMobile ? 2 : 3
        }}
      >
        {getAnimationComponent(
          <Paper
            elevation={cardElevation}
            sx={{
              position: "relative",
              p: { xs: 3, sm: 4 },
              borderRadius: cardRadius,
              backgroundColor: cardBackground,
              backdropFilter: "blur(8px)",
              transition: "all 0.3s ease",
              overflow: "hidden"
            }}
          >
            {/* Theme Toggle */}
            {renderThemeToggle()}
            
            {/* Close Button */}
            {renderCloseButton()}
            
            {/* Header */}
            {renderHeader()}
            
            {/* Alerts */}
            {renderAlerts()}
            
            {/* Main Content */}
            <Box sx={{ position: "relative" }}>
              {renderLoadingOverlay()}
              {children}
            </Box>
            
            {/* Footer */}
            {renderFooter()}
          </Paper>
        )}
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Add global styles for animations */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .dark-mode {
          filter: invert(0) !important;
        }
        
        /* Smooth transitions */
        * {
          transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${darkMode ? "#1f2937" : "#f1f1f1"};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${darkMode ? "#4b5563" : "#cbd5e1"};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? "#6b7280" : "#9ca3af"};
        }
      `}</style>
    </Box>
  );
};

// PropTypes for type checking
AuthLayout.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  showLogo: PropTypes.bool,
  showThemeToggle: PropTypes.bool,
  backgroundImages: PropTypes.arrayOf(PropTypes.string),
  enableBgRotation: PropTypes.bool,
  maxWidth: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl", false]),
  className: PropTypes.string,
  style: PropTypes.object,
  onThemeChange: PropTypes.func,
  onClose: PropTypes.func,
  showCloseButton: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.string,
  successMessage: PropTypes.string,
  showBackdrop: PropTypes.bool,
  backdropBlur: PropTypes.oneOf(["none", "sm", "md", "lg"]),
  cardElevation: PropTypes.number,
  cardRadius: PropTypes.number,
  animation: PropTypes.oneOf(["fade", "grow", "slide", "none"]),
  logoUrl: PropTypes.string,
  logoAlt: PropTypes.string,
  logoHeight: PropTypes.number,
  logoWidth: PropTypes.number,
  customLogo: PropTypes.node,
  footerContent: PropTypes.node,
  headerContent: PropTypes.node,
  testId: PropTypes.string
};

// Default props
AuthLayout.defaultProps = {
  title: "Quickks",
  subtitle: "",
  showLogo: true,
  showThemeToggle: true,
  backgroundImages: DEFAULT_BG_IMAGES,
  enableBgRotation: false,
  maxWidth: "sm",
  className: "",
  style: {},
  onThemeChange: null,
  onClose: null,
  showCloseButton: false,
  loading: false,
  error: null,
  successMessage: null,
  showBackdrop: true,
  backdropBlur: "sm",
  cardElevation: 10,
  cardRadius: 3,
  animation: "fade",
  logoUrl: process.env.REACT_APP_LOGO_URL || "/logo.png",
  logoAlt: "Quickks Logo",
  logoHeight: 64,
  logoWidth: 64,
  customLogo: null,
  footerContent: null,
  headerContent: null,
  testId: "auth-layout"
};

export default React.memo(AuthLayout);