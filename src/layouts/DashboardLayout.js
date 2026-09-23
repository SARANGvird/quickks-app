// src/layouts/DashboardLayout.jsx
import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAdminDashboardSocket } from "../hooks/useAdminDashboardSocket";
import { useNotification } from "../contexts/NotificationContext";
import Sidebar from "../components/Sidebar";
import {
  FaBars,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
  FaCog,
  FaQuestionCircle,
  FaChevronDown,
  FaSpinner,
  FaWifi,
  FaWifiSlash,
  FaMoon,
  FaSun,
  FaDesktop,
  FaMobileAlt,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPrint
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// ==========================================================
// CONSTANTS
// ==========================================================
const THEMES = {
  LIGHT: "light",
  DARK: "dark"
};

const SIDEBAR_VARIANTS = {
  EXPANDED: "expanded",
  COLLAPSED: "collapsed",
  HIDDEN: "hidden"
};

const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const formatDate = (date) => {
  return format(date, "EEEE, MMMM do, yyyy");
};

// ==========================================================
// COMPONENTS
// ==========================================================
const LoadingSpinner = () => (
  <div style={styles.loadingContainer}>
    <FaSpinner className="spin" size={40} color="#6366f1" />
    <p>Loading dashboard...</p>
  </div>
);

const ConnectionStatus = ({ isConnected, isReconnecting }) => (
  <div style={styles.connectionStatus}>
    <div
      className={`status-dot ${isConnected ? "connected" : isReconnecting ? "reconnecting" : "disconnected"}`}
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: isConnected ? "#10b981" : isReconnecting ? "#f59e0b" : "#ef4444",
        boxShadow: isConnected ? "0 0 8px #10b981" : "none"
      }}
    />
    <span style={styles.connectionText}>
      {isConnected ? "Live" : isReconnecting ? "Reconnecting..." : "Offline"}
    </span>
  </div>
);

const UserMenu = ({ user, onLogout, onSettings, onHelp }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getUserInitials = () => {
    const name = user?.name || "User";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div ref={menuRef} style={styles.userMenuContainer}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.userMenuButton}
        aria-label="User menu"
      >
        <div style={styles.userAvatar}>
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} style={styles.avatarImage} />
          ) : (
            getUserInitials()
          )}
        </div>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{user?.name || "User"}</span>
          <span style={styles.userRole}>{user?.role || "Guest"}</span>
        </div>
        <FaChevronDown size={12} style={{ marginLeft: 8, opacity: 0.6 }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={styles.userDropdown}
          >
            <div style={styles.dropdownHeader}>
              <div style={styles.dropdownAvatar}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} style={styles.avatarImage} />
                ) : (
                  getUserInitials()
                )}
              </div>
              <div>
                <div style={styles.dropdownName}>{user?.name}</div>
                <div style={styles.dropdownEmail}>{user?.email}</div>
              </div>
            </div>
            <div style={styles.dropdownDivider} />
            <button onClick={onSettings} style={styles.dropdownItem}>
              <FaCog size={14} /> Settings
            </button>
            <button onClick={onHelp} style={styles.dropdownItem}>
              <FaQuestionCircle size={14} /> Help & Support
            </button>
            <div style={styles.dropdownDivider} />
            <button onClick={onLogout} style={{ ...styles.dropdownItem, ...styles.logoutItem }}>
              <FaSignOutAlt size={14} /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationBell = ({ notifications, unreadCount, onMarkRead, onViewAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "booking": return "📅";
      case "payment": return "💰";
      case "system": return "⚙️";
      case "alert": return "⚠️";
      default: return "🔔";
    }
  };

  return (
    <div ref={bellRef} style={styles.notificationContainer}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.notificationButton}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <FaBell size={18} />
        {unreadCount > 0 && (
          <span style={styles.notificationBadge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={styles.notificationDropdown}
          >
            <div style={styles.notificationHeader}>
              <span style={styles.notificationTitle}>Notifications</span>
              {unreadCount > 0 && (
                <button onClick={onMarkRead} style={styles.markReadButton}>
                  Mark all read
                </button>
              )}
            </div>
            <div style={styles.notificationList}>
              {notifications?.length > 0 ? (
                notifications.slice(0, 5).map((notif, index) => (
                  <div key={notif.id || index} style={styles.notificationItem}>
                    <div style={styles.notificationIcon}>
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div style={styles.notificationContent}>
                      <div style={styles.notificationMessage}>{notif.message}</div>
                      <div style={styles.notificationTime}>
                        {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.noNotifications}>No notifications</div>
              )}
            </div>
            <div style={styles.notificationFooter}>
              <button onClick={onViewAll} style={styles.viewAllButton}>
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const DashboardLayout = ({ children }) => {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [sidebarVariant, setSidebarVariant] = useState(SIDEBAR_VARIANTS.EXPANDED);
  const [theme, setTheme] = useState(THEMES.LIGHT);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Socket connection for real-time updates
  const socketData = useAdminDashboardSocket(user?.accessToken, {
    restBootstrap: true,
    onNotification: (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      addNotification({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        duration: 5000
      });
    }
  });

  // ==========================================================
  // RESPONSIVE HANDLING
  // ==========================================================
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < BREAKPOINTS.MOBILE);
      
      if (width < BREAKPOINTS.MOBILE) {
        setSidebarVariant(SIDEBAR_VARIANTS.HIDDEN);
      } else if (width < BREAKPOINTS.TABLET) {
        setSidebarVariant(SIDEBAR_VARIANTS.COLLAPSED);
      } else {
        setSidebarVariant(SIDEBAR_VARIANTS.EXPANDED);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ==========================================================
  // THEME MANAGEMENT
  // ==========================================================
  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboard_theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
    localStorage.setItem("dashboard_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    addNotification({
      type: "info",
      title: "Theme Changed",
      message: `${newTheme === THEMES.DARK ? "Dark" : "Light"} mode activated`,
      duration: 2000
    });
  }, [theme, addNotification]);

  // ==========================================================
  // HANDLERS
  // ==========================================================
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
      addNotification({
        type: "success",
        title: "Logged Out",
        message: "You have been successfully logged out.",
        duration: 3000
      });
    } catch (error) {
      console.error("Logout error:", error);
      addNotification({
        type: "error",
        title: "Logout Failed",
        message: "An error occurred while logging out.",
        duration: 5000
      });
    }
  }, [logout, navigate, addNotification]);

  const handleSettings = useCallback(() => {
    navigate("/dashboard/settings");
  }, [navigate]);

  const handleHelp = useCallback(() => {
    navigate("/dashboard/help");
  }, [navigate]);

  const handleMarkAllRead = useCallback(() => {
    setUnreadCount(0);
    addNotification({
      type: "success",
      title: "Notifications Read",
      message: "All notifications marked as read.",
      duration: 2000
    });
  }, [addNotification]);

  const handleViewAllNotifications = useCallback(() => {
    navigate("/dashboard/notifications");
  }, [navigate]);

  const toggleSidebar = useCallback(() => {
    if (sidebarVariant === SIDEBAR_VARIANTS.EXPANDED) {
      setSidebarVariant(SIDEBAR_VARIANTS.COLLAPSED);
    } else if (sidebarVariant === SIDEBAR_VARIANTS.COLLAPSED) {
      setSidebarVariant(SIDEBAR_VARIANTS.EXPANDED);
    }
  }, [sidebarVariant]);

  const showMobileSidebar = useCallback(() => {
    setSidebarVariant(SIDEBAR_VARIANTS.EXPANDED);
  }, []);

  const hideMobileSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarVariant(SIDEBAR_VARIANTS.HIDDEN);
    }
  }, [isMobile]);

  // ==========================================================
  // LOADING STATE
  // ==========================================================
  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    navigate("/login");
    return null;
  }

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================
  const greeting = getGreeting();
  const currentDate = formatDate(new Date());
  const isSidebarVisible = sidebarVariant !== SIDEBAR_VARIANTS.HIDDEN;

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div style={{ ...styles.container, ...styles[`container${theme.charAt(0).toUpperCase() + theme.slice(1)}`] }}>
      {/* Sidebar */}
      <Sidebar
        role={user.role}
        variant={sidebarVariant}
        onNavigate={hideMobileSidebar}
        theme={theme}
      />
      
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarVisible && (
        <div style={styles.sidebarOverlay} onClick={hideMobileSidebar} />
      )}
      
      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={{ ...styles.header, ...styles[`header${theme.charAt(0).toUpperCase() + theme.slice(1)}`] }}>
          <div style={styles.headerLeft}>
            {isMobile && !isSidebarVisible && (
              <button onClick={showMobileSidebar} style={styles.menuButton} aria-label="Menu">
                <FaBars size={20} />
              </button>
            )}
            {!isMobile && (
              <button onClick={toggleSidebar} style={styles.menuButton} aria-label="Toggle sidebar">
                <FaBars size={18} />
              </button>
            )}
            
            <div style={styles.headerInfo}>
              <h2 style={styles.greeting}>{greeting}, {user.name?.split(" ")[0]}!</h2>
              <div style={styles.dateInfo}>
                <span>{currentDate}</span>
              </div>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            {/* Search Bar */}
            <div style={styles.searchContainer}>
              <FaSearch size={14} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            
            {/* Connection Status */}
            <ConnectionStatus 
              isConnected={socketData?.connected} 
              isReconnecting={socketData?.connectionState === "reconnecting"}
            />
            
            {/* Theme Toggle */}
            <button onClick={toggleTheme} style={styles.iconButton} aria-label="Toggle theme">
              {theme === THEMES.LIGHT ? <FaMoon size={16} /> : <FaSun size={16} />}
            </button>
            
            {/* Notifications */}
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkRead={handleMarkAllRead}
              onViewAll={handleViewAllNotifications}
            />
            
            {/* User Menu */}
            <UserMenu
              user={user}
              onLogout={handleLogout}
              onSettings={handleSettings}
              onHelp={handleHelp}
            />
          </div>
        </div>
        
        {/* Page Content */}
        <div style={styles.pageContent}>
          <Suspense fallback={<LoadingSpinner />}>
            {children || <Outlet context={{ socketData, searchQuery }} />}
          </Suspense>
        </div>
        
        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <span>© {new Date().getFullYear()} Quickks. All rights reserved.</span>
            <div style={styles.footerLinks}>
              <a href="/privacy" style={styles.footerLink}>Privacy Policy</a>
              <a href="/terms" style={styles.footerLink}>Terms of Service</a>
              <a href="/contact" style={styles.footerLink}>Contact Support</a>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Global Styles */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .status-dot {
          animation: pulse 2s infinite;
        }
        
        .status-dot.connected {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        * {
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${theme === THEMES.DARK ? "#1e293b" : "#f1f5f9"};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${theme === THEMES.DARK ? "#475569" : "#cbd5e1"};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme === THEMES.DARK ? "#64748b" : "#94a3b8"};
        }
      `}</style>
    </div>
  );
};

// ==========================================================
// STYLES
// ==========================================================
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  containerLight: {
    backgroundColor: "#f8fafc"
  },
  containerDark: {
    backgroundColor: "#0f172a"
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  sidebarOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 998,
    backdropFilter: "blur(4px)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 32px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "16px"
  },
  headerLight: {
    backgroundColor: "#ffffff",
    borderBottomColor: "#e2e8f0"
  },
  headerDark: {
    backgroundColor: "#1e293b",
    borderBottomColor: "#334155"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "20px"
  },
  menuButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    transition: "background 0.2s"
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  greeting: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0
  },
  dateInfo: {
    fontSize: "0.75rem",
    color: "#64748b"
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap"
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "#f1f5f9",
    borderRadius: "8px",
    minWidth: "200px"
  },
  searchIcon: {
    color: "#94a3b8"
  },
  searchInput: {
    border: "none",
    background: "none",
    outline: "none",
    fontSize: "14px",
    width: "100%",
    color: "#1e293b"
  },
  connectionStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    backgroundColor: "#f1f5f9",
    borderRadius: "20px"
  },
  connectionText: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#475569"
  },
  iconButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    transition: "background 0.2s"
  },
  userMenuContainer: {
    position: "relative"
  },
  userMenuButton: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 12px",
    backgroundColor: "#f1f5f9",
    border: "none",
    borderRadius: "40px",
    cursor: "pointer",
    transition: "background 0.2s"
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#6366f1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: "600",
    fontSize: "12px",
    overflow: "hidden"
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  userInfo: {
    textAlign: "left"
  },
  userName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1e293b",
    display: "block"
  },
  userRole: {
    fontSize: "11px",
    color: "#64748b",
    textTransform: "capitalize"
  },
  userDropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "8px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    minWidth: "240px",
    zIndex: 1000,
    overflow: "hidden"
  },
  dropdownHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px"
  },
  dropdownAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#6366f1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: "600",
    overflow: "hidden"
  },
  dropdownName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b"
  },
  dropdownEmail: {
    fontSize: "12px",
    color: "#64748b"
  },
  dropdownDivider: {
    height: "1px",
    backgroundColor: "#e2e8f0",
    margin: "8px 0"
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "10px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    color: "#475569",
    textAlign: "left",
    transition: "background 0.2s"
  },
  logoutItem: {
    color: "#ef4444"
  },
  notificationContainer: {
    position: "relative"
  },
  notificationButton: {
    position: "relative",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    color: "#64748b"
  },
  notificationBadge: {
    position: "absolute",
    top: "0",
    right: "0",
    backgroundColor: "#ef4444",
    color: "#fff",
    fontSize: "10px",
    borderRadius: "10px",
    padding: "2px 5px",
    minWidth: "16px"
  },
  notificationDropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "8px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    width: "320px",
    zIndex: 1000,
    overflow: "hidden"
  },
  notificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0"
  },
  notificationTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b"
  },
  markReadButton: {
    background: "none",
    border: "none",
    fontSize: "11px",
    color: "#6366f1",
    cursor: "pointer"
  },
  notificationList: {
    maxHeight: "300px",
    overflowY: "auto"
  },
  notificationItem: {
    display: "flex",
    gap: "12px",
    padding: "12px 16px",
    borderBottom: "1px solid #f1f5f9",
    cursor: "pointer",
    transition: "background 0.2s"
  },
  notificationIcon: {
    fontSize: "20px"
  },
  notificationContent: {
    flex: 1
  },
  notificationMessage: {
    fontSize: "13px",
    color: "#1e293b",
    marginBottom: "4px"
  },
  notificationTime: {
    fontSize: "11px",
    color: "#94a3b8"
  },
  noNotifications: {
    textAlign: "center",
    padding: "32px",
    color: "#94a3b8",
    fontSize: "13px"
  },
  notificationFooter: {
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
    textAlign: "center"
  },
  viewAllButton: {
    background: "none",
    border: "none",
    color: "#6366f1",
    fontSize: "12px",
    cursor: "pointer"
  },
  pageContent: {
    flex: 1,
    padding: "32px",
    overflowY: "auto",
    overflowX: "hidden"
  },
  footer: {
    borderTop: "1px solid #e2e8f0",
    padding: "16px 32px",
    backgroundColor: "transparent"
  },
  footerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    fontSize: "12px",
    color: "#94a3b8"
  },
  footerLinks: {
    display: "flex",
    gap: "24px"
  },
  footerLink: {
    color: "#94a3b8",
    textDecoration: "none",
    transition: "color 0.2s"
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    gap: "16px",
    color: "#64748b"
  }
};

export default DashboardLayout;