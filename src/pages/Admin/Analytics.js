// src/pages/Admin/Analytics.js
//
// Admin analytics dashboard.
// Backend endpoints used (all relative to the axios baseURL .../quickks/api/v1):
//   GET /admin/analytics/stats | chart | activities | top-providers | popular-services | export
//
// Library notes (these were the build/runtime breakers in the previous version):
//   - MUI icons come from "@mui/icons-material" - there is no "ShowChartIcon" export there.
//   - recharts has no "ShowChartIcon" either: a line chart is `LineChart` (aliased ReLineChart).
//   - date pickers: date-fns v3 -> AdapterDateFnsV3, and v7 pickers use `slotProps` (no renderInput).
//   - the rupee sign is written as ₹ so it can never turn into mojibake ("â‚¹") again.

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
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
  AttachMoney,
  People,
  ShoppingBag,
  Download,
  Print,
  Refresh,
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import {
  format,
  formatDistanceToNow,
  subDays,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  isValid
} from "date-fns";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api/api";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const RUPEE = "₹";

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
  REVENUE: "revenue"
};

const EXPORT_FORMATS = {
  csv: { label: "CSV", extension: "csv" },
  excel: { label: "Excel", extension: "xlsx" },
  pdf: { label: "PDF", extension: "pdf" }
};

const EMPTY_STATS = {
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
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(toNumber(value));

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(toNumber(value));

// 1500 -> "₹1.5k", 250000 -> "₹2.5L" (Indian grouping)
const formatCompactRupee = (value) => {
  const n = toNumber(value);
  const abs = Math.abs(n);
  if (abs >= 10000000) return `${RUPEE}${+(n / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${RUPEE}${+(n / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${RUPEE}${+(n / 1000).toFixed(1)}k`;
  return `${RUPEE}${n}`;
};

// Backend wraps payloads as { data: ... } on some endpoints and returns them bare on others.
const unwrap = (res) => res?.data?.data ?? res?.data ?? null;
const asArray = (value) => (Array.isArray(value) ? value : Array.isArray(value?.content) ? value.content : []);

const isCancelled = (err) =>
  err?.name === "CanceledError" || err?.name === "AbortError" || err?.code === "ERR_CANCELED";

// Pure: never mutates `now` (the old TODAY branch did).
const getDateRange = (range, customStart, customEnd) => {
  const now = new Date();
  switch (range) {
    case TIME_RANGES.TODAY:
      return { start: startOfDay(now), end: now };
    case TIME_RANGES.WEEK:
      return { start: subDays(now, 7), end: now };
    case TIME_RANGES.MONTH:
      return { start: subMonths(now, 1), end: now };
    case TIME_RANGES.QUARTER:
      return { start: subMonths(now, 3), end: now };
    case TIME_RANGES.YEAR:
      return { start: subYears(now, 1), end: now };
    case TIME_RANGES.CUSTOM:
      return {
        start: startOfDay(isValid(customStart) ? customStart : subDays(now, 30)),
        end: endOfDay(isValid(customEnd) ? customEnd : now)
      };
    default:
      return { start: subDays(now, 30), end: now };
  }
};

const safeFormat = (value, pattern) => {
  const d = new Date(value);
  return isValid(d) ? format(d, pattern) : "N/A";
};
const safeRelative = (value) => {
  const d = new Date(value);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : "N/A";
};

/* -------------------------------------------------------------------------- */
/* Stat card                                                                  */
/* -------------------------------------------------------------------------- */

const StatCard = ({ title, value, change, icon, color, loading }) => {
  const hasChange = change !== undefined && change !== null && Number.isFinite(Number(change));
  const growth = toNumber(change);
  const isPositive = growth >= 0;

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
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  {title}
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {typeof value === "number" ? formatNumber(value) : value}
                </Typography>
                {hasChange && (
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    {isPositive ? (
                      <ArrowUpward fontSize="small" sx={{ color: "success.main" }} />
                    ) : (
                      <ArrowDownward fontSize="small" sx={{ color: "error.main" }} />
                    )}
                    <Typography variant="caption" color={isPositive ? "success.main" : "error.main"}>
                      {Math.abs(growth)}% from last period
                    </Typography>
                  </Box>
                )}
              </Box>
              <Avatar sx={{ bgcolor: `${color}20`, color }}>{icon}</Avatar>
            </Box>
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
            "& .MuiLinearProgress-bar": { backgroundColor: color }
          }}
        />
      </Card>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

const Analytics = () => {
  const { addNotification } = useNotifications();

  // Keep the latest notifier in a ref: if the context creates a new function on every render,
  // putting it in a hook dependency would refetch in an endless loop.
  const notifyRef = useRef(addNotification);
  notifyRef.current = addNotification;
  const notify = useCallback((payload) => notifyRef.current?.(payload), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(TIME_RANGES.MONTH);
  const [customStartDate, setCustomStartDate] = useState(() => subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState(() => new Date());
  const [selectedMetric, setSelectedMetric] = useState(METRICS.REVENUE);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [popularServices, setPopularServices] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const customRangeInvalid =
    timeRange === TIME_RANGES.CUSTOM &&
    (!isValid(customStartDate) || !isValid(customEndDate) || customStartDate > customEndDate);

  /* ------------------------------ data loading ----------------------------- */

  const controllerRef = useRef(null);

  const fetchAnalytics = useCallback(async () => {
    if (customRangeInvalid) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRange(timeRange, customStartDate, customEndDate);
      const range = { startDate: start.toISOString(), endDate: end.toISOString() };

      const [statsRes, chartRes, activitiesRes, providersRes, servicesRes] = await Promise.all([
        api.get("/admin/analytics/stats", { params: range, signal }),
        api.get("/admin/analytics/chart", { params: { metric: selectedMetric, ...range }, signal }),
        api.get("/admin/analytics/activities", { params: { limit: 10 }, signal }),
        api.get("/admin/analytics/top-providers", { params: { limit: 5 }, signal }),
        api.get("/admin/analytics/popular-services", { params: { limit: 5 }, signal })
      ]);
      if (signal.aborted) return;

      setStats({ ...EMPTY_STATS, ...(unwrap(statsRes) || {}) });
      setChartData(asArray(unwrap(chartRes)));
      setRecentActivities(asArray(unwrap(activitiesRes)));
      setTopProviders(asArray(unwrap(providersRes)));
      setPopularServices(asArray(unwrap(servicesRes)));
      setPage(0);
    } catch (err) {
      if (isCancelled(err)) return;
      console.error("Failed to fetch analytics:", err);
      const message = err?.response?.data?.message || "Failed to load analytics data. Please try again.";
      setError(message);
      notify({ type: "error", title: "Loading Failed", message });
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [timeRange, customStartDate, customEndDate, selectedMetric, customRangeInvalid, notify]);

  useEffect(() => {
    fetchAnalytics();
    return () => controllerRef.current?.abort();
  }, [fetchAnalytics]);

  /* -------------------------------- export --------------------------------- */

  const handleExport = async (fmt) => {
    setExportAnchorEl(null);
    const meta = EXPORT_FORMATS[fmt];
    if (!meta || customRangeInvalid) return;

    setExporting(true);
    try {
      const { start, end } = getDateRange(timeRange, customStartDate, customEndDate);
      const response = await api.get("/admin/analytics/export", {
        params: { format: fmt, startDate: start.toISOString(), endDate: end.toISOString() },
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      // `fmt` (string) is deliberately not called `format`: that name shadowed date-fns format().
      link.download = `analytics_report_${format(new Date(), "yyyy-MM-dd")}.${meta.extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notify({ type: "success", title: "Export Successful", message: `Analytics report exported as ${meta.label}` });
    } catch (err) {
      console.error("Export failed:", err);
      notify({ type: "error", title: "Export Failed", message: "Failed to export analytics report" });
    } finally {
      setExporting(false);
    }
  };

  /* --------------------------------- charts -------------------------------- */

  const renderMainChart = () => {
    if (!chartData.length) {
      return (
        <Box py={8} textAlign="center">
          <Typography color="text.secondary">No data for the selected period</Typography>
        </Box>
      );
    }

    switch (selectedMetric) {
      case METRICS.REVENUE:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={formatCompactRupee} />
              <ReTooltip formatter={(value) => [`${RUPEE}${formatNumber(value)}`, "Revenue"]} />
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
              <YAxis allowDecimals={false} />
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
              <YAxis allowDecimals={false} />
              <ReTooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name="Users"
                stroke={CHART_COLORS.purple}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ReLineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const spinner = (py) => (
    <Box display="flex" justifyContent="center" py={py}>
      <CircularProgress />
    </Box>
  );

  const emptyRow = (colSpan, text) => (
    <TableRow>
      <TableCell colSpan={colSpan} align="center">
        <Typography variant="body2" color="text.secondary" py={2}>
          {text}
        </Typography>
      </TableCell>
    </TableRow>
  );

  const pagedActivities = recentActivities.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  /* --------------------------------- render -------------------------------- */

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

          <Box display="flex" gap={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchAnalytics} disabled={loading}>
              Refresh
            </Button>
            <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>
              Print
            </Button>
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <Download />}
              onClick={(e) => setExportAnchorEl(e.currentTarget)}
              disabled={exporting || customRangeInvalid}
            >
              Export
            </Button>
            <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={() => setExportAnchorEl(null)}>
              {Object.entries(EXPORT_FORMATS).map(([key, meta]) => (
                <MenuItem key={key} onClick={() => handleExport(key)}>
                  Export as {meta.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={fetchAnalytics}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Time range */}
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
              <Box display="flex" gap={2} flexWrap="wrap">
                <DatePicker
                  label="Start Date"
                  value={customStartDate}
                  onChange={(value) => value && setCustomStartDate(value)}
                  maxDate={customEndDate || undefined}
                  disableFuture
                  slotProps={{ textField: { size: "small" } }}
                />
                <DatePicker
                  label="End Date"
                  value={customEndDate}
                  onChange={(value) => value && setCustomEndDate(value)}
                  minDate={customStartDate || undefined}
                  disableFuture
                  slotProps={{ textField: { size: "small" } }}
                />
              </Box>
            )}
          </Box>
          {customRangeInvalid && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Choose a valid date range: the start date must be on or before the end date.
            </Alert>
          )}
        </Paper>

        {/* Stats */}
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
              value={toNumber(stats.totalUsers)}
              change={stats.userGrowth}
              icon={<People />}
              color={CHART_COLORS.secondary}
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Bookings"
              value={toNumber(stats.totalBookings)}
              change={stats.bookingGrowth}
              icon={<ShoppingBag />}
              color={CHART_COLORS.warning}
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Providers"
              value={toNumber(stats.activeProviders)}
              change={stats.providerGrowth}
              icon={<DeviceHub />}
              color={CHART_COLORS.purple}
              loading={loading}
            />
          </Grid>
        </Grid>

        {/* Main chart */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
            <Typography variant="h6" fontWeight="bold">
              Performance Overview
            </Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="analytics-metric-label">Metric</InputLabel>
              <Select
                labelId="analytics-metric-label"
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
          {loading ? spinner(8) : renderMainChart()}
        </Paper>

        {/* Insights */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Top Performing Providers
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                spinner(4)
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
                      {topProviders.length === 0
                        ? emptyRow(4, "No provider data yet")
                        : topProviders.map((provider, index) => (
                            <TableRow key={provider.id ?? provider.name ?? index}>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Avatar
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      bgcolor: CHART_COLORS_ARRAY[index % CHART_COLORS_ARRAY.length]
                                    }}
                                  >
                                    {provider.name?.charAt(0)}
                                  </Avatar>
                                  <Typography variant="body2">{provider.name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">{formatNumber(provider.bookings)}</TableCell>
                              <TableCell align="right">{formatCurrency(provider.revenue)}</TableCell>
                              <TableCell align="right">
                                <Rating value={toNumber(provider.rating)} precision={0.5} readOnly size="small" />
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Popular Services
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                spinner(4)
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
                      {popularServices.length === 0
                        ? emptyRow(4, "No service data yet")
                        : popularServices.map((service, index) => {
                            const trend = toNumber(service.trend);
                            return (
                              <TableRow key={service.id ?? service.name ?? index}>
                                <TableCell>{service.name}</TableCell>
                                <TableCell align="right">{formatNumber(service.bookings)}</TableCell>
                                <TableCell align="right">{formatCurrency(service.revenue)}</TableCell>
                                <TableCell align="right">
                                  {trend >= 0 ? (
                                    <Chip size="small" color="success" icon={<ArrowUpward />} label={`+${trend}%`} />
                                  ) : (
                                    <Chip size="small" color="error" icon={<ArrowDownward />} label={`${trend}%`} />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Activities
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loading ? (
                spinner(4)
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
                        {pagedActivities.length === 0
                          ? emptyRow(4, "No recent activity")
                          : pagedActivities.map((activity, index) => (
                              <TableRow key={activity.id ?? `${activity.timestamp}-${index}`}>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={activity.type}
                                    color={
                                      activity.type === "booking"
                                        ? "primary"
                                        : activity.type === "payment"
                                          ? "success"
                                          : activity.type === "user"
                                            ? "info"
                                            : "default"
                                    }
                                  />
                                </TableCell>
                                <TableCell>{activity.userName}</TableCell>
                                <TableCell>{activity.description}</TableCell>
                                <TableCell>
                                  <Tooltip title={safeFormat(activity.timestamp, "PPpp")}>
                                    <span>{safeRelative(activity.timestamp)}</span>
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