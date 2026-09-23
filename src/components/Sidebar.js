// src/components/Sidebar.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBars,
  FaTimes,
  FaWrench,
  FaUserCog,
  FaStar,
  FaMoneyBillWave,
  FaHome,
  FaCalendarAlt,
  FaClipboardList,
  FaUsers,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaEnvelope,
  FaQuestionCircle,
  FaChevronDown,
  FaChevronUp,
  FaTachometerAlt,
  FaUserCircle,
  FaBuilding,
  FaCreditCard,
  FaShieldAlt,
  FaFileAlt,
  FaComments,
  FaHistory,
  FaGavel
} from "react-icons/fa";
import { Tooltip, Badge, Avatar, Divider, CircularProgress } from "@mui/material";

// Menu configurations with icons and submenus
const MENU_CONFIG = {
  CUSTOMER: {
    icon: FaUserCircle,
    label: "Customer Panel",
    items: [
      { label: "Dashboard", to: "/dashboard/customer", icon: FaTachometerAlt, end: true },
      { label: "Create Booking", to: "/dashboard/customer/create-booking", icon: FaCalendarAlt },
      { label: "My Bookings", to: "/dashboard/customer/bookings", icon: FaClipboardList, badge: true },
      { label: "Payment History", to: "/dashboard/customer/payments", icon: FaCreditCard },
      { label: "My Reviews", to: "/dashboard/customer/reviews", icon: FaStar },
      { label: "Messages", to: "/dashboard/customer/messages", icon: FaEnvelope, badge: true },
      { label: "Notifications", to: "/dashboard/customer/notifications", icon: FaBell, badge: true },
      { label: "Profile Settings", to: "/dashboard/customer/profile", icon: FaUserCog }
    ]
  },
  PROVIDER: {
    icon: FaWrench,
    label: "Provider Panel",
    items: [
      { label: "Dashboard", to: "/dashboard/provider", icon: FaTachometerAlt, end: true },
      { label: "My Jobs", to: "/dashboard/provider/jobs", icon: FaClipboardList, badge: true },
      { label: "Job Requests", to: "/dashboard/provider/requests", icon: FaCalendarAlt, badge: true },
      { label: "Manage Services", to: "/dashboard/provider/services", icon: FaWrench },
      { label: "Earnings", to: "/dashboard/provider/earnings", icon: FaMoneyBillWave },
      { label: "Payout History", to: "/dashboard/provider/payouts", icon: FaHistory },
      { label: "My Reviews", to: "/dashboard/provider/reviews", icon: FaStar },
      { label: "Messages", to: "/dashboard/provider/messages", icon: FaEnvelope },
      { label: "Availability", to: "/dashboard/provider/availability", icon: FaCalendarAlt },
      { label: "Profile Settings", to: "/dashboard/provider/profile", icon: FaUserCog }
    ]
  },
  ADMIN: {
    icon: FaShieldAlt,
    label: "Admin Panel",
    items: [
      { label: "Dashboard", to: "/dashboard/admin", icon: FaTachometerAlt, end: true },
      { label: "User Management", to: "/dashboard/admin/users", icon: FaUsers, badge: true },
      { label: "Provider Management", to: "/dashboard/admin/providers", icon: FaBuilding },
      { label: "Job Management", to: "/dashboard/admin/jobs", icon: FaClipboardList },
      { label: "Payment Management", to: "/dashboard/admin/payments", icon: FaCreditCard },
      { label: "Disputes", to: "/dashboard/admin/disputes", icon: FaGavel, badge: true },
      { label: "Reports & Analytics", to: "/dashboard/admin/reports", icon: FaChartLine },
      { label: "System Settings", to: "/dashboard/admin/settings", icon: FaCog },
      { label: "Audit Logs", to: "/dashboard/admin/audit", icon: FaHistory },
      { label: "Support Tickets", to: "/dashboard/admin/support", icon: FaComments, badge: true }
    ]
  }
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch notifications count
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications/unread");
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Get user role and menu config
  const role = user?.role?.toUpperCase() || "CUSTOMER";
  const menuConfig = MENU_CONFIG[role] || MENU_CONFIG.CUSTOMER;
  const hasUnreadNotifications = notifications.length > 0;

  // Check if a menu item is active
  const isActive = useCallback((to, end = false) => {
    if (end) {
      return location.pathname === to;
    }
    return location.pathname.startsWith(to);
  }, [location.pathname]);

  // Toggle sidebar on mobile
  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
    if (isMobile && !isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobile, isOpen]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    setLoading(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);

  // Toggle submenu
  const toggleSubmenu = useCallback((menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  }, []);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile && isOpen) {
      setIsOpen(false);
      document.body.style.overflow = "unset";
    }
  }, [location.pathname, isMobile]);

  // Get user initials for avatar
  const getUserInitials = useCallback(() => {
    const name = user?.name || user?.fullName || "User";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user]);

  // Render menu items
  const renderMenuItems = (items) => {
    return items.map((item, index) => {
      const active = isActive(item.to, item.end);
      const hasBadge = item.badge && (item.label === "Notifications" ? hasUnreadNotifications : true);
      
      return (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <NavLink
            to={item.to}
            className={`sidebar-link ${active ? "active" : ""}`}
            style={({ isActive: navActive }) => ({
              ...styles.link,
              ...(navActive ? styles.activeLink : {})
            })}
          >
            <div style={styles.linkContent}>
              <div style={styles.linkIcon}>
                <item.icon size={18} />
              </div>
              <span style={styles.linkText}>{item.label}</span>
            </div>
            {hasBadge && (
              <Badge
                badgeContent={item.label === "Notifications" ? notifications.length : "•"}
                color="error"
                variant={item.label === "Notifications" ? "standard" : "dot"}
                sx={styles.badge}
              />
            )}
          </NavLink>
        </motion.div>
      );
    });
  };

  // Render user profile section
  const renderUserProfile = () => (
    <div style={styles.userSection}>
      <div style={styles.avatarContainer}>
        {user?.avatar ? (
          <Avatar src={user.avatar} sx={styles.avatar} />
        ) : (
          <Avatar sx={{ ...styles.avatar, bgcolor: "#fbbf24", color: "#0f172a" }}>
            {getUserInitials()}
          </Avatar>
        )}
        <div style={styles.userInfo}>
          <div style={styles.userName}>{user?.name || user?.fullName || "User"}</div>
          <div style={styles.userRole}>{role.toLowerCase()}</div>
        </div>
      </div>
    </div>
  );

  // Render sidebar content
  const renderSidebarContent = () => (
    <>
      {/* Logo Section */}
      <div style={styles.logoSection}>
        <div style={styles.logo}>
          <FaWrench size={24} style={{ color: "#fbbf24" }} />
          <span style={styles.logoText}>Quickks</span>
        </div>
        {!isMobile && (
          <button onClick={toggleSidebar} style={styles.toggleBtn} aria-label="Toggle Sidebar">
            <FaTimes size={16} />
          </button>
        )}
      </div>

      {/* User Profile */}
      {renderUserProfile()}

      <Divider sx={styles.divider} />

      {/* Navigation Menu */}
      <nav style={styles.nav}>
        {renderMenuItems(menuConfig.items)}
      </nav>

      {/* Help Section */}
      <div style={styles.helpSection}>
        <NavLink to="/help" style={styles.helpLink}>
          <FaQuestionCircle size={16} />
          <span>Help & Support</span>
        </NavLink>
      </div>

      <Divider sx={styles.divider} />

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        disabled={loading}
        style={styles.logoutBtn}
      >
        {loading ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <>
            <FaSignOutAlt size={16} />
            <span>Logout</span>
          </>
        )}
      </button>
    </>
  );

  // Overlay for mobile
  const renderMobileOverlay = () => {
    if (!isMobile || !isOpen) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={toggleSidebar}
        style={styles.overlay}
      />
    );
  };

  if (!user) return null;

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && !isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={toggleSidebar}
          style={styles.mobileToggleBtn}
          aria-label="Open Sidebar"
        >
          <FaBars size={20} />
        </motion.button>
      )}

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(isOpen || !isMobile) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 20 }}
            style={{
              ...styles.sidebar,
              width: isOpen ? 280 : (isMobile ? 0 : 80),
              padding: isOpen ? "20px 16px" : (isMobile ? 0 : "20px 12px")
            }}
          >
            {isOpen ? renderSidebarContent() : (
              // Collapsed view
              <div style={styles.collapsedContent}>
                <div style={styles.collapsedLogo}>
                  <FaWrench size={24} style={{ color: "#fbbf24" }} />
                </div>
                <div style={styles.collapsedIcons}>
                  {menuConfig.items.slice(0, 5).map((item, index) => (
                    <Tooltip key={index} title={item.label} placement="right">
                      <NavLink
                        to={item.to}
                        style={({ isActive }) => ({
                          ...styles.collapsedLink,
                          ...(isActive ? styles.activeCollapsedLink : {})
                        })}
                      >
                        <item.icon size={20} />
                      </NavLink>
                    </Tooltip>
                  ))}
                </div>
                <Tooltip title="Logout" placement="right">
                  <button onClick={handleLogout} style={styles.collapsedLogoutBtn}>
                    <FaSignOutAlt size={20} />
                  </button>
                </Tooltip>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay */}
      {renderMobileOverlay()}

      {/* Main Content Spacing */}
      <div style={{
        marginLeft: (!isMobile && isOpen) ? 280 : (!isMobile ? 80 : 0),
        transition: "margin-left 0.3s ease"
      }} />
    </>
  );
};

const styles = {
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    overflow: "hidden",
    zIndex: 1000,
    boxShadow: "2px 0 10px rgba(0,0,0,0.1)"
  },
  logoSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid rgba(255,255,255,0.1)"
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  logoText: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: "-0.5px"
  },
  toggleBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    borderRadius: "6px",
    padding: "6px",
    cursor: "pointer",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s"
  },
  userSection: {
    marginBottom: "20px",
    padding: "12px",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  avatarContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  avatar: {
    width: "48px",
    height: "48px"
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#fff",
    marginBottom: "4px"
  },
  userRole: {
    fontSize: "11px",
    color: "#94a3b8",
    textTransform: "capitalize"
  },
  nav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    overflowY: "auto",
    maxHeight: "calc(100vh - 280px)",
    scrollbarWidth: "thin"
  },
  link: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: "8px",
    textDecoration: "none",
    color: "#cbd5e1",
    transition: "all 0.2s ease",
    fontSize: "14px",
    fontWeight: "500",
    position: "relative"
  },
  activeLink: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    color: "#fbbf24"
  },
  linkContent: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1
  },
  linkIcon: {
    width: "24px",
    display: "flex",
    alignItems: "center"
  },
  linkText: {
    flex: 1
  },
  badge: {
    "& .MuiBadge-badge": {
      fontSize: "10px",
      height: "18px",
      minWidth: "18px"
    }
  },
  divider: {
    backgroundColor: "rgba(255,255,255,0.1)",
    margin: "16px 0"
  },
  helpSection: {
    marginBottom: "16px"
  },
  helpLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    textDecoration: "none",
    color: "#94a3b8",
    fontSize: "14px",
    transition: "all 0.2s ease"
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#f87171",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%"
  },
  collapsedContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
    height: "100%"
  },
  collapsedLogo: {
    padding: "12px 0",
    borderBottom: "1px solid rgba(255,255,255,0.1)"
  },
  collapsedIcons: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flex: 1
  },
  collapsedLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
    borderRadius: "8px",
    color: "#cbd5e1",
    transition: "all 0.2s ease",
    width: "40px",
    height: "40px"
  },
  activeCollapsedLink: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    color: "#fbbf24"
  },
  collapsedLogoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
    borderRadius: "8px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "none",
    color: "#f87171",
    cursor: "pointer",
    width: "40px",
    height: "40px",
    marginBottom: "20px"
  },
  mobileToggleBtn: {
    position: "fixed",
    top: "80px",
    left: "16px",
    zIndex: 999,
    backgroundColor: "#fbbf24",
    border: "none",
    borderRadius: "8px",
    padding: "10px",
    cursor: "pointer",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 998,
    backdropFilter: "blur(4px)"
  }
};

// Add hover styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .sidebar-link:hover {
    background-color: rgba(251, 191, 36, 0.1);
    transform: translateX(4px);
  }
  
  .sidebar-link.active:hover {
    background-color: rgba(251, 191, 36, 0.2);
  }
  
  .help-link:hover {
    background-color: rgba(251, 191, 36, 0.1);
    color: #fbbf24;
  }
  
  .logout-btn:hover:not(:disabled) {
    background-color: rgba(239, 68, 68, 0.2);
    transform: translateY(-1px);
  }
  
  .collapsed-link:hover {
    background-color: rgba(251, 191, 36, 0.1);
    transform: scale(1.05);
  }
  
  .toggle-btn:hover {
    background-color: rgba(251, 191, 36, 0.2);
    transform: rotate(90deg);
  }
  
  /* Custom scrollbar */
  .sidebar-nav::-webkit-scrollbar {
    width: 4px;
  }
  
  .sidebar-nav::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
  }
  
  .sidebar-nav::-webkit-scrollbar-thumb {
    background: rgba(251, 191, 36, 0.3);
    border-radius: 2px;
  }
  
  .sidebar-nav::-webkit-scrollbar-thumb:hover {
    background: rgba(251, 191, 36, 0.5);
  }
`;
document.head.appendChild(styleSheet);

export default React.memo(Sidebar);