// src/components/Navbar.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  LogOut, 
  User, 
  Info, 
  Menu, 
  X, 
  Home, 
  Briefcase, 
  Calendar, 
  MessageSquare,
  CreditCard,
  Settings,
  HelpCircle,
  Bell,
  Shield,
  ChevronDown,
  UserCircle,
  LayoutDashboard,
  Star,
  Clock,
  DollarSign,
  FileText,
  Users,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // User info
  const name = user?.name || user?.fullName || "User";
  const role = user?.role || "guest";
  const avatar = user?.avatar || null;
  const email = user?.email || "";

  // Memoized dashboard path
  const dashboardPath = useMemo(() => {
    if (!isAuthenticated) return "/";
    switch (role.toLowerCase()) {
      case "admin":
        return "/admin/dashboard";
      case "provider":
        return "/provider/dashboard";
      case "customer":
        return "/customer/dashboard";
      default:
        return "/";
    }
  }, [isAuthenticated, role]);

  // Navigation items based on role
  const navigationItems = useMemo(() => {
    const items = [
      { name: "Home", path: "/", icon: Home, show: true },
      { name: "Services", path: "/services", icon: Briefcase, show: true },
      { name: "About", path: "/about", icon: Info, show: true },
    ];

    if (isAuthenticated) {
      items.push(
        { name: "Dashboard", path: dashboardPath, icon: LayoutDashboard, show: true },
        { name: "Bookings", path: "/bookings", icon: Calendar, show: true },
        { name: "Messages", path: "/messages", icon: MessageSquare, show: true, badge: unreadCount }
      );

      if (role === "customer") {
        items.push(
          { name: "My Bookings", path: "/my-bookings", icon: Clock, show: true },
          { name: "Payments", path: "/payments", icon: CreditCard, show: true },
          { name: "Reviews", path: "/reviews", icon: Star, show: true }
        );
      }

      if (role === "provider") {
        items.push(
          { name: "Earnings", path: "/provider/earnings", icon: DollarSign, show: true },
          { name: "Schedule", path: "/provider/schedule", icon: Calendar, show: true },
          { name: "Customers", path: "/provider/customers", icon: Users, show: true }
        );
      }

      if (role === "admin") {
        items.push(
          { name: "Analytics", path: "/admin/analytics", icon: BarChart3, show: true },
          { name: "Users", path: "/admin/users", icon: Users, show: true },
          { name: "Reports", path: "/admin/reports", icon: FileText, show: true }
        );
      }
    }

    return items;
  }, [isAuthenticated, role, dashboardPath, unreadCount]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Fetch notifications (mock - replace with API call)
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch notifications from API
      const fetchNotifications = async () => {
        try {
          const response = await fetch("/api/notifications/unread-count");
          const data = await response.json();
          setUnreadCount(data.count || 0);
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
        }
      };
      fetchNotifications();
    }
  }, [isAuthenticated]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logout, navigate]);

  // Handle mobile menu toggle
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
    if (!mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileMenuOpen]);

  // Handle user menu toggle
  const toggleUserMenu = useCallback(() => {
    setUserMenuOpen(prev => !prev);
  }, []);

  // Get user initials for avatar
  const getUserInitials = useCallback(() => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [name]);

  // Render desktop navigation
  const renderDesktopNav = () => (
    <div className="desktop-nav" style={styles.desktopNav}>
      {navigationItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          style={({ isActive }) => ({
            ...styles.navLink,
            ...(isActive ? styles.activeNavLink : {})
          })}
        >
          <item.icon size={18} />
          <span>{item.name}</span>
          {item.badge > 0 && (
            <span style={styles.badge}>{item.badge}</span>
          )}
        </NavLink>
      ))}
    </div>
  );

  // Render mobile navigation
  const renderMobileNav = () => (
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ type: "tween", duration: 0.3 }}
          style={styles.mobileMenu}
        >
          <div style={styles.mobileMenuHeader}>
            <div style={styles.mobileUserInfo}>
              <div style={styles.mobileAvatar}>
                {avatar ? (
                  <img src={avatar} alt={name} style={styles.avatarImage} />
                ) : (
                  getUserInitials()
                )}
              </div>
              <div>
                <div style={styles.mobileUserName}>{name}</div>
                <div style={styles.mobileUserRole}>{role}</div>
              </div>
            </div>
            <button onClick={toggleMobileMenu} style={styles.closeMenuBtn}>
              <X size={24} />
            </button>
          </div>
          
          <div style={styles.mobileNavLinks}>
            {navigationItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
                style={({ isActive }) => ({
                  ...styles.mobileNavLink,
                  ...(isActive ? styles.activeMobileNavLink : {})
                })}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
                {item.badge > 0 && (
                  <span style={styles.mobileBadge}>{item.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
          
          <div style={styles.mobileFooter}>
            <button onClick={handleLogout} style={styles.mobileLogoutBtn}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render user dropdown menu
  const renderUserDropdown = () => (
    <AnimatePresence>
      {userMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          style={styles.dropdownMenu}
        >
          <div style={styles.dropdownHeader}>
            <div style={styles.dropdownAvatar}>
              {avatar ? (
                <img src={avatar} alt={name} style={styles.avatarImage} />
              ) : (
                getUserInitials()
              )}
            </div>
            <div>
              <div style={styles.dropdownName}>{name}</div>
              <div style={styles.dropdownEmail}>{email}</div>
            </div>
          </div>
          
          <div style={styles.dropdownDivider} />
          
          <Link to="/profile" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
            <UserCircle size={16} />
            <span>My Profile</span>
          </Link>
          
          <Link to="/settings" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
            <Settings size={16} />
            <span>Settings</span>
          </Link>
          
          <Link to="/help" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>
            <HelpCircle size={16} />
            <span>Help Center</span>
          </Link>
          
          <div style={styles.dropdownDivider} />
          
          <button onClick={handleLogout} style={styles.dropdownLogoutItem}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <nav 
        style={{
          ...styles.navContainer,
          ...(scrolled ? styles.navScrolled : {})
        }}
      >
        <div style={styles.navContent}>
          {/* Logo */}
          <div 
            style={styles.logoWrapper} 
            onClick={() => navigate(dashboardPath)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && navigate(dashboardPath)}
          >
            Quickks<span style={{ color: "#fbbf24" }}>.</span>
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && renderDesktopNav()}

          {/* Right Section */}
          <div style={styles.rightSection}>
            {/* Notifications */}
            {isAuthenticated && (
              <button 
                style={styles.notificationBtn}
                onClick={() => navigate("/notifications")}
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={styles.notificationBadge}>{unreadCount}</span>
                )}
              </button>
            )}

            {/* User Menu (Desktop) */}
            {isAuthenticated ? (
              <div style={styles.userMenuContainer}>
                <button 
                  style={styles.userInfo} 
                  onClick={toggleUserMenu}
                  aria-label="User menu"
                >
                  <div style={styles.avatar}>
                    {avatar ? (
                      <img src={avatar} alt={name} style={styles.avatarImage} />
                    ) : (
                      getUserInitials()
                    )}
                  </div>
                  <div style={styles.userDetails}>
                    <span style={styles.userName}>{name}</span>
                    <span style={styles.userRole}>{role}</span>
                  </div>
                  <ChevronDown size={16} style={{ marginLeft: 4 }} />
                </button>
                {renderUserDropdown()}
              </div>
            ) : (
              <div style={styles.authButtons}>
                <Link to="/login" style={styles.loginBtn}>Login</Link>
                <Link to="/register" style={styles.registerBtn}>Sign Up</Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button 
              style={styles.menuBtn} 
              onClick={toggleMobileMenu}
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Overlay */}
      {renderMobileNav()}
      
      {/* Overlay Background */}
      {mobileMenuOpen && (
        <div 
          style={styles.mobileOverlay} 
          onClick={toggleMobileMenu}
          role="presentation"
        />
      )}
    </>
  );
};

const styles = {
  navContainer: {
    backgroundColor: "#0f172a",
    color: "#fff",
    padding: "0.8rem 0",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    fontFamily: "'Poppins', sans-serif",
    transition: "all 0.3s ease",
    borderBottom: "1px solid rgba(255,255,255,0.1)"
  },
  navScrolled: {
    padding: "0.5rem 0",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
  },
  navContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 10%",
    position: "relative"
  },
  logoWrapper: {
    fontSize: "1.6rem",
    fontWeight: "800",
    cursor: "pointer",
    letterSpacing: "-0.5px",
    transition: "transform 0.3s ease",
    color: "#fff"
  },
  desktopNav: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    justifyContent: "center"
  },
  navLink: {
    color: "#cbd5e1",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    transition: "all 0.3s ease",
    position: "relative"
  },
  activeNavLink: {
    color: "#fbbf24",
    backgroundColor: "rgba(251, 191, 36, 0.1)"
  },
  badge: {
    position: "absolute",
    top: "0",
    right: "0",
    backgroundColor: "#ef4444",
    color: "#fff",
    fontSize: "10px",
    padding: "2px 5px",
    borderRadius: "10px",
    fontWeight: "bold"
  },
  rightSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  notificationBtn: {
    position: "relative",
    background: "rgba(255,255,255,0.05)",
    border: "none",
    borderRadius: "8px",
    padding: "8px",
    cursor: "pointer",
    color: "#cbd5e1",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center"
  },
  notificationBadge: {
    position: "absolute",
    top: "0",
    right: "0",
    backgroundColor: "#ef4444",
    color: "#fff",
    fontSize: "10px",
    padding: "2px 5px",
    borderRadius: "10px",
    fontWeight: "bold"
  },
  userMenuContainer: {
    position: "relative"
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "4px 12px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    cursor: "pointer",
    transition: "all 0.3s ease"
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a",
    fontWeight: "bold",
    fontSize: "12px"
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover"
  },
  userDetails: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left"
  },
  userName: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#fff"
  },
  userRole: {
    fontSize: "0.7rem",
    color: "#94a3b8",
    textTransform: "capitalize",
    letterSpacing: "0.5px"
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "8px",
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    minWidth: "240px",
    overflow: "hidden",
    zIndex: 1001,
    border: "1px solid rgba(255,255,255,0.1)"
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
    backgroundColor: "#fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a",
    fontWeight: "bold",
    fontSize: "14px"
  },
  dropdownName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#fff"
  },
  dropdownEmail: {
    fontSize: "12px",
    color: "#94a3b8"
  },
  dropdownDivider: {
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.1)",
    margin: "8px 0"
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 16px",
    color: "#cbd5e1",
    textDecoration: "none",
    fontSize: "14px",
    transition: "all 0.2s ease",
    cursor: "pointer"
  },
  dropdownLogoutItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 16px",
    color: "#f87171",
    textDecoration: "none",
    fontSize: "14px",
    background: "none",
    border: "none",
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  authButtons: {
    display: "flex",
    gap: "12px"
  },
  loginBtn: {
    padding: "8px 20px",
    backgroundColor: "transparent",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.3s ease"
  },
  registerBtn: {
    padding: "8px 20px",
    backgroundColor: "#fbbf24",
    color: "#0f172a",
    border: "none",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease"
  },
  menuBtn: {
    display: "none",
    background: "rgba(255,255,255,0.05)",
    border: "none",
    borderRadius: "8px",
    padding: "8px",
    cursor: "pointer",
    color: "#fff",
    transition: "all 0.3s ease"
  },
  mobileMenu: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "300px",
    height: "100vh",
    backgroundColor: "#0f172a",
    zIndex: 2000,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    boxShadow: "-5px 0 20px rgba(0,0,0,0.3)"
  },
  mobileMenuHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)"
  },
  mobileUserInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  mobileAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a",
    fontWeight: "bold",
    fontSize: "16px"
  },
  mobileUserName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#fff"
  },
  mobileUserRole: {
    fontSize: "12px",
    color: "#94a3b8",
    textTransform: "capitalize"
  },
  closeMenuBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    padding: "4px"
  },
  mobileNavLinks: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1
  },
  mobileNavLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    color: "#cbd5e1",
    textDecoration: "none",
    fontSize: "14px",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    position: "relative"
  },
  activeMobileNavLink: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    color: "#fbbf24"
  },
  mobileBadge: {
    position: "absolute",
    right: "16px",
    backgroundColor: "#ef4444",
    color: "#fff",
    fontSize: "10px",
    padding: "2px 6px",
    borderRadius: "10px"
  },
  mobileFooter: {
    paddingTop: "20px",
    borderTop: "1px solid rgba(255,255,255,0.1)"
  },
  mobileLogoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500"
  },
  mobileOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1999,
    backdropFilter: "blur(4px)"
  }
};

// Add hover styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .nav-link:hover {
    color: #fbbf24 !important;
    background-color: rgba(251, 191, 36, 0.05);
    transform: translateY(-1px);
  }
  
  .mobile-nav-link:hover {
    background-color: rgba(251, 191, 36, 0.05);
    transform: translateX(5px);
  }
  
  .dropdown-item:hover {
    background-color: rgba(251, 191, 36, 0.1);
    color: #fbbf24;
  }
  
  .dropdown-logout-item:hover {
    background-color: rgba(239, 68, 68, 0.1);
  }
  
  .login-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  .register-btn:hover {
    background-color: #f59e0b;
    transform: translateY(-1px);
  }
  
  @media (max-width: 1024px) {
    .desktop-nav {
      display: none !important;
    }
    
    .menu-btn {
      display: flex !important;
    }
    
    .user-info .user-details {
      display: none;
    }
  }
  
  @media (max-width: 768px) {
    .notification-btn {
      display: none;
    }
    
    .user-info {
      padding: 8px !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default React.memo(Navbar);