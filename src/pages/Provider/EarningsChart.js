import React, { useState, useMemo, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Button,
  Skeleton,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import {
  FaRupeeSign,
  FaDownload,
  FaPrint,
  FaCalendarAlt,
  FaChartLine,
  FaChartBar,
  FaChartPie,
  FaInfoCircle,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
} from "react-icons/fa";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api/api";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const CHART_TYPES = {
  LINE: "line",
  BAR: "bar",
  AREA: "area",
  PIE: "pie",
  COMPOSED: "composed",
};

const TIME_RANGES = {
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
  CUSTOM: "custom",
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculateTrend = (data, key = "amount") => {
  if (!data || data.length < 2) return { value: 0, direction: "stable" };
  const cur = data[data.length - 1]?.[key] || 0;
  const prev = data[data.length - 2]?.[key] || 0;
  if (prev === 0) return { value: cur > 0 ? 100 : 0, direction: cur > 0 ? "up" : "stable" };
  const pct = ((cur - prev) / prev) * 100;
  return { value: Math.abs(pct).toFixed(1), direction: pct > 0 ? "up" : pct < 0 ? "down" : "stable" };
};

const CustomTooltip = ({ active, payload, label, currencySymbol = "₹" }) => {
  if (active && payload?.length) {
    return (
      <Paper sx={{ p: 2, boxShadow: 3, borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
        {payload.map((e, i) => (
          <Typography key={i} variant="h6" sx={{ color: e.color, display: "flex", alignItems: "center", gap: 0.5 }}>
            {currencySymbol} {Number(e.value).toLocaleString()}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

const ChartSkeleton = () => (
  <Box sx={{ width: "100%", height: 300 }}>
    <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 2 }} />
  </Box>
);

const StatCard = ({ title, value, trend, icon, color = "#6366f1" }) => {
  const TrendIcon = trend.direction === "up" ? FaArrowUp : trend.direction === "down" ? FaArrowDown : FaMinus;
  const trendColor = trend.direction === "up" ? "#10b981" : trend.direction === "down" ? "#ef4444" : "#94a3b8";
  return (
    <Paper sx={{ p: 2, flex: 1, minWidth: 150, borderRadius: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
          <Typography variant="h5" fontWeight={800} sx={{ color }}>{formatCurrency(value)}</Typography>
        </Box>
        <Box sx={{ p: 1, bgcolor: `${color}15`, borderRadius: 2, color }}>{icon}</Box>
      </Box>
      {trend.value > 0 && (
        <Box display="flex" alignItems="center" gap={0.5} mt={1}>
          <TrendIcon size={12} color={trendColor} />
          <Typography variant="caption" sx={{ color: trendColor }}>{trend.value}% from previous</Typography>
        </Box>
      )}
    </Paper>
  );
};

const EarningsChart = ({
  data = [],
  type = "line",
  title = "Earnings Overview",
  timeRange = "week",
  onTimeRangeChange,
  showSummary = true,
  showExport = true,
  showTimeRangeSelector = true,
  height = 300,
  currencySymbol = "₹",
  providerId = null,
  className = "",
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [chartType, setChartType] = useState(type);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const totalEarnings = useMemo(() => chartData.reduce((s, it) => s + (it.amount || it.value || 0), 0), [chartData]);
  const averageEarnings = useMemo(() => (chartData.length > 0 ? totalEarnings / chartData.length : 0), [totalEarnings, chartData.length]);
  const trend = useMemo(() => calculateTrend(chartData, "amount"), [chartData]);
  const highestEarning = useMemo(() => (chartData.length === 0 ? 0 : Math.max(...chartData.map((i) => i.amount || i.value || 0))), [chartData]);

  const fetchEarningsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        providerId: providerId || user?.id,
        timeRange: selectedTimeRange,
        ...(selectedTimeRange === TIME_RANGES.CUSTOM && customStart && customEnd && { startDate: customStart, endDate: customEnd }),
      };
      const res = await api.get("/provider/earnings/chart", { params });
      const fd = res.data?.data || res.data || [];
      setChartData(Array.isArray(fd) ? fd : []);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load earnings data";
      setError(msg);
      addNotification?.({ type: "error", title: "Loading Failed", message: msg });
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [providerId, user?.id, selectedTimeRange, customStart, customEnd, addNotification]);

  useEffect(() => {
    if (data.length > 0) setChartData(data);
    else fetchEarningsData();
  }, [data, fetchEarningsData]);

  useEffect(() => { setChartType(type); }, [type]);
  useEffect(() => { setSelectedTimeRange(timeRange); }, [timeRange]);

  const handleTimeRangeChange = useCallback((newRange) => {
    if (!newRange) return;
    setSelectedTimeRange(newRange);
    if (newRange === TIME_RANGES.CUSTOM) setShowCustom(true);
    else {
      setShowCustom(false);
      setCustomStart("");
      setCustomEnd("");
      onTimeRangeChange?.(newRange);
    }
  }, [onTimeRangeChange]);

  const handleCustomApply = useCallback(() => {
    if (customStart && customEnd) {
      setShowCustom(false);
      onTimeRangeChange?.(TIME_RANGES.CUSTOM, { startDate: customStart, endDate: customEnd });
      fetchEarningsData();
    }
  }, [customStart, customEnd, onTimeRangeChange, fetchEarningsData]);

  const handleExport = useCallback(async (fmt) => {
    try {
      const params = {
        providerId: providerId || user?.id,
        timeRange: selectedTimeRange,
        format: fmt,
        ...(selectedTimeRange === TIME_RANGES.CUSTOM && customStart && customEnd && { startDate: customStart, endDate: customEnd }),
      };
      const res = await api.get("/provider/earnings/export", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `earnings_${format(new Date(), "yyyy-MM-dd")}.${fmt === "excel" ? "xlsx" : fmt}`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addNotification?.({ type: "success", title: "Export Successful", message: `Exported as ${fmt.toUpperCase()}` });
    } catch {
      addNotification?.({ type: "error", title: "Export Failed", message: "Failed to export report" });
    }
    setAnchorEl(null);
  }, [providerId, user?.id, selectedTimeRange, customStart, customEnd, addNotification]);

  const displayData = useMemo(() => {
    if (chartData.length > 0) return chartData;
    if (loading) return [];
    return [
      { name: "Mon", amount: 1200 },
      { name: "Tue", amount: 800 },
      { name: "Wed", amount: 1500 },
      { name: "Thu", amount: 900 },
      { name: "Fri", amount: 2000 },
      { name: "Sat", amount: 1800 },
      { name: "Sun", amount: 1000 },
    ];
  }, [chartData, loading]);

  const pieData = useMemo(() => {
    if (chartType !== CHART_TYPES.PIE) return [];
    return displayData.map((i) => ({ name: i.name, value: i.amount || i.value || 0 }));
  }, [displayData, chartType]);

  const renderChart = () => {
    if (loading) return <ChartSkeleton />;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (displayData.length === 0) return <Alert severity="info">No earnings data available</Alert>;

    const common = { width: "100%", height, margin: { top: 5, right: 30, left: 20, bottom: 5 } };

    switch (chartType) {
      case CHART_TYPES.BAR:
        return (
          <ResponsiveContainer {...common}>
            <BarChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} tickFormatter={(v) => `₹${v}`} />
              <ReTooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
              <Legend />
              <Bar dataKey="amount" fill={COLORS[0]} name="Earnings" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case CHART_TYPES.AREA:
        return (
          <ResponsiveContainer {...common}>
            <AreaChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} tickFormatter={(v) => `₹${v}`} />
              <ReTooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
              <Legend />
              <Area type="monotone" dataKey="amount" stroke={COLORS[0]} fill={`${COLORS[0]}20`} name="Earnings" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case CHART_TYPES.PIE:
        return (
          <ResponsiveContainer {...common}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                {pieData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <ReTooltip formatter={(v) => [`${currencySymbol}${v}`, "Amount"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case CHART_TYPES.COMPOSED:
        return (
          <ResponsiveContainer {...common}>
            <ComposedChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} tickFormatter={(v) => `₹${v}`} />
              <ReTooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
              <Legend />
              <Bar dataKey="amount" barSize={20} fill={COLORS[0]} name="Earnings" />
              <Line type="monotone" dataKey="amount" stroke={COLORS[2]} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer {...common}>
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} tickFormatter={(v) => `₹${v}`} />
              <ReTooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke={COLORS[0]} strokeWidth={3} dot={{ r: 6, fill: COLORS[0] }} activeDot={{ r: 8 }} name="Earnings" />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Box className={className} sx={{ width: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {showTimeRangeSelector && (
            <>
              <ToggleButtonGroup size="small" value={selectedTimeRange} exclusive onChange={(e, v) => v && handleTimeRangeChange(v)}>
                <ToggleButton value={TIME_RANGES.WEEK}>Week</ToggleButton>
                <ToggleButton value={TIME_RANGES.MONTH}>Month</ToggleButton>
                <ToggleButton value={TIME_RANGES.QUARTER}>Quarter</ToggleButton>
                <ToggleButton value={TIME_RANGES.YEAR}>Year</ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title="Custom Range">
                <IconButton size="small" onClick={() => setShowCustom((s) => !s)} color={selectedTimeRange === TIME_RANGES.CUSTOM ? "primary" : "default"}>
                  <FaCalendarAlt />
                </IconButton>
              </Tooltip>
            </>
          )}
          <ToggleButtonGroup size="small" value={chartType} exclusive onChange={(e, v) => v && setChartType(v)}>
            <ToggleButton value={CHART_TYPES.LINE}><FaChartLine size={14} /></ToggleButton>
            <ToggleButton value={CHART_TYPES.BAR}><FaChartBar size={14} /></ToggleButton>
            <ToggleButton value={CHART_TYPES.PIE}><FaChartPie size={14} /></ToggleButton>
          </ToggleButtonGroup>
          {showExport && (
            <>
              <Tooltip title="Print"><IconButton size="small" onClick={() => window.print()}><FaPrint /></IconButton></Tooltip>
              <Tooltip title="Export"><IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}><FaDownload /></IconButton></Tooltip>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => handleExport("csv")}>CSV</MenuItem>
                <MenuItem onClick={() => handleExport("excel")}>Excel</MenuItem>
                <MenuItem onClick={() => handleExport("pdf")}>PDF</MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      </Stack>

      {showCustom && (
        <Paper sx={{ p: 2, mb: 3, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField type="date" label="Start Date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <TextField type="date" label="End Date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={handleCustomApply} size="small">Apply</Button>
          <Button variant="outlined" onClick={() => setShowCustom(false)} size="small">Cancel</Button>
        </Paper>
      )}

      {showSummary && (
        <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
          <StatCard title="Total Earnings" value={totalEarnings} trend={trend} icon={<FaRupeeSign size={20} />} color={COLORS[0]} />
          <StatCard title="Average Daily" value={averageEarnings} trend={{ value: 0, direction: "stable" }} icon={<FaChartLine size={20} />} color={COLORS[1]} />
          <StatCard title="Highest Day" value={highestEarning} trend={{ value: 0, direction: "stable" }} icon={<FaArrowUp size={20} />} color={COLORS[2]} />
        </Stack>
      )}

      <Box sx={{ width: "100%", height, mt: 2 }}>{renderChart()}</Box>

      <Box mt={2} display="flex" justifyContent="center" alignItems="center" gap={1}>
        <FaInfoCircle size={12} color="#94a3b8" />
        <Typography variant="caption" color="text.secondary">{chartType === CHART_TYPES.PIE ? "Hover over segments to see values" : "Click legend to toggle series"}</Typography>
      </Box>
    </Box>
  );
};

EarningsChart.propTypes = {
  data: PropTypes.array,
  type: PropTypes.oneOf(Object.values(CHART_TYPES)),
  title: PropTypes.string,
  timeRange: PropTypes.oneOf(Object.values(TIME_RANGES)),
  onTimeRangeChange: PropTypes.func,
  showSummary: PropTypes.bool,
  showExport: PropTypes.bool,
  showTimeRangeSelector: PropTypes.bool,
  height: PropTypes.number,
  currencySymbol: PropTypes.string,
  providerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
};

export default React.memo(EarningsChart);