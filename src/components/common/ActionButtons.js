import React, { useMemo, useCallback, useState } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Stack,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Box,
  Chip,
  Menu,
  MenuItem,
  Divider
} from "@mui/material";
import {
  FaCheck,
  FaTimes,
  FaPlay,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaInfoCircle,
  FaBan,
  FaClock,
  FaSpinner,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaReceipt,
  FaComment,
  FaFlag,
  FaStar,
  FaShare,
  FaPrint,
  FaDownload,
  FaCopy,
  FaReply
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import api from "../../api/api";
import { toast } from "react-hot-toast";

// ==========================================================
// ✅ Action Configuration
// ==========================================================
const actionConfigs = {
  provider: {
    REQUESTED: [
      { 
        label: "Accept", 
        action: "accept", 
        color: "success", 
        icon: FaCheck,
        variant: "contained",
        tooltip: "Accept this booking and start the process",
        confirmRequired: false
      },
      { 
        label: "Reject", 
        action: "reject", 
        color: "error", 
        icon: FaTimes, 
        variant: "outlined",
        tooltip: "Reject this booking",
        confirmRequired: true,
        confirmMessage: "Are you sure you want to reject this booking?"
      },
    ],
    PENDING: [
      { 
        label: "Accept", 
        action: "accept", 
        color: "success", 
        icon: FaCheck,
        variant: "contained",
        tooltip: "Accept this booking",
        confirmRequired: false
      },
      { 
        label: "Reject", 
        action: "reject", 
        color: "error", 
        icon: FaTimes, 
        variant: "outlined",
        tooltip: "Reject this booking",
        confirmRequired: true,
        confirmMessage: "Are you sure you want to reject this booking?"
      },
    ],
    ASSIGNED: [
      { 
        label: "Accept", 
        action: "accept", 
        color: "success", 
        icon: FaCheck,
        variant: "contained",
        tooltip: "Accept this booking",
        confirmRequired: false
      },
      { 
        label: "Reject", 
        action: "reject", 
        color: "error", 
        icon: FaTimes, 
        variant: "outlined",
        tooltip: "Reject this booking",
        confirmRequired: true,
        confirmMessage: "Are you sure you want to reject this booking?"
      },
    ],
    ACCEPTED: [
      { 
        label: "Start Travel", 
        action: "travel", 
        color: "primary", 
        icon: FaMapMarkerAlt,
        variant: "contained",
        tooltip: "Mark that you have started traveling to the location",
        confirmRequired: true,
        confirmMessage: "Mark as started traveling? This will notify the customer."
      },
      { 
        label: "Start Job", 
        action: "start", 
        color: "success", 
        icon: FaPlay,
        variant: "contained",
        tooltip: "Start the service job",
        confirmRequired: true,
        confirmMessage: "Start the service now? The timer will begin."
      },
    ],
    PROVIDER_STARTED: [
      { 
        label: "Start Job", 
        action: "start", 
        color: "success", 
        icon: FaPlay,
        variant: "contained",
        tooltip: "Start the service job",
        confirmRequired: true,
        confirmMessage: "Start the service now? The timer will begin."
      },
    ],
    STARTED: [
      { 
        label: "Complete", 
        action: "complete", 
        color: "success", 
        icon: FaCheckCircle,
        variant: "contained",
        tooltip: "Mark this job as completed",
        confirmRequired: true,
        confirmMessage: "Confirm completion of this job? The customer will be notified."
      },
    ],
    COMPLETED_BY_PROVIDER: [
      { 
        label: "Request Payment", 
        action: "payment", 
        color: "info", 
        icon: FaMoneyBillWave,
        variant: "contained",
        tooltip: "Request payment from customer",
        confirmRequired: false
      },
    ],
  },
  customer: {
    REQUESTED: [
      { 
        label: "Cancel", 
        action: "cancel", 
        color: "error", 
        icon: FaTimes, 
        variant: "outlined",
        tooltip: "Cancel this booking",
        confirmRequired: true,
        confirmMessage: "Are you sure you want to cancel this booking? Cancellation fees may apply."
      },
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
    ],
    PENDING: [
      { 
        label: "Cancel", 
        action: "cancel", 
        color: "error", 
        icon: FaTimes, 
        variant: "outlined",
        tooltip: "Cancel this booking",
        confirmRequired: true,
        confirmMessage: "Are you sure you want to cancel this booking?"
      },
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
    ],
    ASSIGNED: [
      { 
        label: "Cancel", 
        action: "cancel", 
        color: "error", 
        icon: FaTimes, 
        variant: "outlined",
        tooltip: "Cancel this booking",
        confirmRequired: true,
        confirmMessage: "Are you sure you want to cancel this booking?"
      },
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
    ],
    ACCEPTED: [
      { 
        label: "Cancel", 
        action: "cancel", 
        color: "error", 
        icon: FaTimes, 
        variant: "outlined",
        tooltip: "Cancel this booking",
        confirmRequired: true,
        confirmMessage: "Are you sure you want to cancel this booking?"
      },
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
    ],
    PROVIDER_STARTED: [
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
    ],
    STARTED: [
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
    ],
    COMPLETED_BY_PROVIDER: [
      { 
        label: "Confirm & Pay", 
        action: "complete", 
        color: "success", 
        icon: FaCheckCircle,
        variant: "contained",
        tooltip: "Confirm completion and make payment",
        confirmRequired: true,
        confirmMessage: "Confirm that the service was completed satisfactorily and proceed to payment?"
      },
      { 
        label: "Report Issue", 
        action: "report", 
        color: "warning", 
        icon: FaFlag,
        variant: "outlined",
        tooltip: "Report an issue with this service"
      },
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
    ],
    COMPLETED: [
      { 
        label: "Write Review", 
        action: "review", 
        color: "warning", 
        icon: FaStar,
        variant: "contained",
        tooltip: "Rate and review your experience"
      },
      { 
        label: "View Receipt", 
        action: "receipt", 
        color: "info", 
        icon: FaReceipt,
        variant: "outlined",
        tooltip: "View payment receipt"
      },
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
    ],
    CANCELLED: [
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
      { 
        label: "Book Again", 
        action: "rebook", 
        color: "primary", 
        icon: FaPlay,
        variant: "contained",
        tooltip: "Book a similar service"
      },
    ],
  },
  admin: {
    REQUESTED: [
      { 
        label: "Assign Provider", 
        action: "assign", 
        color: "primary", 
        icon: FaUser,
        variant: "contained",
        tooltip: "Assign a provider to this booking"
      },
      { 
        label: "Cancel", 
        action: "cancel", 
        color: "error", 
        icon: FaTimes, 
        variant: "outlined",
        tooltip: "Cancel this booking",
        confirmRequired: true,
        confirmMessage: "Are you sure you want to cancel this booking?"
      },
    ],
    ALL: [
      { 
        label: "View Details", 
        action: "details", 
        color: "info", 
        icon: FaInfoCircle,
        variant: "outlined",
        tooltip: "View booking details"
      },
    ],
  },
};

// ==========================================================
// ✅ Confirmation Dialog
// ==========================================================
const ConfirmationDialog = ({ open, onClose, onConfirm, title, message, loading }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title || "Confirm Action"}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {message || "Are you sure you want to perform this action?"}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          variant="contained" 
          disabled={loading}
          autoFocus
        >
          {loading ? <CircularProgress size={20} /> : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// ✅ Reason Input Dialog
// ==========================================================
const ReasonDialog = ({ open, onClose, onConfirm, title, loading }) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title || "Provide Reason"}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Reason"
          type="text"
          fullWidth
          variant="outlined"
          multiline
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please provide a reason for this action..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          color="primary" 
          variant="contained" 
          disabled={loading || !reason.trim()}
        >
          {loading ? <CircularProgress size={20} /> : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// ✅ Main Component
// ==========================================================
const ActionButtons = ({
  role = "provider",
  status = "UNKNOWN",
  bookingId,
  bookingAmount,
  loading = false,
  onAccept,
  onReject,
  onCancel,
  onComplete,
  onStart,
  onTravel,
  onViewDetails,
  onPayment,
  onReview,
  onReceipt,
  onRebook,
  onAssign,
  onReport,
  onActionComplete,
  showDetails = true,
  showShare = false,
  showCopy = false,
  compact = false,
  disabled = false,
  customActions = [],
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [reasonDialog, setReasonDialog] = useState({ open: false, action: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [actionMenu, setActionMenu] = useState(null);

  // Get actions based on role and status
  const actions = useMemo(() => {
    const roleConfig = actionConfigs[role] || actionConfigs.admin;
    const statusConfig = roleConfig[status?.toUpperCase()] || roleConfig.ALL || [];
    return [...statusConfig, ...customActions];
  }, [role, status, customActions]);

  // Show notification
  const showNotification = useCallback((message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar(prev => ({ ...prev, open: false })), 4000);
  }, []);

  // Handle API action with reason
  const handleApiAction = useCallback(async (action, reason = "") => {
    if (!bookingId) return;

    setActionLoading(true);
    try {
      let response;
      const payload = { action, reason, bookingId };

      switch (action) {
        case "accept":
          response = await api.post(`/api/v1/bookings/${bookingId}/accept`, payload);
          onAccept?.(response.data);
          showNotification("Booking accepted successfully", "success");
          break;
        case "reject":
          response = await api.post(`/api/v1/bookings/${bookingId}/reject`, payload);
          onReject?.(response.data);
          showNotification("Booking rejected", "info");
          break;
        case "cancel":
          response = await api.post(`/api/v1/bookings/${bookingId}/cancel`, payload);
          onCancel?.(response.data);
          showNotification("Booking cancelled", "warning");
          break;
        case "complete":
          response = await api.post(`/api/v1/bookings/${bookingId}/complete`, payload);
          onComplete?.(response.data);
          showNotification("Booking completed successfully", "success");
          break;
        case "start":
          response = await api.post(`/api/v1/bookings/${bookingId}/start`, payload);
          onStart?.(response.data);
          showNotification("Service started", "info");
          break;
        case "travel":
          response = await api.post(`/api/v1/bookings/${bookingId}/travel-start`, payload);
          onTravel?.(response.data);
          showNotification("Travel started", "info");
          break;
        case "payment":
          response = await api.post(`/api/v1/bookings/${bookingId}/request-payment`, payload);
          onPayment?.(response.data);
          showNotification("Payment request sent", "success");
          break;
        default:
          if (onActionComplete) {
            await onActionComplete(action, payload);
          }
      }
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      const errorMsg = error.response?.data?.message || `Failed to ${action} booking`;
      showNotification(errorMsg, "error");
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, action: null });
      setReasonDialog({ open: false, action: null });
    }
  }, [bookingId, onAccept, onReject, onCancel, onComplete, onStart, onTravel, onPayment, onActionComplete, showNotification]);

  // Handle action
  const handleAction = useCallback(async (actionConfig) => {
    const { action, confirmRequired, confirmMessage, requireReason = false } = actionConfig;

    if (disabled || loading || actionLoading) return;

    // Handle special actions that don't need API calls
    if (action === "details") {
      onViewDetails?.();
      return;
    }

    if (action === "review") {
      onReview?.();
      return;
    }

    if (action === "receipt") {
      onReceipt?.();
      return;
    }

    if (action === "rebook") {
      onRebook?.();
      return;
    }

    if (action === "assign") {
      onAssign?.();
      return;
    }

    if (action === "report") {
      onReport?.();
      return;
    }

    if (action === "share") {
      handleShare();
      return;
    }

    if (action === "copy") {
      handleCopy();
      return;
    }

    // For API actions
    if (confirmRequired) {
      setConfirmDialog({
        open: true,
        action: action,
        title: confirmMessage?.title || `Confirm ${action}`,
        message: confirmMessage?.message || `Are you sure you want to ${action} this booking?`,
      });
    } else if (requireReason) {
      setReasonDialog({
        open: true,
        action: action,
        title: `Provide reason for ${action}`,
      });
    } else {
      await handleApiAction(action);
    }
  }, [disabled, loading, actionLoading, onViewDetails, onReview, onReceipt, onRebook, onAssign, onReport, handleApiAction]);

  // Handle confirm dialog
  const handleConfirm = useCallback(async () => {
    const { action } = confirmDialog;
    await handleApiAction(action);
  }, [confirmDialog, handleApiAction]);

  // Handle reason dialog
  const handleReasonConfirm = useCallback(async (reason) => {
    const { action } = reasonDialog;
    await handleApiAction(action, reason);
  }, [reasonDialog, handleApiAction]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Booking Details",
          text: `Booking #${bookingId}`,
          url: window.location.href,
        });
        showNotification("Shared successfully", "success");
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      handleCopy();
    }
  }, [bookingId, showNotification]);

  // Handle copy
  const handleCopy = useCallback(() => {
    const bookingUrl = `${window.location.origin}/bookings/${bookingId}`;
    navigator.clipboard.writeText(bookingUrl);
    showNotification("Link copied to clipboard", "success");
  }, [bookingId, showNotification]);

  // Handle menu open
  const handleMenuOpen = (event) => {
    setActionMenu(event.currentTarget);
  };

  const handleMenuClose = () => {
    setActionMenu(null);
  };

  // Get button size
  const buttonSize = compact ? "small" : "medium";

  // If no actions, return null
  if (actions.length === 0 && !showDetails) {
    return null;
  }

  return (
    <>
      <Stack 
        direction="row" 
        spacing={1} 
        flexWrap="wrap" 
        useFlexGap
        sx={{ gap: 1 }}
      >
        {actions.map((actionConfig) => {
          const { label, action, color, icon: Icon, variant, tooltip, disabled: actionDisabled = false } = actionConfig;
          const isDisabled = disabled || loading || actionLoading || actionDisabled;

          return (
            <Tooltip key={action} title={tooltip || label} arrow>
              <span>
                <Button
                  variant={variant || "contained"}
                  color={color}
                  size={buttonSize}
                  startIcon={<Icon size={compact ? 12 : 14} />}
                  onClick={() => handleAction(actionConfig)}
                  disabled={isDisabled}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    minWidth: compact ? "auto" : 80,
                    px: compact ? 1.5 : 2,
                    py: compact ? 0.5 : 1,
                  }}
                >
                  {compact ? null : label}
                  {compact && <Icon size={14} />}
                </Button>
              </span>
            </Tooltip>
          );
        })}
        
        {showDetails && (
          <Tooltip title="View booking details" arrow>
            <Button
              variant="outlined"
              size={buttonSize}
              startIcon={<FaInfoCircle size={compact ? 12 : 14} />}
              onClick={onViewDetails}
              disabled={disabled || loading}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {compact ? null : "Details"}
            </Button>
          </Tooltip>
        )}

        {showShare && (
          <Tooltip title="Share booking" arrow>
            <Button
              variant="outlined"
              size={buttonSize}
              startIcon={<FaShare size={compact ? 12 : 14} />}
              onClick={handleShare}
              disabled={disabled}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                minWidth: "auto",
              }}
            >
              {compact ? null : "Share"}
            </Button>
          </Tooltip>
        )}

        {showCopy && (
          <Tooltip title="Copy link" arrow>
            <Button
              variant="outlined"
              size={buttonSize}
              startIcon={<FaCopy size={compact ? 12 : 14} />}
              onClick={handleCopy}
              disabled={disabled}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                minWidth: "auto",
              }}
            >
              {compact ? null : "Copy"}
            </Button>
          </Tooltip>
        )}
      </Stack>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null })}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        loading={actionLoading}
      />

      {/* Reason Dialog */}
      <ReasonDialog
        open={reasonDialog.open}
        onClose={() => setReasonDialog({ open: false, action: null })}
        onConfirm={handleReasonConfirm}
        title={reasonDialog.title}
        loading={actionLoading}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Status Badge (optional) */}
      {status && (
        <Chip
          label={status.replace(/_/g, " ")}
          size="small"
          sx={{
            ml: 1,
            bgcolor: status === "COMPLETED" ? "#10b98120" : 
                     status === "CANCELLED" ? "#ef444420" :
                     status === "STARTED" ? "#3b82f620" :
                     status === "ACCEPTED" ? "#6366f120" : "#f59e0b20",
            color: status === "COMPLETED" ? "#10b981" : 
                   status === "CANCELLED" ? "#ef4444" :
                   status === "STARTED" ? "#3b82f6" :
                   status === "ACCEPTED" ? "#6366f1" : "#f59e0b",
            fontWeight: 600,
          }}
        />
      )}
    </>
  );
};

ActionButtons.propTypes = {
  role: PropTypes.oneOf(["provider", "customer", "admin"]),
  status: PropTypes.string,
  bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  bookingAmount: PropTypes.number,
  loading: PropTypes.bool,
  onAccept: PropTypes.func,
  onReject: PropTypes.func,
  onCancel: PropTypes.func,
  onComplete: PropTypes.func,
  onStart: PropTypes.func,
  onTravel: PropTypes.func,
  onViewDetails: PropTypes.func,
  onPayment: PropTypes.func,
  onReview: PropTypes.func,
  onReceipt: PropTypes.func,
  onRebook: PropTypes.func,
  onAssign: PropTypes.func,
  onReport: PropTypes.func,
  onActionComplete: PropTypes.func,
  showDetails: PropTypes.bool,
  showShare: PropTypes.bool,
  showCopy: PropTypes.bool,
  compact: PropTypes.bool,
  disabled: PropTypes.bool,
  customActions: PropTypes.array,
};

ActionButtons.defaultProps = {
  role: "provider",
  status: "UNKNOWN",
  loading: false,
  showDetails: true,
  showShare: false,
  showCopy: false,
  compact: false,
  disabled: false,
  customActions: [],
};

export default React.memo(ActionButtons);