import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Grid, Stack, Paper, Chip, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";
import { FaUsers, FaChartBar, FaShieldAlt, FaClipboardList, FaExclamationTriangle, FaCog, FaFileExport, FaMoneyBillWave } from "react-icons/fa";

const ACTIONS = [
  { id: "manage-users", label: "Manage Users", path: "/admin/users", icon: FaUsers, color: "#6366f1", desc: "View and manage all users", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "manage-providers", label: "Manage Providers", path: "/admin/providers", icon: FaShieldAlt, color: "#10b981", desc: "Verify providers", roles: ["ADMIN", "SUPER_ADMIN"], badge: "verify" },
  { id: "manage-bookings", label: "Manage Bookings", path: "/admin/bookings", icon: FaClipboardList, color: "#f59e0b", desc: "All bookings", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "manage-complaints", label: "Complaints", path: "/admin/complaints", icon: FaExclamationTriangle, color: "#ef4444", desc: "Resolve issues", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "analytics", label: "Analytics", path: "/admin/analytics", icon: FaChartBar, color: "#8b5cf6", desc: "Platform insights", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "payments", label: "Payments", path: "/admin/payments", icon: FaMoneyBillWave, color: "#ec4899", desc: "Transactions", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "reports", label: "Reports", path: "/admin/reports", icon: FaFileExport, color: "#06b6d4", desc: "Export reports", roles: ["ADMIN", "SUPER_ADMIN"] },
  { id: "settings", label: "Settings", path: "/admin/settings", icon: FaCog, color: "#64748b", desc: "System config", roles: ["SUPER_ADMIN"] },
];

const Card = styled(Paper)(({ accent }) => ({
  padding: "16px 18px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, rgba(30,41,59,0.68) 0%, rgba(15,23,42,0.88) 100%)",
  border: "1px solid rgba(255,255,255,0.06)",
  backdropFilter: "blur(12px)",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  "&:hover": { transform: "translateY(-2px)", boxShadow: `0 12px 28px rgba(0,0,0,0.24), 0 0 0 1px ${accent}22`, borderColor: `${accent}33` },
  "&::after": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}55, transparent)` },
}));

const QuickActions = ({ navigate: propNavigate, variant = "grid", compact = false, showDescriptions = true, showIcons = true, customActions = null, userRole = "ADMIN", onActionClick = null, className = "", style = {} }) => {
  const hookNavigate = useNavigate();
  const navigate = propNavigate || hookNavigate;

  const filtered = useMemo(() => {
    const list = customActions || ACTIONS;
    return list.filter((a) => !a.roles || a.roles.includes(userRole));
  }, [customActions, userRole]);

  const handleClick = useCallback((action) => {
    if (onActionClick) onActionClick(action);
    if (action.path) navigate(action.path);
  }, [navigate, onActionClick]);

  if (!filtered.length) return null;

  const isVertical = variant === "vertical";
  const isGrid = variant === "grid";

  return (
    <Box className={className} sx={style}>
      <Grid container spacing={isGrid ? 1.6 : 1.2}>
        {filtered.map((action, idx) => (
          <Grid key={action.id} item xs={isVertical ? 12 : 12} sm={isVertical ? 12 : 6} md={isVertical ? 12 : isGrid ? 3 : 4} lg={isGrid ? 3 : 2.4}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04, duration: 0.32 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Card accent={action.color} onClick={() => handleClick(action)} sx={{ display: "flex", alignItems: "center", gap: 1.6, minHeight: compact ? 64 : 86 }}>
                {showIcons && (
                  <Box sx={{ width: compact ? 40 : 46, height: compact ? 40 : 46, borderRadius: 3, bgcolor: `${action.color}18`, border: `1px solid ${action.color}28`, color: action.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <action.icon size={compact ? 16 : 18} />
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <Typography sx={{ fontWeight: 800, fontSize: compact ? "0.88rem" : "0.92rem", color: "#f8fafc", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{action.label}</Typography>
                    {action.badge && <Chip label={action.badge} size="small" sx={{ height: 18, fontSize: "0.62rem", fontWeight: 800, bgcolor: "#ef4444", color: "#fff" }} />}
                  </Stack>
                  {showDescriptions && !compact && <Typography sx={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 500, mt: 0.3, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{action.desc}</Typography>}
                </Box>
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: action.color, boxShadow: `0 0 8px ${action.color}88`, flexShrink: 0 }} />
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export const CompactQuickActions = (props) => <QuickActions {...props} compact showDescriptions={false} variant="grid" />;
export const VerticalQuickActions = (props) => <QuickActions {...props} variant="vertical" showDescriptions />;
export const GridQuickActions = (props) => <QuickActions {...props} variant="grid" showDescriptions />;
export const MobileQuickActions = (props) => <QuickActions {...props} variant="vertical" compact showDescriptions={false} />;

export default React.memo(QuickActions);