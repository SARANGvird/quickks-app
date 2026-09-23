// src/components/Booking/ActionButtons.jsx
import React, { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Chip
} from "@mui/material";
import {
  FaSpinner,
  FaTimes,
  FaHourglassHalf,
  FaCheckCircle,
  FaPlay,
  FaStop,
  FaRedo,
  FaBan,
  FaTrash,
  FaEdit,
  FaPrint,
  FaShare,
  FaClock,
  FaCalendarCheck,
  FaUserCheck,
  FaMoneyBillWave
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";

// ==========================================================
// CONSTANTS
// ==========================================================
const BOOKING_STATUS = {
  PENDING: { label: "Pending", color: "warning", icon: FaClock },
  CONFIRMED: { label: "Confirmed", color: "info", icon: FaCalendarCheck },
  IN_PROGRESS: { label: "In Progress", color: "primary", icon: FaHourglassHalf },
  COMPLETED: { label: "Completed", color: "success", icon: FaCheckCircle },
  CANCELLED: { label: "Cancelled", color: "error", icon: FaTimes },
  REJECTED: { label: "Rejected", color: "error", icon: FaBan }
};

const ACTION_TYPES = {
  CANCEL: "cancel",
  IN_PROGRESS: "in_progress",
  COMPLETE: "complete",
  REJECT: "reject",
  CONFIRM: "confirm",
  RESCHEDULE: "reschedule"
};

const ACTION_CONFIG = {
  [ACTION_TYPES.CANCEL]: {
    label: "Cancel Booking",
    icon: FaTimes,
    color: "error",
    confirmMessage: "Are you sure you want to cancel this booking? This action may have consequences.",
    variant: "contained"
  },
  [ACTION_TYPES.IN_PROGRESS]: {
    label: "Start Service",
    icon: FaPlay,
    color: "primary",
    confirmMessage: "Confirm you have started the service?",
    variant: "contained"
  },
  [ACTION_TYPES.COMPLETE]: {
    label: "Complete Service",
    icon: FaCheckCircle,
    color: "success",
    confirmMessage: "Is the service completed successfully?",
    variant: "contained"
  },
  [ACTION_TYPES.REJECT]: {
    label: "Reject Booking",
    icon: FaBan,
    color: "error",
    confirmMessage: "Are you sure you want to reject this booking?",
    variant: "outlined"
  },
  [ACTION_TYPES.CONFIRM]: {
    label: "Confirm Booking",
    icon: FaUserCheck,
    color: "success",
    confirmMessage: "Confirm this booking?",
    variant: "contained"
  }
};

// ==========================================================
// CONFIRMATION DIALOG COMPONENT
// ==========================================================
const ConfirmationDialog = ({ open, action, onConfirm, onCancel, loading }) => {
  const config = ACTION_CONFIG[action];
  if (!config) return null;
  
  const Icon = config.icon;
  
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Icon size={24} color={config.color === "error" ? "#ef4444" : "#fbbf24"} />
        <Typography variant="h6" fontWeight="bold">
          {config.label}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {config.confirmMessage}
        </DialogContentText>
        <Alert severity="warning" sx={{ mt: 2 }}>
          This action may affect the booking status and cannot be easily undone.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onCancel} disabled={loading} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={config.color}
          startIcon={loading ? <CircularProgress size={16} /> : <Icon />}
        >
          {loading ? "Processing..." : config.label}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// ACTION BUTTON COMPONENT
// ==========================================================
const ActionButton = ({ action, onClick, loading, disabled, size = "medium", variant }) => {
  const config = ACTION_CONFIG[action];
  if (!config) return null;
  
  const Icon = config.icon;
  const buttonVariant = variant || config.variant;
  
  return (
    <Tooltip title={config.label} arrow>
      <span>
        <Button
          onClick={onClick}
          disabled={disabled || loading}
          variant={buttonVariant}
          color={config.color}
          size={size}
          startIcon={loading ? <CircularProgress size={16} /> : <Icon />}
          sx={{
            minWidth: "100px",
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 2,
            '&:hover': {
              transform: 'translateY(-1px)',
              transition: 'transform 0.2s'
            }
          }}
        >
          {config.label}
        </Button>
      </span>
    </Tooltip>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const ActionButtons = ({
  booking,
  loading = false,
  onCancel,
  onMarkInProgress,
  onComplete,
  onReject,
  onConfirm,
  onReschedule,
  onDelete,
  onEdit,
  onPrint,
  onShare,
  showIcons = true,
  size = "medium",
  variant = "default",
  requireConfirmation = true,
  disabled = false,
  customActions = []
}) => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotifications();
  
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // ==========================================================
  // CHECK PERMISSIONS
  // ==========================================================
  const canCancel = useMemo(() => {
    if (!booking) return false;
    const notCompleted = booking.status !== "COMPLETED";
    const notCancelled = booking.status !== "CANCELLED";
    const isOwner = user?.id === booking.customerId || user?.id === booking.providerId;
    const isAdmin = user?.role === "ADMIN";
    return (isOwner || isAdmin) && notCompleted && notCancelled;
  }, [booking, user]);

  const canMarkInProgress = useMemo(() => {
    if (!booking) return false;
    const isProvider = user?.role === "PROVIDER" && user?.id === booking.providerId;
    const isAdmin = user?.role === "ADMIN";
    const isPendingOrConfirmed = booking.status === "PENDING" || booking.status === "CONFIRMED";
    return (isProvider || isAdmin) && isPendingOrConfirmed;
  }, [booking, user]);

  const canComplete = useMemo(() => {
    if (!booking) return false;
    const isProvider = user?.role === "PROVIDER" && user?.id === booking.providerId;
    const isAdmin = user?.role === "ADMIN";
    const isInProgress = booking.status === "IN_PROGRESS";
    return (isProvider || isAdmin) && isInProgress;
  }, [booking, user]);

  const canReject = useMemo(() => {
    if (!booking) return false;
    const isProvider = user?.role === "PROVIDER" && user?.id === booking.providerId;
    const isAdmin = user?.role === "ADMIN";
    const isPending = booking.status === "PENDING";
    return (isProvider || isAdmin) && isPending;
  }, [booking, user]);

  const canConfirm = useMemo(() => {
    if (!booking) return false;
    const isProvider = user?.role === "PROVIDER" && user?.id === booking.providerId;
    const isAdmin = user?.role === "ADMIN";
    const isPending = booking.status === "PENDING";
    return (isProvider || isAdmin) && isPending;
  }, [booking, user]);

  // ==========================================================
  // HANDLE ACTION
  // ==========================================================
  const handleAction = useCallback(async (action, handler) => {
    if (requireConfirmation) {
      setPendingAction(action);
      setConfirmDialogOpen(true);
      return;
    }
    
    await executeAction(action, handler);
  }, [requireConfirmation]);

  const executeAction = useCallback(async (action, handler) => {
    setActionLoading(action);
    try {
      await handler();
      addNotification({
        type: "success",
        title: "Action Completed",
        message: `Booking ${action} successfully`
      });
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      addNotification({
        type: "error",
        title: "Action Failed",
        message: error.message || `Failed to ${action} booking`
      });
      setSnackbar({
        open: true,
        message: error.message || `Failed to ${action} booking`,
        severity: "error"
      });
    } finally {
      setActionLoading(null);
    }
  }, [addNotification]);

  const handleConfirmAction = useCallback(async () => {
    setConfirmDialogOpen(false);
    
    switch (pendingAction) {
      case ACTION_TYPES.CANCEL:
        await executeAction(pendingAction, onCancel);
        break;
      case ACTION_TYPES.IN_PROGRESS:
        await executeAction(pendingAction, onMarkInProgress);
        break;
      case ACTION_TYPES.COMPLETE:
        await executeAction(pendingAction, onComplete);
        break;
      case ACTION_TYPES.REJECT:
        await executeAction(pendingAction, onReject);
        break;
      case ACTION_TYPES.CONFIRM:
        await executeAction(pendingAction, onConfirm);
        break;
      default:
        if (customActions.find(a => a.action === pendingAction)) {
          await executeAction(pendingAction, () => customActions.find(a => a.action === pendingAction)?.handler());
        }
    }
    
    setPendingAction(null);
  }, [pendingAction, executeAction, onCancel, onMarkInProgress, onComplete, onReject, onConfirm, customActions]);

  const handleCancelAction = useCallback(() => {
    setConfirmDialogOpen(false);
    setPendingAction(null);
  }, []);

  // ==========================================================
  // RENDER
  // ==========================================================
  if (!booking) return null;

  const StatusIcon = BOOKING_STATUS[booking.status]?.icon || FaClock;
  const isLoading = loading || actionLoading !== null;

  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
        {/* Status Indicator */}
        <Chip
          icon={<StatusIcon size={14} />}
          label={BOOKING_STATUS[booking.status]?.label || booking.status}
          color={BOOKING_STATUS[booking.status]?.color || "default"}
          size="small"
          sx={{ fontWeight: 600 }}
        />

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {/* Cancel Button */}
          {canCancel && onCancel && (
            <ActionButton
              action={ACTION_TYPES.CANCEL}
              onClick={() => handleAction(ACTION_TYPES.CANCEL, onCancel)}
              loading={actionLoading === ACTION_TYPES.CANCEL}
              disabled={isLoading || disabled}
              size={size}
              variant={variant === "default" ? "contained" : "outlined"}
            />
          )}

          {/* Confirm Button */}
          {canConfirm && onConfirm && (
            <ActionButton
              action={ACTION_TYPES.CONFIRM}
              onClick={() => handleAction(ACTION_TYPES.CONFIRM, onConfirm)}
              loading={actionLoading === ACTION_TYPES.CONFIRM}
              disabled={isLoading || disabled}
              size={size}
              variant={variant === "default" ? "contained" : "outlined"}
            />
          )}

          {/* Mark In Progress Button */}
          {canMarkInProgress && onMarkInProgress && (
            <ActionButton
              action={ACTION_TYPES.IN_PROGRESS}
              onClick={() => handleAction(ACTION_TYPES.IN_PROGRESS, onMarkInProgress)}
              loading={actionLoading === ACTION_TYPES.IN_PROGRESS}
              disabled={isLoading || disabled}
              size={size}
              variant={variant === "default" ? "contained" : "outlined"}
            />
          )}

          {/* Complete Button */}
          {canComplete && onComplete && (
            <ActionButton
              action={ACTION_TYPES.COMPLETE}
              onClick={() => handleAction(ACTION_TYPES.COMPLETE, onComplete)}
              loading={actionLoading === ACTION_TYPES.COMPLETE}
              disabled={isLoading || disabled}
              size={size}
              variant={variant === "default" ? "contained" : "outlined"}
            />
          )}

          {/* Reject Button */}
          {canReject && onReject && (
            <ActionButton
              action={ACTION_TYPES.REJECT}
              onClick={() => handleAction(ACTION_TYPES.REJECT, onReject)}
              loading={actionLoading === ACTION_TYPES.REJECT}
              disabled={isLoading || disabled}
              size={size}
              variant={variant === "default" ? "outlined" : "contained"}
            />
          )}

          {/* Edit Button */}
          {onEdit && hasPermission?.("edit_bookings") && (
            <Tooltip title="Edit Booking">
              <Button
                onClick={onEdit}
                disabled={isLoading || disabled}
                variant="outlined"
                size={size}
                startIcon={<FaEdit />}
                sx={{ minWidth: "auto", borderRadius: 2 }}
              >
                Edit
              </Button>
            </Tooltip>
          )}

          {/* Delete Button */}
          {onDelete && hasPermission?.("delete_bookings") && (
            <Tooltip title="Delete Booking">
              <Button
                onClick={onDelete}
                disabled={isLoading || disabled}
                variant="outlined"
                color="error"
                size={size}
                startIcon={<FaTrash />}
                sx={{ minWidth: "auto", borderRadius: 2 }}
              >
                Delete
              </Button>
            </Tooltip>
          )}

          {/* Reschedule Button */}
          {onReschedule && (canCancel || hasPermission?.("reschedule_bookings")) && (
            <Tooltip title="Reschedule Booking">
              <Button
                onClick={onReschedule}
                disabled={isLoading || disabled}
                variant="outlined"
                size={size}
                startIcon={<FaRedo />}
                sx={{ minWidth: "auto", borderRadius: 2 }}
              >
                Reschedule
              </Button>
            </Tooltip>
          )}

          {/* Print Button */}
          {onPrint && (
            <Tooltip title="Print Details">
              <Button
                onClick={onPrint}
                disabled={isLoading || disabled}
                variant="outlined"
                size={size}
                startIcon={<FaPrint />}
                sx={{ minWidth: "auto", borderRadius: 2 }}
              >
                Print
              </Button>
            </Tooltip>
          )}

          {/* Share Button */}
          {onShare && (
            <Tooltip title="Share Booking">
              <Button
                onClick={onShare}
                disabled={isLoading || disabled}
                variant="outlined"
                size={size}
                startIcon={<FaShare />}
                sx={{ minWidth: "auto", borderRadius: 2 }}
              >
                Share
              </Button>
            </Tooltip>
          )}

          {/* Custom Actions */}
          {customActions.map((customAction, index) => (
            <ActionButton
              key={index}
              action={customAction.action}
              onClick={() => handleAction(customAction.action, customAction.handler)}
              loading={actionLoading === customAction.action}
              disabled={isLoading || disabled}
              size={size}
              variant={customAction.variant || "outlined"}
            />
          ))}
        </Stack>
      </Box>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        action={pendingAction}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        loading={actionLoading === pendingAction}
      />

      {/* Snackbar for error messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ borderRadius: 2, width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
ActionButtons.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bookingId: PropTypes.string,
    status: PropTypes.string,
    customerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    providerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }),
  loading: PropTypes.bool,
  onCancel: PropTypes.func,
  onMarkInProgress: PropTypes.func,
  onComplete: PropTypes.func,
  onReject: PropTypes.func,
  onConfirm: PropTypes.func,
  onReschedule: PropTypes.func,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onPrint: PropTypes.func,
  onShare: PropTypes.func,
  showIcons: PropTypes.bool,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  variant: PropTypes.oneOf(["default", "compact"]),
  requireConfirmation: PropTypes.bool,
  disabled: PropTypes.bool,
  customActions: PropTypes.arrayOf(
    PropTypes.shape({
      action: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      color: PropTypes.string,
      handler: PropTypes.func.isRequired,
      variant: PropTypes.string
    })
  )
};

ActionButtons.defaultProps = {
  loading: false,
  showIcons: true,
  size: "medium",
  variant: "default",
  requireConfirmation: true,
  disabled: false,
  customActions: []
};

export default React.memo(ActionButtons);