import React, { useState, useEffect, useCallback, useMemo, useRef, useId } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { adminService } from "../../api/api";
import LoadingSpinner from "../LoadingSpinner";
import ErrorBoundary from "../ErrorBoundary";
import useAdminDashboardSocket from "../../hooks/useAdminDashboardSocket";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Box, Container, Stack, Paper, Typography, Button, IconButton, TextField, InputAdornment,
  Switch, FormControlLabel, Checkbox, Avatar, Badge, Chip, Skeleton, Alert, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Drawer, Dialog,
  DialogTitle, DialogContent, DialogActions, Menu, MenuItem, Tooltip, ToggleButton,
  ToggleButtonGroup, Divider, useMediaQuery, useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { styled, alpha } from "@mui/material/styles";
import {
  FaUsers, FaClipboardList, FaRupeeSign, FaCog, FaBolt, FaSync, FaShieldAlt, FaBell, FaSearch,
  FaArrowUp, FaArrowDown, FaFileExport, FaTimes, FaUserCheck, FaSignOutAlt, FaStar, FaChartLine,
} from "react-icons/fa";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
const ALL_PANELS = ["stats", "providers", "revenue", "bookings", "topProviders", "demand", "activities"];
const REVENUE_RANGES = [7, 30, 90];
const INTERVAL_OPTIONS = [15, 30, 60, 120];
const PREF_KEY = "quickks_admin_prefs_v67";

const COLORS = {
  primary: "#6366f1", primaryDark: "#4f46e5", success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#0ea5e9",
  muted: "#64748b", secondary: "#475569", bg: "#f8fafc", bgHover: "#f1f5f9", border: "#e2e8f0", borderLight: "#f1f5f9",
  gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  gradientSuccess: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
};
const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#0ea5e9", "#f97316"];
const STATUS_COLORS = {
  PENDING: COLORS.warning, CONFIRMED: COLORS.info, ASSIGNED: COLORS.info, IN_PROGRESS: COLORS.primary,
  COMPLETED: COLORS.success, CANCELLED: COLORS.danger, REJECTED: COLORS.danger, REFUNDED: COLORS.muted,
};

const isCanceled = (e) => e?.name === "CanceledError" || e?.name === "AbortError" || e?.code === "ERR_CANCELED";
const normalizeRole = (r) => String(r || "").toUpperCase().replace(/^ROLE_/, "");
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(Math.round(num(n)));
const fmtINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num(n));
const fmtCompact = (n) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(num(n));
const safeDistance = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : formatDistanceToNow(d, { addSuffix: true });
};

const toArray = (payload, depth = 0) => {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object" || depth > 8) return [];
  if (payload.data !== undefined) {
    if (Array.isArray(payload.data)) return payload.data;
    const inner = payload.data;
    if (inner && typeof inner === "object") {
      if (Array.isArray(inner)) return inner;
      const nested = inner.data ?? inner.content ?? inner.items ?? inner.results ?? inner.records ?? inner.list ?? inner.rows ?? inner.bookings ?? inner.providers ?? inner.activities ?? inner.revenueTrend ?? inner.serviceDemand;
      if (Array.isArray(nested)) return nested;
      if (nested && typeof nested === "object") {
        const deep = toArray(nested, depth + 1);
        if (deep.length > 0) return deep;
      }
      if (inner.data && typeof inner.data === "object") {
        const rr = toArray(inner.data, depth + 1);
        if (rr.length > 0) return rr;
      }
      return [inner];
    }
  }
  const direct = payload.content ?? payload.items ?? payload.results ?? payload.records ?? payload.list ?? payload.rows ?? payload.bookings ?? payload.providers ?? payload.activities;
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === "object") {
    const r = toArray(direct, depth + 1);
    if (r.length > 0) return r;
  }
  if (Object.keys(payload).some((k) => STAT_KEYS.includes(k))) return [payload];
  return [];
};

const STAT_KEYS = [
  "totalUsers", "activeUsers", "newUsersToday", "userGrowthRate", "totalProviders", "pendingProviders",
  "verifiedProviders", "totalBookings", "activeBookings", "bookingGrowthRate", "totalRevenue", "revenueGrowthRate",
];

const normalizeStats = (raw) => {
  let d = raw;
  for (let i = 0; i < 8 && d && typeof d === "object" && !Array.isArray(d) && d.totalUsers == null; i += 1) {
    if (d.data && typeof d.data === "object") d = d.data;
    else if (d.dashboardStats) d = d.dashboardStats;
    else if (d.stats) d = d.stats;
    else break;
  }
  d = d?.dashboardStats || d?.stats || d || {};
  if (Array.isArray(d)) d = d[0] || {};
  return Object.fromEntries(STAT_KEYS.map((k) => [k, num(d[k])]));
};

const labelFromDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const mapSeries = (raw) => {
  const arr = Array.isArray(raw) ? raw : toArray(raw);
  if (!arr.length) return [];
  return arr.map((it, i) => ({
    name: it?.label || it?.name || it?.date ? labelFromDate(it.date) || `#${i + 1}` : `#${i + 1}`,
    value: num(it?.value ?? it?.amount ?? it?.revenue ?? it?.total ?? it?.count),
    raw: it,
  }));
};

const colorByName = (() => {
  const map = new Map();
  return (name) => {
    const key = String(name || "Unknown");
    if (!map.has(key)) map.set(key, CHART_COLORS[map.size % CHART_COLORS.length]);
    return map.get(key);
  };
})();

const mapDistribution = (raw) => {
  const arr = Array.isArray(raw) ? raw : toArray(raw);
  if (!arr.length) return [];
  return arr.map((i) => {
    const name = i?.label || i?.name || "Unknown";
    return { name, value: num(i?.count ?? i?.value), color: i?.color || colorByName(name) };
  });
};

const mapBookings = (raw) => {
  const arr = Array.isArray(raw) ? raw : toArray(raw);
  if (!arr.length) return [];
  return arr.map((b, i) => ({
    key: b?.id ?? b?.bookingId ?? `row-${i}`,
    id: b?.id ?? b?.bookingId ?? null,
    customer: b?.customerName || b?.customer?.name || b?.customer?.fullName || "Unknown",
    service: b?.serviceType || b?.service?.name || b?.service || "—",
    amount: num(b?.totalAmount ?? b?.amount),
    status: String(b?.status || "PENDING").toUpperCase(),
    createdAt: b?.createdAt || b?.bookingDate || b?.timestamp || null,
  }));
};

const mapTopProviders = (raw) => {
  const arr = Array.isArray(raw) ? raw : toArray(raw);
  if (!arr.length) return [];
  return arr.map((p, i) => ({
    key: p?.id ?? p?.providerId ?? `prov-${i}`,
    id: p?.id ?? p?.providerId ?? null,
    name: p?.name || p?.fullName || p?.providerName || "Provider",
    rating: num(p?.rating ?? p?.averageRating),
    jobs: num(p?.completedBookings ?? p?.totalBookings ?? p?.bookings ?? p?.jobs),
    revenue: num(p?.revenue ?? p?.earnings ?? p?.totalEarnings),
  }));
};

const mapActivities = (raw) => {
  const arr = Array.isArray(raw) ? raw : toArray(raw);
  if (!arr.length) return [];
  return arr.map((a, i) => ({
    key: a?.id ?? `act-${i}`,
    text: a?.title || a?.message || a?.description || a?.action || "Activity",
    at: a?.timestamp || a?.createdAt || a?.time || null,
    type: String(a?.type || a?.severity || "info").toLowerCase(),
  }));
};

const normAlert = (a) => ({
  ...a,
  _key: a?.id ?? `${a?.timestamp || ""}|${a?.title || a?.message || ""}|${Math.random()}`,
  _color: { error: COLORS.danger, critical: COLORS.danger, warning: COLORS.warning, success: COLORS.success }[String(a?.severity || a?.type || "").toLowerCase()] || COLORS.info,
});

const callOptional = (names, ...args) => {
  const fn = names.map((n) => adminService?.[n]).find((f) => typeof f === "function");
  if (!fn) return Promise.reject(Object.assign(new Error("not implemented"), { code: "NOT_IMPLEMENTED" }));
  return fn.apply(adminService, args);
};

const PANELS = {
  stats: { fetch: (s) => adminService.getDashboardStats(s), map: normalizeStats, isArray: false },
  providers: { fetch: (s) => adminService.getProviderDistribution(s), map: mapDistribution, isArray: true },
  revenue: { fetch: (s, p) => adminService.getRevenueTrend({ days: p.days }, s), map: mapSeries, isArray: true },
  bookings: { fetch: (s) => adminService.getRecentBookings({ limit: 10 }, s), map: mapBookings, isArray: true },
  topProviders: { fetch: (s) => callOptional(["getTopProviders", "getTopProvidersCompat"], { limit: 5 }, s), map: mapTopProviders, isArray: true },
  demand: { fetch: (s) => callOptional(["getServiceDemand", "getServiceDemandCompat"], { days: 30 }, s), map: mapSeries, isArray: true },
  activities: { fetch: (s) => callOptional(["getRecentActivities", "getRecentActivitiesCompat"], { limit: 10 }, s), map: mapActivities, isArray: true },
};

const EMPTY_DATA = {
  stats: normalizeStats({}), providers: [], revenue: [], bookings: [], topProviders: [], demand: [], activities: [],
};
const INITIAL_STATUS = Object.fromEntries(ALL_PANELS.map((k) => [k, { state: "loading" }]));

const csvCell = (v) => {
  if (typeof v === "number") return String(v);
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename, rows) => {
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}") || {}; } catch { return {}; }
};

const GlassCard = styled(Paper)(({ theme, hoverable }) => ({
  background: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(12px)",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 20,
  padding: 22,
  boxShadow: "0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)",
  },
  ...(hoverable && {
    "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 40px rgba(0,0,0,0.08)", borderColor: alpha(COLORS.primary, 0.2) },
  }),
  [theme.breakpoints.down("sm")]: { padding: 16, borderRadius: 16 },
}));

const GradientText = styled(Typography)({
  background: COLORS.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontWeight: 800,
});

const StatCard = React.memo(function StatCard({ title, value, format = "number", icon: Icon, trend, status, color = "primary", onClick, badge, subtitle }) {
  const main = COLORS[color] || COLORS.primary;
  const t = trend == null ? null : num(trend);
  const state = status?.state || "loading";
  const clickable = Boolean(onClick);
  return (
    <GlassCard hoverable={clickable} component={clickable ? "button" : "div"} type={clickable ? "button" : undefined} onClick={onClick}
      sx={{ width: "100%", height: "100%", textAlign: "left", font: "inherit", display: "block", cursor: clickable ? "pointer" : "default",
        "&:focus-visible": { outline: `2px solid ${main}`, outlineOffset: 2 } }}>
      <Stack direction="row" justifyContent="space-between" mb={1.5}>
        <Box sx={{ p: 1.5, borderRadius: 3, background: `linear-gradient(135deg, ${alpha(main, 0.12)} 0%, ${alpha(main, 0.06)} 100%)`, border: `1px solid ${alpha(main, 0.12)}`, display: "flex" }}>{Icon && <Icon size={20} color={main} />}</Box>
        {t != null && state === "ready" && (
          <Chip icon={t >= 0 ? <FaArrowUp size={8} /> : <FaArrowDown size={8} />} label={`${t >= 0 ? "+" : ""}${t.toFixed(1)}%`} size="small"
            sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: alpha(t >= 0 ? COLORS.success : COLORS.danger, 0.1), color: t >= 0 ? COLORS.success : COLORS.danger, border: `1px solid ${alpha(t >= 0 ? COLORS.success : COLORS.danger, 0.15)}` }} />
        )}
      </Stack>
      <Typography sx={{ color: COLORS.muted, fontSize: 12.5, fontWeight: 600, letterSpacing: 0.2, textTransform: "uppercase" }}>
        {title} {badge && <Chip label={badge} size="small" sx={{ height: 20, fontSize: 10, ml: 1, fontWeight: 700, bgcolor: alpha(COLORS.info, 0.1), color: COLORS.info }} />}
      </Typography>
      {state === "loading" ? <Skeleton width="70%" height={36} sx={{ mt: 1, borderRadius: 2 }} /> : state === "error" ? (
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.muted, mt: 1 }}>—</Typography>
      ) : (
        <Stack direction="row" alignItems="baseline" spacing={1} mt={0.5}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.5, fontSize: "1.6rem" }}>{format === "currency" ? fmtINR(value) : fmtNum(value)}</Typography>
          {subtitle && <Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 500, bgcolor: COLORS.bg, px: 1, py: 0.25, borderRadius: 1, border: `1px solid ${COLORS.borderLight}` }}>{subtitle}</Typography>}
        </Stack>
      )}
    </GlassCard>
  );
});

const Panel = React.memo(function Panel({ title, subtitle, actions, status, onRetry, minHeight = 240, children, icon: Icon }) {
  const state = status?.state || "loading";
  return (
    <GlassCard component="section" aria-label={title} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5} gap={1}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          {Icon && <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(COLORS.primary, 0.08), border: `1px solid ${alpha(COLORS.primary, 0.1)}` }}><Icon size={14} color={COLORS.primary} /></Box>}
          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: 14, letterSpacing: -0.2 }}>{title}</Typography>
            {subtitle && <Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 500 }}>{subtitle}</Typography>}
          </Box>
        </Stack>
        {actions}
      </Stack>
      <Box sx={{ flex: 1, minHeight }}>
        {state === "loading" ? <Skeleton variant="rounded" height={minHeight} sx={{ borderRadius: 3 }} /> : state === "error" ? (
          <Box sx={{ minHeight, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, textAlign: "center", bgcolor: alpha(COLORS.danger, 0.02), borderRadius: 3, border: `1px dashed ${alpha(COLORS.danger, 0.15)}`, p: 2 }}>
            <Typography variant="body2" color={COLORS.secondary} fontWeight={500}>{status?.error?.httpStatus === 403 ? "No permission" : "Failed to load"}</Typography>
            <Button size="small" variant="contained" onClick={onRetry} sx={{ textTransform: "none", borderRadius: 2, boxShadow: "none" }}>Retry</Button>
          </Box>
        ) : children}
      </Box>
      {status?.stale && <Typography variant="caption" sx={{ color: COLORS.warning, display: "block", mt: 1.5, fontWeight: 600, bgcolor: alpha(COLORS.warning, 0.06), px: 1.5, py: 0.5, borderRadius: 2, border: `1px solid ${alpha(COLORS.warning, 0.15)}` }}>Stale data - refresh failed</Typography>}
    </GlassCard>
  );
});

const EmptyState = ({ text, minHeight = 200, icon: Icon }) => (
  <Box sx={{ minHeight, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, bgcolor: COLORS.bg, borderRadius: 3, border: `1px dashed ${COLORS.border}` }}>
    {Icon && <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "white", border: `1px solid ${COLORS.borderLight}` }}><Icon size={18} color={COLORS.muted} /></Box>}
    <Typography variant="caption" color={COLORS.muted} fontWeight={600}>{text}</Typography>
  </Box>
);

const MetricChart = React.memo(function MetricChart({ data, type = "area", height = 280, color = COLORS.primary, currency = false }) {
  const gid = useId().replace(/:/g, "");
  const safeData = Array.isArray(data) ? data : [];
  if (!safeData.length) return <EmptyState text="No data for this period" minHeight={height} icon={FaChartLine} />;
  const fmt = (v) => (currency ? fmtINR(v) : fmtNum(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "area" ? (
        <AreaChart data={safeData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} /><stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id={`shadow-${gid}`}><feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={color} floodOpacity="0.15" /></filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderLight} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fontWeight: 500 }} tickFormatter={fmtCompact} width={48} axisLine={false} tickLine={false} />
          <RechartsTooltip contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12 }} formatter={(v) => [fmt(v), "Value"]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fill={`url(#g-${gid})`} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: color }} filter={`url(#shadow-${gid})`} />
        </AreaChart>
      ) : (
        <BarChart data={safeData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderLight} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fontWeight: 500 }} tickFormatter={fmtCompact} width={48} axisLine={false} tickLine={false} />
          <RechartsTooltip contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontSize: 12 }} formatter={(v) => [fmt(v), "Value"]} />
          <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} barSize={24} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
});

export default function AdminDashboard() {
  const { loading: authLoading, isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const prefs = useMemo(loadPrefs, []);
  const [chartType, setChartType] = useState(prefs.chartType === "bar" ? "bar" : "area");
  const [autoRefresh, setAutoRefresh] = useState(prefs.autoRefresh !== false);
  const [refreshSeconds, setRefreshSeconds] = useState(INTERVAL_OPTIONS.includes(prefs.refreshSeconds) ? prefs.refreshSeconds : 30);
  const [range, setRange] = useState(REVENUE_RANGES.includes(prefs.range) ? prefs.range : 7);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportChoices, setExportChoices] = useState({ summary: true, bookings: true, revenue: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [anchorNotif, setAnchorNotif] = useState(null);
  const [anchorUser, setAnchorUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(() => new Date());
  const [forbidden, setForbidden] = useState(false);
  const [data, setData] = useState(EMPTY_DATA);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [alerts, setAlerts] = useState([]);
  const [readKeys, setReadKeys] = useState(() => new Set());
  const mountedRef = useRef(true);
  const controllersRef = useRef(new Set());
  const genRef = useRef({});
  const inflightRef = useRef(0);
  const paramsRef = useRef({ days: range });
  const prevRangeRef = useRef(range);
  const authRedirectRef = useRef(false);
  const deniedRef = useRef(false);
  const role = normalizeRole(user?.role);
  const allowed = !authLoading && isAuthenticated && ADMIN_ROLES.has(role);

  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ chartType, autoRefresh, refreshSeconds, range })); } catch {}
  }, [chartType, autoRefresh, refreshSeconds, range]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true, state: { from: routeLocation } });
      return;
    }
    if (!ADMIN_ROLES.has(role) && !deniedRef.current) {
      deniedRef.current = true;
      toast.error("Admin access required");
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, role, navigate, routeLocation]);

  useEffect(() => {
    mountedRef.current = true;
    const controllers = controllersRef.current;
    return () => {
      mountedRef.current = false;
      controllers.forEach((c) => c.abort());
      controllers.clear();
    };
  }, []);

  const handleUnauthorized = useCallback(async () => {
    if (authRedirectRef.current) return;
    authRedirectRef.current = true;
    toast.info("Session expired - Sign in again");
    try { await logout?.(); } catch {}
    navigate("/login", { replace: true, state: { from: routeLocation } });
  }, [logout, navigate, routeLocation]);

  const loadPanels = useCallback(async (keys) => {
    const controller = new AbortController();
    controllersRef.current.add(controller);
    inflightRef.current += 1;
    const gens = {};
    keys.forEach((k) => { genRef.current[k] = (genRef.current[k] || 0) + 1; gens[k] = genRef.current[k]; });
    const stale = () => controller.signal.aborted || !mountedRef.current;

    const run = async (key) => {
      const cfg = PANELS[key];
      try {
        const raw = await cfg.fetch(controller.signal, paramsRef.current);
        if (stale() || genRef.current[key] !== gens[key]) return { key, skipped: true };
        const mapped = cfg.map(raw);
        if (cfg.isArray) {
          const arr = Array.isArray(mapped) ? mapped : [];
          setData((p) => ({ ...p, [key]: arr }));
        } else {
          setData((p) => ({ ...p, [key]: mapped && typeof mapped === "object" ? mapped : {} }));
        }
        setStatus((p) => ({ ...p, [key]: { state: "ready" } }));
        return { key, ok: true };
      } catch (err) {
        if (isCanceled(err) || stale() || genRef.current[key] !== gens[key]) return { key, skipped: true };
        if (err?.code === "NOT_IMPLEMENTED") {
          setStatus((p) => ({ ...p, [key]: { state: "unavailable" } }));
          return { key, skipped: true };
        }
        const httpStatus = err?.response?.status || 0;
        const error = { httpStatus, message: err?.response?.data?.message || err?.message };
        setStatus((p) => {
          const hadData = p[key]?.state === "ready";
          return { ...p, [key]: { state: hadData ? "ready" : "error", stale: hadData, error } };
        });
        return { key, ok: false, httpStatus };
      }
    };

    const results = await Promise.allSettled(keys.map(run));
    const resolved = results.map((r) => (r.status === "fulfilled" ? r.value : { ok: false, httpStatus: 0 }));
    controllersRef.current.delete(controller);
    inflightRef.current = Math.max(0, inflightRef.current - 1);
    if (mountedRef.current) {
      if (resolved.some((r) => r.ok)) setLastUpdateTime(new Date());
      if (resolved.some((r) => r.httpStatus === 401)) handleUnauthorized();
      else if (resolved.some((r) => r.httpStatus === 403)) setForbidden(true);
      else if (resolved.some((r) => r.ok)) setForbidden(false);
    }
    return resolved;
  }, [handleUnauthorized]);

  useEffect(() => { if (allowed) loadPanels(ALL_PANELS); }, [allowed, loadPanels]);

  useEffect(() => {
    if (!allowed || prevRangeRef.current === range) return;
    prevRangeRef.current = range;
    paramsRef.current = { days: range };
    setData((p) => ({ ...p, revenue: [] }));
    setStatus((p) => ({ ...p, revenue: { state: "loading" } }));
    loadPanels(["revenue"]);
  }, [range, allowed, loadPanels]);

  const handleStats = useCallback((d) => {
    if (!d) return;
    const s = d?.data || d?.dashboardStats || d?.stats || d;
    if (s && typeof s === "object" && s.totalUsers != null) {
      setData((p) => ({ ...p, stats: normalizeStats(s) }));
      setStatus((p) => ({ ...p, stats: { state: "ready" } }));
    }
    if (d?.revenueTrend) {
      const arr = Array.isArray(d.revenueTrend) ? d.revenueTrend : toArray(d.revenueTrend);
      if (paramsRef.current.days === 7 && arr.length) {
        setData((p) => ({ ...p, revenue: mapSeries(arr) }));
        setStatus((p) => ({ ...p, revenue: { state: "ready" } }));
      }
    }
    setLastUpdateTime(new Date());
  }, []);

  const handleAlert = useCallback((a) => {
    if (!a) return;
    const n = normAlert(a);
    setAlerts((p) => (p.some((x) => x._key === n._key) ? p : [n, ...p].slice(0, 50)));
  }, []);

  const { connected, alerts: socketAlerts, lastUpdated, markAlertAsRead, markAllAlertsAsRead, reconnect } = useAdminDashboardSocket({
    enableRealTime: true, autoConnect: allowed, onStatsUpdate: handleStats, onAlert: handleAlert,
  });

  useEffect(() => {
    if (!socketAlerts?.length) return;
    setAlerts((prev) => {
      const seen = new Set(prev.map((a) => a._key));
      const fresh = socketAlerts.map(normAlert).filter((a) => !seen.has(a._key));
      return fresh.length ? [...fresh, ...prev].slice(0, 50) : prev;
    });
  }, [socketAlerts]);

  useEffect(() => {
    if (!allowed || connected || !autoRefresh) return undefined;
    const tick = () => { if (document.visibilityState === "visible" && inflightRef.current === 0) loadPanels(ALL_PANELS); };
    const id = setInterval(tick, refreshSeconds * 1000);
    const onVisible = () => { if (document.visibilityState === "visible" && Date.now() - lastUpdateTime.getTime() > refreshSeconds * 1000) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [allowed, connected, autoRefresh, refreshSeconds, loadPanels, lastUpdateTime]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    if (!connected) reconnect?.();
    const results = await loadPanels(ALL_PANELS);
    if (mountedRef.current) {
      setRefreshing(false);
      const failed = results.filter((r) => r.ok === false).length;
      if (failed === 0) toast.success("Dashboard refreshed");
      else toast.warn(`${failed} section${failed > 1 ? "s" : ""} failed`);
    }
  }, [refreshing, connected, reconnect, loadPanels]);

  const handleSignOut = useCallback(async () => {
    setAnchorUser(null);
    try { await logout?.(); } catch {}
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const stats = data.stats || EMPTY_DATA.stats;
  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const arr = Array.isArray(data.bookings) ? data.bookings : [];
    if (!q) return arr;
    return arr.filter((b) => [b.id, b.customer, b.service, b.status].some((v) => v != null && String(v).toLowerCase().includes(q)));
  }, [data.bookings, searchQuery]);

  const pieData = useMemo(() => Array.isArray(data.providers) ? data.providers.filter((d) => d && d.value > 0) : [], [data.providers]);
  const pieTotal = useMemo(() => pieData.reduce((s, d) => s + num(d.value), 0), [pieData]);
  const unreadCount = useMemo(() => alerts.filter((a) => !readKeys.has(a._key)).length, [alerts, readKeys]);
  const updatedLabel = safeDistance(lastUpdated) || safeDistance(lastUpdateTime) || "just now";

  const retry = useCallback((key) => {
    setStatus((p) => ({ ...p, [key]: { state: "loading" } }));
    loadPanels([key]);
  }, [loadPanels]);

  const handleExport = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    let files = 0;
    if (exportChoices.summary) {
      downloadCsv(`quickks-summary-${stamp}.csv`, [["Metric", "Value"], ...STAT_KEYS.map((k) => [k, stats[k] ?? 0])]);
      files += 1;
    }
    if (exportChoices.bookings) {
      const bookingsArr = Array.isArray(data.bookings) ? data.bookings : [];
      downloadCsv(`quickks-bookings-${stamp}.csv`, [
        ["ID", "Customer", "Service", "Amount (INR)", "Status", "Created"],
        ...bookingsArr.map((b) => [b.id ?? "", b.customer, b.service, b.amount, b.status, b.createdAt ?? ""]),
      ]);
      files += 1;
    }
    if (exportChoices.revenue) {
      const revenueArr = Array.isArray(data.revenue) ? data.revenue : [];
      downloadCsv(`quickks-revenue-${range}d-${stamp}.csv`, [["Period", "Revenue (INR)"], ...revenueArr.map((r) => [r.name, r.value])]);
      files += 1;
    }
    if (files) toast.success(`Exported ${files} file${files > 1 ? "s" : ""}`);
    setExportOpen(false);
  }, [exportChoices, stats, data.bookings, data.revenue, range]);

  if (authLoading || !allowed) {
    return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: COLORS.bg }}><LoadingSpinner size="large" text="Loading admin..." /></Box>;
  }

  const showTop = status.topProviders.state !== "unavailable";
  const showDemand = status.demand.state !== "unavailable";
  const showActivity = status.activities.state !== "unavailable";

  return (
    <ErrorBoundary>
      <Box sx={{ minHeight: "100vh", bgcolor: COLORS.bg, background: `radial-gradient(1200px 600px at 20% -10%, ${alpha(COLORS.primary, 0.08)} 0%, transparent 60%), radial-gradient(1000px 500px at 100% 0%, ${alpha(COLORS.info, 0.06)} 0%, transparent 60%), ${COLORS.bg}` }}>
        {refreshing && <LinearProgress sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, height: 3, bgcolor: alpha(COLORS.primary, 0.1), "& .MuiLinearProgress-bar": { background: COLORS.gradient } }} />}
        <Container maxWidth="xl" sx={{ py: 2.5 }}>
          <GlassCard component="header" sx={{ mb: 2.5, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
              <Stack direction="row" spacing={1.75} alignItems="center">
                <Avatar sx={{ background: COLORS.gradient, width: 44, height: 44, boxShadow: `0 4px 12px ${alpha(COLORS.primary, 0.3)}` }}><FaBolt size={18} color="white" /></Avatar>
                <Box>
                  <Typography component="h1" variant="h6" sx={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: -0.5 }}><GradientText component="span">Quickks Admin</GradientText></Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: connected ? COLORS.success : COLORS.warning, boxShadow: `0 0 0 3px ${alpha(connected ? COLORS.success : COLORS.warning, 0.15)}`, animation: connected ? "pulse 2s infinite" : "none", "@keyframes pulse": { "0%": { boxShadow: `0 0 0 0 ${alpha(COLORS.success, 0.4)}` }, "70%": { boxShadow: `0 0 0 6px ${alpha(COLORS.success, 0)}` }, "100%": { boxShadow: `0 0 0 0 ${alpha(COLORS.success, 0)}` } } }} />
                    <Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 600, fontSize: 11.5 }}>Updated {updatedLabel} • {connected ? "LIVE" : "POLLING"}</Typography>
                  </Stack>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <TextField size="small" placeholder="Search bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ minWidth: isMobile ? 120 : 220, "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "white", "&:hover": { "& fieldset": { borderColor: alpha(COLORS.primary, 0.3) } } } }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={12} color={COLORS.muted} /></InputAdornment>, sx: { height: 36, fontSize: 13 } }} />
                <Tooltip title="Refresh"><span><IconButton size="small" onClick={handleRefresh} disabled={refreshing} sx={{ width: 36, height: 36, bgcolor: "white", border: `1px solid ${COLORS.border}`, "&:hover": { bgcolor: COLORS.bgHover } }}><FaSync size={14} /></IconButton></span></Tooltip>
                <Tooltip title="Notifications"><IconButton size="small" onClick={(e) => setAnchorNotif(e.currentTarget)} sx={{ width: 36, height: 36, bgcolor: "white", border: `1px solid ${COLORS.border}` }}><Badge badgeContent={unreadCount} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 10, fontWeight: 800 } }}><FaBell size={14} /></Badge></IconButton></Tooltip>
                <Tooltip title="Settings"><IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ width: 36, height: 36, bgcolor: "white", border: `1px solid ${COLORS.border}` }}><FaCog size={14} /></IconButton></Tooltip>
                <Tooltip title="Export"><IconButton size="small" onClick={() => setExportOpen(true)} sx={{ width: 36, height: 36, background: COLORS.gradient, color: "white", "&:hover": { opacity: 0.9 } }}><FaFileExport size={14} /></IconButton></Tooltip>
                <Avatar component="button" type="button" onClick={(e) => setAnchorUser(e.currentTarget)}
                  sx={{ width: 36, height: 36, background: COLORS.gradient, fontSize: 13, fontWeight: 800, cursor: "pointer", border: "none", boxShadow: `0 2px 8px ${alpha(COLORS.primary, 0.3)}` }}>
                  {String(user?.fullName || user?.name || user?.firstName || user?.email || "A")[0].toUpperCase()}
                </Avatar>
              </Stack>
            </Stack>
          </GlassCard>

          <Paper role="status" sx={{ p: 1.5, mb: 2.5, bgcolor: alpha(connected ? COLORS.success : COLORS.warning, 0.06), borderRadius: 3, border: `1px solid ${alpha(connected ? COLORS.success : COLORS.warning, 0.14)}`, boxShadow: "none", backdropFilter: "blur(8px)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
              <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: 600, fontSize: 12.5 }}>
                {connected ? "● Realtime active - instant updates" : autoRefresh ? `○ Realtime offline - polling every ${refreshSeconds}s` : "○ Realtime offline - auto-refresh off"}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {!connected && <Button size="small" onClick={() => reconnect?.()} sx={{ textTransform: "none", fontSize: 11, fontWeight: 700, borderRadius: 2 }}>Reconnect</Button>}
                <Chip label={connected ? "LIVE" : "POLLING"} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 800, letterSpacing: 0.5, bgcolor: connected ? COLORS.success : COLORS.warning, color: "white" }} />
              </Stack>
            </Stack>
          </Paper>

          {forbidden && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 3, fontWeight: 600 }} action={<Button size="small" onClick={handleSignOut} sx={{ fontWeight: 700 }}>Sign out</Button>}>Server refused admin access (403) - check role</Alert>}
          {data.stats.pendingProviders > 0 && status.stats.state === "ready" && (
            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 3, fontWeight: 600, bgcolor: alpha(COLORS.info, 0.06), border: `1px solid ${alpha(COLORS.info, 0.15)}` }} action={<Button size="small" variant="contained" onClick={() => navigate("/admin/providers")} sx={{ borderRadius: 2, fontWeight: 700, boxShadow: "none" }}>Review</Button>}>
              {data.stats.pendingProviders} provider{data.stats.pendingProviders > 1 ? "s" : ""} waiting approval
            </Alert>
          )}

          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="Total users" value={stats.totalUsers} icon={FaUsers} trend={stats.userGrowthRate} status={status.stats} color="primary" onClick={() => navigate("/admin/users")} badge={stats.newUsersToday ? `+${stats.newUsersToday} today` : null} subtitle={`${fmtNum(stats.activeUsers)} active`} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="Providers" value={stats.totalProviders} icon={FaShieldAlt} status={status.stats} color="success" onClick={() => navigate("/admin/providers")} badge={stats.pendingProviders ? `${stats.pendingProviders} pending` : null} subtitle={`${fmtNum(stats.verifiedProviders)} verified`} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="Bookings" value={stats.totalBookings} icon={FaClipboardList} trend={stats.bookingGrowthRate} status={status.stats} color="warning" onClick={() => navigate("/admin/bookings")} badge={stats.activeBookings ? `${stats.activeBookings} active` : null} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="Revenue" value={stats.totalRevenue} format="currency" icon={FaRupeeSign} trend={stats.revenueGrowthRate} status={status.stats} color="info" /></Grid>
          </Grid>

          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Panel title={`Revenue - last ${range} days`} subtitle="Daily revenue trend" status={status.revenue} onRetry={() => retry("revenue")} minHeight={300} icon={FaChartLine}
                actions={
                  <Stack direction="row" spacing={1}>
                    <ToggleButtonGroup size="small" exclusive value={range} onChange={(_, v) => v && setRange(v)} sx={{ bgcolor: "white", borderRadius: 2, border: `1px solid ${COLORS.border}`, "& .MuiToggleButton-root": { border: 0, borderRadius: 2, px: 1.5, py: 0.5, fontSize: 12, fontWeight: 700, textTransform: "none" } }}>
                      {REVENUE_RANGES.map((d) => <ToggleButton key={d} value={d}>{d}D</ToggleButton>)}
                    </ToggleButtonGroup>
                    <ToggleButtonGroup size="small" exclusive value={chartType} onChange={(_, v) => v && setChartType(v)} sx={{ bgcolor: "white", borderRadius: 2, border: `1px solid ${COLORS.border}`, "& .MuiToggleButton-root": { border: 0, borderRadius: 2, px: 1.25, py: 0.5, fontSize: 11, fontWeight: 700 } }}>
                      <ToggleButton value="area">Area</ToggleButton><ToggleButton value="bar">Bar</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                }>
                <MetricChart data={data.revenue} type={chartType} height={300} currency />
              </Panel>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Panel title="Provider distribution" status={status.providers} onRetry={() => retry("providers")} minHeight={300} icon={FaShieldAlt}>
                {pieData.length === 0 ? <EmptyState text="No providers yet" minHeight={300} icon={FaShieldAlt} /> : (
                  <>
                    <Box sx={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={3} stroke="none">{pieData.map((e) => <Cell key={e.name} fill={e.color} />)}</Pie><RechartsTooltip contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }} /></PieChart>
                      </ResponsiveContainer>
                    </Box>
                    <Stack spacing={1} mt={1.5}>
                      {pieData.map((e) => (
                        <Stack key={e.name} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, borderRadius: 2, bgcolor: COLORS.bg, border: `1px solid ${COLORS.borderLight}`, "&:hover": { bgcolor: "white" } }}>
                          <Stack direction="row" spacing={1.25} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: e.color, boxShadow: `0 2px 6px ${alpha(e.color, 0.3)}` }} /><Typography variant="caption" fontWeight={700}>{e.name}</Typography></Stack>
                          <Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 700, bgcolor: "white", px: 1, py: 0.25, borderRadius: 1, border: `1px solid ${COLORS.borderLight}` }}>{fmtNum(e.value)} • {pieTotal ? Math.round((e.value / pieTotal) * 100) : 0}%</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}
              </Panel>
            </Grid>
          </Grid>

          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, lg: showTop ? 8 : 12 }}>
              <Panel title="Recent bookings" status={status.bookings} onRetry={() => retry("bookings")} minHeight={280}
                actions={<Button size="small" variant="outlined" onClick={() => navigate("/admin/bookings")} sx={{ textTransform: "none", fontSize: 12, fontWeight: 700, borderRadius: 2 }}>View all</Button>}>
                {filteredBookings.length === 0 ? <EmptyState text={searchQuery ? "No match" : "No bookings yet"} minHeight={200} icon={FaClipboardList} /> : (
                  <TableContainer sx={{ borderRadius: 3, border: `1px solid ${COLORS.borderLight}`, "& .MuiTable-root": { borderCollapse: "separate" } }}>
                    <Table size="small">
                      <TableHead><TableRow sx={{ bgcolor: COLORS.bg, "& .MuiTableCell-root": { borderBottom: `1px solid ${COLORS.border}`, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.muted } }}>{["ID", "Customer", "Service", "Amount", "Status", "When"].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                      <TableBody>
                        {filteredBookings.slice(0, 8).map((b) => {
                          const open = () => b.id != null && navigate(`/admin/bookings/${b.id}`);
                          const c = STATUS_COLORS[b.status] || COLORS.muted;
                          return (
                            <TableRow key={b.key} hover tabIndex={b.id != null ? 0 : -1} onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }} sx={{ cursor: b.id != null ? "pointer" : "default", "&:hover": { bgcolor: alpha(COLORS.primary, 0.02) }, "& .MuiTableCell-root": { borderBottom: `1px solid ${COLORS.borderLight}`, py: 1.25 } }}>
                              <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{b.id != null ? `#${b.id}` : "—"}</TableCell>
                              <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{b.customer}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{b.service}</TableCell>
                              <TableCell sx={{ fontWeight: 800, fontSize: 12 }}>{fmtINR(b.amount)}</TableCell>
                              <TableCell><Chip label={b.status.replace(/_/g, " ")} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 800, letterSpacing: 0.3, bgcolor: alpha(c, 0.1), color: c, border: `1px solid ${alpha(c, 0.2)}` }} /></TableCell>
                              <TableCell sx={{ fontSize: 11, color: COLORS.muted, whiteSpace: "nowrap", fontWeight: 500 }}>{safeDistance(b.createdAt) || "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Panel>
            </Grid>
            {showTop && (
              <Grid size={{ xs: 12, lg: 4 }}>
                <Panel title="Top providers" subtitle="By completed jobs" status={status.topProviders} onRetry={() => retry("topProviders")} minHeight={280}>
                  {data.topProviders.length === 0 ? <EmptyState text="No activity" minHeight={200} icon={FaStar} /> : (
                    <Stack divider={<Divider flexItem sx={{ borderColor: COLORS.borderLight }} />} spacing={0}>
                      {data.topProviders.map((p, i) => (
                        <Stack key={p.key} direction="row" alignItems="center" spacing={1.5} onClick={() => p.id != null && navigate(`/admin/providers/${p.id}`)} sx={{ py: 1.5, px: 1, borderRadius: 2, cursor: p.id != null ? "pointer" : "default", "&:hover": { bgcolor: COLORS.bg } }}>
                          <Avatar sx={{ width: 36, height: 36, fontSize: 13, bgcolor: alpha(CHART_COLORS[i % CHART_COLORS.length], 0.12), color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 800, border: `1px solid ${alpha(CHART_COLORS[i % CHART_COLORS.length], 0.15)}` }}>{p.name[0]?.toUpperCase()}</Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" noWrap fontWeight={700} sx={{ fontSize: 13 }}>{p.name}</Typography><Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 500 }}>{fmtNum(p.jobs)} jobs{p.revenue ? ` • ${fmtINR(p.revenue)}` : ""}</Typography></Box>
                          {p.rating > 0 && <Stack direction="row" spacing={0.5} alignItems="center" sx={{ bgcolor: alpha(COLORS.warning, 0.1), px: 1, py: 0.25, borderRadius: 2, border: `1px solid ${alpha(COLORS.warning, 0.15)}` }}><FaStar size={11} color={COLORS.warning} /><Typography variant="caption" fontWeight={800}>{p.rating.toFixed(1)}</Typography></Stack>}
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Panel>
              </Grid>
            )}
          </Grid>

          {(showDemand || showActivity) && (
            <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
              {showDemand && (
                <Grid size={{ xs: 12, lg: showActivity ? 6 : 12 }}>
                  <Panel title="Service demand" subtitle="Last 30 days" status={status.demand} onRetry={() => retry("demand")} minHeight={280}>
                    <MetricChart data={data.demand} type="bar" height={280} color={COLORS.success} />
                  </Panel>
                </Grid>
              )}
              {showActivity && (
                <Grid size={{ xs: 12, lg: showDemand ? 6 : 12 }}>
                  <Panel title="Recent activity" status={status.activities} onRetry={() => retry("activities")} minHeight={280}>
                    {data.activities.length === 0 ? <EmptyState text="No activity" minHeight={200} /> : (
                      <Stack spacing={1.5} sx={{ maxHeight: 300, overflowY: "auto", pr: 0.5, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: COLORS.border, borderRadius: 2 } }}>
                        {data.activities.map((a) => (
                          <Stack key={a.key} direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: 1, borderRadius: 2, "&:hover": { bgcolor: COLORS.bg } }}>
                            <Box sx={{ mt: 0.75, width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: { error: COLORS.danger, warning: COLORS.warning, success: COLORS.success }[a.type] || COLORS.info, boxShadow: `0 0 0 3px ${alpha({ error: COLORS.danger, warning: COLORS.warning, success: COLORS.success }[a.type] || COLORS.info, 0.15)}` }} />
                            <Box><Typography variant="body2" fontWeight={600} sx={{ fontSize: 13, lineHeight: 1.4 }}>{a.text}</Typography><Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 500 }}>{safeDistance(a.at) || "Just now"}</Typography></Box>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Panel>
                </Grid>
              )}
            </Grid>
          )}

          <Box sx={{ mt: 4, textAlign: "center", py: 2, borderTop: `1px solid ${COLORS.borderLight}` }}><Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 600, letterSpacing: 0.3 }}>© {new Date().getFullYear()} Quickks Admin • Crafted with precision • {connected ? "LIVE" : "OFFLINE"}</Typography></Box>
        </Container>

        <Menu anchorEl={anchorNotif} open={Boolean(anchorNotif)} onClose={() => setAnchorNotif(null)} PaperProps={{ sx: { width: 380, maxWidth: "92vw", maxHeight: 440, borderRadius: 3, border: `1px solid ${COLORS.border}`, boxShadow: "0 16px 48px rgba(0,0,0,0.12)", overflow: "hidden" } }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${COLORS.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: COLORS.bg }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: 13 }}>Notifications • {unreadCount} new</Typography>
            {alerts.length > 0 && <Button size="small" onClick={() => { setReadKeys(new Set(alerts.map((a) => a._key))); markAllAlertsAsRead?.(); }} sx={{ fontSize: 11, fontWeight: 700, textTransform: "none", borderRadius: 2 }}>Mark read</Button>}
          </Box>
          <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
            {alerts.length ? alerts.slice(0, 15).map((al) => (
              <MenuItem key={al._key} sx={{ opacity: readKeys.has(al._key) ? 0.6 : 1, whiteSpace: "normal", alignItems: "flex-start", gap: 1.25, py: 1.5, borderBottom: `1px solid ${COLORS.borderLight}`, "&:hover": { bgcolor: COLORS.bg } }}
                onClick={() => { setReadKeys((p) => new Set(p).add(al._key)); markAlertAsRead?.(al.id); }}>
                <Box sx={{ mt: 0.75, width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: al._color, boxShadow: `0 0 0 3px ${alpha(al._color, 0.15)}` }} />
                <Box><Typography variant="caption" fontWeight={700} sx={{ fontSize: 12.5 }}>{al.title || al.message}</Typography><Typography variant="caption" sx={{ display: "block", color: COLORS.muted, fontSize: 11, fontWeight: 500, mt: 0.25 }}>{safeDistance(al.timestamp) || "Just now"}</Typography></Box>
              </MenuItem>
            )) : <Box sx={{ p: 4, textAlign: "center" }}><Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 600 }}>No notifications</Typography></Box>}
          </Box>
        </Menu>

        <Menu anchorEl={anchorUser} open={Boolean(anchorUser)} onClose={() => setAnchorUser(null)} PaperProps={{ sx: { borderRadius: 3, border: `1px solid ${COLORS.border}`, boxShadow: "0 16px 48px rgba(0,0,0,0.12)", minWidth: 200, overflow: "hidden" } }}>
          <Box sx={{ px: 2.5, py: 2, background: `linear-gradient(135deg, ${alpha(COLORS.primary, 0.06)} 0%, ${alpha(COLORS.info, 0.04)} 100%)` }}><Typography variant="body2" fontWeight={800}>{user?.fullName || user?.name || "Admin"}</Typography><Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 10 }}>{role.replace(/_/g, " ")}</Typography></Box>
          <Divider sx={{ borderColor: COLORS.borderLight }} />
          <MenuItem onClick={() => { setAnchorUser(null); navigate("/profile"); }} sx={{ fontWeight: 600, fontSize: 13 }}><FaUserCheck style={{ marginRight: 10 }} />Profile</MenuItem>
          <MenuItem onClick={() => { setAnchorUser(null); setSettingsOpen(true); }} sx={{ fontWeight: 600, fontSize: 13 }}><FaCog style={{ marginRight: 10 }} />Settings</MenuItem>
          <Divider sx={{ borderColor: COLORS.borderLight }} />
          <MenuItem onClick={handleSignOut} sx={{ fontWeight: 600, fontSize: 13, color: COLORS.danger }}><FaSignOutAlt style={{ marginRight: 10 }} />Sign out</MenuItem>
        </Menu>

        <Drawer anchor="right" open={settingsOpen} onClose={() => setSettingsOpen(false)} PaperProps={{ sx: { width: 340, maxWidth: "92vw", p: 3, borderLeft: `1px solid ${COLORS.border}`, boxShadow: "-8px 0 32px rgba(0,0,0,0.08)" } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}><Typography variant="h6" fontWeight={900} sx={{ fontSize: 16, letterSpacing: -0.3 }}>Settings</Typography><IconButton size="small" onClick={() => setSettingsOpen(false)} sx={{ bgcolor: COLORS.bg, border: `1px solid ${COLORS.border}` }}><FaTimes size={12} /></IconButton></Stack>
          <Stack spacing={3}>
            <Box><FormControlLabel control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} size="small" />} label={<Typography variant="body2" fontWeight={600}>Auto-refresh when offline</Typography>} /></Box>
            <Box><Typography variant="caption" sx={{ color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 11, display: "block", mb: 1.5 }}>Refresh interval</Typography><ToggleButtonGroup size="small" exclusive value={refreshSeconds} onChange={(_, v) => v && setRefreshSeconds(v)} disabled={!autoRefresh} sx={{ bgcolor: COLORS.bg, borderRadius: 2.5, p: 0.5, "& .MuiToggleButton-root": { border: 0, borderRadius: 2, px: 2, py: 0.75, fontSize: 13, fontWeight: 700, "&.Mui-selected": { bgcolor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" } } }}>{INTERVAL_OPTIONS.map((s) => <ToggleButton key={s} value={s}>{s}s</ToggleButton>)}</ToggleButtonGroup></Box>
          </Stack>
        </Drawer>

        <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, border: `1px solid ${COLORS.border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.16)" } }}>
          <DialogTitle sx={{ fontSize: 16, fontWeight: 900, letterSpacing: -0.3, pb: 1 }}>Export CSV</DialogTitle>
          <DialogContent sx={{ pt: "8px !important" }}>
            <Stack spacing={0.5} mt={1}>
              {[{ id: "summary", label: "Summary KPIs", desc: "All metrics" }, { id: "bookings", label: "Recent bookings", desc: "Last 10 bookings" }, { id: "revenue", label: `Revenue ${range} days`, desc: "Trend data" }].map((o) => (
                <Box key={o.id} sx={{ display: "flex", alignItems: "center", p: 1.5, borderRadius: 2.5, border: `1px solid ${exportChoices[o.id] ? alpha(COLORS.primary, 0.2) : COLORS.borderLight}`, bgcolor: exportChoices[o.id] ? alpha(COLORS.primary, 0.04) : "white", cursor: "pointer", "&:hover": { borderColor: alpha(COLORS.primary, 0.3) } }} onClick={() => setExportChoices((p) => ({ ...p, [o.id]: !p[o.id] }))}>
                  <Checkbox size="small" checked={exportChoices[o.id]} sx={{ p: 0.5, mr: 1.5 }} />
                  <Box><Typography variant="body2" fontWeight={700} sx={{ fontSize: 13 }}>{o.label}</Typography><Typography variant="caption" sx={{ color: COLORS.muted, fontSize: 11 }}>{o.desc}</Typography></Box>
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}><Button size="small" onClick={() => setExportOpen(false)} sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}>Cancel</Button><Button size="small" variant="contained" onClick={handleExport} disabled={!Object.values(exportChoices).some(Boolean)} sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 800, background: COLORS.gradient, boxShadow: `0 4px 12px ${alpha(COLORS.primary, 0.3)}`, "&:hover": { boxShadow: `0 6px 16px ${alpha(COLORS.primary, 0.4)}` } }}>Download {Object.values(exportChoices).filter(Boolean).length} files</Button></DialogActions>
        </Dialog>

        <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
      </Box>
    </ErrorBoundary>
  );
}