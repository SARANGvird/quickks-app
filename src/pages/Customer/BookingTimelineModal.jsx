// src/components/Booking/BookingTimelineModal.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
  Tooltip,
  useMediaQuery,
  useTheme
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Info as InfoIcon,
  LocalShipping as OnTheWayIcon,
  Build as BuildIcon,
  Payment as PaymentIcon,
  Star as StarIcon
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";

// ==========================================================
// CONSTANTS
// ==========================================================
const STATUS_CONFIG = {
  PENDING: {
    label: "Booking Requested",
    icon: AccessTimeIcon,
    color: "#f59e0b",
    bgColor: "#fef3c7",
    description: "Your booking request has been submitted and is awaiting provider confirmation."
  },
  CONFIRMED: {
    label: "Booking Confirmed",
    icon: CheckCircleIcon,
    color: "#10b981",
    bgColor: "#d1fae5",
    description: "Your booking has been confirmed. Provider will arrive at the scheduled time."
  },
  ACCEPTED: {
    label: "Provider Accepted",
    icon: CheckCircleIcon,
    color: "#10b981",
    bgColor: "#d1fae5",
    description: "The provider has accepted your booking request."
  },
  ON_THE_WAY: {
    label: "Provider En Route",
    icon: OnTheWayIcon,
    color: "#3b82f6",
    bgColor: "#dbeafe",
    description: "The provider is on the way to your location."
  },
  IN_PROGRESS: {
    label: "Service In Progress",
    icon: BuildIcon,
    color: "#8b5cf6",
    bgColor: "#ede9fe",
    description: "The provider is currently working on your service request."
  },
  COMPLETED: {
    label: "Service Completed",
    icon: CheckCircleIcon,
    color: "#10b981",
    bgColor: "#d1fae5",
    description: "The service has been completed successfully."
  },
  CANCELLED: {
    label: "Booking Cancelled",
    icon: CancelIcon,
    color: "#ef4444",
    bgColor: "#fee2e2",
    description: "This booking has been cancelled."
  },
  REJECTED: {
    label: "Booking Rejected",
    icon: CancelIcon,
    color: "#ef4444",
    bgColor: "#fee2e2",
    description: "The provider could not accept this booking request."
  },
  COMPLETED_BY_PROVIDER: {
    label: "Awaiting Confirmation",
    icon: CheckCircleIcon,
    color: "#10b981",
    bgColor: "#d1fae5",
    description: "Provider has marked the service as complete. Please confirm."
  },
  PAYMENT_PENDING: {
    label: "Payment Required",
    icon: PaymentIcon,
    color: "#f59e0b",
    bgColor: "#fef3c7",
    description: "Complete payment to confirm your booking."
  },
  PAYMENT_COMPLETED: {
    label: "Payment Completed",
    icon: CheckCircleIcon,
    color: "#10b981",
    bgColor: "#d1fae5",
    description: "Payment has been processed successfully."
  }
};

const STATUS_ORDER = [
  "PENDING",
  "PAYMENT_PENDING",
  "PAYMENT_COMPLETED",
  "CONFIRMED",
  "ACCEPTED",
  "ON_THE_WAY",
  "IN_PROGRESS",
  "COMPLETED_BY_PROVIDER",
  "COMPLETED"
];

const CANCELLED_STATUSES = ["CANCELLED", "REJECTED"];

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================
const formatDateTime = (dateString) => {
  if (!dateString) return "Not available";
  try {
    return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
  } catch {
    return dateString;
  }
};

const getRelativeTime = (dateString) => {
  if (!dateString) return null;
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return null;
  }
};

// ==========================================================
// TIMELINE STEP COMPONENT
// ==========================================================
const TimelineStep = ({ status, isActive, isCompleted, isCancelled, timestamp, onClick }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config?.icon || AccessTimeIcon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <Box sx={{ display: "flex", gap: 2, position: "relative" }}>
        {/* Timeline Line */}
        {!isCancelled && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: isCompleted ? config?.color : "#e2e8f0",
                color: isCompleted ? "white" : "#94a3b8",
                transition: "all 0.3s ease",
                boxShadow: isActive ? `0 0 0 4px ${config?.color}40` : "none"
              }}
            >
              {isCompleted ? <CheckCircleIcon /> : <Icon />}
            </Avatar>
            {!isActive && (
              <Box
                sx={{
                  width: 2,
                  flex: 1,
                  bgcolor: isCompleted ? config?.color : "#e2e8f0",
                  my: 1
                }}
              />
            )}
          </Box>
        )}

        {/* Content */}
        <Box sx={{ flex: 1, pb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="subtitle1" fontWeight="bold">
              {config?.label || status}
            </Typography>
            {isActive && (
              <Chip
                label="Current"
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
            )}
            {isCancelled && (
              <Chip
                label="Cancelled"
                size="small"
                color="error"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {config?.description}
          </Typography>
          
          {timestamp && (
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <AccessTimeIcon sx={{ fontSize: 12, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {formatDateTime(timestamp)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({getRelativeTime(timestamp)})
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const BookingTimelineModal = ({ 
  booking, 
  open, 
  onClose, 
  onViewDetails,
  showActions = true,
  compact = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  
  if (!booking) return null;

  // Determine current status index and completed statuses
  const isCancelled = CANCELLED_STATUSES.includes(booking.status);
  const currentIndex = STATUS_ORDER.indexOf(booking.status);
  const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;

  // Get timeline events with timestamps
  const timelineEvents = useMemo(() => {
    const events = [];
    
    if (booking.createdAt) {
      events.push({ status: "PENDING", timestamp: booking.createdAt });
    }
    if (booking.paymentCompletedAt) {
      events.push({ status: "PAYMENT_COMPLETED", timestamp: booking.paymentCompletedAt });
    }
    if (booking.confirmedAt) {
      events.push({ status: "CONFIRMED", timestamp: booking.confirmedAt });
    }
    if (booking.acceptedAt) {
      events.push({ status: "ACCEPTED", timestamp: booking.acceptedAt });
    }
    if (booking.startedAt) {
      events.push({ status: "ON_THE_WAY", timestamp: booking.startedAt });
    }
    if (booking.inProgressAt) {
      events.push({ status: "IN_PROGRESS", timestamp: booking.inProgressAt });
    }
    if (booking.completedByProviderAt) {
      events.push({ status: "COMPLETED_BY_PROVIDER", timestamp: booking.completedByProviderAt });
    }
    if (booking.completedAt) {
      events.push({ status: "COMPLETED", timestamp: booking.completedAt });
    }
    if (booking.cancelledAt) {
      events.push({ status: "CANCELLED", timestamp: booking.cancelledAt });
    }
    
    return events;
  }, [booking]);

  // Handle status click to scroll to that step
  const handleStatusClick = (status) => {
    const element = document.getElementById(`timeline-step-${status}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Render compact version
  if (compact) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold">Booking Timeline</Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={currentIndex} orientation="vertical">
            {STATUS_ORDER.map((status, index) => {
              const isCompleted = index <= currentIndex;
              const stepConfig = STATUS_CONFIG[status];
              
              return (
                <Step key={status} completed={isCompleted && !isCancelled}>
                  <StepLabel
                    StepIconProps={{
                      icon: stepConfig?.icon && <stepConfig.icon />,
                      active: index === currentIndex,
                      completed: isCompleted && !isCancelled
                    }}
                  >
                    <Typography variant="body2" fontWeight={index === currentIndex ? "bold" : "normal"}>
                      {stepConfig?.label || status}
                    </Typography>
                    {timelineEvents.find(e => e.status === status)?.timestamp && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatDateTime(timelineEvents.find(e => e.status === status).timestamp)}
                      </Typography>
                    )}
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          {onViewDetails && (
            <Button onClick={onViewDetails} variant="contained">
              View Details
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  // Render full version
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 }, overflow: "hidden" } }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          bgcolor: config.bgColor,
          borderBottom: 1,
          borderColor: "divider"
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: config.color, width: 48, height: 48 }}>
              <StatusIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Booking Timeline
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Booking #{booking.bookingId?.slice(-8).toUpperCase()}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 0 }}>
        {isCancelled ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <CancelIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Booking Cancelled
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {booking.cancellationReason || "This booking has been cancelled."}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            {STATUS_ORDER.map((status, index) => {
              const isCompleted = index <= currentIndex;
              const isActive = index === currentIndex;
              const timestamp = timelineEvents.find(e => e.status === status)?.timestamp;
              
              // Skip cancelled statuses in normal flow
              if (CANCELLED_STATUSES.includes(status) && !isCancelled) return null;
              
              return (
                <TimelineStep
                  key={status}
                  status={status}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  isCancelled={isCancelled && status === "CANCELLED"}
                  timestamp={timestamp}
                  onClick={() => timestamp && handleStatusClick(status)}
                />
              );
            })}
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <Box sx={{ p: 3, bgcolor: "grey.50", borderTop: 1, borderColor: "divider" }}>
        <Stack spacing={2}>
          {/* Booking Info */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Booking ID
              </Typography>
              <Typography variant="body2" fontWeight="500">
                {booking.bookingId}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Service Type
              </Typography>
              <Typography variant="body2" fontWeight="500">
                {booking.serviceType || "Service Booking"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Scheduled Date
              </Typography>
              <Typography variant="body2" fontWeight="500">
                {formatDateTime(booking.scheduledAt)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Status
              </Typography>
              <Chip
                label={config.label}
                size="small"
                sx={{
                  bgcolor: config.bgColor,
                  color: config.color,
                  fontWeight: 600
                }}
              />
            </Box>
          </Stack>

          {/* Provider Info */}
          {booking.providerName && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Service Provider
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Typography variant="body2">{booking.providerName}</Typography>
                  </Box>
                  {booking.providerPhone && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <PhoneIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="body2">{booking.providerPhone}</Typography>
                    </Box>
                  )}
                  {booking.providerRating && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <StarIcon sx={{ fontSize: 16, color: "#fbbf24" }} />
                      <Typography variant="body2">{booking.providerRating} ★</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* Address */}
          {booking.address && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Service Address
                </Typography>
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <LocationIcon sx={{ fontSize: 16, color: "text.secondary", mt: 0.5 }} />
                  <Typography variant="body2">{booking.address}</Typography>
                </Box>
              </Box>
            </>
          )}

          {/* Action Buttons */}
          {showActions && (
            <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button onClick={onClose} variant="outlined">
                Close
              </Button>
              {onViewDetails && (
                <Button onClick={onViewDetails} variant="contained">
                  View Full Details
                </Button>
              )}
            </Box>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
BookingTimelineModal.propTypes = {
  booking: PropTypes.shape({
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    status: PropTypes.string,
    serviceType: PropTypes.string,
    scheduledAt: PropTypes.string,
    address: PropTypes.string,
    providerName: PropTypes.string,
    providerPhone: PropTypes.string,
    providerRating: PropTypes.number,
    cancellationReason: PropTypes.string,
    createdAt: PropTypes.string,
    paymentCompletedAt: PropTypes.string,
    confirmedAt: PropTypes.string,
    acceptedAt: PropTypes.string,
    startedAt: PropTypes.string,
    inProgressAt: PropTypes.string,
    completedByProviderAt: PropTypes.string,
    completedAt: PropTypes.string,
    cancelledAt: PropTypes.string
  }),
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func,
  showActions: PropTypes.bool,
  compact: PropTypes.bool
};

BookingTimelineModal.defaultProps = {
  booking: null,
  onViewDetails: null,
  showActions: true,
  compact: false
};

export default React.memo(BookingTimelineModal);