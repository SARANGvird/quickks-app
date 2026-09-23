// src/layouts/AdminLayout.jsx
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Box,
  useMediaQuery,
  useTheme,
  Backdrop,
  CircularProgress,
  Snackbar,
  Alert,
  Fade,
  Slide
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import Sidebar from "../components/Admin/Sidebar";
import Topbar from "../components/Admin/Topbar";
import { motion, AnimatePresence } from "framer-motion";

// ==========================================================
// STYLED COMPONENTS
// ==========================================================
const LayoutRoot = styled(Box)(({ theme }) => ({
  display: "flex",
  width: "100%",
  height: "100vh",
  backgroundColor: theme.palette.background.default,
  overflow: "hidden",
  position: "relative"
}));

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  position: "relative",
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  })
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  overflow: "auto",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2)
  },
  "&::-webkit-scrollbar": {
    width: "8px",
    height: "8px"
  },
  "&::-webkit-scrollbar-track": {
    background: theme.palette.grey[100],
    borderRadius: "4px"
  },
  "&::-webkit-scrollbar-thumb": {
    background: theme.palette.grey[400],
    borderRadius: "4px",
    "&:hover": {
      background: theme.palette.grey[500]
    }
  }
}));

// ==========================================================
// ANIMATION VARIANTS
// ==========================================================
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
/**
 * AdminLayout Component
 * 
 * Provides a consistent layout structure for all admin-facing pages,
 * including sidebar navigation, topbar, and responsive content area.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The content to be rendered within the layout
 * @param {boolean} props.requireAuth - Whether authentication is required
 * @param {boolean} props.showSidebar - Show sidebar navigation
 * @param {boolean} props.showTopbar - Show topbar
 * @param {boolean} props.enableAnimations - Enable page transition animations
 * @param {string} props.sidebarVariant - Sidebar variant (permanent, persistent, temporary)
 * @param {number} props.sidebarWidth - Width of sidebar in pixels
 * @param {string} props.className - Additional CSS class name
 * @param {Object} props.style - Additional inline styles
 */
const AdminLayout = ({
  children,
  requireAuth = true,
  showSidebar = true,
  showTopbar = true,
  enableAnimations = true,
  sidebarVariant = "permanent",
  sidebarWidth = 280,
  collapsedSidebarWidth = 80,
  className = "",
  style = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { notifications, removeNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [pageKey, setPageKey] = useState(0);
  
  // ==========================================================
  // SIDEBAR HANDLERS
  // ==========================================================
  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  }, [isMobile]);
  
  const handleSidebarClose = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);
  
  const handleSidebarOpen = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(true);
    }
  }, [isMobile]);
  
  // ==========================================================
  // RESPONSIVE BEHAVIOR
  // ==========================================================
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    } else if (!isMobile && !sidebarOpen && sidebarVariant === "permanent") {
      setSidebarOpen(true);
    }
  }, [isMobile, sidebarOpen, sidebarVariant]);
  
  // Auto-collapse sidebar on tablet
  useEffect(() => {
    if (isTablet && !isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    } else if (!isTablet && sidebarCollapsed && sidebarVariant === "permanent") {
      setSidebarCollapsed(false);
    }
  }, [isTablet, isMobile, sidebarCollapsed, sidebarVariant]);
  
  // ==========================================================
  // AUTHENTICATION CHECK
  // ==========================================================
  useEffect(() => {
    if (requireAuth && !authLoading && !isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = "/admin/login";
    }
  }, [requireAuth, authLoading, isAuthenticated]);
  
  // ==========================================================
  // LOADING STATE
  // ==========================================================
  if (authLoading && requireAuth) {
    return (
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={true}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress color="primary" />
          <Box sx={{ mt: 2, color: "#fff" }}>Loading Dashboard...</Box>
        </Box>
      </Backdrop>
    );
  }
  
  if (requireAuth && !isAuthenticated) {
    return null;
  }
  
  // Calculate sidebar width based on state
  const computedSidebarWidth = sidebarCollapsed ? collapsedSidebarWidth : sidebarWidth;
  
  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <LayoutRoot className={`admin-layout ${className}`} style={style}>
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={handleSidebarClose}
          onToggle={handleSidebarToggle}
          variant={isMobile ? "temporary" : sidebarVariant}
          width={computedSidebarWidth}
          collapsedWidth={collapsedSidebarWidth}
          user={user}
        />
      )}
      
      {/* Main Content */}
      <MainContent
        component="main"
        sx={{
          marginLeft: showSidebar && !isMobile && sidebarOpen ? computedSidebarWidth : 0,
          transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
          })
        }}
      >
        {/* Topbar */}
        {showTopbar && (
          <Topbar
            onMenuClick={handleSidebarToggle}
            sidebarOpen={sidebarOpen}
            sidebarCollapsed={sidebarCollapsed}
            user={user}
            isMobile={isMobile}
            onRefresh={() => setPageKey(prev => prev + 1)}
          />
        )}
        
        {/* Content Area with Animations */}
        <ContentWrapper>
          <AnimatePresence mode="wait">
            {enableAnimations ? (
              <motion.div
                key={pageKey}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            ) : (
              <Box>{children}</Box>
            )}
          </AnimatePresence>
        </ContentWrapper>
      </MainContent>
      
      {/* Global Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <Snackbar
            key={notification.id}
            open={true}
            autoHideDuration={notification.duration || 6000}
            onClose={() => removeNotification(notification.id)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            TransitionComponent={Slide}
            TransitionProps={{ direction: "left" }}
          >
            <Alert
              onClose={() => removeNotification(notification.id)}
              severity={notification.type}
              variant="filled"
              sx={{ 
                width: "100%", 
                borderRadius: 2,
                boxShadow: theme.shadows[3]
              }}
            >
              {notification.message}
            </Alert>
          </Snackbar>
        ))}
      </AnimatePresence>
      
      {/* Loading Backdrop */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 2,
          backdropFilter: "blur(4px)"
        }}
        open={loading}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={backdropVariants}
          transition={{ duration: 0.3 }}
          style={{ textAlign: "center" }}
        >
          <CircularProgress color="primary" />
          <Box sx={{ mt: 2 }}>Processing...</Box>
        </motion.div>
      </Backdrop>
      
      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert 
          severity="error" 
          onClose={() => setError(null)} 
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {error}
        </Alert>
      </Snackbar>
      
      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert 
          severity="success" 
          onClose={() => setSuccessMessage(null)} 
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </LayoutRoot>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
AdminLayout.propTypes = {
  /**
   * The child elements (pages or content) to render within the layout
   */
  children: PropTypes.node.isRequired,
  
  /**
   * Whether authentication is required to access this layout
   */
  requireAuth: PropTypes.bool,
  
  /**
   * Show sidebar navigation
   */
  showSidebar: PropTypes.bool,
  
  /**
   * Show topbar
   */
  showTopbar: PropTypes.bool,
  
  /**
   * Enable page transition animations
   */
  enableAnimations: PropTypes.bool,
  
  /**
   * Sidebar variant (permanent, persistent, temporary)
   */
  sidebarVariant: PropTypes.oneOf(["permanent", "persistent", "temporary"]),
  
  /**
   * Width of sidebar in pixels when expanded
   */
  sidebarWidth: PropTypes.number,
  
  /**
   * Width of sidebar in pixels when collapsed
   */
  collapsedSidebarWidth: PropTypes.number,
  
  /**
   * Additional CSS class name
   */
  className: PropTypes.string,
  
  /**
   * Additional inline styles
   */
  style: PropTypes.object
};

// ==========================================================
// DEFAULT PROPS
// ==========================================================
AdminLayout.defaultProps = {
  requireAuth: true,
  showSidebar: true,
  showTopbar: true,
  enableAnimations: true,
  sidebarVariant: "permanent",
  sidebarWidth: 280,
  collapsedSidebarWidth: 80,
  className: "",
  style: {}
};

// ==========================================================
// EXPORT
// ==========================================================
export default React.memo(AdminLayout);