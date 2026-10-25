import React, { useMemo } from "react";
import { Box, Typography, Stack, Chip, Tooltip } from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import { Activity, Wifi, WifiOff, Clock3, Server, Database, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); }
  70% { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
  100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
`;

const Root = styled(Box)(({ connected }) => ({
  background: connected ? "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(255,255,255,0.04) 100%)" : "linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(255,255,255,0.04) 100%)",
  border: `1px solid ${connected ? "rgba(16,185,129,0.22)" : "rgba(239,68,68,0.22)"}`,
  padding: "16px",
  borderRadius: "16px",
  position: "relative",
  overflow: "hidden",
  backdropFilter: "blur(8px)",
}));

const LiveDot = styled(Box)(({ connected }) => ({
  width: 10,
  height: 10,
  borderRadius: "50%",
  backgroundColor: connected ? "#4ade80" : "#f87171",
  animation: connected ? `${pulse} 2s infinite` : "none",
}));

const MetricChip = styled(Chip)({
  height: 26,
  fontSize: "0.72rem",
  fontWeight: 700,
  borderRadius: 999,
  backgroundColor: "rgba(255,255,255,0.06)",
  color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.08)",
});

const SystemHealth = ({ connected = false, lastUpdated = null, latency = null, services = null }) => {
  const timeAgo = useMemo(() => {
    if (!lastUpdated) return "—";
    try {
      const d = new Date(lastUpdated);
      if (isNaN(d.getTime())) return String(lastUpdated);
      return formatDistanceToNow(d, { addSuffix: true });
    } catch { return String(lastUpdated); }
  }, [lastUpdated]);

  const serviceList = useMemo(() => {
    if (services && Array.isArray(services)) return services;
    return [
      { name: "API", up: true },
      { name: "WS", up: connected },
      { name: "DB", up: true },
    ];
  }, [services, connected]);

  const latencyLabel = useMemo(() => {
    if (latency == null) return null;
    if (latency < 120) return { text: `${latency}ms`, color: "#4ade80" };
    if (latency < 350) return { text: `${latency}ms`, color: "#fbbf24" };
    return { text: `${latency}ms`, color: "#f87171" };
  }, [latency]);

  return (
    <Root connected={connected}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: connected ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)", display: "grid", placeItems: "center" }}>
            {connected ? <Wifi size={18} color="#4ade80" /> : <WifiOff size={18} color="#f87171" />}
          </Box>
          <Box>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: "#f8fafc" }}>System Health</Typography>
              <LiveDot connected={connected} />
            </Stack>
            <Stack direction="row" spacing={0.6} alignItems="center" mt={0.2}>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: connected ? "#86efac" : "#fca5a5" }}>{connected ? "Live • Operational" : "Disconnected • Retrying"}</Typography>
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.6} alignItems="center">
          {latencyLabel && <Tooltip title="API latency"><Box sx={{ px: 1, py: 0.3, borderRadius: 999, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.72rem", fontWeight: 800, color: latencyLabel.color }}>{latencyLabel.text}</Box></Tooltip>}
          <Activity size={14} color="#64748b" />
        </Stack>
      </Stack>

      <Box sx={{ mt: 1.6, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
        {serviceList.map((s) => (
          <Box key={s.name} sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 0.8 }}>
            {s.name === "API" ? <Server size={12} color={s.up ? "#4ade80" : "#f87171"} /> : s.name === "WS" ? <Wifi size={12} color={s.up ? "#4ade80" : "#f87171"} /> : s.name === "DB" ? <Database size={12} color={s.up ? "#4ade80" : "#f87171"} /> : <ShieldCheck size={12} color={s.up ? "#4ade80" : "#f87171"} />}
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#cbd5e1" }}>{s.name}</Typography>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: s.up ? "#4ade80" : "#f87171", ml: "auto" }} />
          </Box>
        ))}
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.6} sx={{ pt: 1.2, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Stack direction="row" spacing={0.6} alignItems="center">
          <Clock3 size={12} color="#64748b" />
          <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>Last sync {timeAgo}</Typography>
        </Stack>
        <MetricChip label={connected ? "Encrypted • WSS" : "Reconnecting"} size="small" />
      </Stack>
    </Root>
  );
};

export default React.memo(SystemHealth);