// src/components/admin/AdminDashboard.jsx
// ✅ COMPLETE FIXED - v10.3 FINAL
// ✅ FIXED: WebSocket URL - ensures string, not object
// ✅ FIXED: StatCard component - proper icon handling (icon prop)
// ✅ FIXED: React DOM warnings (slotProps, key spreading)
// ✅ FIXED: All ESLint errors (no-unused-vars, exhaustive-deps)
// ✅ FIXED: API endpoints matching backend
// ✅ FIXED: Data mapping from backend responses
// ✅ FIXED: Notification service fallback
// ✅ PRODUCTION-READY

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { formatDistanceToNow, subDays, format } from "date-fns";
import api from "../../api/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import useAdminDashboardSocket from "../../hooks/useAdminDashboardSocket";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ==========================================================
// MATERIAL-UI IMPORTS
// ==========================================================
import {
  Box, Container, Grid, Stack, Paper, Typography, Button, IconButton,
  ButtonBase, TextField, InputAdornment, Switch, FormControlLabel,
  Avatar, Badge, Chip, Divider, Skeleton, Breadcrumbs, Link, Tab, Tabs,
  Alert, LinearProgress, CircularProgress, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, MenuItem, Select,
  FormControl, Drawer, Dialog, DialogTitle, DialogContent, DialogActions,
  Menu, Tooltip, useMediaQuery, useTheme, Radio, RadioGroup
} from '@mui/material';

import { styled, alpha, keyframes } from "@mui/material/styles";

// ==========================================================
// ICON IMPORTS
// ==========================================================
import { 
  FaUsers, FaClipboardList, FaRupeeSign, FaCog, FaChartBar,
  FaBolt, FaSync, FaShieldAlt, FaBell, FaSearch,
  FaFilter, FaCheckCircle, FaExclamationTriangle, FaArrowUp, FaArrowDown,
  FaUserGraduate, FaUserClock, FaClock, FaRocket, FaTimes,
  FaChartLine, FaChartBar as FaChartBarIcon,
  FaChartArea, FaPercent, FaFileExport, FaBug, FaMoneyBillWave,
  FaRegClock, FaServer, FaUserCheck
} from "react-icons/fa";

// ==========================================================
// DATE PICKERS
// ==========================================================
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// ==========================================================
// ANIMATIONS
// ==========================================================
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================================
// CHART IMPORTS - Lazy loaded
// ==========================================================
const AreaChart = lazy(() => import('recharts').then(m => ({ default: m.AreaChart })));
const Area = lazy(() => import('recharts').then(m => ({ default: m.Area })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const RechartsTooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const PieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import('recharts').then(m => ({ default: m.Pie })));
const Cell = lazy(() => import('recharts').then(m => ({ default: m.Cell })));
const BarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import('recharts').then(m => ({ default: m.Bar })));

// ==========================================================
// 🎨 ANIMATIONS & KEYFRAMES
// ==========================================================
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const gradientMove = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ==========================================================
// 🎨 COLOR CONSTANTS
// ==========================================================
const COLORS = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
  success: '#10b981',
  successLight: '#d1fae5',
  successDark: '#065f46',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  warningDark: '#92400e',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  dangerDark: '#991b1b',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  infoDark: '#1e40af',
  purple: '#8b5cf6',
  purpleLight: '#ede9fe',
  purpleDark: '#6d28d9',
  pink: '#ec4899',
  pinkLight: '#fce7f3',
  pinkDark: '#be185d',
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#64748b',
    disabled: '#94a3b8',
    inverse: '#ffffff',
  },
  background: {
    main: '#f8fafc',
    light: '#ffffff',
    lighter: '#f1f5f9',
    dark: '#e2e8f0',
    darker: '#cbd5e1',
  },
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#cbd5e1',
  chart: {
    blue: '#6366f1',
    green: '#10b981',
    yellow: '#f59e0b',
    red: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899',
    teal: '#14b8a6',
    orange: '#f97316',
  },
};

const CHART_COLORS = [
  COLORS.chart.blue,
  COLORS.chart.green,
  COLORS.chart.yellow,
  COLORS.chart.red,
  COLORS.chart.purple,
  COLORS.chart.pink,
  COLORS.chart.teal,
  COLORS.chart.orange,
];

// ==========================================================
// 🎨 STYLED COMPONENTS
// ==========================================================

const GlassCard = styled(Paper, {
  shouldForwardProp: (prop) => !['hover', 'gradient'].includes(prop),
})(({ theme, hover = false, gradient = false }) => ({
  background: gradient 
    ? COLORS.primaryGradient 
    : 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${gradient ? 'rgba(255,255,255,0.2)' : COLORS.border}`,
  borderRadius: 24,
  padding: 24,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: gradient 
    ? '0 8px 32px rgba(99, 102, 241, 0.3)' 
    : '0 4px 20px rgba(0,0,0,0.04)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': gradient ? {
    content: '""',
    position: 'absolute',
    top: '-50%',
    right: '-50%',
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
    animation: `${float} 6s ease-in-out infinite`,
  } : {},
  '&:hover': hover && !gradient && {
    transform: 'translateY(-8px)',
    boxShadow: '0 16px 48px rgba(0,0,0,0.08)',
    borderColor: COLORS.primaryLight,
  },
  '&:hover': hover && gradient && {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 16px 48px rgba(99, 102, 241, 0.4)',
  },
  [theme.breakpoints.down('sm')]: {
    padding: 16,
    borderRadius: 16,
  },
}));

const GradientText = styled(Typography)({
  background: COLORS.primaryGradient,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  display: 'inline-block',
  animation: `${gradientMove} 4s ease-in-out infinite`,
  backgroundSize: '200% 200%',
});

const AnimatedIconContainer = styled(Box)(({ color = COLORS.primary }) => ({
  background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
  borderRadius: '16px',
  padding: 12,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
  border: `1px solid ${alpha(color, 0.15)}`,
  '&:hover': {
    transform: 'scale(1.1) rotate(-5deg)',
    background: `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(color, 0.1)} 100%)`,
  },
}));

// ==========================================================
// 🧩 ANIMATED NUMBER COMPONENT
// ==========================================================
const AnimatedNumber = React.memo(({ value, prefix = '', suffix = '', duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef();
  const mountedRef = useRef(true);
  const displayValueRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const startValue = displayValueRef.current;
    const endValue = value || 0;
    const startTime = performance.now();

    const animate = (currentTime) => {
      if (!mountedRef.current) return;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      displayValueRef.current = current;
      setDisplayValue(current);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = useMemo(() => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(Math.round(displayValue));
  }, [displayValue]);

  return <span>{prefix}{formattedValue}{suffix}</span>;
});

AnimatedNumber.displayName = 'AnimatedNumber';

// ==========================================================
// 🧩 STATUS BADGE COMPONENT
// ==========================================================
const StatusBadge = React.memo(({ status, pulse = false, size = 'small' }) => {
  const getStatusColor = useCallback((status) => {
    const colors = {
      online: COLORS.success,
      offline: COLORS.text.muted,
      active: COLORS.success,
      pending: COLORS.warning,
      completed: COLORS.success,
      cancelled: COLORS.danger,
      in_progress: COLORS.info,
      on_hold: COLORS.warning,
      rejected: COLORS.danger,
      approved: COLORS.success,
      verified: COLORS.success,
      unverified: COLORS.warning,
      suspended: COLORS.danger,
      banned: COLORS.danger,
      resolved: COLORS.success,
      open: COLORS.warning,
      closed: COLORS.text.muted,
      escalated: COLORS.danger,
      healthy: COLORS.success,
      unhealthy: COLORS.danger,
      connecting: COLORS.warning,
      critical: COLORS.danger,
      requested: COLORS.warning,
      accepted: COLORS.info,
      started: COLORS.info,
      expired: COLORS.text.muted,
    };
    return colors[status?.toLowerCase()] || COLORS.primary;
  }, []);

  const sizeConfig = useMemo(() => {
    return size === 'small' ? { dot: 10, text: 'caption' } :
           size === 'medium' ? { dot: 12, text: 'body2' } :
           { dot: 14, text: 'body1' };
  }, [size]);

  const color = getStatusColor(status);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <Box sx={{
        width: sizeConfig.dot,
        height: sizeConfig.dot,
        borderRadius: '50%',
        bgcolor: color,
        boxShadow: `0 0 12px ${alpha(color, 0.3)}`,
        animation: pulse ? `${pulseGlow} 2s ease-in-out infinite` : 'none',
        mr: 1,
      }} />
      <Typography
        variant={sizeConfig.text}
        sx={{
          textTransform: 'capitalize',
          fontWeight: 600,
          color: COLORS.text.secondary
        }}
      >
        {status?.replace(/_/g, ' ')}
      </Typography>
    </Box>
  );
});

StatusBadge.displayName = 'StatusBadge';

// ==========================================================
// 🧩 STAT CARD COMPONENT - ✅ FIXED: icon prop
// ==========================================================
const StatCard = React.memo(({
  title,
  value,
  icon: IconComponent,
  trend,
  loading,
  prefix = "",
  suffix = "",
  color = "primary",
  onClick,
  badge,
  subtitle,
  progress,
  gradient = false,
  animationDelay = 0
}) => {
  const trendValue = useMemo(() => {
    if (trend === undefined || trend === null) return null;
    return `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`;
  }, [trend]);

  const mainColor = COLORS[color] || COLORS.primary;

  const renderIcon = useCallback(() => {
    if (!IconComponent) return null;
    return <IconComponent size={22} color={gradient ? '#ffffff' : mainColor} />;
  }, [IconComponent, gradient, mainColor]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: animationDelay }}
      whileHover={onClick ? { y: -6, transition: { duration: 0.2 } } : {}}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', height: '100%' }}
    >
      <GlassCard hover={!!onClick} gradient={gradient}>
        <Box sx={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: gradient 
            ? 'rgba(255,255,255,0.1)' 
            : `radial-gradient(circle, ${alpha(mainColor, 0.08)} 0%, transparent 70%)`,
          animation: `${float} 4s ease-in-out infinite`,
        }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <AnimatedIconContainer color={gradient ? '#ffffff' : mainColor}>
            {renderIcon()}
          </AnimatedIconContainer>

          {badge && (
            <Chip 
              label={badge} 
              size="small" 
              sx={{
                bgcolor: gradient ? 'rgba(255,255,255,0.2)' : alpha(mainColor, 0.1),
                color: gradient ? '#ffffff' : mainColor,
                fontWeight: 600,
                fontSize: 11,
                backdropFilter: gradient ? 'blur(10px)' : 'none',
              }} 
            />
          )}

          {!loading && trend !== undefined && trend !== null && (
            <Tooltip title={`${trendValue} from last month`}>
              <Chip
                icon={trend >= 0 ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                label={trendValue}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  bgcolor: alpha(trend >= 0 ? COLORS.success : COLORS.danger, 0.1),
                  color: gradient ? '#ffffff' : (trend >= 0 ? COLORS.success : COLORS.danger),
                  backdropFilter: gradient ? 'blur(10px)' : 'none',
                }}
              />
            </Tooltip>
          )}
        </Box>

        <Typography sx={{ 
          color: gradient ? 'rgba(255,255,255,0.8)' : COLORS.text.muted, 
          fontSize: 13, 
          fontWeight: 500 
        }}>
          {title}
        </Typography>

        {loading ? (
          <Skeleton width="80%" height={40} sx={{ mt: 1 }} />
        ) : (
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              letterSpacing: -0.5, 
              color: gradient ? '#ffffff' : COLORS.text.primary
            }}>
              {prefix}<AnimatedNumber value={value} />{suffix}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color={gradient ? 'rgba(255,255,255,0.7)' : COLORS.text.muted}>
                {subtitle}
              </Typography>
            )}
          </Stack>
        )}

        {progress !== undefined && progress > 0 && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(progress, 100)}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: gradient ? 'rgba(255,255,255,0.2)' : alpha(mainColor, 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: gradient ? '#ffffff' : mainColor,
                  borderRadius: 2,
                }
              }}
            />
          </Box>
        )}
      </GlassCard>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';

// ==========================================================
// 🧩 QUICK ACTION COMPONENT
// ==========================================================
const QuickAction = React.memo(({ icon: IconComponent, label, color = "primary", onClick, badge, description }) => {
  const mainColor = COLORS[color] || COLORS.primary;

  const renderIcon = useCallback(() => {
    if (!IconComponent) return null;
    return <IconComponent size={22} />;
  }, [IconComponent]);

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <ButtonBase onClick={onClick} sx={{
        width: '100%',
        p: 2.5,
        borderRadius: 3,
        bgcolor: COLORS.background.light,
        border: `1px solid ${COLORS.border}`,
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          bgcolor: alpha(mainColor, 0.04),
          borderColor: alpha(mainColor, 0.3),
          boxShadow: `0 8px 24px ${alpha(mainColor, 0.15)}`,
        }
      }}>
        {badge && (
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <Chip
              label={badge}
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                bgcolor: alpha(mainColor, 0.1),
                color: mainColor,
                fontWeight: 600
              }}
            />
          </Box>
        )}
        <AnimatedIconContainer color={mainColor} sx={{ mb: 1.5 }}>
          {renderIcon()}
        </AnimatedIconContainer>
        <Typography variant="body2" fontWeight={700} color={COLORS.text.primary} noWrap>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" sx={{ color: COLORS.text.muted, fontSize: 10, mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </ButtonBase>
    </motion.div>
  );
});

QuickAction.displayName = 'QuickAction';

// ==========================================================
// 🧩 METRIC CHART COMPONENT
// ==========================================================
const MetricChart = React.memo(({ 
  data, 
  type = "area", 
  height = 300, 
  loading, 
  color = COLORS.chart.blue 
}) => {
  const chartData = useMemo(() => {
    return (data || []).map(item => ({
      ...item,
      name: item.name || item.label || 'Unknown'
    }));
  }, [data]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <CircularProgress size={40} thickness={3} />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <Typography color={COLORS.text.muted}>No data available</Typography>
      </Box>
    );
  }

  return (
    <Suspense fallback={<CircularProgress size={30} />}>
      <ResponsiveContainer width="100%" height={height}>
        {type === "area" ? (
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderLight} vertical={false} />
            <XAxis
              dataKey="name"
              stroke={COLORS.text.muted}
              tick={{ fill: COLORS.text.muted, fontSize: 12 }}
            />
            <YAxis
              stroke={COLORS.text.muted}
              tick={{ fill: COLORS.text.muted, fontSize: 12 }}
            />
            <RechartsTooltip
              contentStyle={{
                background: COLORS.background.light,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#gradient-${color.replace('#', '')})`}
            />
          </AreaChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderLight} vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke={COLORS.text.muted}
              tick={{ fill: COLORS.text.muted, fontSize: 12 }}
            />
            <YAxis 
              stroke={COLORS.text.muted}
              tick={{ fill: COLORS.text.muted, fontSize: 12 }}
            />
            <RechartsTooltip
              contentStyle={{
                background: COLORS.background.light,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
              }}
            />
            <Bar 
              dataKey="value" 
              fill={color} 
              radius={[6, 6, 0, 0]} 
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Suspense>
  );
});

MetricChart.displayName = 'MetricChart';

// ==========================================================
// 🧩 DATE RANGE PICKER COMPONENT
// ==========================================================
const DateRangePicker = React.memo(({ startDate, endDate, onApply }) => {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const presets = useMemo(() => [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 365 days', days: 365 },
  ], []);

  const handlePreset = useCallback((preset) => {
    if (preset.days) {
      const end = new Date();
      const start = subDays(end, preset.days);
      setLocalStart(start);
      setLocalEnd(end);
    }
  }, []);

  const handleApply = useCallback(() => {
    onApply(localStart, localEnd);
  }, [localStart, localEnd, onApply]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <DatePicker
          label="Start Date"
          value={localStart}
          onChange={setLocalStart}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        <DatePicker
          label="End Date"
          value={localEnd}
          onChange={setLocalEnd}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />

        <Divider>Quick Select</Divider>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {presets.map((preset, index) => (
            <Button
              key={index}
              size="small"
              variant="outlined"
              onClick={() => handlePreset(preset)}
              sx={{ fontSize: 11, textTransform: 'none' }}
            >
              {preset.label}
            </Button>
          ))}
        </Stack>

        <Button
          variant="contained"
          size="medium"
          onClick={handleApply}
          sx={{ 
            textTransform: 'none',
            background: COLORS.primaryGradient,
            '&:hover': {
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
            }
          }}
        >
          Apply Range
        </Button>
      </Stack>
    </Box>
  );
});

DateRangePicker.displayName = 'DateRangePicker';

// ==========================================================
// 🧩 ACTIVITY TIMELINE COMPONENT
// ==========================================================
const ActivityTimeline = React.memo(({ events, onItemClick }) => {
  if (!events?.length) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <FaClock size={48} color={COLORS.text.muted} style={{ opacity: 0.3 }} />
        <Typography color={COLORS.text.muted} sx={{ mt: 2 }}>No recent activities</Typography>
      </Box>
    );
  }

  const getIcon = (type) => {
    const icons = {
      booking: <FaClipboardList size={16} />,
      user: <FaUsers size={16} />,
      provider: <FaShieldAlt size={16} />,
      payment: <FaMoneyBillWave size={16} />,
      system: <FaServer size={16} />,
    };
    return icons[type] || <FaRegClock size={16} />;
  };

  return (
    <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 2, '&::-webkit-scrollbar': { width: 4 } }}>
      {events.map((event, index) => (
        <motion.div
          key={event.id || index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onItemClick?.(event)}
          style={{ cursor: onItemClick ? 'pointer' : 'default' }}
        >
          <Stack direction="row" spacing={2} sx={{
            mb: 3,
            position: 'relative',
            '&:hover': onItemClick ? {
              '& .timeline-content': {
                bgcolor: alpha(COLORS.primary, 0.03),
                borderRadius: 2,
              }
            } : {}
          }}>
            {index < events.length - 1 && (
              <Box sx={{
                position: 'absolute',
                left: 20,
                top: 40,
                width: 2,
                height: 'calc(100% + 4px)',
                background: `linear-gradient(to bottom, ${alpha(COLORS.primary, 0.2)}, ${alpha(COLORS.primary, 0.05)})`,
              }} />
            )}
            <Avatar sx={{
              bgcolor: alpha(event.color ? COLORS[event.color] : COLORS.primary, 0.1),
              color: event.color ? COLORS[event.color] : COLORS.primary,
              width: 40,
              height: 40,
              zIndex: 1,
              border: `2px solid ${alpha(event.color ? COLORS[event.color] : COLORS.primary, 0.15)}`
            }}>
              {getIcon(event.type)}
            </Avatar>
            <Box className="timeline-content" sx={{
              flex: 1,
              pb: 2,
              p: 1.5,
              borderRadius: 2,
              transition: 'background-color 0.2s'
            }}>
              <Typography variant="body2" fontWeight={600} color={COLORS.text.primary}>
                {event.title}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.text.muted, display: 'block', mb: 0.5 }}>
                {event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) : 'Just now'}
              </Typography>
              {event.description && (
                <Typography variant="body2" sx={{ color: COLORS.text.secondary, mt: 0.5 }}>
                  {event.description}
                </Typography>
              )}
            </Box>
          </Stack>
        </motion.div>
      ))}
    </Box>
  );
});

ActivityTimeline.displayName = 'ActivityTimeline';

// ==========================================================
// 📊 API SERVICE - MATCHING BACKEND
// ==========================================================
const API_ENDPOINTS = {
  DASHBOARD_STATS: '/api/v1/admin/dashboard/stats',
  REVENUE_TREND: '/api/v1/admin/dashboard/revenue-trend',
  PROVIDER_DISTRIBUTION: '/api/v1/admin/dashboard/provider-distribution',
  RECENT_ACTIVITIES: '/api/v1/admin/dashboard/recent-activities',
  TOP_PROVIDERS: '/api/v1/admin/dashboard/top-providers',
  RECENT_BOOKINGS: '/api/v1/admin/dashboard/recent-bookings',
  SERVICE_DEMAND: '/api/v1/admin/dashboard/service-demand',
  USER_STATS: '/api/v1/admin/users/stats',
  PROVIDER_STATS: '/api/v1/admin/providers/stats',
  BOOKING_STATS: '/api/v1/admin/bookings/stats',
  DASHBOARD_EXPORT: '/api/v1/admin/dashboard/export'
};

const dashboardApi = {
  getDashboardStats: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.DASHBOARD_STATS);
      return response.data || response;
    } catch (error) {
      console.error('Dashboard Stats API Error:', error);
      throw error;
    }
  },
  getRevenueTrend: async (days = 7) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.REVENUE_TREND}?days=${days}`);
      return response.data || response;
    } catch (error) {
      console.error('Revenue Trend API Error:', error);
      throw error;
    }
  },
  getProviderDistribution: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.PROVIDER_DISTRIBUTION);
      return response.data || response;
    } catch (error) {
      console.error('Provider Distribution API Error:', error);
      throw error;
    }
  },
  getRecentActivities: async (limit = 20) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.RECENT_ACTIVITIES}?limit=${limit}`);
      return response.data || response;
    } catch (error) {
      console.error('Recent Activities API Error:', error);
      throw error;
    }
  },
  getTopProviders: async (limit = 5) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.TOP_PROVIDERS}?limit=${limit}`);
      return response.data || response;
    } catch (error) {
      console.error('Top Providers API Error:', error);
      throw error;
    }
  },
  getRecentBookings: async (limit = 10) => {
    try {
      const response = await api.get(`${API_ENDPOINTS.RECENT_BOOKINGS}?limit=${limit}`);
      return response.data || response;
    } catch (error) {
      console.error('Recent Bookings API Error:', error);
      throw error;
    }
  },
  getServiceDemand: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.SERVICE_DEMAND);
      return response.data || response;
    } catch (error) {
      console.error('Service Demand API Error:', error);
      throw error;
    }
  },
  exportDashboardReport: async (format, dateRange) => {
    try {
      const response = await api.get(API_ENDPOINTS.DASHBOARD_EXPORT, {
        params: {
          format,
          startDate: dateRange?.start?.toISOString(),
          endDate: dateRange?.end?.toISOString(),
          _t: Date.now(),
        },
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      console.error('Export API Error:', error);
      throw error;
    }
  }
};

// ==========================================================
// 🏆 MAIN ADMIN DASHBOARD COMPONENT
// ==========================================================
const AdminDashboard = () => {
  const { logout, loading: authLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // ==========================================================
  // 📦 STATE MANAGEMENT
  // ==========================================================
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [dateRange, setDateRange] = useState({ start: subDays(new Date(), 30), end: new Date() });
  const [showFilters, setShowFilters] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [settingsDrawer, setSettingsDrawer] = useState(false);
  const [chartType, setChartType] = useState('area');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [roleCheckDone, setRoleCheckDone] = useState(false);

  // Data States
  const [dashboardStats, setDashboardStats] = useState(null);
  const [providerChartData, setProviderChartData] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [serviceDemandData, setServiceDemandData] = useState([]);
  const [readAlertIds, setReadAlertIds] = useState(() => new Set());

  // Loading States
  const [loading, setLoading] = useState({
    stats: true,
    providerStats: true,
    revenue: true,
    activities: true,
    topProviders: true,
    bookings: true,
    serviceDemand: true
  });

  // ==========================================================
  // 🎯 WEBSOCKET HOOK
  // ==========================================================
  const {
    connected: socketConnected,
    connecting: socketConnecting,
    alerts: socketAlerts,
    lastUpdated: socketLastUpdated,
    markAlertAsRead,
    markAllAlertsAsRead,
    reconnect: socketReconnect
  } = useAdminDashboardSocket({
    enableRealTime: true,
    autoConnect: true,
    maxAlerts: 50,
    onStatsUpdate: useCallback((data) => {
      if (!data) return;
      if (data.dashboardStats) setDashboardStats(data.dashboardStats);
      if (data.revenueTrend) setRevenueTrend(data.revenueTrend);
      if (data.providerDistribution) {
        const chartData = (data.providerDistribution || []).map(item => ({
          name: item.name || 'Unknown',
          value: item.value || 0,
          color: item.color || COLORS.chart.blue
        }));
        setProviderChartData(chartData);
      }
      if (data.recentActivities) setRecentActivities(data.recentActivities);
      if (data.topProviders) setTopProviders(data.topProviders);
      setLastUpdateTime(new Date());
    }, []),
    onAlert: useCallback((alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
      toast.info(alert.message || alert.title || 'New notification', {
        position: 'bottom-right',
        autoClose: 5000,
        hideProgressBar: false,
      });
    }, [])
  });

  // ==========================================================
  // 🔄 REFS
  // ==========================================================
  const mountedRef = useRef(true);
  const refreshTimerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // ==========================================================
  // 🔐 ROLE / AUTH GUARD
  // ==========================================================
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/dashboard/admin' } });
      return;
    }

    const role = user?.role?.toUpperCase() || '';
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];

    if (!allowedRoles.includes(role)) {
      toast.error(`Access Denied: You are logged in as ${user?.role || 'Unknown'}. Admin access required.`);
      navigate('/');
      return;
    }

    setRoleCheckDone(true);
  }, [authLoading, isAuthenticated, user, navigate]);

  // ==========================================================
  // 📡 API CALL FUNCTIONS
  // ==========================================================
  const handleApiError = useCallback((error, endpoint) => {
    console.error(`Failed to fetch ${endpoint}:`, error);
    if (!mountedRef.current) return null;
    if (error.response?.status !== 404) {
      const errorMsg = error.response?.data?.message || error.message || 'Network Error';
      toast.error(`API Error: ${endpoint} - ${errorMsg}`);
    }
    return null;
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      const data = await dashboardApi.getDashboardStats();
      if (mountedRef.current && data) {
        setDashboardStats(data);
        setLastUpdateTime(new Date());
      }
      return data;
    } catch (error) {
      return handleApiError(error, 'dashboard-stats');
    } finally {
      if (mountedRef.current) setLoading(prev => ({ ...prev, stats: false }));
    }
  }, [handleApiError]);

  const fetchProviderStatus = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, providerStats: true }));
      const data = await dashboardApi.getProviderDistribution();
      if (mountedRef.current && data) {
        const chartData = (data || []).map(item => ({
          name: item.name || 'Unknown',
          value: item.value || 0,
          color: item.color || CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)]
        }));
        setProviderChartData(chartData.length ? chartData : [
          { name: 'No Data', value: 1, color: COLORS.text.muted }
        ]);
      }
      return data;
    } catch (error) {
      if (mountedRef.current) {
        setProviderChartData([{ name: 'No Data', value: 1, color: COLORS.text.muted }]);
      }
      return handleApiError(error, 'provider-distribution');
    } finally {
      if (mountedRef.current) setLoading(prev => ({ ...prev, providerStats: false }));
    }
  }, [handleApiError]);

  const fetchRevenueTrend = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, revenue: true }));
      const data = await dashboardApi.getRevenueTrend(7);
      if (mountedRef.current) {
        const chartData = (data || []).map((item, idx) => ({
          name: item.name || format(subDays(new Date(), 6 - idx), 'EEE'),
          value: item.value || 0
        }));
        setRevenueTrend(chartData.length ? chartData : 
          Array.from({ length: 7 }, (_, i) => ({
            name: format(subDays(new Date(), 6 - i), 'EEE'),
            value: 0
          }))
        );
      }
      return data;
    } catch (error) {
      if (mountedRef.current) {
        setRevenueTrend(Array.from({ length: 7 }, (_, i) => ({
          name: format(subDays(new Date(), 6 - i), 'EEE'),
          value: 0
        })));
      }
      return handleApiError(error, 'revenue-trend');
    } finally {
      if (mountedRef.current) setLoading(prev => ({ ...prev, revenue: false }));
    }
  }, [handleApiError]);

  const fetchRecentActivities = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, activities: true }));
      const data = await dashboardApi.getRecentActivities(20);
      if (mountedRef.current) {
        const activities = (data || []).map(item => ({
          id: item.id,
          type: item.type || 'system',
          title: item.title || 'Activity',
          description: item.description || '',
          timestamp: item.timestamp || new Date().toISOString(),
          color: item.color || 'primary',
          icon: item.icon || 'FaRegClock'
        }));
        setRecentActivities(activities);
      }
      return data;
    } catch (error) {
      if (mountedRef.current) setRecentActivities([]);
      return handleApiError(error, 'recent-activities');
    } finally {
      if (mountedRef.current) setLoading(prev => ({ ...prev, activities: false }));
    }
  }, [handleApiError]);

  const fetchTopProviders = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, topProviders: true }));
      const data = await dashboardApi.getTopProviders(5);
      if (mountedRef.current) {
        const providers = (data || []).map(item => ({
          id: item.id,
          name: item.name || `Provider ${item.id}`,
          providerName: item.name || `Provider ${item.id}`,
          rating: item.rating || 0,
          completedJobs: item.completedJobs || 0,
          completedBookings: item.completedJobs || 0,
          serviceType: item.serviceType || 'General Service',
          specialization: item.serviceType || 'General Service'
        }));
        setTopProviders(providers);
      }
      return data;
    } catch (error) {
      if (mountedRef.current) setTopProviders([]);
      return handleApiError(error, 'top-providers');
    } finally {
      if (mountedRef.current) setLoading(prev => ({ ...prev, topProviders: false }));
    }
  }, [handleApiError]);

  const fetchRecentBookings = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, bookings: true }));
      const data = await dashboardApi.getRecentBookings(10);
      if (mountedRef.current) {
        const bookings = (data || []).map(item => ({
          id: item.id,
          bookingId: item.bookingId || item.id,
          customerName: item.customerName || 'Unknown',
          service: item.serviceType || 'General Service',
          serviceType: item.serviceType || 'General Service',
          amount: item.totalAmount || 0,
          totalAmount: item.totalAmount || 0,
          status: item.status || 'PENDING',
          createdAt: item.createdAt || new Date().toISOString()
        }));
        setRecentBookings(bookings);
      }
      return data;
    } catch (error) {
      if (mountedRef.current) setRecentBookings([]);
      return handleApiError(error, 'recent-bookings');
    } finally {
      if (mountedRef.current) setLoading(prev => ({ ...prev, bookings: false }));
    }
  }, [handleApiError]);

  const fetchServiceDemand = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, serviceDemand: true }));
      const data = await dashboardApi.getServiceDemand();
      if (mountedRef.current) {
        const demandData = (data || []).map(item => ({
          name: item.name || 'Unknown',
          value: item.value || 0
        }));
        setServiceDemandData(demandData.length ? demandData : [
          { name: 'Plumbing', value: 0 },
          { name: 'Electrical', value: 0 },
          { name: 'Cleaning', value: 0 },
          { name: 'AC Service', value: 0 },
          { name: 'Carpentry', value: 0 },
        ]);
      }
      return data;
    } catch (error) {
      if (mountedRef.current) {
        setServiceDemandData([
          { name: 'Plumbing', value: 0 },
          { name: 'Electrical', value: 0 },
          { name: 'Cleaning', value: 0 },
        ]);
      }
      return handleApiError(error, 'service-demand');
    } finally {
      if (mountedRef.current) setLoading(prev => ({ ...prev, serviceDemand: false }));
    }
  }, [handleApiError]);

  // ==========================================================
  // 🔄 FETCH ALL DATA
  // ==========================================================
  const fetchAllData = useCallback(async (showLoading = true) => {
    if (!mountedRef.current || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (showLoading) {
        setLoading({
          stats: true, providerStats: true, revenue: true,
          activities: true, topProviders: true, bookings: true,
          serviceDemand: true
        });
      }
      setApiError(null);

      const results = await Promise.allSettled([
        fetchDashboardStats(),
        fetchProviderStatus(),
        fetchRevenueTrend(),
        fetchRecentActivities(),
        fetchTopProviders(),
        fetchRecentBookings(),
        fetchServiceDemand()
      ]);

      const rejected = results.filter(r => r.status === 'rejected');
      if (rejected.length === results.length && mountedRef.current) {
        setApiError('Failed to load dashboard data. Please refresh.');
      }
      if (mountedRef.current) setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      if (mountedRef.current) {
        setApiError('Failed to load dashboard data. Please refresh.');
        toast.error('Failed to load dashboard data');
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [fetchDashboardStats, fetchProviderStatus, fetchRevenueTrend, fetchRecentActivities, fetchTopProviders, fetchRecentBookings, fetchServiceDemand]);

  // ==========================================================
  // 🔄 EFFECTS - Lifecycle
  // ==========================================================
  useEffect(() => {
    if (!roleCheckDone) return;
    if (!initialLoadDoneRef.current) {
      fetchAllData(true);
      initialLoadDoneRef.current = true;
    }
  }, [fetchAllData, roleCheckDone]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (roleCheckDone && !socketConnected && autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        if (mountedRef.current && !isFetchingRef.current) {
          fetchAllData(false);
        }
      }, refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [socketConnected, autoRefresh, refreshInterval, roleCheckDone, fetchAllData]);

  // Merge socket alerts
  useEffect(() => {
    if (!socketAlerts?.length) return;
    setAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.id).filter(Boolean));
      const fresh = socketAlerts.filter(a => !a.id || !existingIds.has(a.id));
      if (fresh.length === 0) return prev;
      return [...fresh, ...prev].slice(0, 50);
    });
  }, [socketAlerts]);

  // ==========================================================
  // 🎯 ALL HANDLER FUNCTIONS
  // ==========================================================

  const handleRefresh = useCallback(async () => {
    if (isFetchingRef.current) return;
    setRefreshing(true);
    try {
      if (socketConnected) socketReconnect?.();
      await fetchAllData(true);
      toast.success('Dashboard data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [fetchAllData, socketConnected, socketReconnect]);

  const handleRetry = useCallback(() => {
    fetchAllData(true);
  }, [fetchAllData]);

  const handleExport = useCallback(async (format) => {
    setExporting(true);
    try {
      const response = await dashboardApi.exportDashboardReport(format, dateRange);
      const blob = response?.data instanceof Blob ? response.data : new Blob([response?.data ?? '']);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-report-${format(new Date(), 'yyyy-MM-dd')}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
      setExportDialog(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      if (mountedRef.current) setExporting(false);
    }
  }, [dateRange]);

  const handleNotificationClick = useCallback((event) => {
    setNotificationAnchor(event.currentTarget);
  }, []);

  const handleNotificationClose = useCallback(() => {
    setNotificationAnchor(null);
  }, []);

  const handleViewAllNotifications = useCallback(() => {
    handleNotificationClose();
    navigate('/dashboard/admin/notifications');
  }, [handleNotificationClose, navigate]);

  const handleUserMenuClick = useCallback((event) => {
    setUserMenuAnchor(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchor(null);
  }, []);

  const handleTabChange = useCallback((event, newValue) => {
    setSelectedTab(newValue);
  }, []);

  const handleQuickAction = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  const handleActivityClick = useCallback((activity) => {
    if (activity?.type) {
      const id = activity.id || activity.userId || activity.providerId || activity.paymentId || activity.bookingId;
      if (id) {
        navigate(`/dashboard/admin/${activity.type}s/${id}`);
      } else {
        navigate(`/dashboard/admin/${activity.type}s`);
      }
    }
  }, [navigate]);

  const getUserInitials = useCallback(() => {
    if (user?.fullName) {
      return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'AD';
  }, [user]);

  const handleDateRangeApply = useCallback((start, end) => {
    setDateRange({ start, end });
    setShowFilters(false);
    fetchAllData(true);
  }, [fetchAllData]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  }, [logout, navigate]);

  const handleMarkAlertRead = useCallback((alert, index) => {
    const id = alert.id ?? `idx-${index}`;
    setReadAlertIds(prev => new Set(prev).add(id));
    markAlertAsRead?.(alert.id);
  }, [markAlertAsRead]);

  const handleMarkAllAlertsRead = useCallback(() => {
    setReadAlertIds(new Set(alerts.map((a, i) => a.id ?? `idx-${i}`)));
    markAllAlertsAsRead?.();
  }, [alerts, markAllAlertsAsRead]);

  // ==========================================================
  // 📊 DERIVED STATE
  // ==========================================================
  const safeStats = useMemo(() => {
    const d = dashboardStats || {};
    return {
      totalUsers: d.totalUsers || 0,
      activeUsers: d.activeUsers || 0,
      newUsersToday: d.newUsersToday || 0,
      newUsersThisMonth: d.newUsersThisMonth || 0,
      userGrowthRate: d.userGrowthRate || 0,
      totalProviders: d.totalProviders || 0,
      pendingProviders: d.pendingProviders || 0,
      verifiedProviders: d.verifiedProviders || 0,
      rejectedProviders: d.rejectedProviders || 0,
      suspendedProviders: d.suspendedProviders || 0,
      activeProviders: d.activeProviders || 0,
      providerGrowthRate: d.providerGrowthRate || 0,
      totalBookings: d.totalBookings || 0,
      activeBookings: d.activeBookings || 0,
      pendingBookings: d.pendingBookings || 0,
      completedBookings: d.completedBookings || 0,
      cancelledBookings: d.cancelledBookings || 0,
      bookingGrowthRate: d.bookingGrowthRate || 0,
      totalRevenue: d.totalRevenue || 0,
      revenueToday: d.revenueToday || 0,
      revenueMonth: d.revenueMonth || 0,
      revenueGrowthRate: d.revenueGrowthRate || 0,
      totalComplaints: d.totalComplaints || 0,
      resolvedComplaints: d.resolvedComplaints || 0,
      complaintResolutionRate: d.complaintResolutionRate || 0
    };
  }, [dashboardStats]);

  const derivedMetrics = useMemo(() => ({
    userConversionRate: safeStats.totalUsers > 0 ? ((safeStats.activeUsers / safeStats.totalUsers) * 100).toFixed(1) : '0.0',
    providerVerificationRate: safeStats.totalProviders > 0 ? ((safeStats.verifiedProviders / safeStats.totalProviders) * 100).toFixed(1) : '0.0',
    bookingCompletionRate: safeStats.totalBookings > 0 ? ((safeStats.completedBookings / safeStats.totalBookings) * 100).toFixed(1) : '0.0',
    averageBookingValue: safeStats.completedBookings > 0 ? (safeStats.totalRevenue / safeStats.completedBookings).toFixed(0) : '0',
    pendingComplaints: (safeStats.totalComplaints || 0) - (safeStats.resolvedComplaints || 0),
    revenuePerUser: safeStats.totalUsers > 0 ? (safeStats.totalRevenue / safeStats.totalUsers).toFixed(0) : '0',
  }), [safeStats]);

  const unreadAlertCount = useMemo(
    () => alerts.filter(a => !a.id || !readAlertIds.has(a.id)).length,
    [alerts, readAlertIds]
  );

  const timeAgo = useMemo(() => {
    if (socketLastUpdated) {
      return `Updated ${formatDistanceToNow(new Date(socketLastUpdated), { addSuffix: true })}`;
    }
    if (lastUpdateTime) {
      return `Updated ${formatDistanceToNow(lastUpdateTime, { addSuffix: true })}`;
    }
    return 'Loading...';
  }, [socketLastUpdated, lastUpdateTime]);

  const quickActions = useMemo(() => [
    { label: "Users", icon: FaUsers, path: "/dashboard/admin/users", color: "primary", badge: safeStats.newUsersToday ? `+${safeStats.newUsersToday}` : null, description: "Manage user accounts" },
    { label: "Providers", icon: FaShieldAlt, path: "/dashboard/admin/providers", color: "success", badge: safeStats.pendingProviders ? `${safeStats.pendingProviders} pending` : null, description: "Verify & manage providers" },
    { label: "Bookings", icon: FaClipboardList, path: "/dashboard/admin/bookings", color: "warning", badge: safeStats.activeBookings ? `${safeStats.activeBookings} active` : null, description: "Monitor all bookings" },
    { label: "Complaints", icon: FaExclamationTriangle, path: "/dashboard/admin/complaints", color: "danger", badge: derivedMetrics.pendingComplaints > 0 ? `${derivedMetrics.pendingComplaints} open` : null, description: "Resolve issues" },
    { label: "Analytics", icon: FaChartBar, path: "/dashboard/admin/analytics", color: "info", description: "View detailed reports" },
    { label: "Payments", icon: FaMoneyBillWave, path: "/dashboard/admin/payments", color: "purple", description: "Manage transactions" },
    { label: "Reports", icon: FaFileExport, path: "/dashboard/admin/reports", color: "pink", description: "Generate reports" },
    { label: "Settings", icon: FaCog, path: "/dashboard/admin/settings", color: "textSecondary", description: "System configuration" },
  ], [safeStats, derivedMetrics]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredBookings = useMemo(() => {
    if (!normalizedQuery) return recentBookings;
    return recentBookings.filter(b =>
      [b.customerName, b.service, b.serviceType, String(b.id ?? b.bookingId ?? '')]
        .filter(Boolean)
        .some(field => String(field).toLowerCase().includes(normalizedQuery))
    );
  }, [recentBookings, normalizedQuery]);

  // ==========================================================
  // 🚦 LOADING STATE CHECK
  // ==========================================================
  if (authLoading || !roleCheckDone) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </Box>
    );
  }

  // ==========================================================
  // 🎨 RENDER
  // ==========================================================
  return (
    <ErrorBoundary>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ minHeight: "100vh", bgcolor: COLORS.background.main }}>
          {refreshing && (
            <LinearProgress sx={{ 
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
              height: 3, background: COLORS.primaryGradient,
            }} />
          )}

          <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>

            {/* Top Navigation Bar */}
            <GlassCard hover={false} sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ 
                    bgcolor: 'transparent',
                    background: COLORS.primaryGradient,
                    width: { xs: 40, sm: 48 }, 
                    height: { xs: 40, sm: 48 },
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                  }}>
                    <FaRocket size={24} color="white" />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                      <GradientText>Quickks Admin</GradientText>
                    </Typography>
                    <Breadcrumbs sx={{ mt: 0.5 }}>
                      <Link
                        underline="hover"
                        color="inherit"
                        component="button"
                        sx={{ fontSize: 13, color: COLORS.text.muted, cursor: 'pointer' }}
                        onClick={() => navigate('/dashboard')}
                      >
                        Dashboard
                      </Link>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.text.primary }}>
                        {selectedTab === 0 ? "Overview" : selectedTab === 1 ? "Analytics" : "Reports"}
                      </Typography>
                    </Breadcrumbs>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <TextField
                    size="small"
                    placeholder="Search bookings, providers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ minWidth: isMobile ? 140 : 220 }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <FaSearch size={14} color={COLORS.text.muted} />
                          </InputAdornment>
                        ),
                      }
                    }}
                  />
                  <Tooltip title="Filters">
                    <IconButton onClick={() => setShowFilters(!showFilters)}>
                      <Badge badgeContent={dateRange.start || dateRange.end ? 1 : 0} color="primary">
                        <FaFilter size={16} />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={`Notifications (${unreadAlertCount})`}>
                    <IconButton onClick={handleNotificationClick}>
                      <Badge badgeContent={unreadAlertCount} color="error">
                        <FaBell size={16} color={COLORS.text.secondary} />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Refresh">
                    <IconButton onClick={handleRefresh} disabled={refreshing}>
                      <FaSync size={16} className={refreshing ? 'fa-spin' : ''} color={COLORS.text.secondary} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Settings">
                    <IconButton onClick={() => setSettingsDrawer(true)}>
                      <FaCog size={16} color={COLORS.text.secondary} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Export">
                    <IconButton onClick={() => setExportDialog(true)}>
                      <FaFileExport size={16} color={COLORS.text.secondary} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Debug">
                    <IconButton onClick={() => setShowDebug(!showDebug)} sx={{ color: showDebug ? COLORS.warning : COLORS.text.muted }}>
                      <FaBug size={16} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={user?.name || 'Account'}>
                    <IconButton onClick={handleUserMenuClick}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS.primary, fontWeight: 600, fontSize: 14 }}>
                        {getUserInitials()}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                  <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={handleUserMenuClose}
                    PaperProps={{ sx: { width: 200, bgcolor: COLORS.background.light, border: `1px solid ${COLORS.border}`, borderRadius: 2 } }}
                  >
                    <MenuItem onClick={() => { handleUserMenuClose(); navigate('/profile'); }}>
                      <FaUserCheck style={{ marginRight: 8 }} /> Profile
                    </MenuItem>
                    <MenuItem onClick={() => { handleUserMenuClose(); setSettingsDrawer(true); }}>
                      <FaCog style={{ marginRight: 8 }} /> Settings
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={{ color: COLORS.danger }}>
                      <FaTimes style={{ marginRight: 8 }} /> Logout
                    </MenuItem>
                  </Menu>
                </Stack>
              </Stack>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${COLORS.border}` }}>
                      <DateRangePicker
                        startDate={dateRange.start}
                        endDate={dateRange.end}
                        onApply={handleDateRangeApply}
                      />
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>

            {/* Connection Status */}
            <Paper sx={{ p: 1.5, mb: 4, bgcolor: alpha(socketConnected ? COLORS.success : COLORS.warning, 0.05), borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <StatusBadge 
                    status={socketConnected ? 'online' : socketConnecting ? 'connecting' : 'offline'} 
                    pulse={!socketConnected && !socketConnecting} 
                  />
                  <Typography variant="caption" color={COLORS.text.secondary}>
                    {socketConnected
                      ? '✅ Real-time connection active'
                      : autoRefresh
                        ? `🔄 Auto-refreshing every ${refreshInterval}s`
                        : '⏸️ Auto-refresh is off — use the refresh button for the latest data'}
                  </Typography>
                </Stack>
                <Typography variant="caption" color={COLORS.text.muted}>
                  {timeAgo}
                </Typography>
              </Stack>
            </Paper>

            {apiError && (
              <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }} action={
                <Button color="inherit" size="small" onClick={handleRetry}>Retry</Button>
              }>
                {apiError}
              </Alert>
            )}

            {/* Tabs */}
            <Tabs value={selectedTab} onChange={handleTabChange} sx={{ mb: 4, '& .MuiTabs-indicator': { background: COLORS.primaryGradient, height: 3 } }}>
              <Tab label="Overview" sx={{ textTransform: 'none', fontWeight: 600 }} />
              <Tab label="Analytics" sx={{ textTransform: 'none', fontWeight: 600 }} />
              <Tab label="Reports" sx={{ textTransform: 'none', fontWeight: 600 }} />
            </Tabs>

            {/* Overview Tab - Main Stats */}
            {selectedTab === 0 && (
              <>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      key="total-users"
                      title="Total Users"
                      value={safeStats.totalUsers}
                      icon={FaUsers}
                      trend={safeStats.userGrowthRate}
                      loading={loading.stats}
                      color="primary"
                      onClick={() => navigate('/dashboard/admin/users')}
                      badge={safeStats.newUsersToday ? `+${safeStats.newUsersToday}` : null}
                      subtitle={`${safeStats.activeUsers} active`}
                      animationDelay={0.1}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      key="providers"
                      title="Providers"
                      value={safeStats.totalProviders}
                      icon={FaShieldAlt}
                      trend={safeStats.providerGrowthRate}
                      loading={loading.providerStats}
                      color="success"
                      onClick={() => navigate('/dashboard/admin/providers')}
                      badge={safeStats.pendingProviders ? `${safeStats.pendingProviders} pending` : null}
                      subtitle={`${safeStats.verifiedProviders} verified`}
                      animationDelay={0.2}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      key="bookings"
                      title="Bookings"
                      value={safeStats.totalBookings}
                      icon={FaClipboardList}
                      trend={safeStats.bookingGrowthRate}
                      loading={loading.bookings}
                      color="warning"
                      onClick={() => navigate('/dashboard/admin/bookings')}
                      badge={safeStats.activeBookings ? `${safeStats.activeBookings} active` : null}
                      progress={parseFloat(derivedMetrics.bookingCompletionRate)}
                      subtitle={`${derivedMetrics.bookingCompletionRate}% completed`}
                      animationDelay={0.3}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      key="revenue"
                      title="Revenue"
                      value={safeStats.totalRevenue}
                      prefix="₹"
                      icon={FaRupeeSign}
                      trend={safeStats.revenueGrowthRate}
                      loading={loading.revenue}
                      color="info"
                      onClick={() => navigate('/dashboard/admin/revenue')}
                      badge={safeStats.revenueToday ? `₹${(safeStats.revenueToday / 1000).toFixed(1)}K` : null}
                      subtitle={`Avg: ₹${derivedMetrics.averageBookingValue}/booking`}
                      animationDelay={0.4}
                    />
                  </Grid>
                </Grid>

                {/* Secondary Stats */}
                <Grid container spacing={2} sx={{ mb: 6 }}>
                  {[
                    { key: "new-users", title: "New Users", value: safeStats.newUsersToday, icon: FaUserGraduate, color: "primary" },
                    { key: "pending", title: "Pending", value: safeStats.pendingProviders, icon: FaUserClock, color: "warning" },
                    { key: "completed", title: "Completed", value: safeStats.completedBookings, icon: FaCheckCircle, color: "success" },
                    { key: "today-revenue", title: "Today Revenue", value: safeStats.revenueToday, prefix: "₹", icon: FaChartLine, color: "info" },
                    { key: "complaints", title: "Complaints", value: safeStats.totalComplaints, icon: FaExclamationTriangle, color: "danger" },
                    { key: "conversion", title: "Conversion", value: parseFloat(derivedMetrics.userConversionRate), suffix: "%", icon: FaPercent, color: "purple" },
                  ].map((stat, idx) => (
                    <Grid item xs={6} sm={4} md={2} key={stat.key}>
                      <StatCard
                        key={stat.key}
                        title={stat.title}
                        value={stat.value}
                        icon={stat.icon}
                        prefix={stat.prefix || ''}
                        suffix={stat.suffix || ''}
                        color={stat.color}
                        loading={loading.stats}
                        animationDelay={0.1 + idx * 0.05}
                      />
                    </Grid>
                  ))}
                </Grid>

                {/* Charts Section */}
                <Grid container spacing={4} sx={{ mb: 6 }}>
                  <Grid item xs={12} lg={8}>
                    <GlassCard hover={false} sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                        <Box>
                          <Typography variant="h6" fontWeight={700} color={COLORS.text.primary}>
                            Revenue Analytics
                          </Typography>
                          <Typography variant="caption" color={COLORS.text.muted}>
                            Last 7 days trend
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Area Chart">
                            <IconButton size="small" onClick={() => setChartType('area')} sx={{ color: chartType === 'area' ? COLORS.primary : COLORS.text.muted }}>
                              <FaChartArea size={14} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Bar Chart">
                            <IconButton size="small" onClick={() => setChartType('bar')} sx={{ color: chartType === 'bar' ? COLORS.primary : COLORS.text.muted }}>
                              <FaChartBarIcon size={14} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                      <Box sx={{ height: { xs: 240, sm: 300, md: 320 } }}>
                        <MetricChart data={revenueTrend} type={chartType} height={320} loading={loading.revenue} color={COLORS.chart.blue} />
                      </Box>
                    </GlassCard>
                  </Grid>
                  <Grid item xs={12} lg={4}>
                    <GlassCard hover={false} sx={{ p: 3, height: '100%' }}>
                      <Typography variant="h6" fontWeight={700} color={COLORS.text.primary} gutterBottom>
                        Provider Distribution
                      </Typography>
                      <Typography variant="caption" color={COLORS.text.muted} display="block" mb={3}>
                        Verification status breakdown
                      </Typography>
                      <Box sx={{ height: { xs: 200, sm: 240, md: 260 } }}>
                        {providerChartData.length > 0 && providerChartData.some(d => d.value > 0) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={providerChartData.filter(d => d.value > 0)}
                                cx="50%" cy="50%"
                                innerRadius={isMobile ? 40 : 60}
                                outerRadius={isMobile ? 60 : 80}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => isMobile ? '' : `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {providerChartData.filter(d => d.value > 0).map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.color || CHART_COLORS[idx % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Typography color={COLORS.text.muted}>No data available</Typography>
                          </Box>
                        )}
                      </Box>
                    </GlassCard>
                  </Grid>
                </Grid>

                {/* Activity & Top Providers */}
                <Grid container spacing={4} sx={{ mb: 6 }}>
                  <Grid item xs={12} lg={6}>
                    <GlassCard hover={false} sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h6" fontWeight={700} color={COLORS.text.primary}>
                          Activity Feed
                        </Typography>
                        <Chip label={socketConnected ? "LIVE" : "POLLING"} size="small" sx={{ bgcolor: alpha(socketConnected ? COLORS.success : COLORS.info, 0.1), color: socketConnected ? COLORS.success : COLORS.info, fontWeight: 600 }} />
                      </Stack>
                      <ActivityTimeline
                        events={recentActivities}
                        onItemClick={handleActivityClick}
                      />
                    </GlassCard>
                  </Grid>
                  <Grid item xs={12} lg={6}>
                    <GlassCard hover={false} sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={700} color={COLORS.text.primary} gutterBottom>
                        Top Providers
                      </Typography>
                      <Typography variant="caption" color={COLORS.text.muted} display="block" mb={3}>
                        Based on ratings and completed bookings
                      </Typography>
                      {topProviders.length > 0 ? (
                        <Stack spacing={2}>
                          {topProviders.slice(0, 5).map((provider, idx) => (
                            <Paper key={idx} sx={{ p: 2, bgcolor: COLORS.background.light, border: `1px solid ${COLORS.borderLight}`, borderRadius: 2, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: alpha(COLORS.primary, 0.02), borderColor: COLORS.primary, transform: 'translateX(4px)' } }}
                              onClick={() => navigate(`/dashboard/admin/providers/${provider.id}`)}
                            >
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: CHART_COLORS[idx % CHART_COLORS.length], width: 40, height: 40 }}>
                                  {provider?.name?.[0] || provider?.providerName?.[0] || 'P'}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight={700} color={COLORS.text.primary}>
                                    {provider?.name || provider?.providerName || `Provider ${idx + 1}`}
                                  </Typography>
                                  <Typography variant="caption" color={COLORS.text.muted}>
                                    {provider?.specialization || provider?.serviceType || 'General Service'}
                                  </Typography>
                                </Box>
                                <Box textAlign="right">
                                  <Typography variant="body2" fontWeight={700} sx={{ color: COLORS.warning }}>
                                    {provider?.rating || 0} ⭐
                                  </Typography>
                                  <Typography variant="caption" color={COLORS.text.muted}>
                                    {provider?.completedBookings || provider?.completedJobs || 0} jobs
                                  </Typography>
                                </Box>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      ) : (
                        <Typography color={COLORS.text.muted} align="center" sx={{ py: 4 }}>
                          No provider data available
                        </Typography>
                      )}
                    </GlassCard>
                  </Grid>
                </Grid>

                {/* Recent Bookings */}
                <Grid container spacing={4} sx={{ mb: 6 }}>
                  <Grid item xs={12}>
                    <GlassCard hover={false} sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                        <Typography variant="h6" fontWeight={700} color={COLORS.text.primary}>
                          Recent Bookings
                        </Typography>
                        <Button variant="outlined" size="small" onClick={() => navigate('/dashboard/admin/bookings')} sx={{ borderColor: COLORS.primary, color: COLORS.primary, textTransform: 'none', '&:hover': { bgcolor: alpha(COLORS.primary, 0.05), borderColor: COLORS.primaryDark } }}>
                          View All
                        </Button>
                      </Stack>
                      {filteredBookings.length > 0 ? (
                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: COLORS.text.primary }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: COLORS.text.primary }}>Customer</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: COLORS.text.primary }}>Service</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: COLORS.text.primary }}>Amount</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: COLORS.text.primary }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: COLORS.text.primary }}>Date</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredBookings.slice(0, 5).map((booking, idx) => (
                                <TableRow key={idx} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/admin/bookings/${booking.id || booking.bookingId}`)}>
                                  <TableCell sx={{ color: COLORS.text.secondary }}>#{booking.id || booking.bookingId}</TableCell>
                                  <TableCell sx={{ color: COLORS.text.secondary }}>{booking.customerName}</TableCell>
                                  <TableCell sx={{ color: COLORS.text.secondary }}>{booking.service || booking.serviceType}</TableCell>
                                  <TableCell sx={{ fontWeight: 600, color: COLORS.primary }}>₹{booking.amount || booking.totalAmount}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={booking.status || 'PENDING'}
                                      size="small"
                                      sx={{
                                        bgcolor: alpha((booking.status === 'COMPLETED' || booking.status === 'completed') ? COLORS.success : (booking.status === 'PENDING' || booking.status === 'pending' || booking.status === 'REQUESTED') ? COLORS.warning : (booking.status === 'CANCELLED' || booking.status === 'cancelled') ? COLORS.danger : COLORS.info, 0.1),
                                        color: (booking.status === 'COMPLETED' || booking.status === 'completed') ? COLORS.successDark : (booking.status === 'PENDING' || booking.status === 'pending' || booking.status === 'REQUESTED') ? COLORS.warningDark : (booking.status === 'CANCELLED' || booking.status === 'cancelled') ? COLORS.dangerDark : COLORS.infoDark,
                                        fontWeight: 600,
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ color: COLORS.text.muted }}>
                                    {booking.createdAt ? format(new Date(booking.createdAt), 'dd MMM yyyy') : 'N/A'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography color={COLORS.text.muted} align="center" sx={{ py: 4 }}>
                          {normalizedQuery ? 'No bookings match your search' : 'No recent bookings'}
                        </Typography>
                      )}
                    </GlassCard>
                  </Grid>
                </Grid>
              </>
            )}

            {/* Analytics Tab */}
            {selectedTab === 1 && (
              <Grid container spacing={4}>
                <Grid item xs={12}>
                  <GlassCard hover={false} sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} color={COLORS.text.primary} gutterBottom>
                      Service Demand
                    </Typography>
                    <Typography variant="caption" color={COLORS.text.muted} display="block" mb={3}>
                      Most requested services
                    </Typography>
                    <Box sx={{ height: { xs: 300, sm: 400 } }}>
                      {serviceDemandData.length > 0 && serviceDemandData.some(d => d.value > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={serviceDemandData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderLight} vertical={false} />
                            <XAxis dataKey="name" stroke={COLORS.text.muted} />
                            <YAxis stroke={COLORS.text.muted} />
                            <RechartsTooltip contentStyle={{ background: COLORS.background.light, backdropFilter: 'blur(10px)', border: `1px solid ${COLORS.border}`, borderRadius: 12 }} />
                            <Bar dataKey="value" fill={COLORS.chart.blue} radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                          <Typography color={COLORS.text.muted}>No service demand data available</Typography>
                        </Box>
                      )}
                    </Box>
                  </GlassCard>
                </Grid>
              </Grid>
            )}

            {/* Reports Tab */}
            {selectedTab === 2 && (
              <Grid container spacing={4}>
                <Grid item xs={12}>
                  <GlassCard hover={false} sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} color={COLORS.text.primary} gutterBottom>
                      Report Center
                    </Typography>
                    <Typography variant="body2" color={COLORS.text.secondary} mb={3}>
                      Generate and download reports
                    </Typography>
                    <Grid container spacing={3}>
                      {['csv', 'excel', 'pdf'].map((format) => (
                        <Grid item xs={12} sm={6} md={4} key={format}>
                          <Button fullWidth variant="outlined" disabled={exporting} onClick={() => handleExport(format)} sx={{ py: 2.5, borderColor: COLORS.border, color: COLORS.text.primary, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: COLORS.primary, bgcolor: alpha(COLORS.primary, 0.02) } }}>
                            <FaFileExport style={{ marginRight: 8 }} /> Export {format.toUpperCase()}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </GlassCard>
                </Grid>
              </Grid>
            )}

            {/* Quick Actions */}
            <Typography variant="h6" sx={{ color: COLORS.text.muted, fontWeight: 600, mb: 3, mt: 4 }}>
              <FaBolt color={COLORS.warning} style={{ marginRight: 8 }} />
              QUICK ACTIONS
            </Typography>

            <Grid container spacing={2}>
              {quickActions.map((action, idx) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={idx}>
                  <QuickAction
                    key={idx}
                    icon={action.icon}
                    label={action.label}
                    color={action.color}
                    onClick={() => handleQuickAction(action.path)}
                    badge={action.badge}
                    description={action.description}
                  />
                </Grid>
              ))}
            </Grid>

            {/* Footer */}
            <Box sx={{ mt: 8, textAlign: 'center', pb: 2 }}>
              <Typography variant="caption" color={COLORS.text.muted}>
                © {new Date().getFullYear()} Quickks Technologies — Admin Dashboard v10.3
                <span style={{ margin: '0 8px' }}>•</span>
                <span style={{ color: socketConnected ? COLORS.success : COLORS.text.muted }}>
                  {socketConnected ? '🟢 Live' : '⚪ Offline'}
                </span>
                {showDebug && (
                  <span style={{ marginLeft: 8, color: COLORS.text.muted, fontSize: 10 }}>
                    • v10.3 • {new Date().toLocaleTimeString()}
                  </span>
                )}
              </Typography>
            </Box>
          </Container>

          {/* Settings Drawer */}
          <Drawer anchor="right" open={settingsDrawer} onClose={() => setSettingsDrawer(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 360 }, bgcolor: COLORS.background.light, p: 3 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
              <Typography variant="h6" fontWeight={700} color={COLORS.text.primary}>Settings</Typography>
              <IconButton onClick={() => setSettingsDrawer(false)}><FaTimes size={20} /></IconButton>
            </Stack>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>Dashboard Settings</Typography>
                <FormControlLabel control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />} label="Auto-refresh data (when WebSocket disconnected)" />
                {autoRefresh && !socketConnected && (
                  <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <Select value={refreshInterval} onChange={(e) => setRefreshInterval(e.target.value)}>
                      <MenuItem value={15}>15 seconds</MenuItem>
                      <MenuItem value={30}>30 seconds</MenuItem>
                      <MenuItem value={60}>1 minute</MenuItem>
                      <MenuItem value={300}>5 minutes</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>Chart Defaults</Typography>
                <RadioGroup value={chartType} onChange={(e) => setChartType(e.target.value)}>
                  <FormControlLabel value="area" control={<Radio />} label="Area Chart" />
                  <FormControlLabel value="bar" control={<Radio />} label="Bar Chart" />
                </RadioGroup>
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>Theme</Typography>
                <Typography variant="caption" color={COLORS.text.muted}>Light mode only (Dark mode coming soon)</Typography>
              </Box>
            </Stack>
          </Drawer>

          {/* Export Dialog */}
          <Dialog open={exportDialog} onClose={() => !exporting && setExportDialog(false)} PaperProps={{ sx: { bgcolor: COLORS.background.light, borderRadius: 3, p: 1 } }}>
            <DialogTitle sx={{ fontWeight: 700 }}>Export Data</DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <RadioGroup value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                  <FormControlLabel value="csv" control={<Radio />} label="CSV" />
                  <FormControlLabel value="excel" control={<Radio />} label="Excel" />
                  <FormControlLabel value="pdf" control={<Radio />} label="PDF" />
                </RadioGroup>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setExportDialog(false)} disabled={exporting} sx={{ textTransform: 'none' }}>Cancel</Button>
              <Button variant="contained" onClick={() => handleExport(exportFormat)} disabled={exporting} sx={{ textTransform: 'none', background: COLORS.primaryGradient, '&:hover': { boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)' } }}>
                {exporting ? <CircularProgress size={18} sx={{ mr: 1, color: 'inherit' }} /> : null} Export
              </Button>
            </DialogActions>
          </Dialog>

          {/* Notification Center */}
          <Menu anchorEl={notificationAnchor} open={Boolean(notificationAnchor)} onClose={handleNotificationClose} PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, maxHeight: 560, bgcolor: COLORS.background.light, borderRadius: 2 } }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontWeight={700}>Notifications ({unreadAlertCount})</Typography>
              {alerts.length > 0 && <Button size="small" onClick={handleMarkAllAlertsRead} sx={{ textTransform: 'none' }}>Mark all read</Button>}
            </Box>
            <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
              {alerts.length > 0 ? alerts.slice(0, 15).map((alert, index) => {
                const id = alert.id ?? `idx-${index}`;
                const isRead = readAlertIds.has(id);
                return (
                  <MenuItem key={id} sx={{ py: 2, px: 3, opacity: isRead ? 0.6 : 1, borderLeft: isRead ? 'none' : `3px solid ${COLORS.primary}` }} onClick={() => handleMarkAlertRead(alert, index)}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{alert.title || alert.message}</Typography>
                      <Typography variant="caption" color={COLORS.text.muted}>{alert.timestamp ? formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true }) : 'Just now'}</Typography>
                    </Box>
                  </MenuItem>
                );
              }) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <FaBell size={48} color={COLORS.text.muted} style={{ opacity: 0.3 }} />
                  <Typography color={COLORS.text.muted} sx={{ mt: 2 }}>No notifications</Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ p: 1, borderTop: `1px solid ${COLORS.border}` }}>
              <Button fullWidth onClick={handleViewAllNotifications} sx={{ textTransform: 'none' }}>View All</Button>
            </Box>
          </Menu>

          <ToastContainer position="bottom-right" autoClose={4000} theme="light" style={{ zIndex: 9999 }} />

          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .fa-spin { animation: spin 1s linear infinite; }
            @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
            @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
            @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
            @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .fade-in-up { animation: fadeInUp 0.5s ease-out; }
          `}</style>
        </Box>
      </LocalizationProvider>
    </ErrorBoundary>
  );
};

export default AdminDashboard;