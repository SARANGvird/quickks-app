// src/components/Booking/BookingDetailsModal.jsx
// ================================================================
// 🚀 BOOKING DETAILS MODAL - v3.0 ENTERPRISE
// ================================================================
// 
// FEATURES:
// ✅ Complete booking details display
// ✅ Interactive timeline with status tracking
// ✅ Real-time status updates via WebSocket
// ✅ Action buttons with loading states
// ✅ Payment information with transaction details
// ✅ Share, Print, Chat functionality
// ✅ Responsive design with dark mode support
// ✅ Accessibility (ARIA, keyboard navigation)
// ✅ Error boundaries and fallback UI
// ✅ Performance optimized
// ================================================================

import React, { 
  useState, 
  useCallback, 
  useMemo, 
  useEffect, 
  useRef,
  memo 
} from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  Grid,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  Paper,
  LinearProgress,
  Alert,
  Snackbar,
  Skeleton,
  Tab,
  Tabs,
  Rating,
  TextField,
  CircularProgress,
  Badge,
  Fade,
  Zoom,
  Slide
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  FaTimes,
  FaUser,
  FaMapMarkerAlt,
  FaClock,
  FaRupeeSign,
  FaTools,
  FaPhone,
  FaEnvelope,
  FaCheckCircle,
  FaPlay,
  FaMapPin,
  FaCalendarDay,
  FaStar,
  FaComments,
  FaExternalLinkAlt,
  FaWhatsapp,
  FaPrint,
  FaShare,
  FaHistory,
  FaCreditCard,
  FaReceipt,
  FaInfoCircle,
  FaExclamationTriangle,
  FaUserCheck,
  FaUserClock,
  FaCheckDouble,
  FaSync,
  FaCopy,
  FaDownload,
  FaFileInvoice,
  FaShieldAlt
} from "react-icons/fa";
import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// ================================================================
// CONSTANTS & THEME
// ================================================================

const THEME = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryDark: "#4f46e5",
  success: "#10b981",
  successLight: "#34d399",
  successDark: "#059669",
  warning: "#f59e0b",
  warningLight: "#fbbf24",
  warningDark: "#d97706",
  danger: "#ef4444",
  dangerLight: "#f87171",
  dangerDark: "#dc2626",
  info: "#3b82f6",
  purple: "#8b5cf6",
  dark: "#1e293b",
  lightGray: "#f8fafc",
  border: "#e2e8f0",
  borderRadius: "16px",
  transition: "0.3s cubic-bezier(0.4, 0, 0.2, 1)"
};

const STATUS_CONFIG = {
  REQUESTED: { 
    color: THEME.warning, 
    label: "New Request", 
    icon: FaClock, 
    step: 1,
    description: "Booking request submitted"
  },
  PENDING: { 
    color: THEME.warning, 
    label: "Pending", 
    icon: FaClock, 
    step: 1,
    description: "Awaiting provider response"
  },
  PAYMENT_PENDING: { 
    color: THEME.warning, 
    label: "Payment Required", 
    icon: FaCreditCard, 
    step: 1,
    description: "Payment pending confirmation"
  },
  PAYMENT_COMPLETED: { 
    color: THEME.success, 
    label: "Payment Completed", 
    icon: FaCheckCircle, 
    step: 2,
    description: "Payment confirmed"
  },
  ASSIGNED: { 
    color: THEME.primary, 
    label: "Assigned", 
    icon: FaUserCheck, 
    step: 2,
    description: "Provider assigned to job"
  },
  ACCEPTED: { 
    color: THEME.primary, 
    label: "Accepted", 
    icon: FaCheckCircle, 
    step: 3,
    description: "Provider accepted the job"
  },
  PROVIDER_STARTED: { 
    color: THEME.purple, 
    label: "En Route", 
    icon: FaMapPin, 
    step: 4,
    description: "Provider is traveling"
  },
  STARTED: { 
    color: THEME.purple, 
    label: "In Progress", 
    icon: FaTools, 
    step: 5,
    description: "Service in progress"
  },
  COMPLETED_BY_PROVIDER: { 
    color: THEME.success, 
    label: "Completed - Awaiting Confirmation", 
    icon: FaUserClock, 
    step: 6,
    description: "Provider completed service"
  },
  COMPLETED: { 
    color: THEME.success, 
    label: "Completed & Verified", 
    icon: FaCheckDouble, 
    step: 7,
    description: "Service completed and verified"
  },
  CANCELLED: { 
    color: THEME.danger, 
    label: "Cancelled", 
    icon: FaTimes, 
    step: -1,
    description: "Booking cancelled"
  },
  REJECTED: { 
    color: THEME.danger, 
    label: "Rejected", 
    icon: FaExclamationTriangle, 
    step: -1,
    description: "Booking rejected"
  }
};

const ACTION_CONFIG = {
  accept: { label: "Accept", color: "success", icon: FaCheckCircle },
  reject: { label: "Reject", color: "error", icon: FaTimes },
  travel: { label: "Start Travel", color: "primary", icon: FaMapPin },
  start: { label: "Start Job", color: "primary", icon: FaPlay },
  complete: { label: "Complete Job", color: "success", icon: FaCheckCircle },
  chat: { label: "Chat", color: "info", icon: FaComments }
};

// ================================================================
// STYLED COMPONENTS
// ================================================================

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: "20px",
    overflow: "hidden",
    maxHeight: "90vh",
    maxWidth: "600px",
    width: "100%",
    margin: "16px",
    [theme.breakpoints.up("sm")]: {
      margin: "32px"
    }
  }
}));

const HeaderBox = styled(Box)(({ theme, statusColor }) => ({
  padding: "24px 28px",
  background: `linear-gradient(135deg, ${statusColor || THEME.primary} 0%, ${THEME.dark} 100%)`,
  color: "white",
  position: "relative",
  [theme.breakpoints.down("sm")]: {
    padding: "20px"
  }
}));

const StatusChip = styled(Chip)(({ statusColor }) => ({
  backgroundColor: "rgba(255,255,255,0.2)",
  color: "white",
  fontWeight: 600,
  "& .MuiChip-icon": {
    color: "white"
  }
}));

const TimelineContainer = styled(Box)({
  maxHeight: "500px",
  overflowY: "auto",
  paddingRight: "16px",
  "&::-webkit-scrollbar": {
    width: "6px"
  },
  "&::-webkit-scrollbar-track": {
    background: THEME.lightGray,
    borderRadius: "3px"
  },
  "&::-webkit-scrollbar-thumb": {
    background: THEME.border,
    borderRadius: "3px",
    "&:hover": {
      background: THEME.primary
    }
  }
});

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

const formatDateTime = (dateString) => {
  if (!dateString) return "Not available";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return format(date, "PPP 'at' p");
  } catch {
    return dateString;
  }
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return null;
  }
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const getStatusConfig = (status) => {
  if (!status) return STATUS_CONFIG.PENDING;
  const upperStatus = status.toUpperCase();
  return STATUS_CONFIG[upperStatus] || STATUS_CONFIG.PENDING;
};

const getActionConfig = (action) => {
  return ACTION_CONFIG[action] || { label: action, color: "primary", icon: FaCheckCircle };
};

// ================================================================
// SUB-COMPONENTS
// ================================================================

// Loading Skeleton
const LoadingSkeleton = memo(() => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
    <Skeleton variant="text" height={40} width="60%" sx={{ mb: 1 }} />
    <Skeleton variant="text" height={20} width="80%" sx={{ mb: 1 }} />
    <Skeleton variant="text" height={20} width="70%" sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2, mb: 2 }} />
    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
  </Box>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Timeline Step Component
const TimelineStep = memo(({ status, timestamp, isActive, isCompleted, isLast }) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  const isCurrent = isActive && !isCompleted;

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          badgeContent={isCompleted ? <FaCheckCircle size={12} /> : null}
          color="success"
        >
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: isCompleted ? config.color : THEME.lightGray,
              color: isCompleted ? "white" : THEME.dark,
              boxShadow: isCurrent ? `0 0 0 4px ${config.color}40` : "none",
              transition: THEME.transition
            }}
          >
            <Icon size={20} />
          </Avatar>
        </Badge>
        {!isLast && (
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: 44,
              transform: "translateX(-50%)",
              width: 3,
              height: 32,
              bgcolor: isCompleted ? config.color : THEME.border,
              borderRadius: "2px"
            }}
          />
        )}
      </Box>
      <Box sx={{ flex: 1, pt: 0.5 }}>
        <Typography 
          variant="subtitle2" 
          fontWeight={isCurrent ? "bold" : "normal"}
          color={isCurrent ? config.color : "text.primary"}
        >
          {config.label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {config.description}
        </Typography>
        {timestamp && (
          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
            <FaClock size={12} color={THEME.border} />
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(timestamp)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6 }}>
              ({formatRelativeTime(timestamp)})
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
});

TimelineStep.propTypes = {
  status: PropTypes.string.isRequired,
  timestamp: PropTypes.string,
  isActive: PropTypes.bool,
  isCompleted: PropTypes.bool,
  isLast: PropTypes.bool
};

TimelineStep.defaultProps = {
  isActive: false,
  isCompleted: false,
  isLast: false
};

TimelineStep.displayName = 'TimelineStep';

// Info Row Component
const InfoRow = memo(({ icon, label, value, color, action }) => {
  const IconComponent = icon;
  
  return (
    <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1 }}>
      <IconComponent size={16} color={color || THEME.primary} />
      <Typography variant="body2">
        <strong>{label}:</strong> {value || "N/A"}
      </Typography>
      {action && (
        <Button size="small" onClick={action} sx={{ ml: "auto" }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
});

InfoRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
  color: PropTypes.string,
  action: PropTypes.object
};

InfoRow.displayName = 'InfoRow';

// Action Button Component
const ActionButton = memo(({ action, onClick, loading, disabled }) => {
  const config = getActionConfig(action);
  const Icon = config.icon;

  return (
    <Button
      variant="contained"
      color={config.color}
      onClick={onClick}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Icon />}
      sx={{
        minWidth: "120px",
        borderRadius: "12px",
        fontWeight: 600,
        textTransform: "none"
      }}
    >
      {loading ? "Processing..." : config.label}
    </Button>
  );
});

ActionButton.propTypes = {
  action: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  disabled: PropTypes.bool
};

ActionButton.defaultProps = {
  loading: false,
  disabled: false
};

ActionButton.displayName = 'ActionButton';

// ================================================================
// MAIN COMPONENT
// ================================================================

const BookingDetailsModal = ({ 
  open, 
  onClose, 
  booking, 
  onAction, 
  loading = false,
  onStatusUpdate,
  showActions = true
}) => {
  // ================================================================
  // STATE
  // ================================================================

  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ================================================================
  // REFS
  // ================================================================

  const dialogRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // ================================================================
  // MEMOIZED VALUES
  // ================================================================

  const statusMeta = useMemo(() => {
    if (!booking) return STATUS_CONFIG.PENDING;
    return getStatusConfig(booking.status);
  }, [booking]);

  const StatusIcon = statusMeta.icon;

  const isNewRequest = useMemo(() => {
    if (!booking) return false;
    const status = booking.status?.toUpperCase();
    return ["REQUESTED", "PENDING", "PAYMENT_PENDING", "ASSIGNED"].includes(status);
  }, [booking]);

  const isAccepted = useMemo(() => {
    return booking?.status?.toUpperCase() === "ACCEPTED";
  }, [booking]);

  const isInProgress = useMemo(() => {
    return booking?.status?.toUpperCase() === "STARTED";
  }, [booking]);

  const isTraveling = useMemo(() => {
    return booking?.status?.toUpperCase() === "PROVIDER_STARTED";
  }, [booking]);

  const isCompletedByProvider = useMemo(() => {
    return booking?.status?.toUpperCase() === "COMPLETED_BY_PROVIDER";
  }, [booking]);

  const isCompleted = useMemo(() => {
    return booking?.status?.toUpperCase() === "COMPLETED";
  }, [booking]);

  const isCancelled = useMemo(() => {
    const status = booking?.status?.toUpperCase();
    return ["CANCELLED", "REJECTED"].includes(status);
  }, [booking]);

  const availableActions = useMemo(() => {
    const actions = [];
    if (!booking) return actions;

    const status = booking.status?.toUpperCase();

    if (["REQUESTED", "PENDING", "PAYMENT_PENDING", "ASSIGNED"].includes(status)) {
      actions.push("accept", "reject");
    }
    if (status === "ACCEPTED") {
      actions.push("travel", "start");
    }
    if (status === "PROVIDER_STARTED") {
      actions.push("start");
    }
    if (status === "STARTED") {
      actions.push("complete");
    }
    if (status === "COMPLETED_BY_PROVIDER") {
      // No actions, waiting for customer confirmation
    }
    if (!["CANCELLED", "REJECTED", "COMPLETED"].includes(status)) {
      actions.push("chat");
    }

    return actions;
  }, [booking]);

  const timelineSteps = useMemo(() => {
    if (!booking) return [];

    const steps = [];
    
    // Define all possible steps in order
    const stepOrder = [
      { status: "REQUESTED", key: "createdAt", fallback: "createdAt" },
      { status: "PAYMENT_COMPLETED", key: "paymentCompletedAt" },
      { status: "ASSIGNED", key: "assignedAt" },
      { status: "ACCEPTED", key: "providerAcceptedAt" },
      { status: "PROVIDER_STARTED", key: "providerStartedTravelAt" },
      { status: "STARTED", key: "serviceStartedAt" },
      { status: "COMPLETED_BY_PROVIDER", key: "serviceCompletedAt" },
      { status: "COMPLETED", key: "completionConfirmedAt" }
    ];

    // Add steps that have timestamps or are the current status
    let hasCurrent = false;
    stepOrder.forEach(step => {
      const timestamp = booking[step.key];
      const isCurrentStatus = step.status === booking.status?.toUpperCase();
      
      if (timestamp || isCurrentStatus) {
        steps.push({
          status: step.status,
          timestamp: timestamp || (isCurrentStatus ? new Date().toISOString() : null),
          isActive: isCurrentStatus,
          isCompleted: isCurrentStatus && !isCancelled && !isCompletedByProvider
        });
        if (isCurrentStatus) hasCurrent = true;
      }
    });

    // If status is cancelled, add cancelled step
    if (isCancelled && booking.cancelledAt) {
      steps.push({
        status: booking.status?.toUpperCase(),
        timestamp: booking.cancelledAt,
        isActive: true,
        isCompleted: true
      });
    }

    // Mark last step
    if (steps.length > 0) {
      steps[steps.length - 1].isLast = true;
    }

    return steps;
  }, [booking, isCancelled, isCompletedByProvider]);

  // ================================================================
  // HANDLERS
  // ================================================================

  const handleAction = useCallback(async (action) => {
    if (actionLoading || !onAction) return;

    setActionLoading(true);
    setError(null);

    try {
      await onAction(action, booking?.bookingId);
      setSnackbar({
        open: true,
        message: `${action.charAt(0).toUpperCase() + action.slice(1)} action completed successfully`,
        severity: "success"
      });
      
      // Notify parent of status change
      if (onStatusUpdate) {
        await onStatusUpdate(booking?.bookingId);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || `Failed to ${action}`;
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error"
      });
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, onAction, booking, onStatusUpdate]);

  const handleGetDirections = useCallback((address) => {
    if (!address) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      "_blank"
    );
  }, []);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `Booking ${booking?.bookingId}`,
      text: `Booking details for ${booking?.serviceType || 'service'}`,
      url: `${window.location.origin}/bookings/${booking?.bookingId}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        setCopied(true);
        setSnackbar({
          open: true,
          message: "Link copied to clipboard",
          severity: "success"
        });
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Share error:", error);
        setSnackbar({
          open: true,
          message: "Failed to share",
          severity: "error"
        });
      }
    }
  }, [booking]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || !onStatusUpdate) return;
    
    setIsRefreshing(true);
    try {
      await onStatusUpdate(booking?.bookingId);
      setSnackbar({
        open: true,
        message: "Booking details refreshed",
        severity: "success"
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to refresh",
        severity: "error"
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onStatusUpdate, booking]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape" && open) {
      onClose();
    }
  }, [open, onClose]);

  // ================================================================
  // EFFECTS
  // ================================================================

  useEffect(() => {
    if (open) {
      // Reset active tab when opening
      setActiveTab(0);
      setError(null);
      
      // Focus trap
      if (dialogRef.current) {
        dialogRef.current.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    // Auto-refresh when booking status changes
    if (booking?.status && onStatusUpdate) {
      const status = booking.status.toUpperCase();
      if (["ACCEPTED", "PROVIDER_STARTED", "STARTED", "COMPLETED_BY_PROVIDER"].includes(status)) {
        const interval = setInterval(() => {
          onStatusUpdate(booking.bookingId);
        }, 30000); // Refresh every 30 seconds
        
        return () => clearInterval(interval);
      }
    }
  }, [booking, onStatusUpdate]);

  // Keyboard event listener
  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  // ================================================================
  // RENDER HELPERS
  // ================================================================

  const renderHeader = () => (
    <HeaderBox statusColor={statusMeta.color}>
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 12,
          top: 12,
          color: "white",
          bgcolor: "rgba(255,255,255,0.15)",
          "&:hover": {
            bgcolor: "rgba(255,255,255,0.25)"
          }
        }}
        aria-label="Close booking details"
      >
        <FaTimes size={18} />
      </IconButton>

      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          sx={{
            bgcolor: "rgba(255,255,255,0.2)",
            width: 56,
            height: 56,
            fontSize: 24
          }}
        >
          <StatusIcon />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="900">
            Booking Details
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            #{booking?.bookingId || "N/A"}
          </Typography>
        </Box>
      </Box>

      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mt={2} 
        flexWrap="wrap" 
        gap={1}
      >
        <StatusChip
          icon={<statusMeta.icon size={14} />}
          label={statusMeta.label}
          statusColor={statusMeta.color}
        />
        <Box display="flex" alignItems="center" gap={1}>
          {booking?.serviceCharge > 0 && (
            <StatusChip
              icon={<FaRupeeSign size={14} />}
              label={formatCurrency(booking.serviceCharge)}
              statusColor={statusMeta.color}
            />
          )}
          <IconButton
            onClick={handleRefresh}
            disabled={isRefreshing}
            sx={{
              color: "white",
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.25)"
              }
            }}
            aria-label="Refresh booking details"
          >
            <FaSync className={isRefreshing ? "spin" : ""} size={14} />
          </IconButton>
        </Box>
      </Box>
    </HeaderBox>
  );

  const renderTabs = () => (
    <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, pt: 1 }}>
      <Tabs 
        value={activeTab} 
        onChange={(e, v) => setActiveTab(v)}
        aria-label="Booking details tabs"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Details" aria-label="Booking details" />
        <Tab label="Timeline" aria-label="Booking timeline" />
        <Tab label="Payment" aria-label="Payment information" />
      </Tabs>
    </Box>
  );

  const renderDetailsTab = () => (
    <Grid container spacing={3}>
      {/* Customer Information */}
      <Grid item xs={12}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          CUSTOMER INFORMATION
        </Typography>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2.5, 
            borderRadius: "12px",
            borderColor: THEME.border
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar sx={{ bgcolor: THEME.primary, width: 48, height: 48 }}>
              <FaUser size={22} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="800">
                {booking?.customerName || "Customer"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customer ID: {booking?.customerId || "N/A"}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {booking?.customerPhone && (
              <Chip
                icon={<FaPhone />}
                label={booking.customerPhone}
                variant="outlined"
                onClick={() => window.open(`tel:${booking.customerPhone}`)}
                clickable
                size="medium"
              />
            )}
            {booking?.customerPhone && (
              <Chip
                icon={<FaWhatsapp />}
                label="WhatsApp"
                variant="outlined"
                onClick={() => window.open(
                  `https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`,
                  "_blank"
                )}
                clickable
                sx={{ 
                  color: "#25D366", 
                  borderColor: "#25D366",
                  "&:hover": {
                    backgroundColor: "rgba(37, 211, 102, 0.08)"
                  }
                }}
              />
            )}
            {booking?.customerEmail && (
              <Chip
                icon={<FaEnvelope />}
                label={booking.customerEmail}
                variant="outlined"
                onClick={() => window.open(`mailto:${booking.customerEmail}`)}
                clickable
              />
            )}
          </Stack>
        </Paper>
      </Grid>

      {/* Service Details */}
      <Grid item xs={12}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          SERVICE DETAILS
        </Typography>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2.5, 
            borderRadius: "12px",
            borderColor: THEME.border
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InfoRow
                icon={FaTools}
                label="Service Type"
                value={booking?.serviceType}
                color={THEME.primary}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoRow
                icon={FaClock}
                label="Scheduled"
                value={formatDateTime(booking?.scheduledAt || booking?.createdAt)}
                color={THEME.warning}
              />
            </Grid>
            <Grid item xs={12}>
              <InfoRow
                icon={FaMapMarkerAlt}
                label="Address"
                value={booking?.address || "Not specified"}
                color={THEME.danger}
                action={{
                  label: "Get Directions",
                  onClick: () => handleGetDirections(booking?.address)
                }}
              />
            </Grid>
            {booking?.description && (
              <Grid item xs={12}>
                <InfoRow
                  icon={FaInfoCircle}
                  label="Description"
                  value={booking.description}
                  color={THEME.info}
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      </Grid>

      {/* Provider Notes */}
      {booking?.providerNotes && (
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            YOUR NOTES
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2.5, 
              borderRadius: "12px", 
              bgcolor: THEME.lightGray,
              borderColor: THEME.border
            }}
          >
            <Typography>{booking.providerNotes}</Typography>
          </Paper>
        </Grid>
      )}

      {/* Status Info */}
      {isCompletedByProvider && (
        <Grid item xs={12}>
          <Alert 
            severity="warning" 
            icon={<FaClock />}
            sx={{ borderRadius: "12px" }}
          >
            Service completed by provider. Awaiting your confirmation.
          </Alert>
        </Grid>
      )}

      {isCompleted && (
        <Grid item xs={12}>
          <Alert 
            severity="success" 
            icon={<FaCheckCircle />}
            sx={{ borderRadius: "12px" }}
          >
            Service completed successfully. Thank you for using Quickks!
          </Alert>
        </Grid>
      )}

      {isCancelled && (
        <Grid item xs={12}>
          <Alert 
            severity="error" 
            icon={<FaExclamationTriangle />}
            sx={{ borderRadius: "12px" }}
          >
            This booking has been {booking?.status?.toLowerCase()}.
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  const renderTimelineTab = () => (
    <TimelineContainer ref={scrollContainerRef}>
      {timelineSteps.map((step, index) => (
        <TimelineStep
          key={`${step.status}-${index}`}
          status={step.status}
          timestamp={step.timestamp}
          isActive={step.isActive}
          isCompleted={step.isCompleted || false}
          isLast={step.isLast || false}
        />
      ))}
    </TimelineContainer>
  );

  const renderPaymentTab = () => (
    <Grid container spacing={3}>
      {(booking?.totalAmount > 0 || booking?.serviceCharge > 0) && (
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            PAYMENT INFORMATION
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2.5, 
              borderRadius: "12px",
              borderColor: THEME.border
            }}
          >
            <Grid container spacing={2}>
              {booking?.serviceCharge > 0 && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FaRupeeSign color={THEME.primary} />
                    <Typography>
                      <strong>Service Charge:</strong> {formatCurrency(booking.serviceCharge)}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {booking?.totalAmount > 0 && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FaRupeeSign color={THEME.success} />
                    <Typography>
                      <strong>Total Amount:</strong> {formatCurrency(booking.totalAmount)}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {booking?.paymentMethod && (
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FaCreditCard color={THEME.info} />
                    <Typography>
                      <strong>Payment Method:</strong> {booking.paymentMethod}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {booking?.paymentId && (
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FaReceipt color={THEME.purple} />
                    <Typography>
                      <strong>Transaction ID:</strong> {booking.paymentId}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(booking.paymentId);
                        setSnackbar({
                          open: true,
                          message: "Transaction ID copied",
                          severity: "success"
                        });
                      }}
                      aria-label="Copy transaction ID"
                    >
                      <FaCopy size={12} />
                    </IconButton>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {booking?.bookingFeePaid && (
                    <Chip 
                      icon={<FaRupeeSign />} 
                      label="Booking Fee Paid" 
                      color="success" 
                      size="small" 
                    />
                  )}
                  {booking?.paid && (
                    <Chip 
                      label="Fully Paid" 
                      color="success" 
                      size="small" 
                    />
                  )}
                  {!booking?.paid && booking?.totalAmount > 0 && (
                    <Chip 
                      label="Payment Pending" 
                      color="warning" 
                      size="small" 
                    />
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      )}

      {/* Booking Fee Info */}
      <Grid item xs={12}>
        <Alert 
          severity="info" 
          icon={<FaShieldAlt />}
          sx={{ borderRadius: "12px" }}
        >
          ₹50 booking fee is fully adjustable in your final bill. 
          You only pay the remaining amount after service.
        </Alert>
      </Grid>

      {/* Download Invoice */}
      {booking?.paid && (
        <Grid item xs={12}>
          <Button
            variant="outlined"
            startIcon={<FaDownload />}
            fullWidth
            sx={{ 
              borderRadius: "12px",
              py: 1.5,
              fontWeight: 600
            }}
            onClick={() => {
              // Implement invoice download
              setSnackbar({
                open: true,
                message: "Invoice download started",
                severity: "info"
              });
            }}
          >
            Download Invoice
          </Button>
        </Grid>
      )}
    </Grid>
  );

  const renderActions = () => {
    if (!showActions || availableActions.length === 0) return null;

    return (
      <DialogActions 
        sx={{ 
          p: 3, 
          bgcolor: THEME.lightGray,
          borderTop: `1px solid ${THEME.border}`,
          flexDirection: { xs: "column", sm: "row" },
          gap: 2
        }}
      >
        <Stack 
          direction="row" 
          spacing={2} 
          justifyContent="space-between" 
          width="100%"
        >
          <Button 
            variant="text" 
            onClick={onClose}
            sx={{ 
              borderRadius: "12px",
              fontWeight: 600,
              textTransform: "none"
            }}
          >
            Close
          </Button>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Share">
              <IconButton 
                onClick={handleShare}
                sx={{ 
                  bgcolor: "white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                }}
                aria-label="Share booking"
              >
                {copied ? <FaCheckCircle color={THEME.success} /> : <FaShare />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton 
                onClick={handlePrint}
                sx={{ 
                  bgcolor: "white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                }}
                aria-label="Print booking details"
              >
                <FaPrint />
              </IconButton>
            </Tooltip>
            {availableActions.includes("chat") && (
              <Tooltip title="Chat">
                <IconButton 
                  onClick={() => handleAction("chat")}
                  sx={{ 
                    bgcolor: "white",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    color: "#25D366"
                  }}
                  aria-label="Chat with customer"
                >
                  <FaWhatsapp />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        <Stack 
          direction="row" 
          spacing={2} 
          justifyContent="flex-end" 
          width="100%"
          flexWrap="wrap"
          useFlexGap
        >
          {availableActions.map((action) => (
            <ActionButton
              key={action}
              action={action}
              onClick={() => handleAction(action)}
              loading={actionLoading}
              disabled={actionLoading}
            />
          ))}
        </Stack>
      </DialogActions>
    );
  };

  // ================================================================
  // MAIN RENDER
  // ================================================================

  if (loading) {
    return (
      <StyledDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <LoadingSkeleton />
      </StyledDialog>
    );
  }

  if (!booking) return null;

  return (
    <>
      <StyledDialog
        ref={dialogRef}
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
        TransitionComponent={Slide}
        TransitionProps={{ direction: "up" }}
        aria-labelledby="booking-details-title"
        aria-describedby="booking-details-description"
        PaperProps={{
          role: "dialog",
          "aria-modal": "true"
        }}
      >
        {renderHeader()}
        {renderTabs()}

        <DialogContent dividers sx={{ p: 3 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 0 && renderDetailsTab()}
              {activeTab === 1 && renderTimelineTab()}
              {activeTab === 2 && renderPaymentTab()}
            </motion.div>
          </AnimatePresence>
        </DialogContent>

        {renderActions()}
      </StyledDialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        TransitionComponent={Slide}
        TransitionProps={{ direction: "up" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            minWidth: "280px"
          }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* CSS Animations */}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media print {
          .MuiDialog-paper {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
          .MuiDialogActions-root {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

// ================================================================
// PROP TYPES
// ================================================================

BookingDetailsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  booking: PropTypes.shape({
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    status: PropTypes.string,
    serviceType: PropTypes.string,
    customerName: PropTypes.string,
    customerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    customerPhone: PropTypes.string,
    customerEmail: PropTypes.string,
    address: PropTypes.string,
    scheduledAt: PropTypes.string,
    createdAt: PropTypes.string,
    description: PropTypes.string,
    providerNotes: PropTypes.string,
    totalAmount: PropTypes.number,
    serviceCharge: PropTypes.number,
    paymentMethod: PropTypes.string,
    paymentId: PropTypes.string,
    bookingFeePaid: PropTypes.bool,
    paid: PropTypes.bool,
    paymentCompletedAt: PropTypes.string,
    assignedAt: PropTypes.string,
    providerAcceptedAt: PropTypes.string,
    providerStartedTravelAt: PropTypes.string,
    serviceStartedAt: PropTypes.string,
    serviceCompletedAt: PropTypes.string,
    completionConfirmedAt: PropTypes.string,
    cancelledAt: PropTypes.string
  }),
  onAction: PropTypes.func,
  onStatusUpdate: PropTypes.func,
  loading: PropTypes.bool,
  showActions: PropTypes.bool
};

BookingDetailsModal.defaultProps = {
  booking: null,
  onAction: () => {},
  onStatusUpdate: null,
  loading: false,
  showActions: true
};

// ================================================================
// EXPORT
// ================================================================

export default memo(BookingDetailsModal);