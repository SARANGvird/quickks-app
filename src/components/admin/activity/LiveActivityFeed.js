import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box, Typography, Stack, TextField, IconButton, Chip, Tooltip, Paper, InputAdornment, Button, Divider } from "@mui/material";
import { styled } from "@mui/material/styles";
import { FaBell, FaUserPlus, FaClipboardList, FaShieldAlt, FaMoneyBillWave, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaClock, FaFilter, FaTrash, FaEye, FaEyeSlash, FaChevronDown, FaChevronUp, FaSearch, FaPlay, FaPause } from "react-icons/fa";
import { formatDistanceToNow, format } from "date-fns";

const EVENT_TYPES = {
  USER_REGISTERED: { icon: FaUserPlus, color: "#10b981", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.28)", label: "New User" },
  BOOKING_CREATED: { icon: FaClipboardList, color: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)", label: "New Booking" },
  PROVIDER_APPROVED: { icon: FaShieldAlt, color: "#6366f1", bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.28)", label: "Provider Approved" },
  PAYMENT_RECEIVED: { icon: FaMoneyBillWave, color: "#10b981", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.28)", label: "Payment" },
  COMPLAINT_RAISED: { icon: FaExclamationTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.28)", label: "Complaint" },
  REVIEW_SUBMITTED: { icon: FaCheckCircle, color: "#8b5cf6", bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.28)", label: "New Review" },
  BOOKING_CANCELLED: { icon: FaTimesCircle, color: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.28)", label: "Cancellation" },
};

const Root = styled(Paper)(({ themeMode }) => ({
  background: themeMode === "light" ? "#ffffff" : "linear-gradient(135deg, rgba(20,27,52,0.72) 0%, rgba(15,23,42,0.88) 100%)",
  border: themeMode === "light" ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)",
  backdropFilter: "blur(16px)",
  borderRadius: "20px",
  overflow: "hidden",
  boxShadow: themeMode === "light" ? "0 12px 28px rgba(15,23,42,0.06)" : "0 16px 42px rgba(0,0,0,0.28)",
}));

const FeedBox = styled(Box)({
  overflowY: "auto",
  "&::-webkit-scrollbar": { width: 6 },
  "&::-webkit-scrollbar-thumb": { background: "rgba(148,163,184,0.35)", borderRadius: 999 },
});

const EventRow = styled(Box)(({ themeMode }) => ({
  display: "flex",
  gap: 12,
  padding: "12px 14px",
  borderRadius: "14px",
  marginBottom: 8,
  background: themeMode === "light" ? "#ffffff" : "rgba(255,255,255,0.03)",
  border: themeMode === "light" ? "1px solid #f1f5f9" : "1px solid rgba(255,255,255,0.04)",
  transition: "transform 0.18s ease, background 0.18s ease",
  cursor: "pointer",
  "&:hover": { transform: "translateX(3px)", background: themeMode === "light" ? "#f8fafc" : "rgba(255,255,255,0.06)" },
}));

const LiveActivityFeed = ({ events = [], title = "Live Activity Feed", maxHeight = 420, autoScroll = true, onEventClick = null, onFilterChange = null, enableFiltering = true, enableSearch = true, enableAutoRefresh = true, refreshInterval = 30000, onRefresh = null, theme = "dark", compact = false, showTimestamps = true, showIcons = true, animation = true, className = "", style = {} }) => {
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(autoScroll);
  const [autoRefreshOn, setAutoRefreshOn] = useState(enableAutoRefresh);
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const feedRef = useRef(null);
  const intervalRef = useRef(null);

  const getType = useCallback((ev) => {
    if (ev.type && EVENT_TYPES[ev.type]) return ev.type;
    if (ev.eventType && EVENT_TYPES[ev.eventType]) return ev.eventType;
    const m = (ev.message || ev.title || "").toLowerCase();
    if (m.includes("user") || m.includes("register")) return "USER_REGISTERED";
    if (m.includes("booking") && m.includes("cancel")) return "BOOKING_CANCELLED";
    if (m.includes("booking") || m.includes("booked")) return "BOOKING_CREATED";
    if (m.includes("provider") || m.includes("approved")) return "PROVIDER_APPROVED";
    if (m.includes("payment") || m.includes("paid") || m.includes("₹")) return "PAYMENT_RECEIVED";
    if (m.includes("complaint") || m.includes("issue")) return "COMPLAINT_RAISED";
    if (m.includes("review") || m.includes("rating")) return "REVIEW_SUBMITTED";
    return "USER_REGISTERED";
  }, []);

  const filtered = useMemo(() => {
    let list = [...events];
    if (filterType !== "all") list = list.filter((e) => getType(e) === filterType);
    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter((e) => {
        const msg = (e.message || e.title || "").toLowerCase();
        const det = (e.details || "").toLowerCase();
        return msg.includes(t) || det.includes(t);
      });
    }
    return list;
  }, [events, filterType, search, getType]);

  useEffect(() => { if (onFilterChange) onFilterChange(filterType); }, [filterType, onFilterChange]);

  useEffect(() => {
    if (autoScrollEnabled && feedRef.current && filtered.length) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [filtered, autoScrollEnabled]);

  useEffect(() => {
    if (autoRefreshOn && onRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => { onRefresh(); setLastUpdated(new Date()); }, refreshInterval);
      return () => clearInterval(intervalRef.current);
    }
  }, [autoRefreshOn, onRefresh, refreshInterval]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const fmt = useCallback((ts) => {
    if (!ts) return { rel: "", abs: "" };
    try { const d = new Date(ts); return { rel: formatDistanceToNow(d, { addSuffix: true }), abs: format(d, "HH:mm:ss • MMM dd, yyyy") }; } catch { return { rel: "now", abs: "" }; }
  }, []);

  const isLight = theme === "light";

  return (
    <Root themeMode={theme} className={className} sx={style}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderBottom: isLight ? "1px solid #f1f5f9" : "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 1.2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}><FaBell size={14} color={isLight ? "#0f172a" : "#e2e8f0"} /></Box>
          <Typography sx={{ fontWeight: 800, fontSize: "0.98rem", color: isLight ? "#0f172a" : "#f8fafc" }}>{title}</Typography>
          <Chip label={filtered.length} size="small" sx={{ height: 20, fontSize: "0.70rem", fontWeight: 800, bgcolor: "#6366f1", color: "#fff" }} />
          <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: autoRefreshOn ? "#10b981" : "#64748b", ml: 0.5, animation: autoRefreshOn ? "pulse 2s infinite" : "none", "@keyframes pulse": { "0%": { boxShadow: "0 0 0 0 rgba(16,185,129,0.4)" }, "70%": { boxShadow: "0 0 0 6px rgba(16,185,129,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(16,185,129,0)" } } }} />
        </Stack>
        <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
          {enableSearch && <TextField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." size="small" InputProps={{ startAdornment: <InputAdornment position="start"><FaSearch size={11} color="#94a3b8" /></InputAdornment> }} sx={{ width: 160, "& .MuiOutlinedInput-root": { height: 32, borderRadius: 2, bgcolor: isLight ? "#f8fafc" : "rgba(255,255,255,0.05)", fontSize: "0.8rem", "& fieldset": { borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.08)" } } }} />}
          {enableFiltering && <Tooltip title="Filters"><IconButton size="small" onClick={() => setShowFilters((v) => !v)} sx={{ width: 32, height: 32, bgcolor: showFilters ? "#6366f1" : isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)", color: showFilters ? "#fff" : isLight ? "#475569" : "#94a3b8" }}><FaFilter size={12} /></IconButton></Tooltip>}
          {enableAutoRefresh && <Tooltip title={autoRefreshOn ? "Auto-refresh on" : "Off"}><IconButton size="small" onClick={() => setAutoRefreshOn((v) => !v)} sx={{ width: 32, height: 32, bgcolor: autoRefreshOn ? "rgba(16,185,129,0.14)" : isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)", color: autoRefreshOn ? "#10b981" : "#94a3b8" }}>{autoRefreshOn ? <FaPause size={11} /> : <FaPlay size={11} />}</IconButton></Tooltip>}
          <Tooltip title={autoScrollEnabled ? "Auto-scroll on" : "Off"}><IconButton size="small" onClick={() => setAutoScrollEnabled((v) => !v)} sx={{ width: 32, height: 32, bgcolor: autoScrollEnabled ? "rgba(99,102,241,0.14)" : isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)", color: autoScrollEnabled ? "#6366f1" : "#94a3b8" }}>{autoScrollEnabled ? <FaChevronDown size={12} /> : <FaEyeSlash size={12} />}</IconButton></Tooltip>
          <Tooltip title={expanded ? "Collapse" : "Expand"}><IconButton size="small" onClick={() => setExpanded((v) => !v)} sx={{ width: 32, height: 32, bgcolor: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{expanded ? <FaChevronUp size={12} /> : <FaEye size={12} />}</IconButton></Tooltip>
          <Tooltip title="Clear"><IconButton size="small" onClick={() => { if (onRefresh) onRefresh(); }} sx={{ width: 32, height: 32, bgcolor: isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)", color: "#94a3b8" }}><FaTrash size={11} /></IconButton></Tooltip>
        </Stack>
      </Box>

      {showFilters && (
        <Box sx={{ px: 2, py: 1.2, borderBottom: isLight ? "1px solid #f1f5f9" : "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 0.8, flexWrap: "wrap" }}>
          <Chip label="All" size="small" onClick={() => setFilterType("all")} sx={{ fontWeight: 700, bgcolor: filterType === "all" ? "#6366f1" : isLight ? "#f1f5f9" : "rgba(255,255,255,0.06)", color: filterType === "all" ? "#fff" : "#94a3b8", cursor: "pointer" }} />
          {Object.keys(EVENT_TYPES).map((k) => { const C = EVENT_TYPES[k]; return (<Chip key={k} icon={<C.icon size={11} />} label={C.label} size="small" onClick={() => setFilterType(k)} sx={{ fontWeight: 700, bgcolor: filterType === k ? C.color : isLight ? "#f8fafc" : "rgba(255,255,255,0.05)", color: filterType === k ? "#fff" : isLight ? "#475569" : "#94a3b8", border: `1px solid ${filterType === k ? C.color : isLight ? "#e2e8f0" : "rgba(255,255,255,0.06)"}`, cursor: "pointer" }} />); })}
        </Box>
      )}

      <FeedBox ref={feedRef} sx={{ height: expanded ? "auto" : maxHeight, maxHeight: expanded ? "none" : maxHeight, p: 1.2, bgcolor: isLight ? "#fcfdff" : "rgba(0,0,0,0.18)" }}>
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, color: isLight ? "#94a3b8" : "#64748b" }}>
              <FaBell size={28} style={{ opacity: 0.4, marginBottom: 10 }} />
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 600 }}>{search || filterType !== "all" ? "No matching events" : "Waiting for live events..."}</Typography>
              <Typography variant="caption">Events appear here in real-time</Typography>
            </Box>
          ) : (
            filtered.map((ev, idx) => {
              const t = getType(ev);
              const cfg = EVENT_TYPES[t];
              const Icon = cfg.icon;
              const ts = fmt(ev.timestamp || ev.createdAt || ev.time);
              const msg = ev.message || ev.title || cfg.label;
              return (
                <motion.div key={ev.id || `${t}-${idx}-${ev.timestamp}`} initial={animation ? { opacity: 0, y: 8 } : false} animate={animation ? { opacity: 1, y: 0 } : false} exit={animation ? { opacity: 0, x: 12 } : false} transition={{ duration: 0.22 }}>
                  <EventRow themeMode={theme} onClick={() => onEventClick && onEventClick(ev)}>
                    {showIcons && <Box sx={{ width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: 2, bgcolor: cfg.bg, border: `1px solid ${cfg.border}`, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon size={compact ? 14 : 16} color={cfg.color} /></Box>}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: compact ? "0.82rem" : "0.90rem", fontWeight: 600, color: isLight ? "#1e293b" : "#e2e8f0", lineHeight: 1.35, wordBreak: "break-word" }}>{msg}{ev.details ? <Box component="span" sx={{ color: isLight ? "#64748b" : "#94a3b8", fontWeight: 400, ml: 1, fontSize: "0.82em" }}>{ev.details}</Box> : null}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center" mt={0.6} flexWrap="wrap">
                        <Box sx={{ px: 0.9, py: 0.2, borderRadius: 999, bgcolor: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: "0.66rem", fontWeight: 800 }}>{cfg.label}</Box>
                        {showTimestamps && <Stack direction="row" spacing={0.5} alignItems="center"><FaClock size={10} color={isLight ? "#94a3b8" : "#64748b"} /><Tooltip title={ts.abs}><Typography sx={{ fontSize: "0.70rem", color: isLight ? "#64748b" : "#94a3b8", fontWeight: 500 }}>{ts.rel}</Typography></Tooltip></Stack>}
                        {ev.amount && <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#10b981" }}>{ev.amount}</Typography>}
                      </Stack>
                    </Box>
                  </EventRow>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </FeedBox>

      <Box sx={{ px: 2, py: 1.2, borderTop: isLight ? "1px solid #f1f5f9" : "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ fontSize: "0.70rem", color: isLight ? "#94a3b8" : "#64748b", fontWeight: 600 }}>Last sync {format(lastUpdated, "HH:mm:ss")} • {filtered.length} events</Typography>
        <Stack direction="row" spacing={0.6} alignItems="center"><Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#10b981" }} /><Typography sx={{ fontSize: "0.70rem", color: "#10b981", fontWeight: 700 }}>LIVE</Typography></Stack>
      </Box>
    </Root>
  );
};

export const CompactActivityFeed = (props) => <LiveActivityFeed {...props} compact showTimestamps={false} maxHeight={300} />;
export const LightActivityFeed = (props) => <LiveActivityFeed {...props} theme="light" />;
export const MiniActivityFeed = (props) => <LiveActivityFeed {...props} compact showIcons={false} maxHeight={220} enableFiltering={false} enableSearch={false} />;

export default React.memo(LiveActivityFeed);