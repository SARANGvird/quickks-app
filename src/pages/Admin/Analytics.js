// src/pages/Admin/Analytics.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  Avatar,
  LinearProgress,
  Rating,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  People,
  ShoppingBag,
  AttachMoney,
  Assessment,
  Download,
  Print,
  Refresh,
  CalendarToday,
  FilterList,
  Search,
  MoreVert,
  PieChart,
  BarChart,
  LineChart,
  ShowChart,
  Star,
  Warning,
  CheckCircle,
  Schedule,
  LocationOn,
  DeviceHub,
  ArrowUpward,
  ArrowDownward
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Scatter
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
  cyan: "#06b6d4",
  indigo: "#6366f1"
};

const CHART_COLORS_ARRAY = Object.values(CHART_COLORS);

const TIME_RANGES = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
  QUARTER: "quarter",
  YEAR: "year",
  CUSTOM: "custom"
};

const METRICS = {
  USERS: "users",
  BOOKINGS: "bookings",
  REVENUE: "revenue",
  PROVIDERS: "providers"
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-IN").format(value);
};

const getDateRange = (range, customStart, customEnd) => {
  const now = new Date();
  switch (range) {
    case TIME_RANGES.TODAY:
      return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
    case TIME_RANGES.WEEK:
      return { start: subDays(now, 7), end: now };
    case TIME_RANGES.MONTH:
      return { start: subMonths(now, 1), end: now };
    case TIME_RANGES.QUARTER:
      return { start: subMonths(now, 3), end: now };
    case TIME_RANGES.YEAR:
      return { start: subYears(now, 1), end: now };
    case TIME_RANGES.CUSTOM:
      return { start: customStart || subDays(now, 30), end: customEnd || now };
    default:
      return { start: subDays(now, 30), end: now };
  }
};

// ==========================================================
// STAT CARD COMPONENT
// ==========================================================
const StatCard = ({ title, value, change, icon, color, loading }) => {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ height: "100%" }}
    >
      <Card sx={{ height: "100%", borderRadius: 3, position: "relative", overflow: "hidden" }}>
        <CardContent>
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {typeof value === "number" ? formatNumber(value) : value}
                  </Typography>
                  {change !== undefined && (
                    <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                      {isPositive ? (
                        <ArrowUpward fontSize="small" sx={{ color: "success.main" }} />
                      ) : (
                        <ArrowDownward fontSize="small" sx={{ color: "error.main" }} />
                      )}
                      <Typography variant="caption" color={isPositive ? "success.main" : "error.main"}>
                        {Math.abs(change)}% from last period
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Avatar sx={{ bgcolor: `${color}20`, color: color }}>
                  {icon}
                </Avatar>
              </Box>
            </>
          )}
        </CardContent>
        <LinearProgress
          variant="determinate"
          value={100}
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: "transparent",
            "& .MuiLinearProgress-bar": {
              backgroundColor: color
            }
          }}
        />
      </Card>
    </motion.div>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const Analytics = () => {
  const { user, token } = useAuth();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(TIME_RANGES.MONTH);
  const [customStartDate, setCustomStartDate] = useState(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [selectedMetric, setSelectedMetric] = useState(METRICS.REVENUE);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalUsers: 0,
    userGrowth: 0,
    totalBookings: 0,
    bookingGrowth: 0,
    activeProviders: 0,
    providerGrowth: 0,
    averageRating: 0,
    completionRate: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ==========================================================
  // FETCH DATA
  // ==========================================================
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(timeRange, customStartDate, customEndDate);
      
      const [statsRes, chartRes, activitiesRes, providersRes, servicesRes] = await Promise.all([
        api.get("/admin/analytics/stats", {
          params: { startDate: start.toISOString(), endDate: end.toISOString() }
        }),
        api.get("/admin/analytics/chart", {
          params: { metric: selectedMetric, startDate: start.toISOString(), endDate: end.toISOString() }
        }),
        api.get("/admin/analytics/activities", {
          params: { limit: 10 }
        }),
        api.get("/admin/analytics/top-providers", {
          params: { limit: 5 }
        }),
        api.get("/admin/analytics/popular-services", {
          params: { limit: 5 }
        })
      ]);
      
      setStats(statsRes.data);
      setChartData(chartRes.data);
      setRecentActivities(activitiesRes.data);
      setTopProviders(providersRes.data);
      setPopularServices(servicesRes.data);
      
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      addNotification({
        type: "error",
        title: "Loading Failed",
        message: "Failed to load analytics data. Please try again."
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange, customStartDate, customEndDate, selectedMetric, addNotification]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ==========================================================
  // EXPORT HANDLERS
  // ==========================================================
  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get("/admin/analytics/export", {
        params: { format, startDate: customStartDate, endDate: customEndDate },
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `analytics_report_${format(new Date(), "yyyy-MM-dd")}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      addNotification({
        type: "success",
        title: "Export Successful",
        message: `Analytics report exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error("Export failed:", error);
      addNotification({
        type: "error",
        title: "Export Failed",
        message: "Failed to export analytics report"
      });
    }
    handleExportClose();
  };

  // ==========================================================
  // RENDER CHARTS
  // ==========================================================
  const renderMainChart = () => {
    switch (selectedMetric) {
      case METRICS.REVENUE:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
              <ReTooltip formatter={(value) => [`₹${formatNumber(value)}`, "Revenue"]} />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                name="Revenue"
                stroke={CHART_COLORS.primary}
                fill={`${CHART_COLORS.primary}20`}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case METRICS.BOOKINGS:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ReBarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ReTooltip />
              <Legend />
              <Bar dataKey="value" name="Bookings" fill={CHART_COLORS.secondary} radius={[8, 8, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        );
      case METRICS.USERS:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ReLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ReTooltip />
              <Legend />
              <Line type="monotone" dataKey="value" name="Users" stroke={CHART_COLORS.purple} strokeWidth={2} dot={{ r: 4 }} />
            </ReLineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={4}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track your business performance and growth metrics
            </Typography>
          </Box>
          
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchAnalytics}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExportClick}
            >
              Export
            </Button>
            <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={handleExportClose}>
              <MenuItem onClick={() => handleExport("csv")}>Export as CSV</MenuItem>
              <MenuItem onClick={() => handleExport("excel")}>Export as Excel</MenuItem>
              <MenuItem onClick={() => handleExport("pdf")}>Export as PDF</MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Time Range Selector */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" gap={1} flexWrap="wrap">
              {Object.values(TIME_RANGES).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "contained" : "outlined"}
                  onClick={() => setTimeRange(range)}
                  size="small"
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </Box>
            
            {timeRange === TIME_RANGES.CUSTOM && (
              <Box display="flex" gap={2}>
                <DatePicker
                  label="Start Date"
                  value={customStartDate}
                  onChange={setCustomStartDate}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
                <DatePicker
                  label="End Date"
                  value={customEndDate}
                  onChange={setCustomEndDate}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
              </Box>
            )}
          </Box>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              change={stats.revenueGrowth}
              icon={<AttachMoney />}
              color={CHART_COLORS.primary}
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              change={stats.userGrowth}
              icon={<People />}
              color={CHART_COLORS.secondary}
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Bookings"
              value={stats.totalBookings}
              change={stats.bookingGrowth}
              icon={<ShoppingBag />}
              color={CHART_COLORS.warning}
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Providers"
              value={stats.activeProviders}
              change={stats.providerGrowth}
              icon={<DeviceHub />}
              color={CHART_COLORS.purple}
              loading={loading}
            />
          </Grid>
        </Grid>

        {/* Main Chart */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
            <Typography variant="h6" fontWeight="bold">
              Performance Overview
            </Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                label="Metric"
              >
                <MenuItem value={METRICS.REVENUE}>Revenue</MenuItem>
                <MenuItem value={METRICS.BOOKINGS}>Bookings</MenuItem>
                <MenuItem value={METRICS.USERS}>Users</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : (
            renderMainChart()
          )}
        </Paper>

        {/* Additional Insights */}
        <Grid container spacing={3}>
          {/* Top Providers */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Top Performing Providers
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell align="right">Bookings</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Rating</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topProviders.map((provider, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: CHART_COLORS_ARRAY[index % CHART_COLORS_ARRAY.length] }}>
                                {provider.name?.charAt(0)}
                              </Avatar>
                              <Typography variant="body2">{provider.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{formatNumber(provider.bookings)}</TableCell>
                          <TableCell align="right">{formatCurrency(provider.revenue)}</TableCell>
                          <TableCell align="right">
                            <Rating value={provider.rating} readOnly size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* Popular Services */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Popular Services
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Service</TableCell>
                        <TableCell align="right">Bookings</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {popularServices.map((service, index) => (
                        <TableRow key={index}>
                          <TableCell>{service.name}</TableCell>
                          <TableCell align="right">{formatNumber(service.bookings)}</TableCell>
                          <TableCell align="right">{formatCurrency(service.revenue)}</TableCell>
                          <TableCell align="right">
                            {service.trend > 0 ? (
                              <Chip size="small" color="success" icon={<ArrowUpward />} label={`+${service.trend}%`} />
                            ) : (
                              <Chip size="small" color="error" icon={<ArrowDownward />} label={`${service.trend}%`} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* Recent Activities */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Activities
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Event</TableCell>
                          <TableCell>User</TableCell>
                          <TableCell>Details</TableCell>
                          <TableCell>Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentActivities.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((activity, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip
                                size="small"
                                label={activity.type}
                                color={
                                  activity.type === "booking" ? "primary" :
                                  activity.type === "payment" ? "success" :
                                  activity.type === "user" ? "info" : "default"
                                }
                              />
                            </TableCell>
                            <TableCell>{activity.userName}</TableCell>
                            <TableCell>{activity.description}</TableCell>
                            <TableCell>
                              <Tooltip title={format(new Date(activity.timestamp), "PPpp")}>
                                <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={recentActivities.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                  />
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default Analytics;