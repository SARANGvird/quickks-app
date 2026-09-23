import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Grid, Paper, Typography, Skeleton, Box, Chip, Tooltip, IconButton, Alert, Snackbar } from "@mui/material";
import { 
  TrendingUp, 
  TrendingDown, 
  Refresh, 
  Info, 
  BarChart, 
  AttachMoney, 
  Work, 
  CheckCircle, 
  Cancel,
  Star,
  TrendingUp as TrendingUpIcon,
  ArrowUpward,
  ArrowDownward
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../api/api";
import { toast } from "react-hot-toast";

// ==========================================================
// STAT CARD COMPONENT
// ==========================================================
const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  color = "#6366f1", 
  trend, 
  loading, 
  prefix = "", 
  suffix = "",
  tooltip = "",
  onClick = null,
  subtitle = null
}) => {
  const trendValue = useMemo(() => {
    if (trend === undefined || trend === null) return null;
    return `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`;
  }, [trend]);

  const isPositive = trend > 0;
  const isNegative = trend < 0;

  if (loading) {
    return (
      <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%', position: 'relative', overflow: 'hidden' }}>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="80%" height={40} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="40%" height={16} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={onClick ? { scale: 1.02, y: -2 } : {}}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', height: '100%' }}
    >
      <Paper 
        sx={{ 
          p: 2.5, 
          borderRadius: 3, 
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)',
          border: '1px solid rgba(99,102,241,0.1)',
          '&:hover': onClick && {
            boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)'
          }
        }}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
            opacity: 0.5,
          }}
        />
        
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            {Icon && (
              <Box
                sx={{
                  bgcolor: `${color}15`,
                  p: 1,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: color
                }}
              >
                <Icon sx={{ fontSize: 20 }} />
              </Box>
            )}
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {label}
            </Typography>
          </Box>
          
          {tooltip && (
            <Tooltip title={tooltip}>
              <Info sx={{ fontSize: 16, color: '#94a3b8', cursor: 'help' }} />
            </Tooltip>
          )}
        </Box>

        {/* Value */}
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5, color: '#0f172a' }}>
          {prefix}{value?.toLocaleString()}{suffix}
        </Typography>

        {/* Subtitle */}
        {subtitle && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {subtitle}
          </Typography>
        )}

        {/* Trend */}
        {trend !== undefined && trend !== null && (
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Chip
              icon={isPositive ? <ArrowUpward sx={{ fontSize: 12 }} /> : isNegative ? <ArrowDownward sx={{ fontSize: 12 }} /> : <TrendingUp sx={{ fontSize: 12 }} />}
              label={trendValue}
              size="small"
              sx={{
                bgcolor: isPositive ? 'rgba(16,185,129,0.1)' : isNegative ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)',
                color: isPositive ? '#10b981' : isNegative ? '#ef4444' : '#64748b',
                fontWeight: 600,
                fontSize: 11,
                height: 24
              }}
            />
            <Typography variant="caption" color="text.secondary">
              vs last period
            </Typography>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

// ==========================================================
// MAIN ANALYTICS CARDS COMPONENT
// ==========================================================
const AnalyticsCards = ({ 
  dateRange = null,
  onRefresh = null,
  showTrends = true,
  autoRefresh = false,
  refreshInterval = 30000,
  className = "",
  style = {}
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Auto-refresh timer
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const timer = setInterval(() => {
        fetchAnalytics();
      }, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [autoRefresh, refreshInterval, dateRange]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      // Build URL with date range if provided
      let url = '/api/v1/analytics/summary';
      if (dateRange) {
        const params = new URLSearchParams();
        if (dateRange.start) params.append('start', dateRange.start);
        if (dateRange.end) params.append('end', dateRange.end);
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      
      // Handle response structure (ApiResponseWrapper)
      const analyticsData = response.data?.data || response.data;
      
      setData({
        totalBookings: analyticsData.totalBookings || 0,
        activeJobs: analyticsData.activeJobs || analyticsData.activeBookings || 0,
        completedJobs: analyticsData.completedJobs || analyticsData.completedBookings || 0,
        cancelledJobs: analyticsData.cancelledJobs || analyticsData.cancelledBookings || 0,
        totalRevenue: analyticsData.totalRevenue || analyticsData.totalEarnings || 0,
        avgJobValue: analyticsData.avgJobValue || analyticsData.averageBookingValue || 0,
        avgRating: analyticsData.avgRating || analyticsData.averageRating || 0,
        // Additional metrics
        totalProviders: analyticsData.totalProviders || 0,
        totalCustomers: analyticsData.totalCustomers || 0,
        completionRate: analyticsData.completionRate || 0,
        revenueGrowth: analyticsData.revenueGrowth || 0,
        bookingGrowth: analyticsData.bookingGrowth || 0,
        // Trends
        bookingTrend: analyticsData.bookingTrend || 0,
        revenueTrend: analyticsData.revenueTrend || 0,
        ratingTrend: analyticsData.ratingTrend || 0
      });
      
      setLastUpdated(new Date());
      
      if (onRefresh) {
        onRefresh(analyticsData);
      }
      
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, onRefresh]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchAnalytics(true);
    toast.success('Refreshing analytics...');
  };

  // Handle card click navigation
  const handleCardClick = (type) => {
    // You can implement navigation based on card type
    // window.location.href = `/admin/analytics/${type}`;
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (error && !loading) {
    return (
      <Box sx={{ mb: 4 }}>
        <Alert 
          severity="error" 
          action={
            <button onClick={handleRefresh} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <Refresh />
            </button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4, position: 'relative' }} className={className} style={style}>
      {/* Header with refresh and last updated */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <BarChart sx={{ color: '#6366f1' }} />
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Analytics Overview
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh data">
            <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
              <Refresh sx={{ fontSize: 18, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
          {dateRange && (
            <Chip 
              label={`${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Loading overlay */}
      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(2px)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '16px'
            }}
          >
            <Typography variant="body2" color="text.secondary">Updating...</Typography>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <Grid container spacing={2}>
        {/* Booking Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Bookings"
            value={data?.totalBookings || 0}
            icon={Work}
            color="#6366f1"
            trend={showTrends ? data?.bookingTrend : undefined}
            tooltip="Total number of bookings across the platform"
            onClick={() => handleCardClick('bookings')}
            subtitle={`${data?.activeJobs || 0} active`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Completed Jobs"
            value={data?.completedJobs || 0}
            icon={CheckCircle}
            color="#10b981"
            trend={showTrends ? data?.bookingTrend : undefined}
            tooltip="Successfully completed jobs"
            onClick={() => handleCardClick('completed')}
            subtitle={`${((data?.completedJobs / (data?.totalBookings || 1)) * 100).toFixed(1)}% completion rate`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Cancelled Jobs"
            value={data?.cancelledJobs || 0}
            icon={Cancel}
            color="#ef4444"
            trend={showTrends ? -Math.abs(data?.bookingTrend || 0) : undefined}
            tooltip="Cancelled or rejected jobs"
            onClick={() => handleCardClick('cancelled')}
            subtitle={`${((data?.cancelledJobs / (data?.totalBookings || 1)) * 100).toFixed(1)}% cancellation rate`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Active Jobs"
            value={data?.activeJobs || 0}
            icon={TrendingUp}
            color="#f59e0b"
            tooltip="Currently in-progress jobs"
            onClick={() => handleCardClick('active')}
          />
        </Grid>

        {/* Revenue Stats */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Total Revenue"
            value={data?.totalRevenue || 0}
            icon={AttachMoney}
            color="#10b981"
            prefix="₹"
            trend={showTrends ? data?.revenueGrowth : undefined}
            tooltip="Total revenue from all completed bookings"
            onClick={() => handleCardClick('revenue')}
            subtitle={`₹${((data?.totalRevenue / (data?.completedJobs || 1)) || 0).toFixed(0)} per job avg`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Average Job Value"
            value={data?.avgJobValue || 0}
            icon={TrendingUpIcon}
            color="#8b5cf6"
            prefix="₹"
            tooltip="Average value per completed job"
            onClick={() => handleCardClick('average')}
            subtitle={`Total: ${data?.completedJobs || 0} jobs`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Average Rating"
            value={data?.avgRating || 0}
            icon={Star}
            color="#f59e0b"
            suffix="⭐"
            trend={showTrends ? data?.ratingTrend : undefined}
            tooltip="Average customer rating across all reviews"
            onClick={() => handleCardClick('ratings')}
            subtitle="Based on customer reviews"
          />
        </Grid>

        {/* Optional: Additional Stats if available */}
        {data?.totalProviders > 0 && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Total Providers"
              value={data?.totalProviders || 0}
              icon={Work}
              color="#06b6d4"
              tooltip="Registered service providers"
              onClick={() => handleCardClick('providers')}
            />
          </Grid>
        )}
        
        {data?.totalCustomers > 0 && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Total Customers"
              value={data?.totalCustomers || 0}
              icon={Work}
              color="#ec4899"
              tooltip="Registered customers"
              onClick={() => handleCardClick('customers')}
            />
          </Grid>
        )}
        
        {data?.completionRate > 0 && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Completion Rate"
              value={data?.completionRate || 0}
              icon={CheckCircle}
              color="#10b981"
              suffix="%"
              tooltip="Percentage of successfully completed bookings"
              onClick={() => handleCardClick('completion')}
            />
          </Grid>
        )}
      </Grid>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

// ==========================================================
// HELPER COMPONENTS
// ==========================================================

export const SimpleAnalyticsCards = (props) => (
  <AnalyticsCards {...props} showTrends={false} />
);

export const CompactAnalyticsCards = (props) => (
  <AnalyticsCards {...props} autoRefresh={true} refreshInterval={30000} />
);

export const DetailedAnalyticsCards = (props) => (
  <AnalyticsCards {...props} showTrends={true} autoRefresh={true} />
);

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default AnalyticsCards;