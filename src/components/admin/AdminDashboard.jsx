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
  FaArrowUp, FaArrowDown, FaFileExport, FaTimes, FaUserCheck, FaSignOutAlt, FaStar,
} from "react-icons/fa";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

/* ============================== Config ============================== */

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
const ALL_PANELS = ["stats", "providers", "revenue", "bookings", "topProviders", "demand", "activities"];
const REVENUE_RANGES = [7, 30, 90];
const INTERVAL_OPTIONS = [15, 30, 60, 120];
const PREF_KEY = "quickks_admin_prefs";

const COLORS = {
  primary: "#6366f1", success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6",
  muted: "#64748b", secondary: "#475569", bg: "#f8fafc", border: "#e2e8f0", borderLight: "#f1f5f9",
};
const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const STATUS_COLORS = {
  PENDING: COLORS.warning, CONFIRMED: COLORS.info, ASSIGNED: COLORS.info, IN_PROGRESS: COLORS.primary,
  COMPLETED: COLORS.success, CANCELLED: COLORS.danger, REJECTED: COLORS.danger, REFUNDED: COLORS.muted,
};

/* ============================== Helpers - FIX v64 SAFE ============================== */

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

// FIX v64: ULTRA SAFE - handles axios response, {data:[]}, {data:{content:[]}}, {data:{data:[]}}, paginated, etc - NEVER returns non-array
const toArray = (payload, depth = 0) => {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object" || depth > 5) return [];
  
  // Axios response: response.data may be array or object
  if (payload.data !== undefined) {
    if (Array.isArray(payload.data)) return payload.data;
    // data is object - drill down
    const inner = payload.data;
    if (inner && typeof inner === "object") {
      if (Array.isArray(inner)) return inner;
      // Check for nested wrappers inside data
      const nested = inner.data ?? inner.content ?? inner.items ?? inner.results ?? inner.records ?? inner.list ?? inner.rows ?? inner.bookings ?? inner.providers ?? inner.activities;
      if (Array.isArray(nested)) return nested;
      if (nested && typeof nested === "object") {
        const deepResult = toArray(nested, depth + 1);
        if (deepResult.length > 0) return deepResult;
      }
      // If inner has data property that is object, recurse
      if (inner.data && typeof inner.data === "object") {
        const rr = toArray(inner.data, depth + 1);
        if (rr.length > 0) return rr;
      }
      // Fallback: if inner itself looks like paginated object but we found nothing, return []
    }
  }
  
  // Direct wrappers without .data
  const direct = payload.content ?? payload.items ?? payload.results ?? payload.records ?? payload.list ?? payload.rows ?? payload.bookings ?? payload.providers ?? payload.activities;
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === "object") {
    const r = toArray(direct, depth + 1);
    if (r.length > 0) return r;
  }
  
  // Last resort: if object has numeric keys or looks like array-like, try Object.values
  // But only if it doesn't look like a stats object
  const keys = Object.keys(payload);
  const isStatsLike = keys.some(k => ["totalUsers","totalProviders","totalBookings","totalRevenue"].includes(k));
  if (!isStatsLike && keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
    return Object.values(payload);
  }
  
  return [];
};

const safeArray = toArray;

const STAT_KEYS = [
  "totalUsers", "activeUsers", "newUsersToday", "userGrowthRate", "totalProviders", "pendingProviders",
  "verifiedProviders", "totalBookings", "activeBookings", "bookingGrowthRate", "totalRevenue", "revenueGrowthRate",
];
const normalizeStats = (raw) => {
  let d = raw;
  for (let i = 0; i < 5 && d && typeof d === "object" && !Array.isArray(d) && d.totalUsers == null; i += 1) {
    if (d.data && typeof d.data === "object") d = d.data;
    else if (d.dashboardStats) d = d.dashboardStats;
    else break;
  }
  d = d?.dashboardStats || d || {};
  if (Array.isArray(d)) d = d[0] || {};
  return Object.fromEntries(STAT_KEYS.map((k) => [k, num(d[k])]));
};

const labelFromDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const mapSeries = (raw) => {
  const arr = safeArray(raw);
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((it, i) => ({
    name: it?.label || it?.name || (it?.date && labelFromDate(it.date)) || `#${i + 1}`,
    value: num(it?.value ?? it?.amount ?? it?.revenue ?? it?.total ?? it?.count),
  }));
};

const colorByName = (() => {
  const map = new Map();
  return (name) => {
    const key = name || "Unknown";
    if (!map.has(key)) map.set(key, CHART_COLORS[map.size % CHART_COLORS.length]);
    return map.get(key);
  };
})();

const mapDistribution = (raw) => {
  const arr = safeArray(raw);
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((i) => {
    const name = i?.label || i?.name || "Unknown";
    return { name, value: num(i?.count ?? i?.value), color: i?.color || colorByName(name) };
  });
};

const mapBookings = (raw) => {
  const arr = safeArray(raw);
  if (!Array.isArray(arr) || arr.length === 0) return [];
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
  const arr = safeArray(raw);
  if (!Array.isArray(arr) || arr.length === 0) return [];
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
  const arr = safeArray(raw);
  if (!Array.isArray(arr) || arr.length === 0) return [];
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

// Optional endpoints: if adminService does not implement them yet, the panel hides itself.
const callOptional = (names, ...args) => {
  const fn = names.map((n) => adminService?.[n]).find((f) => typeof f === "function");
  if (!fn) return Promise.reject(Object.assign(new Error("not implemented"), { code: "NOT_IMPLEMENTED" }));
  return fn.apply(adminService, args);
};

const PANELS = {
  stats: { fetch: (s) => adminService.getDashboardStats(s), map: normalizeStats },
  providers: { fetch: (s) => adminService.getProviderDistribution(s), map: mapDistribution },
  revenue: { fetch: (s, p) => adminService.getRevenueTrend({ days: p.days }, s), map: mapSeries },
  bookings: { fetch: (s) => adminService.getRecentBookings({ limit: 10 }, s), map: mapBookings },
  topProviders: { fetch: (s) => callOptional(["getTopProviders"], { limit: 5 }, s), map: mapTopProviders },
  demand: { fetch: (s) => callOptional(["getServiceDemand"], { days: 30 }, s), map: mapSeries },
  activities: { fetch: (s) => callOptional(["getRecentActivities"], { limit: 10 }, s), map: mapActivities },
};
const EMPTY_DATA = {
  stats: normalizeStats({}), providers: [], revenue: [], bookings: [], topProviders: [], demand: [], activities: [],
};
const INITIAL_STATUS = Object.fromEntries(ALL_PANELS.map((k) => [k, { state: "loading" }]));

/* CSV export: UTF-8 BOM for Excel, quotes escaped, formula-injection guarded. */
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

/* ============================== UI primitives ============================== */

const GlassCard = styled(Paper)(({ theme }) => ({
  background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20,
  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  [theme.breakpoints.down("sm")]: { padding: 14, borderRadius: 12 },
}));

const GradientText = styled(Typography)({
  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent", backgroundClip: "text",
});

const StatCard = React.memo(function StatCard({ title, value, format = "number", icon: Icon, trend, status, color = "primary", onClick, badge, subtitle }) {
  const main = COLORS[color] || COLORS.primary;
  const t = trend == null ? null : num(trend);
  const state = status?.state || "loading";
  const clickable = Boolean(onClick);
  return (
    <GlassCard
      component={clickable ? "button" : "div"}
      type={clickable ? "button" : undefined}
      onClick={onClick}
      aria-label={clickable ? `${title}: open details` : undefined}
      sx={{
        width: "100%", height: "100%", textAlign: "left", font: "inherit", display: "block",
        cursor: clickable ? "pointer" : "default", transition: "transform .2s, box-shadow .2s",
        "&:hover": clickable ? { transform: "translateY(-2px)", boxShadow: "0 6px 20px rgba(0,0,0,0.08)" } : undefined,
        "&:focus-visible": { outline: `2px solid ${main}`, outlineOffset: 2 },
        "@media (prefers-reduced-motion: reduce)": { transition: "none", "&:hover": { transform: "none" } },
      }}
    >
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha(main, 0.1), border: `1px solid ${alpha(main, 0.15)}` }}>{Icon && <Icon size={18} color={main} />}</Box>
        {t != null && state === "ready" && (
          <Chip
            icon={t >= 0 ? <FaArrowUp size={8} /> : <FaArrowDown size={8} />}
            label={`${t >= 0 ? "+" : ""}${t.toFixed(1)}%`} size="small"
            sx={{ height: 22, fontSize: 10, bgcolor: alpha(t >= 0 ? COLORS.success : COLORS.danger, 0.1), color: t >= 0 ? COLORS.success : COLORS.danger }}
          />
        )}
      </Stack>
      <Typography sx={{ color: COLORS.muted, fontSize: 12, fontWeight: 500 }}>
        {title} {badge && <Chip label={badge} size="small" sx={{ height: 18, fontSize: 9, ml: 1 }} />}
      </Typography>
      {state === "loading" ? <Skeleton width="60%" height={32} /> : state === "error" ? (
        <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.muted }} title="Could not load">—</Typography>
      ) : (
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {format === "currency" ? fmtINR(value) : fmtNum(value)}{" "}
          {subtitle && <Typography component="span" variant="caption" color={COLORS.muted}>{subtitle}</Typography>}
        </Typography>
      )}
    </GlassCard>
  );
});

const Panel = React.memo(function Panel({ title, subtitle, actions, status, onRetry, minHeight = 220, children }) {
  const state = status?.state || "loading";
  return (
    <GlassCard component="section" aria-label={title} sx={{ height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2} gap={1}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
          {subtitle && <Typography variant="caption" color={COLORS.muted}>{subtitle}</Typography>}
        </Box>
        {actions}
      </Stack>
      {state === "loading" ? <Skeleton variant="rounded" height={minHeight} /> : state === "error" ? (
        <Box sx={{ minHeight, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, textAlign: "center" }}>
          <Typography variant="body2" color={COLORS.secondary}>
            {status?.error?.httpStatus === 403 ? "You do not have permission to view this." : "This section could not be loaded."}
          </Typography>
          <Button size="small" variant="outlined" onClick={onRetry} sx={{ textTransform: "none" }}>Try again</Button>
        </Box>
      ) : children}
      {status?.stale && <Typography variant="caption" sx={{ color: COLORS.warning, display: "block", mt: 1 }}>Showing last loaded data. The latest refresh failed.</Typography>}
    </GlassCard>
  );
});

const EmptyState = ({ text, minHeight = 200 }) => (
  <Box sx={{ minHeight, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Typography variant="caption" color={COLORS.muted}>{text}</Typography>
  </Box>
);

const MetricChart = React.memo(function MetricChart({ data, type = "area", height = 260, color = COLORS.primary, currency = false }) {
  const gid = useId().replace(/:/g, "");
  const safeData = Array.isArray(data) ? data : [];
  if (!safeData?.length) return <EmptyState text="No data for this period" minHeight={height} />;
  const fmt = (v) => (currency ? fmtINR(v) : fmtNum(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "area" ? (
        <AreaChart data={safeData} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} /><stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderLight} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompact} width={44} />
          <RechartsTooltip formatter={(v) => [fmt(v), "Value"]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#g-${gid})`} />
        </AreaChart>
      ) : (
        <BarChart data={safeData} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderLight} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtCompact} width={44} />
          <RechartsTooltip formatter={(v) => [fmt(v), "Value"]} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
});

/* ============================== Page ============================== */

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

  /* Persist preferences. */
  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ chartType, autoRefresh, refreshSeconds, range })); } catch { /* ignore */ }
  }, [chartType, autoRefresh, refreshSeconds, range]);

  /* Auth / role gate. */
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true, state: { from: routeLocation } });
      return;
    }
    if (!ADMIN_ROLES.has(role) && !deniedRef.current) {
      deniedRef.current = true;
      toast.error("You do not have access to the admin area.");
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
    toast.info("Your session has expired. Please sign in again.");
    try { await logout?.(); } catch { /* sign out locally regardless */ }
    navigate("/login", { replace: true, state: { from: routeLocation } });
  }, [logout, navigate, routeLocation]);

  /* Load one or more panels. Latest request per panel wins; aborted requests never touch state. */
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
        const safeMapped = Array.isArray(mapped) ? mapped : (mapped && typeof mapped === 'object' && !Array.isArray(mapped) ? mapped : []);
        setData((p) => ({ ...p, [key]: safeMapped }));
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
        console.error(`[AdminDashboard] ${key} failed`, httpStatus || error.message);
        setStatus((p) => {
          const hadData = p[key]?.state === "ready";
          return { ...p, [key]: { state: hadData ? "ready" : "error", stale: hadData, error } };
        });
        return { key, ok: false, httpStatus };
      }
    };

    const results = await Promise.all(keys.map(run));
    controllersRef.current.delete(controller);
    inflightRef.current = Math.max(0, inflightRef.current - 1);

    if (mountedRef.current) {
      if (results.some((r) => r.ok)) setLastUpdateTime(new Date());
      if (results.some((r) => r.httpStatus === 401)) handleUnauthorized();
      else if (results.some((r) => r.httpStatus === 403)) setForbidden(true);
      else if (results.some((r) => r.ok)) setForbidden(false);
    }
    return results;
  }, [handleUnauthorized]);

  /* Initial load. */
  useEffect(() => { if (allowed) loadPanels(ALL_PANELS); }, [allowed, loadPanels]);

  /* Revenue range change reloads only that panel. */
  useEffect(() => {
    if (!allowed || prevRangeRef.current === range) return;
    prevRangeRef.current = range;
    paramsRef.current = { days: range };
    setData((p) => ({ ...p, revenue: [] }));
    setStatus((p) => ({ ...p, revenue: { state: "loading" } }));
    loadPanels(["revenue"]);
  }, [range, allowed, loadPanels]);

  /* Realtime socket. */
  const handleStats = useCallback((d) => {
    const s = d?.data || d?.dashboardStats || d;
    if (s?.totalUsers != null) {
      setData((p) => ({ ...p, stats: normalizeStats(s) }));
      setStatus((p) => ({ ...p, stats: { state: "ready" } }));
    }
    if (d?.revenueTrend) {
      const arr = safeArray(d.revenueTrend);
      if (paramsRef.current.days === 7 && arr.length) {
        setData((p) => ({ ...p, revenue: mapSeries(d.revenueTrend) }));
        setStatus((p) => ({ ...p, revenue: { state: "ready" } }));
      }
    }
    setLastUpdateTime(new Date());
  }, []);
  const handleAlert = useCallback((a) => {
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

  /* Polling fallback: only when the socket is down, tab visible, nothing in flight. */
  useEffect(() => {
    if (!allowed || connected || !autoRefresh) return undefined;
    const tick = () => {
      if (document.visibilityState === "visible" && inflightRef.current === 0) loadPanels(ALL_PANELS);
    };
    const id = setInterval(tick, refreshSeconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastUpdateTime.getTime() > refreshSeconds * 1000) tick();
    };
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
      else toast.warn(`${failed} section${failed > 1 ? "s" : ""} could not be refreshed`);
    }
  }, [refreshing, connected, reconnect, loadPanels]);

  const handleSignOut = useCallback(async () => {
    setAnchorUser(null);
    try { await logout?.(); } catch { /* the server may reject an expired token; still sign out locally */ }
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  /* Derived. */
  const stats = data.stats;
  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return Array.isArray(data.bookings) ? data.bookings : [];
    const bookingsArr = Array.isArray(data.bookings) ? data.bookings : [];
    return bookingsArr.filter((b) => [b.id, b.customer, b.service, b.status].some((v) => v != null && String(v).toLowerCase().includes(q)));
  }, [data.bookings, searchQuery]);
  const pieData = useMemo(() => Array.isArray(data.providers) ? data.providers.filter((d) => d.value > 0) : [], [data.providers]);
  const pieTotal = useMemo(() => pieData.reduce((s, d) => s + d.value, 0), [pieData]);
  const unreadCount = useMemo(() => alerts.filter((a) => !readKeys.has(a._key)).length, [alerts, readKeys]);
  const updatedLabel = safeDistance(lastUpdated) || safeDistance(lastUpdateTime) || "just now";

  const retry = useCallback((key) => {
    setStatus((p) => ({ ...p, [key]: { state: "loading" } }));
    loadPanels([key]);
  }, [loadPanels]);

  /* Export. */
  const handleExport = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    let files = 0;
    if (exportChoices.summary) {
      downloadCsv(`quickks-summary-${stamp}.csv`, [["Metric", "Value"], ...STAT_KEYS.map((k) => [k, stats[k]])]);
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
    return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><LoadingSpinner size="large" text="Loading admin..." /></Box>;
  }

  const showTop = status.topProviders.state !== "unavailable";
  const showDemand = status.demand.state !== "unavailable";
  const showActivity = status.activities.state !== "unavailable";
  const statsStatus = status.stats;

  return (
    <ErrorBoundary>
      <Box sx={{ minHeight: "100vh", bgcolor: COLORS.bg }}>
        {refreshing && <LinearProgress sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, height: 3 }} />}
        <Container maxWidth="xl" sx={{ py: 2 }}>
          {/* Header */}
          <GlassCard component="header" sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", width: 40, height: 40 }}><FaBolt size={16} color="white" /></Avatar>
                <Box>
                  <Typography component="h1" variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem" }}><GradientText component="span">Quickks Admin</GradientText></Typography>
                  <Typography variant="caption" color={COLORS.muted}>Updated {updatedLabel} • {connected ? "LIVE" : "POLLING"}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TextField size="small" placeholder="Search bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  inputProps={{ "aria-label": "Search recent bookings" }} sx={{ minWidth: isMobile ? 110 : 200 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={12} /></InputAdornment> }} />
                <Tooltip title="Refresh"><span><IconButton size="small" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh dashboard"><FaSync size={14} /></IconButton></span></Tooltip>
                <Tooltip title="Notifications"><IconButton size="small" onClick={(e) => setAnchorNotif(e.currentTarget)} aria-label={`Notifications, ${unreadCount} unread`}><Badge badgeContent={unreadCount} color="error"><FaBell size={14} /></Badge></IconButton></Tooltip>
                <Tooltip title="Settings"><IconButton size="small" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><FaCog size={14} /></IconButton></Tooltip>
                <Tooltip title="Export"><IconButton size="small" onClick={() => setExportOpen(true)} aria-label="Export data"><FaFileExport size={14} /></IconButton></Tooltip>
                <Avatar component="button" type="button" aria-label="Account menu" onClick={(e) => setAnchorUser(e.currentTarget)}
                  sx={{ width: 30, height: 30, bgcolor: COLORS.primary, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none" }}>
                  {String(user?.fullName || user?.name || user?.firstName || user?.email || "A")[0].toUpperCase()}
                </Avatar>
              </Stack>
            </Stack>
          </GlassCard>

          {/* Connection banner */}
          <Paper role="status" sx={{ p: 1.2, mb: 2, bgcolor: alpha(connected ? COLORS.success : COLORS.warning, 0.06), borderRadius: 2, border: `1px solid ${alpha(connected ? COLORS.success : COLORS.warning, 0.12)}`, boxShadow: "none" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
              <Typography variant="caption" color={COLORS.secondary}>
                {connected ? "Realtime updates are active." : autoRefresh ? `Realtime is offline. Refreshing every ${refreshSeconds}s.` : "Realtime is offline and auto-refresh is off."}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {!connected && <Button size="small" onClick={() => reconnect?.()} sx={{ textTransform: "none", fontSize: 11 }}>Reconnect</Button>}
                <Chip label={connected ? "LIVE" : "POLLING"} size="small" sx={{ height: 20, fontSize: 9, fontWeight: 700 }} />
              </Stack>
            </Stack>
          </Paper>

          {forbidden && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} action={<Button size="small" onClick={handleSignOut}>Sign out</Button>}>
              The server refused admin access (403). Sign in again, or ask a super admin to confirm that your account has the admin role.
            </Alert>
          )}
          {stats.pendingProviders > 0 && statsStatus.state === "ready" && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} action={<Button size="small" onClick={() => navigate("/admin/providers")}>Review</Button>}>
              {stats.pendingProviders} provider{stats.pendingProviders > 1 ? "s are" : " is"} waiting for approval.
            </Alert>
          )}

          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="Total users" value={stats.totalUsers} icon={FaUsers} trend={stats.userGrowthRate} status={statsStatus} color="primary" onClick={() => navigate("/admin/users")} badge={stats.newUsersToday ? `+${stats.newUsersToday} today` : null} subtitle={`${fmtNum(stats.activeUsers)} active`} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="Providers" value={stats.totalProviders} icon={FaShieldAlt} status={statsStatus} color="success" onClick={() => navigate("/admin/providers")} badge={stats.pendingProviders ? `${stats.pendingProviders} pending` : null} subtitle={`${fmtNum(stats.verifiedProviders)} verified`} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="Bookings" value={stats.totalBookings} icon={FaClipboardList} trend={stats.bookingGrowthRate} status={statsStatus} color="warning" onClick={() => navigate("/admin/bookings")} badge={stats.activeBookings ? `${stats.activeBookings} active` : null} /></Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="Revenue" value={stats.totalRevenue} format="currency" icon={FaRupeeSign} trend={stats.revenueGrowthRate} status={statsStatus} color="info" /></Grid>
          </Grid>

          {/* Revenue + distribution */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Panel title={`Revenue, last ${range} days`} subtitle="Daily trend" status={status.revenue} onRetry={() => retry("revenue")} minHeight={260}
                actions={
                  <Stack direction="row" spacing={1}>
                    <ToggleButtonGroup size="small" exclusive value={range} onChange={(_, v) => v && setRange(v)} aria-label="Revenue range">
                      {REVENUE_RANGES.map((d) => <ToggleButton key={d} value={d} sx={{ px: 1, py: 0.25, fontSize: 11, textTransform: "none" }}>{d}D</ToggleButton>)}
                    </ToggleButtonGroup>
                    <ToggleButtonGroup size="small" exclusive value={chartType} onChange={(_, v) => v && setChartType(v)} aria-label="Chart type">
                      <ToggleButton value="area" sx={{ px: 1, py: 0.25, fontSize: 11, textTransform: "none" }}>Area</ToggleButton>
                      <ToggleButton value="bar" sx={{ px: 1, py: 0.25, fontSize: 11, textTransform: "none" }}>Bar</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                }>
                <MetricChart data={data.revenue} type={chartType} height={260} currency />
              </Panel>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Panel title="Provider distribution" status={status.providers} onRetry={() => retry("providers")} minHeight={260}>
                {pieData.length === 0 ? <EmptyState text="No providers yet" minHeight={260} /> : (
                  <>
                    <Box sx={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" nameKey="name" paddingAngle={2}>
                            {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    <Stack spacing={0.5} mt={1}>
                      {pieData.map((e) => (
                        <Stack key={e.name} direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: e.color }} /><Typography variant="caption">{e.name}</Typography></Stack>
                          <Typography variant="caption" color={COLORS.muted}>{fmtNum(e.value)} ({Math.round((e.value / pieTotal) * 100)}%)</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}
              </Panel>
            </Grid>
          </Grid>

          {/* Bookings + top providers */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, lg: showTop ? 8 : 12 }}>
              <Panel title="Recent bookings" status={status.bookings} onRetry={() => retry("bookings")} minHeight={240}
                actions={<Button size="small" variant="outlined" onClick={() => navigate("/admin/bookings")} sx={{ textTransform: "none", fontSize: 11 }}>View all</Button>}>
                {filteredBookings.length === 0 ? <EmptyState text={searchQuery ? "No bookings match your search" : "No bookings yet"} minHeight={160} /> : (
                  <TableContainer>
                    <Table size="small" aria-label="Recent bookings">
                      <TableHead>
                        <TableRow>{["ID", "Customer", "Service", "Amount", "Status", "When"].map((h) => <TableCell key={h} scope="col" sx={{ fontWeight: 600, fontSize: 11 }}>{h}</TableCell>)}</TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredBookings.slice(0, 8).map((b) => {
                          const open = () => b.id != null && navigate(`/admin/bookings/${b.id}`);
                          const c = STATUS_COLORS[b.status] || COLORS.muted;
                          return (
                            <TableRow key={b.key} hover tabIndex={b.id != null ? 0 : -1} onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }} sx={{ cursor: b.id != null ? "pointer" : "default" }}>
                              <TableCell sx={{ fontSize: 11 }}>{b.id != null ? `#${b.id}` : "—"}</TableCell>
                              <TableCell sx={{ fontSize: 11 }}>{b.customer}</TableCell>
                              <TableCell sx={{ fontSize: 11 }}>{b.service}</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: 11 }}>{fmtINR(b.amount)}</TableCell>
                              <TableCell><Chip label={b.status.replace(/_/g, " ")} size="small" sx={{ height: 20, fontSize: 9, bgcolor: alpha(c, 0.12), color: c, fontWeight: 600 }} /></TableCell>
                              <TableCell sx={{ fontSize: 11, color: COLORS.muted, whiteSpace: "nowrap" }}>{safeDistance(b.createdAt) || "—"}</TableCell>
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
                <Panel title="Top providers" subtitle="By completed jobs" status={status.topProviders} onRetry={() => retry("topProviders")} minHeight={240}>
                  {data.topProviders.length === 0 ? <EmptyState text="No provider activity yet" minHeight={160} /> : (
                    <Stack divider={<Divider flexItem />} spacing={1}>
                      {data.topProviders.map((p, i) => (
                        <Stack key={p.key} direction="row" alignItems="center" spacing={1.5} onClick={() => p.id != null && navigate(`/admin/providers/${p.id}`)} sx={{ py: 0.5, cursor: p.id != null ? "pointer" : "default" }}>
                          <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: alpha(CHART_COLORS[i % CHART_COLORS.length], 0.15), color: CHART_COLORS[i % CHART_COLORS.length], fontWeight: 700 }}>{p.name[0]?.toUpperCase()}</Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap fontWeight={600}>{p.name}</Typography>
                            <Typography variant="caption" color={COLORS.muted}>{fmtNum(p.jobs)} jobs{p.revenue ? ` • ${fmtINR(p.revenue)}` : ""}</Typography>
                          </Box>
                          {p.rating > 0 && <Stack direction="row" spacing={0.5} alignItems="center"><FaStar size={11} color={COLORS.warning} /><Typography variant="caption" fontWeight={600}>{p.rating.toFixed(1)}</Typography></Stack>}
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Panel>
              </Grid>
            )}
          </Grid>

          {/* Demand + activity */}
          {(showDemand || showActivity) && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {showDemand && (
                <Grid size={{ xs: 12, lg: showActivity ? 6 : 12 }}>
                  <Panel title="Service demand" subtitle="Bookings, last 30 days" status={status.demand} onRetry={() => retry("demand")} minHeight={240}>
                    <MetricChart data={data.demand} type="bar" height={240} color={COLORS.success} />
                  </Panel>
                </Grid>
              )}
              {showActivity && (
                <Grid size={{ xs: 12, lg: showDemand ? 6 : 12 }}>
                  <Panel title="Recent activity" status={status.activities} onRetry={() => retry("activities")} minHeight={240}>
                    {data.activities.length === 0 ? <EmptyState text="No recent activity" minHeight={160} /> : (
                      <Stack spacing={1.25} sx={{ maxHeight: 280, overflowY: "auto" }}>
                        {data.activities.map((a) => (
                          <Stack key={a.key} direction="row" spacing={1.5} alignItems="flex-start">
                            <Box sx={{ mt: 0.75, width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: { error: COLORS.danger, warning: COLORS.warning, success: COLORS.success }[a.type] || COLORS.info }} />
                            <Box><Typography variant="body2">{a.text}</Typography><Typography variant="caption" color={COLORS.muted}>{safeDistance(a.at) || "Just now"}</Typography></Box>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Panel>
                </Grid>
              )}
            </Grid>
          )}

          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Typography variant="caption" color={COLORS.muted}>© {new Date().getFullYear()} Quickks Admin • {connected ? "Live" : "Offline"}</Typography>
          </Box>
        </Container>

        {/* Notifications */}
        <Menu anchorEl={anchorNotif} open={Boolean(anchorNotif)} onClose={() => setAnchorNotif(null)} PaperProps={{ sx: { width: 360, maxWidth: "92vw", maxHeight: 420, borderRadius: 2 } }}>
          <Box sx={{ p: 1.5, borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" fontWeight={700}>Notifications ({unreadCount} unread)</Typography>
            {alerts.length > 0 && <Button size="small" sx={{ fontSize: 10 }} onClick={() => { setReadKeys(new Set(alerts.map((a) => a._key))); markAllAlertsAsRead?.(); }}>Mark all read</Button>}
          </Box>
          <Box sx={{ maxHeight: 340, overflowY: "auto" }}>
            {alerts.length ? alerts.slice(0, 15).map((al) => (
              <MenuItem key={al._key} sx={{ opacity: readKeys.has(al._key) ? 0.6 : 1, whiteSpace: "normal", alignItems: "flex-start", gap: 1 }}
                onClick={() => { setReadKeys((p) => new Set(p).add(al._key)); markAlertAsRead?.(al.id); }}>
                <Box sx={{ mt: 0.75, width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: al._color }} />
                <Box>
                  <Typography variant="caption" fontWeight={600}>{al.title || al.message}</Typography>
                  <Typography variant="caption" sx={{ display: "block", color: COLORS.muted, fontSize: 10 }}>{safeDistance(al.timestamp) || "Just now"}</Typography>
                </Box>
              </MenuItem>
            )) : <Box sx={{ p: 3, textAlign: "center" }}><Typography variant="caption" color={COLORS.muted}>No notifications</Typography></Box>}
          </Box>
        </Menu>

        {/* Account */}
        <Menu anchorEl={anchorUser} open={Boolean(anchorUser)} onClose={() => setAnchorUser(null)}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" fontWeight={700}>{user?.fullName || user?.name || "Admin"}</Typography>
            <Typography variant="caption" color={COLORS.muted}>{role.replace(/_/g, " ")}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setAnchorUser(null); navigate("/profile"); }}><FaUserCheck style={{ marginRight: 8 }} />Profile</MenuItem>
          <MenuItem onClick={() => { setAnchorUser(null); setSettingsOpen(true); }}><FaCog style={{ marginRight: 8 }} />Settings</MenuItem>
          <MenuItem onClick={handleSignOut}><FaSignOutAlt style={{ marginRight: 8 }} />Sign out</MenuItem>
        </Menu>

        {/* Settings */}
        <Drawer anchor="right" open={settingsOpen} onClose={() => setSettingsOpen(false)} PaperProps={{ sx: { width: 320, maxWidth: "92vw", p: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" fontWeight={700}>Settings</Typography>
            <IconButton size="small" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><FaTimes size={14} /></IconButton>
          </Stack>
          <FormControlLabel control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} size="small" />} label={<Typography variant="caption">Auto-refresh when realtime is offline</Typography>} />
          <Typography variant="caption" color={COLORS.muted} sx={{ display: "block", mt: 2, mb: 0.5 }}>Refresh interval</Typography>
          <ToggleButtonGroup size="small" exclusive value={refreshSeconds} onChange={(_, v) => v && setRefreshSeconds(v)} disabled={!autoRefresh} aria-label="Refresh interval">
            {INTERVAL_OPTIONS.map((s) => <ToggleButton key={s} value={s} sx={{ px: 1.5, textTransform: "none", fontSize: 12 }}>{s}s</ToggleButton>)}
          </ToggleButtonGroup>
        </Drawer>

        {/* Export */}
        <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>Export data (CSV)</DialogTitle>
          <DialogContent>
            <Stack>
              {[{ id: "summary", label: "Summary (all KPIs)" }, { id: "bookings", label: "Recent bookings" }, { id: "revenue", label: `Revenue trend (${range} days)` }].map((o) => (
                <FormControlLabel key={o.id} label={<Typography variant="body2">{o.label}</Typography>}
                  control={<Checkbox size="small" checked={exportChoices[o.id]} onChange={(e) => setExportChoices((p) => ({ ...p, [o.id]: e.target.checked }))} />} />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button size="small" variant="contained" onClick={handleExport} disabled={!Object.values(exportChoices).some(Boolean)}>Download</Button>
          </DialogActions>
        </Dialog>

        <ToastContainer position="bottom-right" autoClose={3000} />
      </Box>
    </ErrorBoundary>
  );
}