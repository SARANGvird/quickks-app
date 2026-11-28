
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  FaBars,
  FaTimes,
  FaWrench,
  FaUserCog,
  FaStar,
  FaMoneyBillWave,
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
  FaTachometerAlt,
  FaUserCircle,
  FaBuilding,
  FaCreditCard,
  FaShieldAlt,
  FaComments,
  FaHistory,
  FaGavel,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";
import { Tooltip, Avatar, Divider, CircularProgress } from "@mui/material";
import { styled } from "@mui/material/styles";
import api from "../api/api";

/* ════════════════════════════════════════════════════════════════
   QUICKKS SIDEBAR  ·  Forest #0B3D2E · Lime #C6F24E · Cream #FFF8EC
   - Desktop: expandable (280px) / collapsible (80px, remembered)
   - Mobile (<768px): slide-in drawer with overlay, ESC + route-change close
   - Roles: CUSTOMER / PROVIDER / ADMIN (ROLE_ prefix and SUPER_ADMIN handled)
   - Layout hooks: sets CSS var --quickks-sidebar-w and renders an in-flow
     spacer on desktop; optional onWidthChange(px) callback.
   ════════════════════════════════════════════════════════════════ */

/* ───────── Tokens ───────── */
const FONT = '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
const HEAD = '"Sora", "Inter", "Segoe UI", sans-serif';
const C = {
  forest: "#0B3D2E",
  forestDeep: "#082C21",
  forest2: "#0F4C39",
  lime: "#C6F24E",
  limeDeep: "#A9D92F",
  cream: "#FFF8EC",
  text: "rgba(255,248,236,0.78)",
  muted: "rgba(255,248,236,0.55)",
  line: "rgba(255,255,255,0.10)",
  glass: "rgba(255,255,255,0.06)",
  danger: "#FF8A80",
  dangerBg: "rgba(239,68,68,0.14)",
};

const W_EXPANDED = 280;
const W_COLLAPSED = 80;
const MOBILE_QUERY = "(max-width: 767.95px)";
const COLLAPSE_KEY = "quickks_sidebar_collapsed_v1";
const NOTIFICATIONS_ENDPOINT = "/notifications/unread";
const POLL_MS = 60000;

/* ───────── Menu configuration ─────────
   badge: "count" → numeric unread notifications · "dot" → unread indicator
   children: optional collapsible sub-menu (flattened when the sidebar is collapsed) */
const MENU_CONFIG = {
  CUSTOMER: {
    icon: FaUserCircle,
    label: "Customer Panel",
    items: [
      { label: "Dashboard", to: "/dashboard/customer", icon: FaTachometerAlt, end: true },
      { label: "Create Booking", to: "/dashboard/customer/create-booking", icon: FaCalendarAlt },
      { label: "My Bookings", to: "/dashboard/customer/bookings", icon: FaClipboardList, badge: "dot" },
      { label: "Payment History", to: "/dashboard/customer/payments", icon: FaCreditCard },
      { label: "My Reviews", to: "/dashboard/customer/reviews", icon: FaStar },
      { label: "Messages", to: "/dashboard/customer/messages", icon: FaEnvelope, badge: "dot" },
      { label: "Notifications", to: "/dashboard/customer/notifications", icon: FaBell, badge: "count" },
      { label: "Profile Settings", to: "/dashboard/customer/profile", icon: FaUserCog },
    ],
  },
  PROVIDER: {
    icon: FaWrench,
    label: "Provider Panel",
    items: [
      { label: "Dashboard", to: "/dashboard/provider", icon: FaTachometerAlt, end: true },
      { label: "My Jobs", to: "/dashboard/provider/jobs", icon: FaClipboardList, badge: "dot" },
      { label: "Job Requests", to: "/dashboard/provider/requests", icon: FaCalendarAlt, badge: "dot" },
      { label: "Manage Services", to: "/dashboard/provider/services", icon: FaWrench },
      {
        label: "Earnings",
        to: "/dashboard/provider/earnings",
        icon: FaMoneyBillWave,
        end: true,
        children: [{ label: "Payout History", to: "/dashboard/provider/payouts", icon: FaHistory }],
      },
      { label: "My Reviews", to: "/dashboard/provider/reviews", icon: FaStar },
      { label: "Messages", to: "/dashboard/provider/messages", icon: FaEnvelope },
      { label: "Availability", to: "/dashboard/provider/availability", icon: FaCalendarAlt },
      { label: "Profile Settings", to: "/dashboard/provider/profile", icon: FaUserCog },
    ],
  },
  ADMIN: {
    icon: FaShieldAlt,
    label: "Admin Panel",
    items: [
      { label: "Dashboard", to: "/dashboard/admin", icon: FaTachometerAlt, end: true },
      { label: "User Management", to: "/dashboard/admin/users", icon: FaUsers, badge: "dot" },
      { label: "Provider Management", to: "/dashboard/admin/providers", icon: FaBuilding },
      { label: "Job Management", to: "/dashboard/admin/jobs", icon: FaClipboardList },
      { label: "Payment Management", to: "/dashboard/admin/payments", icon: FaCreditCard },
      { label: "Disputes", to: "/dashboard/admin/disputes", icon: FaGavel, badge: "dot" },
      { label: "Reports & Analytics", to: "/dashboard/admin/reports", icon: FaChartLine },
      { label: "System Settings", to: "/dashboard/admin/settings", icon: FaCog },
      { label: "Audit Logs", to: "/dashboard/admin/audit", icon: FaHistory },
      { label: "Support Tickets", to: "/dashboard/admin/support", icon: FaComments, badge: "dot" },
    ],
  },
};

/* ───────── Helpers ───────── */
const normalizeRole = (rawRole) => {
  const r = String(rawRole || "").toUpperCase().replace(/^ROLE_/, "");
  if (r === "SUPER_ADMIN") return "ADMIN";
  return MENU_CONFIG[r] ? r : "CUSTOMER";
};

const getInitials = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

const flattenItems = (items) =>
  items.flatMap((item) => [item, ...(item.children || []).map((c) => ({ ...c, nested: true }))]);

/* ───────── Hooks ───────── */
function useIsMobile(query = MOBILE_QUERY) {
  const get = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);
  const [isMobile, setIsMobile] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [query]);
  return isMobile;
}

/* Unread notifications: abortable, polls while the tab is visible, refreshes on focus */
function useUnreadCount(enabled) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return undefined;
    }
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      try {
        const res = await api.get(NOTIFICATIONS_ENDPOINT, { signal, timeout: 8000 });
        if (signal.aborted) return;
        const d = res?.data?.data ?? res?.data;
        const n = Array.isArray(d)
          ? d.length
          : Array.isArray(d?.items)
          ? d.items.length
          : Number(d?.count ?? d?.unread ?? d?.total ?? 0);
        setCount(Number.isFinite(n) && n > 0 ? n : 0);
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || signal.aborted) return;
        console.error("[Sidebar] Failed to fetch notifications:", err?.response?.status || err?.message);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    const id = setInterval(onVisible, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return count;
}

/* ───────── Styled primitives ───────── */
const Aside = styled(motion.aside)({
  position: "fixed",
  top: 0,
  left: 0,
  height: "100dvh",
  display: "flex",
  flexDirection: "column",
  background: `linear-gradient(180deg, ${C.forest} 0%, ${C.forestDeep} 100%)`,
  color: C.text,
  fontFamily: FONT,
  zIndex: 1000,
  overflow: "hidden",
  borderRight: `1px solid ${C.line}`,
  boxShadow: "4px 0 24px rgba(8,44,33,0.25)",
  outline: "none",
});

const Inner = styled("div", { shouldForwardProp: (p) => p !== "compact" })(({ compact }) => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  padding: compact ? "20px 12px" : "20px 16px",
  transition: "padding 0.25s ease",
}));

const Nav = styled("nav")({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "thin",
  scrollbarColor: `${C.lime}55 transparent`,
  margin: "0 -4px",
  padding: "0 4px",
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: `${C.lime}44`, borderRadius: 2 },
  "&::-webkit-scrollbar-thumb:hover": { background: `${C.lime}88` },
});

const List = styled("ul")({ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 });

const SidebarLink = styled(NavLink, { shouldForwardProp: (p) => p !== "compact" && p !== "nested" })(({ compact, nested }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: compact ? "center" : "space-between",
  gap: 12,
  minHeight: 42,
  width: compact ? 44 : "auto",
  margin: compact ? "0 auto" : 0,
  padding: compact ? 0 : nested ? "8px 12px 8px 44px" : "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
  color: C.text,
  fontSize: nested ? 13.5 : 14,
  fontWeight: 500,
  transition: "background-color 0.2s ease, color 0.2s ease, transform 0.2s ease",
  "&:hover": { backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", transform: compact ? "scale(1.05)" : "translateX(3px)" },
  "&:focus-visible": { outline: `2px solid ${C.lime}`, outlineOffset: 2 },
  "&.active": {
    backgroundColor: C.lime,
    color: C.forest,
    fontWeight: 700,
    boxShadow: `0 6px 16px -8px ${C.lime}aa`,
    transform: "none",
  },
  "&.active:hover": { backgroundColor: "#D5F876" },
}));

const IconBtn = styled("button")({
  display: "grid",
  placeItems: "center",
  width: 34,
  height: 34,
  flexShrink: 0,
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  background: C.glass,
  color: "#fff",
  cursor: "pointer",
  transition: "all 0.2s ease",
  "&:hover": { background: C.lime, color: C.forest, borderColor: C.lime },
  "&:focus-visible": { outline: `2px solid ${C.lime}`, outlineOffset: 2 },
});

const Pill = styled("span", { shouldForwardProp: (p) => p !== "active" })(({ active }) => ({
  display: "inline-grid",
  placeItems: "center",
  minWidth: 20,
  height: 20,
  padding: "0 6px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
  background: active ? C.forest : "#EF4444",
  color: active ? C.lime : "#fff",
}));

const Dot = styled("span", { shouldForwardProp: (p) => p !== "floating" })(({ floating }) => ({
  width: 9,
  height: 9,
  borderRadius: "50%",
  background: "#EF4444",
  boxShadow: "0 0 0 2px " + C.forest,
  flexShrink: 0,
  ...(floating ? { position: "absolute", top: 7, right: 7 } : {}),
}));

const LogoMark = styled("span")({
  display: "grid",
  placeItems: "center",
  width: 38,
  height: 38,
  borderRadius: 12,
  background: C.lime,
  color: C.forest,
  fontFamily: HEAD,
  fontSize: 20,
  fontWeight: 800,
  flexShrink: 0,
});

const MobileToggle = styled(motion.button, { shouldForwardProp: (p) => p !== "top" })(({ top }) => ({
  position: "fixed",
  top,
  left: 16,
  zIndex: 999,
  display: "grid",
  placeItems: "center",
  width: 44,
  height: 44,
  border: "none",
  borderRadius: 14,
  background: C.lime,
  color: C.forest,
  cursor: "pointer",
  boxShadow: `0 6px 0 -2px ${C.forest}, 0 12px 24px -8px rgba(8,44,33,0.5)`,
  "&:focus-visible": { outline: `2px solid ${C.forest}`, outlineOffset: 3 },
}));

const Overlay = styled(motion.div)({
  position: "fixed",
  inset: 0,
  background: "rgba(8,44,33,0.55)",
  backdropFilter: "blur(4px)",
  zIndex: 998,
});

/* ───────── Menu pieces ───────── */
function ItemBadge({ item, unread, active, compact }) {
  if (item.badge === "count" && unread > 0) {
    return compact ? <Dot floating /> : <Pill active={active}>{unread > 99 ? "99+" : unread}</Pill>;
  }
  if (item.badge === "dot" && unread > 0) {
    return <Dot floating={compact} aria-label="New activity" role="status" />;
  }
  return null;
}

function NavItem({ item, compact, unread, nested = false, onNavigate }) {
  const Icon = item.icon;
  const link = (
    <SidebarLink to={item.to} end={Boolean(item.end)} compact={compact ? 1 : 0} nested={nested ? 1 : 0} onClick={onNavigate} aria-label={compact ? item.label : undefined}>
      {({ isActive }) => (
        <>
          <span style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <span style={{ width: 24, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon size={compact ? 20 : nested ? 15 : 18} />
            </span>
            {!compact && <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
          </span>
          {!compact && <ItemBadge item={item} unread={unread} active={isActive} compact={false} />}
          {compact && <ItemBadge item={item} unread={unread} active={isActive} compact />}
        </>
      )}
    </SidebarLink>
  );
  return compact ? (
    <Tooltip title={item.label} placement="right" arrow>
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function NavGroup({ item, unread, open, onToggle, onNavigate, reduced }) {
  const panelId = `sidebar-group-${item.label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <NavItem item={item} compact={false} unread={unread} onNavigate={onNavigate} />
        </div>
        <IconBtn type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`} style={{ width: 30, height: 30 }}>
          <FaChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </IconBtn>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={panelId}
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            style={{ listStyle: "none", margin: "4px 0 0", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 4 }}
          >
            {item.children.map((child) => (
              <li key={child.to}>
                <NavItem item={child} compact={false} unread={unread} nested onNavigate={onNavigate} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  );
}

/* ───────── Sidebar ───────── */
/**
 * @param {object}   props
 * @param {(px:number)=>void} [props.onWidthChange]  called with the current desktop width (0 on mobile)
 * @param {number}   [props.mobileToggleTop=80]      top offset (px) of the mobile menu button
 */
const Sidebar = ({ onWidthChange, mobileToggleTop = 80 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();

  const asideRef = useRef(null);
  const mountedRef = useRef(true);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [openGroups, setOpenGroups] = useState({});
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  const unread = useUnreadCount(Boolean(user));

  const role = normalizeRole(user?.role);
  const menuConfig = MENU_CONFIG[role];
  const PanelIcon = menuConfig.icon;
  const compact = !isMobile && collapsed;
  const width = !user || isMobile ? 0 : collapsed ? W_COLLAPSED : W_EXPANDED;
  const displayName = user?.name || user?.fullName || user?.firstName || "User";

  const flatItems = useMemo(() => flattenItems(menuConfig.items), [menuConfig]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* Remember the desktop collapsed state */
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable: ignore */
    }
  }, [collapsed]);

  /* Expose the layout width to the rest of the app */
  useEffect(() => {
    document.documentElement.style.setProperty("--quickks-sidebar-w", `${width}px`);
    onWidthChange?.(width);
    return () => document.documentElement.style.removeProperty("--quickks-sidebar-w");
  }, [width, onWidthChange]);

  /* Close the mobile drawer on navigation / when switching to desktop */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  /* Lock body scroll + ESC + focus while the mobile drawer is open */
  useEffect(() => {
    if (!(isMobile && mobileOpen)) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    asideRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [isMobile, mobileOpen]);

  /* Auto-open the group that contains the active child route */
  useEffect(() => {
    const next = {};
    menuConfig.items.forEach((item) => {
      if (item.children?.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`))) next[item.label] = true;
    });
    if (Object.keys(next).length) setOpenGroups((prev) => ({ ...prev, ...next }));
  }, [pathname, menuConfig]);

  const toggleGroup = useCallback((label) => setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] })), []);
  const toggleCollapsed = useCallback(() => setCollapsed((p) => !p), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(false);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      if (mountedRef.current) setLogoutError(true);
    } finally {
      if (mountedRef.current) setLoggingOut(false);
    }
  }, [logout, navigate, loggingOut]);

  if (!user) return null;

  const transition = reduced ? { duration: 0 } : { type: "spring", damping: 26, stiffness: 260 };

  return (
    <>
      {/* Mobile open button */}
      <AnimatePresence>
        {isMobile && !mobileOpen && (
          <MobileToggle
            top={mobileToggleTop}
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            exit={reduced ? { opacity: 0 } : { scale: 0 }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
            aria-expanded={false}
          >
            <FaBars size={18} />
          </MobileToggle>
        )}
      </AnimatePresence>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeMobile} aria-hidden="true" />
        )}
      </AnimatePresence>

      <Aside
        ref={asideRef}
        tabIndex={-1}
        id="quickks-sidebar"
        aria-label={`${menuConfig.label} navigation`}
        {...(isMobile ? { role: "dialog", "aria-modal": mobileOpen ? "true" : undefined } : {})}
        initial={false}
        animate={{ x: isMobile && !mobileOpen ? -(W_EXPANDED + 24) : 0, width: isMobile ? W_EXPANDED : collapsed ? W_COLLAPSED : W_EXPANDED }}
        transition={transition}
        style={{ visibility: isMobile && !mobileOpen ? "hidden" : "visible", transitionProperty: "visibility", transitionDelay: isMobile && !mobileOpen ? "0.3s" : "0s" }}
      >
        <Inner compact={compact ? 1 : 0}>
          {/* Logo + collapse / close */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: compact ? "center" : "space-between", gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.line}`, flexDirection: compact ? "column" : "row" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <LogoMark aria-hidden="true">Q</LogoMark>
              {!compact && (
                <span style={{ fontFamily: HEAD, fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", display: "inline-flex", alignItems: "baseline" }}>
                  quickks<span style={{ width: 8, height: 8, borderRadius: "50%", background: C.lime, marginLeft: 3, display: "inline-block" }} />
                </span>
              )}
            </div>
            {isMobile ? (
              <IconBtn type="button" onClick={closeMobile} aria-label="Close sidebar">
                <FaTimes size={15} />
              </IconBtn>
            ) : (
              <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right" arrow>
                <IconBtn type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="quickks-sidebar">
                  {collapsed ? <FaAngleDoubleRight size={14} /> : <FaAngleDoubleLeft size={14} />}
                </IconBtn>
              </Tooltip>
            )}
          </div>

          {/* User card */}
          {compact ? (
            <Tooltip title={`${displayName} · ${role.toLowerCase()}`} placement="right" arrow>
              <div style={{ display: "grid", placeItems: "center", marginBottom: 16 }}>
                <Avatar src={user?.avatar || undefined} alt={displayName} sx={{ width: 40, height: 40, bgcolor: C.lime, color: C.forest, fontWeight: 800, fontFamily: HEAD, fontSize: 15 }}>
                  {getInitials(displayName)}
                </Avatar>
              </div>
            </Tooltip>
          ) : (
            <div style={{ marginBottom: 16, padding: 12, background: C.glass, border: `1px solid ${C.line}`, borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar src={user?.avatar || undefined} alt={displayName} sx={{ width: 46, height: 46, bgcolor: C.lime, color: C.forest, fontWeight: 800, fontFamily: HEAD, fontSize: 16 }}>
                  {getInitials(displayName)}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayName}>
                    {displayName}
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.lime, textTransform: "capitalize", letterSpacing: 0.3 }}>
                    <PanelIcon size={11} /> {role.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!compact && (
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 4px 8px" }}>{menuConfig.label}</div>
          )}

          {/* Navigation */}
          <Nav aria-label={`${menuConfig.label} menu`}>
            <List>
              {(compact ? flatItems : menuConfig.items).map((item, index) => (
                <motion.li
                  key={item.to}
                  initial={reduced ? false : { opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduced ? 0 : index * 0.03 }}
                >
                  {!compact && item.children?.length ? (
                    <NavGroup item={item} unread={unread} open={Boolean(openGroups[item.label])} onToggle={() => toggleGroup(item.label)} onNavigate={closeMobile} reduced={reduced} />
                  ) : (
                    <NavItem item={item} compact={compact} unread={unread} nested={Boolean(item.nested)} onNavigate={closeMobile} />
                  )}
                </motion.li>
              ))}
            </List>
          </Nav>

          <Divider sx={{ borderColor: C.line, my: 2 }} />

          {/* Help */}
          <div style={{ marginBottom: 12 }}>
            {compact ? (
              <Tooltip title="Help & Support" placement="right" arrow>
                <SidebarLink to="/help" compact={1} aria-label="Help & Support" onClick={closeMobile}>
                  <FaQuestionCircle size={18} />
                </SidebarLink>
              </Tooltip>
            ) : (
              <SidebarLink to="/help" onClick={closeMobile}>
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 24, display: "grid", placeItems: "center" }}><FaQuestionCircle size={16} /></span>
                  Help &amp; Support
                </span>
              </SidebarLink>
            )}
          </div>

          {/* Logout */}
          <Tooltip title={compact ? "Logout" : ""} placement="right" arrow>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Logout"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: compact ? 44 : "100%",
                height: compact ? 44 : "auto",
                margin: compact ? "0 auto" : 0,
                padding: compact ? 0 : 12,
                borderRadius: 12,
                background: C.dangerBg,
                border: "1px solid rgba(239,68,68,0.28)",
                color: C.danger,
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 700,
                cursor: loggingOut ? "progress" : "pointer",
                opacity: loggingOut ? 0.8 : 1,
                transition: "background-color 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => { if (!loggingOut) e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.24)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.dangerBg; }}
            >
              {loggingOut ? <CircularProgress size={18} color="inherit" /> : <FaSignOutAlt size={compact ? 18 : 16} />}
              {!compact && <span>{loggingOut ? "Logging out…" : "Logout"}</span>}
            </button>
          </Tooltip>
          {logoutError && !compact && (
            <div role="alert" style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: C.danger, textAlign: "center" }}>
              Logout failed. Please try again.
            </div>
          )}
        </Inner>
      </Aside>

      {/* In-flow spacer so page content sits beside the fixed sidebar (use in a flex layout),
          or use margin-left: var(--quickks-sidebar-w) on your content wrapper. */}
      {!isMobile && (
        <div aria-hidden="true" style={{ width, flexShrink: 0, transition: reduced ? "none" : "width 0.3s ease" }} />
      )}
    </>
  );
};

export default React.memo(Sidebar);