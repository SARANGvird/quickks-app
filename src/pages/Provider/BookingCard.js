// src/components/Booking/BookingCard.jsx
import React, { useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Paper,
  Button,
  Chip,
  Box,
  Typography,
  Stack,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  Rating,
  Skeleton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress
} from "@mui/material";
import {
  LocationOn,
  Person,
  CalendarToday,
  AccessTime,
  Phone,
  Email,
  Comment,
  ExpandMore,
  ExpandLess,
  Navigation,
  Info,
  Receipt,
  CheckCircle,
  Cancel,
  Visibility,
  Chat,
  Share,
  Print,
  Star,
  Warning
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { FaRupeeSign, FaClock, FaMapMarkerAlt, FaUser, FaPhone, FaEnvelope } from "react-icons/fa";
import StatusBadge from "./StatusBadge";
import ActionButtons from "./ActionButtons";
import api from "../../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const BOOKING_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  RESCHEDULED: "RESCHEDULED"
};

const STATUS_COLORS = {
  PENDING: "warning",
  CONFIRMED: "info",
  ACCEPTED: "success",
  REJECTED: "error",
  CANCELLED: "error",
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  RESCHEDULED: "secondary"
};

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================
const formatDateTime = (dateString) => {
  if (!dateString) return "Not scheduled";
  try {
    const date = new Date(dateString);
    return format(date, "MMM dd, yyyy 'at' h:mm a");
  } catch (error) {
    return dateString;
  }
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

const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// ==========================================================
// DETAILS SECTION COMPONENT
// ==========================================================
const DetailsSection = ({ booking, onViewTimeline }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
          sx={{ textTransform: "none" }}
        >
          {expanded ? "Show Less" : "View Details"}
        </Button>
        {onViewTimeline && (
          <Button
            size="small"
            onClick={onViewTimeline}
            startIcon={<Visibility />}
            sx={{ textTransform: "none" }}
          >
            Timeline
          </Button>
        )}
      </Stack>
      
      <Collapse in={expanded}>
        <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: "grey.50" }}>
          <Stack spacing={1.5}>
            {booking.bookingId && (
              <Box display="flex" alignItems="center" gap={1}>
                <Receipt fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Booking ID:</strong> {booking.bookingId}
                </Typography>
              </Box>
            )}
            
            {booking.createdAt && (
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Created:</strong> {formatDateTime(booking.createdAt)}
                </Typography>
              </Box>
            )}
            
            {booking.totalAmount > 0 && (
              <Box display="flex" alignItems="center" gap={1}>
                <FaRupeeSign size={14} color="#64748b" />
                <Typography variant="body2">
                  <strong>Amount:</strong> {formatCurrency(booking.totalAmount)}
                </Typography>
              </Box>
            )}
            
            {booking.paymentMethod && (
              <Box display="flex" alignItems="center" gap={1}>
                <Receipt fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Payment Method:</strong> {booking.paymentMethod}
                </Typography>
              </Box>
            )}
            
            {booking.notes && (
              <Box display="flex" alignItems="center" gap={1}>
                <Comment fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Notes:</strong> {booking.notes}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Collapse>
    </Box>
  );
};

// ==========================================================
// LOADING SKELETON
// ==========================================================
const BookingCardSkeleton = () => (
  <Paper sx={{ p: 3, borderRadius: 3 }}>
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="rounded" width={80} height={24} />
      </Stack>
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="70%" />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="text" width="50%" />
      </Stack>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Skeleton variant="rounded" width={80} height={36} />
        <Skeleton variant="rounded" width={80} height={36} />
        <Skeleton variant="rounded" width={80} height={36} />
      </Stack>
    </Stack>
  </Paper>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const BookingCard = ({ 
  booking, 
  loading = false, 
  onAccept, 
  onReject, 
  onView,
  onViewTimeline,
  onChat,
  onCancel,
  onComplete,
  onStart,
  onReschedule,
  showActions = true,
  variant = "default",
  className = ""
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [actionLoading, setActionLoading] = useState(false);

  // ==========================================================
  // MEMOIZED VALUES
  // ==========================================================
  const statusColor = STATUS_COLORS[booking?.status] || "default";
  const isPending = booking?.status === BOOKING_STATUS.PENDING;
  const isAccepted = booking?.status === BOOKING_STATUS.ACCEPTED;
  const isInProgress = booking?.status === BOOKING_STATUS.IN_PROGRESS;
  const isCompleted = booking?.status === BOOKING_STATUS.COMPLETED;
  const isRejected = booking?.status === BOOKING_STATUS.REJECTED;
  const isCancelled = booking?.status === BOOKING_STATUS.CANCELLED;

  const canAccept = isPending && onAccept;
  const canReject = isPending && onReject;
  const canStart = isAccepted && onStart;
  const canComplete = isInProgress && onComplete;
  const canCancel = (isPending || isAccepted) && onCancel;
  const canReschedule = (isPending || isAccepted) && onReschedule;

  // ==========================================================
  // HANDLERS
  // ==========================================================
  const handleAction = useCallback(async (action, handler) => {
    if (actionLoading) return;
    
    setPendingAction(action);
    setConfirmDialogOpen(true);
  }, [actionLoading]);

  const confirmAction = useCallback(async () => {
    setActionLoading(true);
    try {
      switch (pendingAction) {
        case 'accept':
          await onAccept?.(booking.bookingId);
          setSnackbar({ open: true, message: "Booking accepted successfully", severity: "success" });
          break;
        case 'reject':
          await onReject?.(booking.bookingId);
          setSnackbar({ open: true, message: "Booking rejected", severity: "info" });
          break;
        case 'cancel':
          await onCancel?.(booking.bookingId);
          setSnackbar({ open: true, message: "Booking cancelled", severity: "info" });
          break;
        case 'start':
          await onStart?.(booking.bookingId);
          setSnackbar({ open: true, message: "Service started", severity: "success" });
          break;
        case 'complete':
          await onComplete?.(booking.bookingId);
          setSnackbar({ open: true, message: "Service completed", severity: "success" });
          break;
        default:
          break;
      }
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || `Failed to ${pendingAction} booking`, 
        severity: "error" 
      });
    } finally {
      setActionLoading(false);
      setConfirmDialogOpen(false);
      setPendingAction(null);
    }
  }, [pendingAction, booking?.bookingId, onAccept, onReject, onCancel, onStart, onComplete]);

  // ==========================================================
  // LOADING STATE
  // ==========================================================
  if (loading) {
    return <BookingCardSkeleton />;
  }

  // ==========================================================
  // NO DATA STATE
  // ==========================================================
  if (!booking) {
    return (
      <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
        <Typography color="text.secondary">No booking data available</Typography>
      </Paper>
    );
  }

  // ==========================================================
  // CANCELLED/REJECTED STATE
  // ==========================================================
  if (isRejected || isCancelled) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#fff1f2", border: "1px solid #fecaca" }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold" color="error">
              Booking {isRejected ? "Rejected" : "Cancelled"}
            </Typography>
            <Chip
              label={isRejected ? "REJECTED" : "CANCELLED"}
              color="error"
              size="small"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {booking.cancellationReason || booking.rejectionReason || 
              (isRejected 
                ? "The provider is unavailable. Please try booking another professional."
                : "This booking has been cancelled.")}
          </Typography>
          {onView && (
            <Button variant="outlined" onClick={onView} size="small" sx={{ alignSelf: "flex-end" }}>
              View Details
            </Button>
          )}
        </Stack>
      </Paper>
    );
  }

  // ==========================================================
  // DEFAULT VARIANT
  // ==========================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Paper sx={{ 
        p: 3, 
        borderRadius: 3, 
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: 6
        },
        borderLeft: isAccepted ? `4px solid #10b981` : isPending ? `4px solid #f59e0b` : "none"
      }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {booking.serviceType || "Service Booking"}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              {booking.bookingId && (
                <Typography variant="caption" color="text.secondary">
                  ID: {booking.bookingId}
                </Typography>
              )}
              {booking.area && (
                <Chip
                  label={booking.area}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              )}
            </Stack>
          </Box>
          <Chip
            label={booking.status}
            color={statusColor}
            size="small"
            sx={{ fontWeight: 500 }}
          />
        </Stack>

        {/* Address */}
        {booking.address && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
            <LocationOn sx={{ fontSize: 18, color: "text.secondary", mt: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {booking.address}
            </Typography>
          </Box>
        )}

        {/* Schedule */}
        <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1}>
            <CalendarToday sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              {formatDateTime(booking.scheduledAt)}
            </Typography>
          </Box>
          {booking.duration && (
            <Box display="flex" alignItems="center" gap={1}>
              <AccessTime sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2">{booking.duration} mins</Typography>
            </Box>
          )}
        </Stack>

        {/* Customer Info */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50", borderRadius: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
              <Person />
            </Avatar>
            <Box flex={1}>
              <Typography variant="subtitle2" fontWeight="bold">
                {booking.customerName || "Customer"}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                {booking.customerPhone && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Phone sx={{ fontSize: 12, color: "text.secondary" }} />
                    <Typography variant="caption">{booking.customerPhone}</Typography>
                  </Box>
                )}
                {booking.customerEmail && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Email sx={{ fontSize: 12, color: "text.secondary" }} />
                    <Typography variant="caption">{booking.customerEmail}</Typography>
                  </Box>
                )}
              </Stack>
            </Box>
            {onChat && (
              <Tooltip title="Chat with customer">
                <IconButton size="small" onClick={onChat} color="primary">
                  <Chat fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Paper>

        {/* Description */}
        {booking.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {showFullDescription ? booking.description : truncateText(booking.description)}
            {booking.description.length > 100 && (
              <Button
                size="small"
                onClick={() => setShowFullDescription(!showFullDescription)}
                sx={{ ml: 1, textTransform: "none" }}
              >
                {showFullDescription ? "Show less" : "Read more"}
              </Button>
            )}
          </Typography>
        )}

        {/* Amount */}
        {booking.totalAmount > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "#ecfdf5", borderRadius: 2 }}>
            <Typography variant="body2" color="success.main" fontWeight="500">
              Amount: {formatCurrency(booking.totalAmount)}
            </Typography>
          </Box>
        )}

        {/* Details Section */}
        <DetailsSection booking={booking} onViewTimeline={onViewTimeline} />

        {/* Action Buttons */}
        {showActions && (
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
            {onView && (
              <Button
                variant="outlined"
                size="small"
                onClick={onView}
                startIcon={<Visibility />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                View Details
              </Button>
            )}
            
            {canAccept && (
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={() => handleAction('accept', onAccept)}
                disabled={actionLoading}
                startIcon={<CheckCircle />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Accept
              </Button>
            )}
            
            {canReject && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleAction('reject', onReject)}
                disabled={actionLoading}
                startIcon={<Cancel />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Reject
              </Button>
            )}
            
            {canStart && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => handleAction('start', onStart)}
                disabled={actionLoading}
                startIcon={<CheckCircle />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Start Service
              </Button>
            )}
            
            {canComplete && (
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={() => handleAction('complete', onComplete)}
                disabled={actionLoading}
                startIcon={<CheckCircle />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Complete
              </Button>
            )}
            
            {canCancel && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => handleAction('cancel', onCancel)}
                disabled={actionLoading}
                startIcon={<Cancel />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Cancel
              </Button>
            )}
            
            {canReschedule && (
              <Button
                variant="outlined"
                size="small"
                onClick={onReschedule}
                startIcon={<CalendarToday />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Reschedule
              </Button>
            )}
          </Stack>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to {pendingAction} this booking?
              {pendingAction === 'reject' && " This action cannot be undone."}
              {pendingAction === 'cancel' && " The customer will be notified."}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              variant="contained"
              color={pendingAction === 'reject' || pendingAction === 'cancel' ? "error" : "primary"}
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={24} /> : "Confirm"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </motion.div>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
BookingCard.propTypes = {
  booking: PropTypes.shape({
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    serviceType: PropTypes.string,
    status: PropTypes.string,
    address: PropTypes.string,
    scheduledAt: PropTypes.string,
    createdAt: PropTypes.string,
    customerName: PropTypes.string,
    customerPhone: PropTypes.string,
    customerEmail: PropTypes.string,
    providerName: PropTypes.string,
    totalAmount: PropTypes.number,
    duration: PropTypes.number,
    area: PropTypes.string,
    description: PropTypes.string,
    notes: PropTypes.string,
    paymentMethod: PropTypes.string,
    cancellationReason: PropTypes.string,
    rejectionReason: PropTypes.string
  }),
  loading: PropTypes.bool,
  onAccept: PropTypes.func,
  onReject: PropTypes.func,
  onView: PropTypes.func,
  onViewTimeline: PropTypes.func,
  onChat: PropTypes.func,
  onCancel: PropTypes.func,
  onComplete: PropTypes.func,
  onStart: PropTypes.func,
  onReschedule: PropTypes.func,
  showActions: PropTypes.bool,
  variant: PropTypes.oneOf(["default", "compact"]),
  className: PropTypes.string
};

BookingCard.defaultProps = {
  booking: null,
  loading: false,
  onAccept: null,
  onReject: null,
  onView: null,
  onViewTimeline: null,
  onChat: null,
  onCancel: null,
  onComplete: null,
  onStart: null,
  onReschedule: null,
  showActions: true,
  variant: "default",
  className: ""
};

export default React.memo(BookingCard);