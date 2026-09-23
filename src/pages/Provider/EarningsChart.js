// src/components/Provider/EarningsChart.jsx
import React, { useState, useMemo, useCallback } from "react";
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
  ToggleButton
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
  ComposedChart
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
  FaMinus
} from "react-icons/fa";
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const CHART_TYPES = {
  LINE: "line",
  BAR: "bar",
  AREA: "area",
  PIE: "pie",
  COMPOSED: "composed"
};

const TIME_RANGES = {
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
  CUSTOM: "custom"
};

const TIME_RANGE_CONFIG = {
  [TIME_RANGES.WEEK]: { label: "This Week", days: 7 },
  [TIME_RANGES.MONTH]: { label: "This Month", days: 30 },
  [TIME_RANGES.QUARTER]: { label: "Last 3 Months", days: 90 },
  [TIME_RANGES.YEAR]: { label: "This Year", days: 365 }
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const calculateTrend = (data, key = "amount") => {
  if (!data || data.length < 2) return { value: 0, direction: "stable" };
  const current = data[data.length - 1]?.[key] || 0;
  const previous = data[data.length - 2]?.[key] || 0;
  if (previous === 0) return { value: current > 0 ? 100 : 0, direction: current > 0 ? "up" : "stable" };
  const percentChange = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(percentChange).toFixed(1),
    direction: percentChange > 0 ? "up" : percentChange < 0 ? "down" : "stable"
  };
};

const formatDateForAPI = (date) => {
  return format(date, "yyyy-MM-dd");
};

// ==========================================================
// CUSTOM TOOLTIP
// ==========================================================
const CustomTooltip = ({ active, payload, label, currencySymbol = "₹" }) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 2, bgcolor: "background.paper", boxShadow: 3, borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Typography
            key={index}
            variant="h6"
            sx={{ color: entry.color, display: "flex", alignItems: "center", gap: 0.5 }}
          >
            {currencySymbol} {entry.value.toLocaleString()}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

// ==========================================================
// LOADING SKELETON
// ==========================================================
const ChartSkeleton = () => (
  <Box sx={{ width: "100%", height: 300 }}>
    <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 2 }} />
  </Box>
);

// ==========================================================
// STAT CARD COMPONENT
// ==========================================================
const StatCard = ({ title, value, trend, icon, color }) => {
  const TrendIcon = trend.direction === "up" ? FaArrowUp : trend.direction === "down" ? FaArrowDown : FaMinus;
  
  return (
    <Paper sx={{ p: 2, flex: 1, minWidth: 150, borderRadius: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight="800" color={color}>
            {formatCurrency(value)}
          </Typography>
        </Box>
        <Box sx={{ p: 1, bgcolor: `${color}10`, borderRadius: 2, color }}>
          {icon}
        </Box>
      </Box>
      {trend.value > 0 && (
        <Box display="flex" alignItems="center" gap={0.5} mt={1}>
          <TrendIcon size={12} color={trend.direction === "up" ? "#10b981" : trend.direction === "down" ? "#ef4444" : "#94a3b8"} />
          <Typography variant="caption" color={trend.direction === "up" ? "success.main" : trend.direction === "down" ? "error.main" : "text.secondary"}>
            {trend.value}% from previous period
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
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
  className = ""
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // State
  const [chartType, setChartType] = useState(type);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Calculate summary stats
  const totalEarnings = useMemo(() => {
    return chartData.reduce((sum, item) => sum + (item.amount || item.value || 0), 0);
  }, [chartData]);

  const averageEarnings = useMemo(() => {
    return chartData.length > 0 ? totalEarnings / chartData.length : 0;
  }, [totalEarnings, chartData.length]);

  const trend = useMemo(() => {
    return calculateTrend(chartData, "amount");
  }, [chartData]);

  const highestEarning = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map(item => item.amount || item.value || 0));
  }, [chartData]);

  // Fetch earnings data
  const fetchEarningsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        providerId: providerId || user?.id,
        timeRange: selectedTimeRange,
        ...(selectedTimeRange === TIME_RANGES.CUSTOM && customStartDate && customEndDate && {
          startDate: customStartDate,
          endDate: customEndDate
        })
      };
      
      const response = await api.get("/provider/earnings/chart", { params });
      const fetchedData = response.data?.data || response.data || [];
      setChartData(fetchedData);
    } catch (err) {
      console.error("Failed to fetch earnings data:", err);
      setError(err.response?.data?.message || "Failed to load earnings data");
      addNotification({
        type: "error",
        title: "Loading Failed",
        message: err.response?.data?.message || "Failed to load earnings chart"
      });
    } finally {
      setLoading(false);
    }
  }, [providerId, user?.id, selectedTimeRange, customStartDate, customEndDate, addNotification]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (data.length > 0) {
      setChartData(data);
    } else {
      fetchEarningsData();
    }
  }, [data, fetchEarningsData]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((newRange) => {
    setSelectedTimeRange(newRange);
    if (newRange === TIME_RANGES.CUSTOM) {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
      setCustomStartDate("");
      setCustomEndDate("");
      onTimeRangeChange?.(newRange);
    }
  }, [onTimeRangeChange]);

  // Handle custom date range apply
  const handleCustomDateApply = useCallback(() => {
    if (customStartDate && customEndDate) {
      setShowCustomDatePicker(false);
      onTimeRangeChange?.(TIME_RANGES.CUSTOM, { startDate: customStartDate, endDate: customEndDate });
      fetchEarningsData();
    }
  }, [customStartDate, customEndDate, onTimeRangeChange, fetchEarningsData]);

  // Handle export
  const handleExport = useCallback(async (format) => {
    try {
      const params = {
        providerId: providerId || user?.id,
        timeRange: selectedTimeRange,
        format,
        ...(selectedTimeRange === TIME_RANGES.CUSTOM && customStartDate && customEndDate && {
          startDate: customStartDate,
          endDate: customEndDate
        })
      };
      
      const response = await api.get("/provider/earnings/export", {
        params,
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `earnings_report_${format(new Date(), "yyyy-MM-dd")}.${format === "excel" ? "xlsx" : format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addNotification({
        type: "success",
        title: "Export Successful",
        message: `Earnings report exported as ${format.toUpperCase()}`
      });
    } catch (err) {
      console.error("Export failed:", err);
      addNotification({
        type: "error",
        title: "Export Failed",
        message: "Failed to export earnings report"
      });
    }
    setAnchorEl(null);
  }, [providerId, user?.id, selectedTimeRange, customStartDate, customEndDate, addNotification]);

  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Sample data if no data and not loading
  const displayData = useMemo(() => {
    if (chartData.length > 0) return chartData;
    if (loading) return [];
    
    // Return sample data for demo
    return [
      { name: "Mon", amount: 1200 },
      { name: "Tue", amount: 800 },
      { name: "Wed", amount: 1500 },
      { name: "Thu", amount: 900 },
      { name: "Fri", amount: 2000 },
      { name: "Sat", amount: 1800 },
      { name: "Sun", amount: 1000 }
    ];
  }, [chartData, loading]);

  // Pie chart data transformation
  const pieData = useMemo(() => {
    if (chartType !== CHART_TYPES.PIE) return [];
    return displayData.map(item => ({
      name: item.name,
      value: item.amount || item.value || 0
    }));
  }, [displayData, chartType]);

  // Render chart based on type
  const renderChart = () => {
    if (loading) return <ChartSkeleton />;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (displayData.length === 0) return <Alert severity="info">No earnings data available</Alert>;

    const commonProps = {
      width: "100%",
      height: height,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case CHART_TYPES.BAR:
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} tickFormatter={(value) => `₹${value}`} />
              <ReTooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
              <Legend />
              <Bar dataKey="amount" fill={COLORS[0]} name="Earnings" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case CHART_TYPES.AREA:
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} tickFormatter={(value) => `₹${value}`} />
              <ReTooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
              <Legend />
              <Area type="monotone" dataKey="amount" stroke={COLORS[0]} fill={`${COLORS[0]}20`} name="Earnings" />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case CHART_TYPES.PIE:
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip formatter={(value) => [`${currencySymbol}${value}`, "Amount"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case CHART_TYPES.COMPOSED:
        return (
          <ResponsiveContainer {...commonProps}>
            <ComposedChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} tickFormatter={(value) => `₹${value}`} />
              <ReTooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
              <Legend />
              <Bar dataKey="amount" barSize={20} fill={COLORS[0]} name="Earnings" />
              <Line type="monotone" dataKey="amount" stroke={COLORS[2]} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} tickFormatter={(value) => `₹${value}`} />
              <ReTooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke={COLORS[0]}
                strokeWidth={3}
                dot={{ r: 6, fill: COLORS[0] }}
                activeDot={{ r: 8 }}
                name="Earnings"
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Box className={className} sx={{ width: "100%" }}>
      {/* Header with Title and Actions */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
        <Typography variant="h6" fontWeight="700">
          {title}
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Time Range Selector */}
          {showTimeRangeSelector && (
            <>
              <ToggleButtonGroup
                size="small"
                value={selectedTimeRange}
                exclusive
                onChange={(e, value) => value && handleTimeRangeChange(value)}
                sx={{ mr: 1 }}
              >
                <ToggleButton value={TIME_RANGES.WEEK}>Week</ToggleButton>
                <ToggleButton value={TIME_RANGES.MONTH}>Month</ToggleButton>
                <ToggleButton value={TIME_RANGES.QUARTER}>Quarter</ToggleButton>
                <ToggleButton value={TIME_RANGES.YEAR}>Year</ToggleButton>
              </ToggleButtonGroup>
              
              <Tooltip title="Custom Range">
                <IconButton
                  size="small"
                  onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                  color={selectedTimeRange === TIME_RANGES.CUSTOM ? "primary" : "default"}
                >
                  <FaCalendarAlt />
                </IconButton>
              </Tooltip>
            </>
          )}
          
          {/* Chart Type Selector */}
          <Tooltip title="Chart Type">
            <ToggleButtonGroup size="small" value={chartType} exclusive onChange={(e, value) => value && setChartType(value)}>
              <ToggleButton value={CHART_TYPES.LINE}><FaChartLine size={14} /></ToggleButton>
              <ToggleButton value={CHART_TYPES.BAR}><FaChartBar size={14} /></ToggleButton>
              <ToggleButton value={CHART_TYPES.PIE}><FaChartPie size={14} /></ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
          
          {/* Export Options */}
          {showExport && (
            <>
              <Tooltip title="Print">
                <IconButton size="small" onClick={handlePrint}>
                  <FaPrint />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export">
                <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                  <FaDownload />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => handleExport("csv")}>Export as CSV</MenuItem>
                <MenuItem onClick={() => handleExport("excel")}>Export as Excel</MenuItem>
                <MenuItem onClick={() => handleExport("pdf")}>Export as PDF</MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      </Stack>

      {/* Custom Date Range Picker */}
      {showCustomDatePicker && (
        <Paper sx={{ p: 2, mb: 3, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            type="date"
            label="Start Date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            label="End Date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={handleCustomDateApply} size="small">
            Apply
          </Button>
          <Button variant="outlined" onClick={() => setShowCustomDatePicker(false)} size="small">
            Cancel
          </Button>
        </Paper>
      )}

      {/* Summary Cards */}
      {showSummary && (
        <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
          <StatCard
            title="Total Earnings"
            value={totalEarnings}
            trend={trend}
            icon={<FaRupeeSign size={20} />}
            color="primary"
          />
          <StatCard
            title="Average Daily"
            value={averageEarnings}
            trend={{ value: 0, direction: "stable" }}
            icon={<FaChartLine size={20} />}
            color="success"
          />
          <StatCard
            title="Highest Day"
            value={highestEarning}
            trend={{ value: 0, direction: "stable" }}
            icon={<FaArrowUp size={20} />}
            color="warning"
          />
        </Stack>
      )}

      {/* Chart */}
      <Box sx={{ width: "100%", height, mt: 2 }}>
        {renderChart()}
      </Box>

      {/* Info Note */}
      <Box mt={2} display="flex" justifyContent="center" alignItems="center" gap={1}>
        <FaInfoCircle size={12} color="#94a3b8" />
        <Typography variant="caption" color="text.secondary">
          {chartType === CHART_TYPES.PIE 
            ? "Hover over segments to see detailed values" 
            : "Click on legend items to toggle data series"}
        </Typography>
      </Box>
    </Box>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
EarningsChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    amount: PropTypes.number,
    value: PropTypes.number
  })),
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
  className: PropTypes.string
};

EarningsChart.defaultProps = {
  data: [],
  type: CHART_TYPES.LINE,
  title: "Earnings Overview",
  timeRange: TIME_RANGES.WEEK,
  onTimeRangeChange: null,
  showSummary: true,
  showExport: true,
  showTimeRangeSelector: true,
  height: 300,
  currencySymbol: "₹",
  providerId: null,
  className: ""
};

export default React.memo(EarningsChart);