// src/pages/Customer/CustomerDashboard.js
// 🚀 QUICKKS SAAS v4.0 - COMPLETE FIXED
// ✅ Fixed: All import issues
// ✅ Fixed: All prop mismatches
// ✅ Fixed: Error handling
// ✅ Fixed: Production ready

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, alpha } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  format,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  formatDistanceToNow
} from "date-fns";

// React Icons
import {
  FaPlus,
  FaCheckCircle,
  FaHistory,
  FaSignOutAlt,
  FaBell,
  FaUser,
  FaClock,
  FaWifi,
  FaExclamationTriangle,
  FaStar,
  FaFilter,
  FaSearch,
  FaSync,
  FaComments,
  FaTimes,
  FaInfoCircle
} from "react-icons/fa";
import { IoMdNotifications } from "react-icons/io";

// MUI Components
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Avatar,
  CircularProgress,
  Paper,
  Tooltip,
  Container,
  Badge,
  Snackbar,
  Alert,
  AlertTitle,
  TextField,
  Select,
  MenuItem,
  Fab,
  Zoom,
  Drawer,
  useMediaQuery,
  InputAdornment,
  Skeleton,
  Grid,
  Divider,
} from "@mui/material";

// Custom Hooks & Contexts
import { useAuth } from "../../contexts/AuthContext";

// API
import api, { checkHealth } from "../../api/api";

// Components - LAZY LOAD to avoid missing imports
const BookingForm = React.lazy(() => import("../../components/BookingForm"));
const RatingModal = React.lazy(() => import("../../components/rating/RatingModal"));
const ChatDrawer = React.lazy(() => import("../../components/chat/ChatDrawer"));
const RazorpayPayment = React.lazy(() => import("../../components/payment/RazorpayPayment"));
const BookingCard = React.lazy(() => import("./BookingCard"));
const EmptyState = React.lazy(() => import("../../components/common/EmptyState"));
const ErrorBoundary = React.lazy(() => import("../../components/ErrorBoundary"));

// ==========================================================
// CONSTANTS
// ==========================================================
const CONFIG = {
  NOTIFICATION_DURATION: 5000,
  CONFETTI_DURATION: 3000,
  REFRESH_INTERVAL: 30000,
  STALE_TIME: 60000,
  WEBSOCKET_ENABLED: process.env.REACT_APP_WEBSOCKET_ENABLED !== 'false',
  MAX_HISTORY_DISPLAY: 50,
  DEBOUNCE_DELAY: 300,
};

const ACTIVE_STATUSES = ["REQUESTED", "PENDING", "ASSIGNED", "ACCEPTED", "STARTED", "PROVIDER_STARTED", "COMPLETED_BY_PROVIDER", "PAYMENT_PENDING"];
const HISTORY_STATUSES = ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"];

const STATUS_COLORS = {
  COMPLETED: "success",
  CANCELLED: "error",
  REJECTED: "error",
  EXPIRED: "warning",
  PENDING: "warning",
  REQUESTED: "info",
  ASSIGNED: "primary",
  ACCEPTED: "success",
  STARTED: "info",
  PROVIDER_STARTED: "info",
  COMPLETED_BY_PROVIDER: "success",
  PAYMENT_PENDING: "warning",
};

const STATUS_LABELS = {
  REQUESTED: "Requested",
  PENDING: "Pending",
  PAYMENT_PENDING: "Payment Pending",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  STARTED: "In Progress",
  PROVIDER_STARTED: "Provider Started",
  COMPLETED_BY_PROVIDER: "Completed by Provider",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

// ==========================================================
// THEME
// ==========================================================
const themeColors = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryDark: "#4f46e5",
  success: "#10b981",
  successLight: "#34d399",
  danger: "#ef4444",
  dangerLight: "#f87171",
  warning: "#f59e0b",
  warningLight: "#fbbf24",
  info: "#3b82f6",
  infoLight: "#60a5fa",
  background: "#f8fafc",
  backgroundDark: "#f1f5f9",
  card: "#ffffff",
  textMain: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  borderDark: "#cbd5e1",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  bgcolor: "rgba(15, 23, 42, 0.7)",
  backdropFilter: "blur(8px)",
  zIndex: 3500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  p: 2
};

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const isValidDate = (value) => {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

const formatDate = (dateString) => {
  if (!isValidDate(dateString)) return "Date not set";
  const date = new Date(dateString);
  if (isToday(date)) return `Today at ${format(date, 'hh:mm a')}`;
  if (isYesterday(date)) return `Yesterday at ${format(date, 'hh:mm a')}`;
  return format(date, 'MMM dd, yyyy • hh:mm a');
};

const getStatusColor = (status) => {
  return STATUS_COLORS[status?.toUpperCase()] || "default";
};

const getStatusLabel = (status) => {
  return STATUS_LABELS[status?.toUpperCase()] || status || "Unknown";
};

// ==========================================================
// LOADING SKELETON
// ==========================================================
const DashboardSkeleton = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3, mb: 3 }} />
    <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 3, mb: 3 }} />
    <Stack spacing={2}>
      <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 3 }} />
      <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 3 }} />
    </Stack>
  </Box>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const CustomerDashboard = () => {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const themeMui = useTheme();
  const isMobile = useMediaQuery(themeMui.breakpoints.down('sm'));

  // ==========================================================
  // REFS
  // ==========================================================
  const refreshTimerRef = useRef(null);
  const confettiTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const searchTimeoutRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);

  // ==========================================================
  // STATE
  // ==========================================================
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: "", severity: "info" });

  const [showModal, setShowModal] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [processingIds, setProcessingIds] = useState(() => new Set());

  const [chatOpen, setChatOpen] = useState(false);
  const [chatBooking, setChatBooking] = useState(null);

  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [filterDrawer, setFilterDrawer] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    serviceType: 'all',
    minAmount: '',
    maxAmount: '',
    dateFrom: '',
    dateTo: '',
  });

  const [connectionError, setConnectionError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    bookingId: null,
    amount: 0,
    bookingDetails: null
  });

  // ==========================================================
  // AUTH GUARD
  // ==========================================================
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/dashboard/customer' } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // ==========================================================
  // FETCH BOOKINGS
  // ==========================================================
  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated || authLoading) return;
    
    try {
      setIsLoading(true);
      const response = await api.get('/api/v1/bookings/my');
      const data = response.data?.data || response.data || [];
      
      if (mountedRef.current) {
        setBookings(Array.isArray(data) ? data : []);
        setError(null);
        setIsStale(false);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to load bookings');
        setBookings([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, authLoading]);

  // ==========================================================
  // INITIAL FETCH
  // ==========================================================
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    
    fetchBookings();
    
    refreshTimerRef.current = setInterval(() => {
      if (mountedRef.current) {
        fetchBookings();
      }
    }, CONFIG.REFRESH_INTERVAL);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [isAuthenticated, authLoading, fetchBookings]);

  // ==========================================================
  // HEALTH CHECK
  // ==========================================================
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkConnection = async () => {
      try {
        const result = await checkHealth();
        if (mountedRef.current) {
          setConnectionError(!result.success);
        }
      } catch (err) {
        if (mountedRef.current) {
          setConnectionError(true);
        }
      }
    };

    const initialTimer = setTimeout(checkConnection, 2000);
    healthCheckIntervalRef.current = setInterval(checkConnection, 60000);

    return () => {
      clearTimeout(initialTimer);
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [isAuthenticated]);

  // ==========================================================
  // MOUNT TRACKING
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // ==========================================================
  // DEBOUNCE SEARCH
  // ==========================================================
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, CONFIG.DEBOUNCE_DELAY);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // ==========================================================
  // FILTERING LOGIC
  // ==========================================================
  const { activeBookings, historyBookings, stats, serviceTypes } = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) {
      return {
        activeBookings: [],
        historyBookings: [],
        stats: {
          totalSpent: 0,
          completedCount: 0,
          totalBookings: 0,
          pendingCount: 0,
          activeCount: 0,
          pendingPayment: 0,
          completionRate: 0
        },
        serviceTypes: ['all']
      };
    }

    const available = bookings.filter(b => !dismissedIds.has(b.bookingId));

    let filtered = available.filter(b => {
      if (dateRange !== 'all') {
        const rawDate = b.scheduledAt || b.createdAt;
        if (!isValidDate(rawDate)) return false;
        const date = new Date(rawDate);
        if (dateRange === 'today' && !isToday(date)) return false;
        if (dateRange === 'week' && !isThisWeek(date)) return false;
        if (dateRange === 'month' && !isThisMonth(date)) return false;
      }

      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matches =
          b.serviceType?.toLowerCase().includes(query) ||
          b.providerName?.toLowerCase().includes(query) ||
          b.bookingId?.toLowerCase().includes(query) ||
          b.area?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (selectedFilters.serviceType !== 'all' && b.serviceType !== selectedFilters.serviceType) return false;
      if (selectedFilters.minAmount && (b.totalAmount || 0) < Number(selectedFilters.minAmount)) return false;
      if (selectedFilters.maxAmount && (b.totalAmount || 0) > Number(selectedFilters.maxAmount)) return false;
      if (selectedFilters.dateFrom && isValidDate(b.scheduledAt) && new Date(b.scheduledAt) < new Date(selectedFilters.dateFrom)) return false;
      if (selectedFilters.dateTo && isValidDate(b.scheduledAt) && new Date(b.scheduledAt) > new Date(selectedFilters.dateTo)) return false;

      return true;
    });

    const active = filtered.filter(b => ACTIVE_STATUSES.includes(b.status?.toUpperCase()));
    const history = filtered
      .filter(b => HISTORY_STATUSES.includes(b.status?.toUpperCase()))
      .sort((a, b) => {
        const bDate = isValidDate(b.scheduledAt || b.createdAt) ? new Date(b.scheduledAt || b.createdAt) : new Date(0);
        const aDate = isValidDate(a.scheduledAt || a.createdAt) ? new Date(a.scheduledAt || a.createdAt) : new Date(0);
        return bDate - aDate;
      });

    const completedBookings = history.filter(b => b.status?.toUpperCase() === "COMPLETED");
    const totalSpent = completedBookings.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const completedCount = completedBookings.length;
    const totalHistory = history.length;
    const completionRate = totalHistory > 0 ? Math.round((completedCount / totalHistory) * 100) : 0;

    const pendingPayment = active.filter(b =>
      b.status?.toUpperCase() === "PAYMENT_PENDING" ||
      b.status?.toUpperCase() === "REQUESTED"
    ).length;

    const types = new Set(bookings.map(b => b.serviceType).filter(Boolean));
    const serviceTypeList = ['all', ...Array.from(types)];

    return {
      activeBookings: active,
      historyBookings: history,
      stats: {
        totalSpent,
        completedCount,
        totalBookings: bookings.length,
        pendingCount: pendingPayment,
        activeCount: active.length,
        pendingPayment,
        completionRate
      },
      serviceTypes: serviceTypeList
    };
  }, [bookings, dismissedIds, dateRange, debouncedSearchQuery, selectedFilters]);

  // ==========================================================
  // HANDLERS
  // ==========================================================
  const refetch = useCallback(() => {
    fetchBookings();
  }, [fetchBookings]);

  const isBookingProcessing = useCallback((id) => processingIds.has(id), [processingIds]);
  
  const setBookingProcessing = useCallback((id, value) => {
    setProcessingIds(prev => {
      const next = new Set(prev);
      if (value) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const handleConfirmCompletion = useCallback(async (id) => {
    if (isBookingProcessing(id)) return;

    setBookingProcessing(id, true);
    try {
      await api.patch(`/api/v1/bookings/${id}/confirm-completion`);

      if (!mountedRef.current) return;

      toast.success("Service confirmed successfully! Thank you for using Quickks.");
      refetch();

      setShowConfetti(true);
      confettiTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setShowConfetti(false);
      }, CONFIG.CONFETTI_DURATION);

      const newNotif = {
        id: `notif_${Date.now()}`,
        message: "Service confirmed successfully!",
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);

    } catch (err) {
      if (!mountedRef.current) return;
      const errorMsg = err.response?.data?.message || "Confirmation failed. Please try again.";
      toast.error(errorMsg);
      setNotification({ open: true, message: errorMsg, severity: "error" });
    } finally {
      if (mountedRef.current) setBookingProcessing(id, false);
    }
  }, [isBookingProcessing, setBookingProcessing, refetch]);

  const handleCancelBooking = useCallback(async (id, reason = "Customer requested cancellation") => {
    if (isBookingProcessing(id)) return;

    setBookingProcessing(id, true);
    try {
      await api.patch(`/api/v1/bookings/${id}/cancel`, { reason });
      if (!mountedRef.current) return;
      toast.success("Booking cancelled successfully");
      refetch();
    } catch (err) {
      if (!mountedRef.current) return;
      const errorMsg = err.response?.data?.message || "Failed to cancel booking";
      toast.error(errorMsg);
      setNotification({ open: true, message: errorMsg, severity: "error" });
    } finally {
      if (mountedRef.current) setBookingProcessing(id, false);
    }
  }, [isBookingProcessing, setBookingProcessing, refetch]);

  const handleOpenChat = useCallback((booking) => {
    setChatBooking(booking);
    setChatOpen(true);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    toast.success("Payment successful! Your booking is confirmed.");
    setPaymentDialog({ open: false, bookingId: null, amount: 0, bookingDetails: null });
    refetch();
    setShowConfetti(true);
    confettiTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setShowConfetti(false);
    }, CONFIG.CONFETTI_DURATION);
  }, [refetch]);

  const handlePaymentFailure = useCallback((error) => {
    toast.error(error || "Payment failed. Please try again.");
    setPaymentDialog({ open: false, bookingId: null, amount: 0, bookingDetails: null });
  }, []);

  const openPaymentDialog = useCallback((booking) => {
    setPaymentDialog({
      open: true,
      bookingId: booking.bookingId || booking.id,
      amount: booking.totalAmount || booking.amount || 0,
      bookingDetails: booking
    });
  }, []);

  const handleDismissNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const handleRetry = useCallback(() => {
    setIsRefreshing(true);
    refetch();
    checkHealth().then(result => {
      if (mountedRef.current) setConnectionError(!result.success);
    });
    setTimeout(() => {
      if (mountedRef.current) setIsRefreshing(false);
    }, 1000);
    toast.info("Refreshing data...");
  }, [refetch]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setDateRange('all');
    setSelectedFilters({
      serviceType: 'all',
      minAmount: '',
      maxAmount: '',
      dateFrom: '',
      dateTo: '',
    });
    setFilterDrawer(false);
  }, []);

  const handleDismissBooking = useCallback((bookingId) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(bookingId);
      return next;
    });
    toast.info("Booking dismissed");
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setShowNotificationPanel(false);
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // ==========================================================
  // LOADING STATE
  // ==========================================================
  if (authLoading || !isAuthenticated) {
    return <DashboardSkeleton />;
  }

  if (isLoading && (!bookings || bookings.length === 0)) {
    return <DashboardSkeleton />;
  }

  // ==========================================================
  // RENDER
  // ==========================================================
  const isAuthPage = window.location.pathname.includes('/login') ||
                     window.location.pathname.includes('/register');

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: themeColors.background, pb: 4, position: "relative" }}>
      {showConfetti && (
        <Confetti
          recycle={false}
          numberOfPieces={600}
          gravity={0.15}
          colors={[themeColors.primary, themeColors.success, themeColors.warning, themeColors.info]}
        />
      )}

      {!isAuthPage && connectionError && (
        <Alert
          severity="warning"
          sx={{ borderRadius: 0, mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          <AlertTitle>Connection Issue</AlertTitle>
          Having trouble connecting to the server. Data may be outdated.
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            Tip: Make sure your backend server is running on port 8081
          </Typography>
        </Alert>
      )}

      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header Section */}
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 4, bgcolor: "white", border: `1px solid ${themeColors.border}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: themeColors.primary, width: { xs: 40, md: 48 }, height: { xs: 40, md: 48 } }}>
                <FaUser size={20} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: themeColors.textMain }}>
                  {getGreeting()}, {user?.name?.split(' ')[0] || "Customer"}! 👋
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                  <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                    {stats.activeCount || 0} active • {stats.completedCount || 0} completed
                  </Typography>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: themeColors.borderDark }} />
                  <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                    {formatCurrency(stats.totalSpent)} spent
                  </Typography>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: themeColors.borderDark }} />
                  <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                    {stats.completionRate}% completion rate
                  </Typography>
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <Tooltip title={`${unreadCount} unread notifications`}>
                <Badge badgeContent={unreadCount} color="error" max={99}>
                  <IconButton
                    onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                    sx={{ border: "1px solid", borderColor: themeColors.border, bgcolor: 'white' }}
                  >
                    <IoMdNotifications size={20} />
                  </IconButton>
                </Badge>
              </Tooltip>

              <Tooltip title="Refresh">
                <IconButton onClick={handleRetry} disabled={isRefreshing} sx={{ border: "1px solid", borderColor: themeColors.border, bgcolor: 'white' }}>
                  <FaSync className={isRefreshing ? "spin" : ""} size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Logout">
                <IconButton onClick={logout} sx={{ border: "1px solid", borderColor: themeColors.border, bgcolor: 'white' }}>
                  <FaSignOutAlt color={themeColors.danger} size={16} />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<FaPlus />}
                onClick={() => setShowModal(true)}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  bgcolor: themeColors.primary,
                  '&:hover': {
                    bgcolor: themeColors.primaryDark
                  }
                }}
              >
                {isMobile ? 'Book' : 'New Booking'}
              </Button>
            </Stack>
          </Stack>

          {/* Stats Row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 3, mt: 3 }}>
            <Box sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 3, transition: 'all 0.2s', '&:hover': { bgcolor: themeColors.backgroundDark } }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>Total Spent</Typography>
              <Typography variant="h5" fontWeight="700" color={themeColors.primary}>{formatCurrency(stats.totalSpent)}</Typography>
              <Typography variant="caption" color="text.secondary">Completed bookings only</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 3, transition: 'all 0.2s', '&:hover': { bgcolor: themeColors.backgroundDark } }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>Completed</Typography>
              <Typography variant="h5" fontWeight="700" color={themeColors.success}>{stats.completedCount}</Typography>
              <Typography variant="caption" color="text.secondary">Services done</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 3, transition: 'all 0.2s', '&:hover': { bgcolor: themeColors.backgroundDark } }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>Active</Typography>
              <Typography variant="h5" fontWeight="700" color={themeColors.warning}>{stats.activeCount}</Typography>
              <Typography variant="caption" color="text.secondary">In progress</Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 3, transition: 'all 0.2s', '&:hover': { bgcolor: themeColors.backgroundDark } }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>Pending Payment</Typography>
              <Typography variant="h5" fontWeight="700" color={themeColors.danger}>{stats.pendingPayment || 0}</Typography>
              <Typography variant="caption" color="text.secondary">Awaiting payment</Typography>
            </Box>
          </Box>
        </Paper>

        {/* Tabs & Filters */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: `1px solid ${themeColors.border}` }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap" gap={2}>
            <Stack direction="row" spacing={2}>
              <Button
                variant={activeTab === 0 ? "contained" : "outlined"}
                onClick={() => setActiveTab(0)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  minWidth: 100,
                  bgcolor: activeTab === 0 ? themeColors.primary : 'transparent'
                }}
              >
                Active ({activeBookings.length})
              </Button>
              <Button
                variant={activeTab === 1 ? "contained" : "outlined"}
                onClick={() => setActiveTab(1)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  minWidth: 100,
                  bgcolor: activeTab === 1 ? themeColors.primary : 'transparent'
                }}
              >
                History ({historyBookings.length})
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <TextField
                size="small"
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: { xs: 140, sm: 200 } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><FaSearch size={14} /></InputAdornment>,
                  sx: { bgcolor: 'white' }
                }}
              />
              <Select
                size="small"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                sx={{ minWidth: 120, bgcolor: 'white' }}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
              <Tooltip title="Advanced Filters">
                <IconButton
                  onClick={() => setFilterDrawer(true)}
                  sx={{ bgcolor: themeColors.background, border: `1px solid ${themeColors.border}`, borderRadius: 2 }}
                >
                  <FaFilter size={16} />
                </IconButton>
              </Tooltip>
              {(searchQuery || dateRange !== 'all' || Object.values(selectedFilters).some(v => v)) && (
                <Button
                  size="small"
                  onClick={clearFilters}
                  sx={{ color: themeColors.textSecondary, textTransform: 'none' }}
                >
                  Clear Filters
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* Active Bookings Tab */}
        {activeTab === 0 && (
          <Box sx={{ mb: 6 }}>
            <AnimatePresence mode="wait">
              {activeBookings.length > 0 ? (
                <Stack spacing={3}>
                  {activeBookings.map((booking, index) => (
                    <motion.div
                      key={booking.bookingId || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.5) }}
                    >
                      <React.Suspense fallback={<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />}>
                        <BookingCard
                          booking={booking}
                          role="customer"
                          onConfirm={handleConfirmCompletion}
                          onChat={() => handleOpenChat(booking)}
                          onDismiss={() => handleDismissBooking(booking.bookingId)}
                          onCancel={handleCancelBooking}
                          onPayment={() => openPaymentDialog(booking)}
                          isProcessing={isBookingProcessing(booking.bookingId)}
                          showPayment={booking.status === "REQUESTED" || booking.status === "PAYMENT_PENDING"}
                        />
                      </React.Suspense>
                    </motion.div>
                  ))}
                </Stack>
              ) : (
                <React.Suspense fallback={<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />}>
                  <EmptyState
                    title="No Active Bookings"
                    description="You don't have any active service requests. Book a service to get started!"
                    actionLabel="Book a Service"
                    onAction={() => setShowModal(true)}
                    icon={<FaClock size={48} />}
                  />
                </React.Suspense>
              )}
            </AnimatePresence>
          </Box>
        )}

        {/* History Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: themeColors.textMain, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FaHistory /> Service History
              <Chip label={`${historyBookings.length} total`} size="small" sx={{ ml: 1, bgcolor: themeColors.background }} />
            </Typography>

            {historyBookings.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {historyBookings.slice(0, CONFIG.MAX_HISTORY_DISPLAY).map((booking) => (
                  <Paper
                    key={booking.bookingId || booking.id}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: `1px solid ${themeColors.border}`,
                      bgcolor: "white",
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        borderColor: themeColors.borderDark
                      }
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap="wrap" gap={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: booking.status === "COMPLETED" ? "#dcfce7" : "#fee2e2",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          {booking.status === "COMPLETED" ?
                            <FaCheckCircle color={themeColors.success} size={24} /> :
                            <FaExclamationTriangle color={themeColors.danger} size={24} />
                          }
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight="600">{booking.serviceType}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
                            <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                              {formatDate(booking.scheduledAt || booking.createdAt)}
                            </Typography>
                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: themeColors.border }} />
                            <Chip
                              label={getStatusLabel(booking.status)}
                              size="small"
                              color={getStatusColor(booking.status)}
                              sx={{ height: 20, fontSize: '0.65rem' }}
                            />
                          </Stack>
                          {booking.providerName && (
                            <Typography variant="caption" sx={{ color: themeColors.primary, display: 'block', mt: 0.5 }}>
                              Provider: {booking.providerName}
                            </Typography>
                          )}
                        </Box>
                      </Stack>

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                        <Typography variant="h6" fontWeight="700" color={themeColors.primary}>
                          {formatCurrency(booking.totalAmount || booking.amount || 0)}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenChat(booking)}
                          startIcon={<FaComments />}
                          sx={{ borderRadius: 2, textTransform: 'none' }}
                        >
                          Rebook
                        </Button>
                      </Stack>
                    </Stack>

                    {booking.status === "COMPLETED" && !booking.reviewed && (
                      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${themeColors.border}` }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
                          <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>How was your experience?</Typography>
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<FaStar />}
                            onClick={() => { setSelectedBooking(booking); setShowRating(true); }}
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                          >
                            Rate Service
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                ))}

                {historyBookings.length > CONFIG.MAX_HISTORY_DISPLAY && (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Showing {CONFIG.MAX_HISTORY_DISPLAY} of {historyBookings.length} bookings
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <React.Suspense fallback={<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />}>
                <EmptyState
                  title="No History Yet"
                  description="Your completed services will appear here. Book your first service to get started!"
                  actionLabel="Book Now"
                  onAction={() => setShowModal(true)}
                  icon={<FaHistory size={48} />}
                />
              </React.Suspense>
            )}
          </Box>
        )}

        {/* FAB for mobile */}
        {isMobile && (
          <Zoom in={!showModal}>
            <Fab
              color="primary"
              onClick={() => setShowModal(true)}
              sx={{ position: 'fixed', bottom: 16, right: 16, bgcolor: themeColors.primary }}
            >
              <FaPlus />
            </Fab>
          </Zoom>
        )}
      </Container>

      {/* Notification Panel */}
      <Drawer
        anchor="right"
        open={showNotificationPanel}
        onClose={() => setShowNotificationPanel(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            p: 0,
            bgcolor: 'white',
            maxHeight: '100vh'
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${themeColors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="700">Notifications</Typography>
          <Stack direction="row" spacing={1}>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllNotificationsRead} sx={{ textTransform: 'none' }}>
                Mark all read
              </Button>
            )}
            <IconButton onClick={() => setShowNotificationPanel(false)}><FaTimes /></IconButton>
          </Stack>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {notifications.length > 0 ? (
            <Stack spacing={2}>
              {notifications.map((notif) => (
                <Paper
                  key={notif.id}
                  sx={{
                    p: 2,
                    bgcolor: notif.read ? 'white' : alpha(themeColors.primary, 0.05),
                    border: `1px solid ${notif.read ? themeColors.border : themeColors.primary}`,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: themeColors.background
                    }
                  }}
                  onClick={() => markNotificationRead(notif.id)}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    {notif.type === 'success' ?
                      <FaCheckCircle color={themeColors.success} size={18} /> :
                      <FaInfoCircle color={themeColors.info} size={18} />
                    }
                    <Box flex={1}>
                      <Typography variant="body2" sx={{ color: themeColors.textMain }}>
                        {notif.message}
                      </Typography>
                      <Typography variant="caption" sx={{ color: themeColors.textMuted }}>
                        {isValidDate(notif.timestamp)
                          ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })
                          : ''}
                      </Typography>
                    </Box>
                    {!notif.read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: themeColors.primary, mt: 1 }} />}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <EmptyState
              title="No Notifications"
              description="You're all caught up!"
              icon={<FaBell size={48} />}
            />
          )}
        </Box>
      </Drawer>

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={filterDrawer}
        onClose={() => setFilterDrawer(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            p: 3,
            bgcolor: 'white',
            maxHeight: '100vh'
          }
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" fontWeight="700">Advanced Filters</Typography>
          <IconButton onClick={() => setFilterDrawer(false)}><FaTimes /></IconButton>
        </Stack>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" fontWeight="600" gutterBottom>Service Type</Typography>
            <Select
              fullWidth
              size="small"
              value={selectedFilters.serviceType}
              onChange={(e) => setSelectedFilters(prev => ({ ...prev, serviceType: e.target.value }))}
              sx={{ bgcolor: themeColors.background }}
            >
              {serviceTypes.map(type => (
                <MenuItem key={type} value={type}>{type === 'all' ? 'All Services' : type}</MenuItem>
              ))}
            </Select>
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="600" gutterBottom>Amount Range (₹)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Min"
                  type="number"
                  value={selectedFilters.minAmount}
                  onChange={(e) => setSelectedFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    sx: { bgcolor: 'white' }
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Max"
                  type="number"
                  value={selectedFilters.maxAmount}
                  onChange={(e) => setSelectedFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    sx: { bgcolor: 'white' }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="600" gutterBottom>Date Range</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="From"
                  value={selectedFilters.dateFrom}
                  onChange={(e) => setSelectedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: 'white' }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="To"
                  value={selectedFilters.dateTo}
                  onChange={(e) => setSelectedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: 'white' }}
                />
              </Grid>
            </Grid>
          </Box>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button fullWidth variant="outlined" onClick={clearFilters} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Clear All
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => setFilterDrawer(false)}
              sx={{ borderRadius: 2, bgcolor: themeColors.primary, textTransform: 'none' }}
            >
              Apply Filters
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      {/* Chat Drawer */}
      {chatBooking && (
        <React.Suspense fallback={null}>
          <ChatDrawer
            open={chatOpen}
            onClose={() => { setChatOpen(false); setChatBooking(null); }}
            bookingId={chatBooking.bookingId || chatBooking.id}
            currentUser={{
              id: user?.uid || user?.id,
              fullName: user?.name || user?.fullName,
              role: 'customer'
            }}
            recipientName={chatBooking.providerName || 'Provider'}
            recipientId={chatBooking.providerId}
          />
        </React.Suspense>
      )}

      {/* Payment Dialog */}
      <React.Suspense fallback={null}>
        <RazorpayPayment
          open={paymentDialog.open}
          onClose={() => setPaymentDialog({ open: false, bookingId: null, amount: 0, bookingDetails: null })}
          bookingId={paymentDialog.bookingId}
          amount={paymentDialog.amount}
          customerDetails={{
            name: user?.name || user?.fullName,
            email: user?.email,
            phone: user?.phone
          }}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      </React.Suspense>

      {/* Booking Form Modal */}
      <AnimatePresence>
        {showModal && (
          <Box sx={overlayStyle}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ width: '95vw', maxWidth: '500px' }}
            >
              <Paper sx={{ bgcolor: "white", borderRadius: 4, maxHeight: "90vh", overflow: "auto" }}>
                <React.Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
                  <BookingForm
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                      setShowModal(false);
                      refetch();
                      toast.success("Booking created! Please complete payment to confirm.");
                    }}
                  />
                </React.Suspense>
              </Paper>
            </motion.div>
          </Box>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRating && selectedBooking && (
          <Box sx={overlayStyle}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ width: '95vw', maxWidth: '440px' }}
            >
              <Paper sx={{ bgcolor: "white", borderRadius: 4 }}>
                <React.Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
                  <RatingModal
                    booking={selectedBooking}
                    onClose={() => setShowRating(false)}
                    onSuccess={() => {
                      setShowRating(false);
                      refetch();
                      toast.success("Thank you for your feedback!");
                    }}
                  />
                </React.Suspense>
              </Paper>
            </motion.div>
          </Box>
        )}
      </AnimatePresence>

      {/* Snackbar Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={CONFIG.NOTIFICATION_DURATION}
        onClose={handleDismissNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={notification.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
          onClose={handleDismissNotification}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Toast Container */}
      <ToastContainer
        theme="colored"
        position="top-right"
        autoClose={CONFIG.NOTIFICATION_DURATION}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .slide-in {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-in-up {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>
    </Box>
  );
};

export default CustomerDashboard;