import React, { useMemo } from "react";
import { Box, Typography, Grid, Paper, Stack, Chip, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { FaUsers, FaClipboardList, FaRupeeSign, FaUserTie } from "react-icons/fa";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

const Card = styled(Paper)(({ accent }) => ({
  padding: "20px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, rgba(30,41,59,0.72) 0%, rgba(15,23,42,0.88) 100%)",
  border: "1px solid rgba(255,255,255,0.06)",
  backdropFilter: "blur(12px)",
  position: "relative",
  overflow: "hidden",
  transition: "transform 0.22s ease, box-shadow 0.22s ease",
  "&:hover": { transform: "translateY(-3px)", boxShadow: `0 16px 36px rgba(0,0,0,0.22), 0 0 0 1px ${accent}22` },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "1px",
    background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
  },
}));

const IconBox = styled(Box)(({ accent }) => ({
  width: 52,
  height: 52,
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  backgroundColor: `${accent}18`,
  color: accent,
  border: `1px solid ${accent}22`,
  boxShadow: `0 8px 18px ${accent}18`,
}));

const formatValue = (type, raw) => {
  if (raw == null) return "0";
  const n = Number(raw);
  if (Number.isNaN(n)) return String(raw);
  if (type === "currency") {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
    return `₹${n.toLocaleString("en-IN")}`;
  }
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("en-IN");
};

const StatsGrid = ({ stats, trends = null, loading = false }) => {
  const kpis = useMemo(() => {
    const s = stats || {};
    return [
      { key: "users", label: "Total Users", value: s.totalUsers ?? s.users ?? s.total_users ?? 0, sub: "Registered customers", icon: <FaUsers />, color: "#6366f1", type: "number" },
      { key: "providers", label: "Active Providers", value: s.activeProviders ?? s.providers ?? s.active_providers ?? 0, sub: "Verified & online", icon: <FaUserTie />, color: "#10b981", type: "number" },
      { key: "bookings", label: "Total Bookings", value: s.totalBookings ?? s.bookings ?? s.total_bookings ?? 0, sub: "All time bookings", icon: <FaClipboardList />, color: "#f59e0b", type: "number" },
      { key: "revenue", label: "Total Revenue", value: s.totalRevenue ?? s.revenue ?? s.total_revenue ?? 0, sub: "Net collected", icon: <FaRupeeSign />, color: "#ec4899", type: "currency" },
    ];
  }, [stats]);

  const getTrend = (key) => {
    if (!trends || trends[key] == null) return null;
    const t = trends[key];
    const val = typeof t === "number" ? t : t.value ?? t.percent ?? 0;
    const dir = val > 0 ? "up" : val < 0 ? "down" : "flat";
    return { val: Math.abs(val), dir };
  };

  if (loading) {
    return (
      <Grid container spacing={2.2} sx={{ mb: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <Grid key={i} item xs={12} sm={6} md={3}>
            <Card accent="#6366f1" sx={{ height: 116, background: "rgba(30,41,59,0.45)" }}>
              <Box sx={{ width: "100%", height: "100%", background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 37%, rgba(255,255,255,0.04) 63%)", backgroundSize: "400% 100%", animation: "shimmer 1.4s infinite", "@keyframes shimmer": { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } }, borderRadius: 2 }} />
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2.2} sx={{ mb: 4 }}>
      {kpis.map((kpi, idx) => {
        const trend = getTrend(kpi.key);
        return (
          <Grid key={kpi.key} item xs={12} sm={6} md={3}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06, duration: 0.4 }}>
              <Card accent={kpi.color}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1.8} alignItems="center">
                    <IconBox accent={kpi.color}>{kpi.icon}</IconBox>
                    <Box>
                      <Typography sx={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, lineHeight: 1 }}>{kpi.label}</Typography>
                      <Tooltip title={`${kpi.sub}: ${kpi.value?.toLocaleString?.() || kpi.value}`}>
                        <Typography sx={{ color: "#f8fafc", fontSize: "1.65rem", fontWeight: 900, lineHeight: 1.1, mt: 0.6, letterSpacing: -0.5 }}>{formatValue(kpi.type, kpi.value)}</Typography>
                      </Tooltip>
                      <Typography sx={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 600, mt: 0.3 }}>{kpi.sub}</Typography>
                    </Box>
                  </Stack>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.8} mt={1.6}>
                  {trend ? (
                    <Chip icon={trend.dir === "up" ? <TrendingUp size={12} /> : trend.dir === "down" ? <TrendingDown size={12} /> : <Minus size={12} />} label={`${trend.dir === "up" ? "+" : trend.dir === "down" ? "-" : ""}${trend.val}%`} size="small" sx={{ height: 22, fontSize: "0.70rem", fontWeight: 800, bgcolor: trend.dir === "up" ? "rgba(16,185,129,0.14)" : trend.dir === "down" ? "rgba(239,68,68,0.14)" : "rgba(255,255,255,0.06)", color: trend.dir === "up" ? "#6ee7b7" : trend.dir === "down" ? "#fca5a5" : "#94a3b8", border: `1px solid ${trend.dir === "up" ? "rgba(16,185,129,0.22)" : trend.dir === "down" ? "rgba(239,68,68,0.22)" : "rgba(255,255,255,0.08)"}` }} />
                  ) : (
                    <Chip label="Live" size="small" sx={{ height: 22, fontSize: "0.68rem", fontWeight: 800, bgcolor: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }} />
                  )}
                  <Typography sx={{ fontSize: "0.70rem", color: "#475569", fontWeight: 600, ml: 0.5 }}>vs last month</Typography>
                </Stack>
              </Card>
            </motion.div>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default React.memo(StatsGrid);