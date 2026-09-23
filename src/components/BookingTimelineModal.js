// src/components/Booking/BookingTimelineModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  Paper,
  Avatar,
  Alert,
  CircularProgress,
  Tooltip,
  useMediaQuery,
  useTheme,
  Fade,
  Grow,
  Slide
} from "@mui/material";
import {
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Build as BuildIcon,
  Done as DoneIcon,
  Schedule as ScheduleIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
  LocationOn as LocationIcon,
  Receipt as ReceiptIcon,
  Star as StarIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";

// Status configuration
const STATUS_CONFIG = {
  REQUESTED: {
    label: "Requested",
    icon: ScheduleIcon,
    color: "#f59e0b",
    bgColor: "#fef3c7",
    description: "Your booking request has been submitted and is awaiting provider confirmation.",
    step: 0
  },
  ACCEPTED: {
    label: "Accepted",
    icon: CheckCircleIcon,
    color: "#10b981",
    bgColor: "#d1fae5",
    description: "Provider has accepted your booking and will arrive shortly.",
    step: 1
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: BuildIcon,
    color: "#3b82f6",
    bgColor: "#dbeafe",
    description: "Provider is working on your service request.",
    step: 2
  },
  COMPLETED: {
    label: "Completed",
    icon: DoneIcon,
    color: "#10b981",
    bgColor: "#d1fae5",
    description: "Service completed successfully!",
    step: 3
  },
  CANCELLED: {
    label: "Cancelled",
    icon: CancelIcon,
    color: "#ef4444",
    bgColor: "#fee2e2",
    description: "Booking has been cancelled.",
    step: -1
  },
  REJECTED: {
    label: "Rejected",
    icon: CancelIcon,
    color: "#ef4444",
    bgColor: "#fee2e2",
    description: "Provider could not accept this booking.",
    step: -1
  }
};

// Timeline event component
const TimelineEvent = ({ event, isLast }) => {
  const Icon = event.icon;
  
  return (
    <Box sx={{ position: "relative", mb: 3 }}>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Box sx={{ position: "relative" }}>
          <Avatar
            sx={{
              bgcolor: event.bgColor,
              color: event.color,
              width: 40,
              height: 40
            }}
          >
            <Icon />
          </Avatar>
          {!isLast && (
            <Box
              sx={{
                position: "absolute",
                top: 40,
                left: "50%",
                transform: "translateX(-50%)",
                width: 2,
                height: "calc(100% + 24px)",
                bgcolor: "#e2e8f0"
              }}
            />
          )}
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="600">
            {event.label}
          </Typography>
          {event.timestamp && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 12 }} />
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {event.description}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Booking details section
const BookingDetails = ({ booking }) => {
  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2, mb: 3 }}>
      <Typography variant="subtitle2" fontWeight="600" gutterBottom>
        Booking Details
      </Typography>
      
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Booking ID
          </Typography>
          <Typography variant="body2" fontWeight="500">
            {booking.bookingId || booking.id}
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Service Type
          </Typography>
          <Typography variant="body2" fontWeight="500">
            {booking.serviceType || "Electrical Service"}
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Scheduled Date & Time
          </Typography>
          <Typography variant="body2" fontWeight="500">
            {booking.scheduledAt ? format(new Date(booking.scheduledAt), "PPP 'at' p") : "To be confirmed"}
          </Typography>
        </Box>
        
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Amount
          </Typography>
          <Typography variant="body2" fontWeight="500">
            ₹{booking.amount || booking.serviceCharge || 0}
          </Typography>
        </Box>
        
        {booking.address && (
          <Box sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Address
            </Typography>
            <Typography variant="body2">
              {booking.address}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// Provider details section
const ProviderDetails = ({ provider }) => {
  if (!provider) return null;
  
  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: "#f9fafb", borderRadius: 2, mb: 3 }}>
      <Typography variant="subtitle2" fontWeight="600" gutterBottom>
        Service Provider
      </Typography>
      
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Avatar sx={{ bgcolor: "#4f46e5", width: 48, height: 48 }}>
          <PersonIcon />
        </Avatar>
        <Box>
          <Typography variant="body1" fontWeight="600">
            {provider.fullName || provider.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <StarIcon sx={{ fontSize: 14, color: "#fbbf24" }} />
            <Typography variant="caption">
              {provider.rating || "New"} ({provider.reviewCount || 0} reviews)
            </Typography>
            <Chip
              label={`${provider.experience || 5}+ years`}
              size="small"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PhoneIcon />}
          onClick={() => window.location.href = `tel:${provider.phone}`}
          sx={{ borderRadius: 2 }}
        >
          Call
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<MessageIcon />}
          onClick={() => window.open(`/chat?provider=${provider.id}`)}
          sx={{ borderRadius: 2 }}
        >
          Message
        </Button>
      </Box>
    </Paper>
  );
};

// Estimated arrival section
const EstimatedArrival = ({ status, estimatedArrival }) => {
  if (status !== "ACCEPTED" && status !== "IN_PROGRESS") return null;
  
  return (
    <Alert
      severity="info"
      icon={<AccessTimeIcon />}
      sx={{ mb: 3, borderRadius: 2 }}
    >
      <Typography variant="body2" fontWeight="500">
        Estimated Arrival: {estimatedArrival || "30-45 minutes"}
      </Typography>
      <Typography variant="caption">
        You can track your provider's location in real-time
      </Typography>
    </Alert>
  );
};

// Action buttons section
const ActionButtons = ({ booking, status, onClose, onContactSupport, onShare, onPrint }) => {
  const config = STATUS_CONFIG[status];
  
  return (
    <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 2 }}>
      {config?.actions?.includes("contact") && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<MessageIcon />}
          onClick={onContactSupport}
        >
          Contact Support
        </Button>
      )}
      
      {config?.actions?.includes("share") && (
        <Tooltip title="Share Timeline">
          <IconButton size="small" onClick={onShare}>
            <ShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      
      {config?.actions?.includes("print") && (
        <Tooltip title="Print Timeline">
          <IconButton size="small" onClick={onPrint}>
            <PrintIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

// Main Component
const BookingTimelineModal = ({
  open,
  onClose,
  booking,
  provider,
  timelineEvents = [],
  onContactSupport,
  onShare,
  onPrint,
  onRate,
  showDetails = true,
  showProvider = true,
  enableActions = true,
  autoRefresh = false,
  refreshInterval = 30000,
  theme = "light"
}) => {
  const themeMui = useTheme();
  const isMobile = useMediaQuery(themeMui.breakpoints.down("sm"));
  const [activeStep, setActiveStep] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  
  // Determine status and step
  const status = useMemo(() => {
    if (!booking?.status) return "REQUESTED";
    const upperStatus = booking.status.toUpperCase();
    return STATUS_CONFIG[upperStatus] ? upperStatus : "REQUESTED";
  }, [booking?.status]);
  
  const config = STATUS_CONFIG[status];
  const currentStep = config?.step || 0;
  
  // Generate timeline events from booking status
  const generateTimelineEvents = useCallback(() => {
    const events = [];
    
    // Request created event
    events.push({
      label: "Booking Requested",
      icon: ScheduleIcon,
      color: "#f59e0b",
      bgColor: "#fef3c7",
      timestamp: booking?.createdAt || booking?.requestedAt,
      description: `Booking request submitted on ${booking?.createdAt ? format(new Date(booking.createdAt), "PPP") : "your selected date"}`
    });
    
    // Accepted event
    if (status === "ACCEPTED" || status === "IN_PROGRESS" || status === "COMPLETED") {
      events.push({
        label: "Booking Accepted",
        icon: CheckCircleIcon,
        color: "#10b981",
        bgColor: "#d1fae5",
        timestamp: booking?.acceptedAt,
        description: `${provider?.fullName || "Provider"} has accepted your booking`
      });
    }
    
    // In Progress event
    if (status === "IN_PROGRESS" || status === "COMPLETED") {
      events.push({
        label: "Service Started",
        icon: BuildIcon,
        color: "#3b82f6",
        bgColor: "#dbeafe",
        timestamp: booking?.startedAt,
        description: "Provider has started working on your service request"
      });
    }
    
    // Completed event
    if (status === "COMPLETED") {
      events.push({
        label: "Service Completed",
        icon: DoneIcon,
        color: "#10b981",
        bgColor: "#d1fae5",
        timestamp: booking?.completedAt,
        description: "Service completed successfully! You can now rate your experience."
      });
    }
    
    // Add custom timeline events
    if (timelineEvents.length > 0) {
      events.push(...timelineEvents);
    }
    
    return events;
  }, [booking, status, provider, timelineEvents]);
  
  // Auto-refresh booking status
  useEffect(() => {
    if (!autoRefresh || !open) return;
    
    const interval = setInterval(() => {
      refreshBookingStatus();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, open, refreshInterval]);
  
  // Refresh booking status
  const refreshBookingStatus = useCallback(async () => {
    if (!booking?.id && !booking?.bookingId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/bookings/${booking.bookingId || booking.id}/status`);
      const data = await response.json();
      
      if (data.status && data.status !== status) {
        // Status changed, update parent
        onClose();
        window.location.reload(); // Or trigger parent refresh
      }
    } catch (err) {
      console.error("Failed to refresh status:", err);
    } finally {
      setLoading(false);
    }
  }, [booking, status, onClose]);
  
  // Share timeline
  const handleShare = useCallback(() => {
    const shareData = {
      title: `Booking Timeline - ${booking.bookingId}`,
      text: `Booking status: ${config.label}\nProvider: ${provider?.fullName}\nScheduled: ${booking.scheduledAt}`,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      onShare?.();
    }
  }, [booking, provider, config, onShare]);
  
  // Print timeline
  const handlePrint = useCallback(() => {
    const printContent = document.getElementById("timeline-print-content");
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
    
    onPrint?.();
  }, [onPrint]);
  
  // Format time remaining
  const formatTimeRemaining = useCallback((estimatedArrival) => {
    if (!estimatedArrival) return null;
    const [hours, minutes] = estimatedArrival.split(":");
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    const now = new Date();
    const arrival = new Date();
    arrival.setHours(parseInt(hours), parseInt(minutes));
    
    if (arrival < now) {
      return "Arriving soon";
    }
    
    const diff = Math.floor((arrival - now) / 60000);
    if (diff < 60) {
      return `${diff} minutes`;
    }
    return `${Math.floor(diff / 60)} hours ${diff % 60} minutes`;
  }, []);
  
  if (!booking) return null;
  
  const timelineEventsList = generateTimelineEvents();
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={Slide}
      TransitionProps={{ direction: "up" }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          bgcolor: theme === "dark" ? "#1f2937" : "background.paper",
          maxHeight: "90vh"
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {config.icon && <config.icon sx={{ color: config.color }} />}
            <Typography variant="h6" fontWeight="600">
              Booking Timeline
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
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Error Alert */}
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3, borderRadius: 2 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
            
            {/* Loading State */}
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            )}
            
            {/* Estimated Arrival */}
            <EstimatedArrival
              status={status}
              estimatedArrival={booking.estimatedArrival}
            />
            
            {/* Booking Details */}
            {showDetails && (
              <BookingDetails booking={booking} />
            )}
            
            {/* Provider Details */}
            {showProvider && provider && (
              <ProviderDetails provider={provider} />
            )}
            
            {/* Timeline Events */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: "#f9fafb",
                borderRadius: 2,
                mb: 2
              }}
            >
              <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                Timeline
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                {timelineEventsList.map((event, index) => (
                  <TimelineEvent
                    key={index}
                    event={event}
                    isLast={index === timelineEventsList.length - 1}
                  />
                ))}
              </Box>
            </Paper>
            
            {/* Additional Information */}
            {booking.notes && (
              <Alert
                severity="info"
                icon={<WarningIcon />}
                sx={{ mt: 2, borderRadius: 2 }}
              >
                <Typography variant="subtitle2">Notes:</Typography>
                <Typography variant="body2">{booking.notes}</Typography>
              </Alert>
            )}
            
            {/* Rating Section */}
            {status === "COMPLETED" && onRate && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: "#f9fafb",
                  borderRadius: 2,
                  textAlign: "center"
                }}
              >
                <Typography variant="body2" gutterBottom>
                  How was your experience?
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 1 }}>
                  <IconButton onClick={() => onRate(1)} color="error">
                    <ThumbDownIcon />
                  </IconButton>
                  <IconButton onClick={() => onRate(5)} color="success">
                    <ThumbUpIcon />
                  </IconButton>
                </Box>
              </Box>
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} variant="outlined" size="small">
          Close
        </Button>
        
        {enableActions && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <ActionButtons
              booking={booking}
              status={status}
              onClose={onClose}
              onContactSupport={onContactSupport}
              onShare={handleShare}
              onPrint={handlePrint}
            />
          </Box>
        )}
      </DialogActions>
      
      {/* Hidden print content */}
      <div id="timeline-print-content" style={{ display: "none" }}>
        <div style={{ padding: 20 }}>
          <h2>Booking Timeline - {booking.bookingId}</h2>
          <p>Status: {config.label}</p>
          <p>Provider: {provider?.fullName}</p>
          <p>Scheduled: {booking.scheduledAt}</p>
          <h3>Timeline Events:</h3>
          <ul>
            {timelineEventsList.map((event, index) => (
              <li key={index}>
                <strong>{event.label}</strong> - {event.description}
                {event.timestamp && ` (${new Date(event.timestamp).toLocaleString()})`}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Dialog>
  );
};

// PropTypes
BookingTimelineModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  booking: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bookingId: PropTypes.string,
    status: PropTypes.string,
    createdAt: PropTypes.string,
    acceptedAt: PropTypes.string,
    startedAt: PropTypes.string,
    completedAt: PropTypes.string,
    scheduledAt: PropTypes.string,
    serviceType: PropTypes.string,
    amount: PropTypes.number,
    serviceCharge: PropTypes.number,
    address: PropTypes.string,
    notes: PropTypes.string,
    estimatedArrival: PropTypes.string
  }).isRequired,
  provider: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fullName: PropTypes.string,
    name: PropTypes.string,
    phone: PropTypes.string,
    rating: PropTypes.number,
    reviewCount: PropTypes.number,
    experience: PropTypes.number
  }),
  timelineEvents: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      color: PropTypes.string,
      bgColor: PropTypes.string,
      timestamp: PropTypes.string,
      description: PropTypes.string
    })
  ),
  onContactSupport: PropTypes.func,
  onShare: PropTypes.func,
  onPrint: PropTypes.func,
  onRate: PropTypes.func,
  showDetails: PropTypes.bool,
  showProvider: PropTypes.bool,
  enableActions: PropTypes.bool,
  autoRefresh: PropTypes.bool,
  refreshInterval: PropTypes.number,
  theme: PropTypes.oneOf(["light", "dark"])
};

// Default Props
BookingTimelineModal.defaultProps = {
  provider: null,
  timelineEvents: [],
  onContactSupport: () => {},
  onShare: () => {},
  onPrint: () => {},
  onRate: null,
  showDetails: true,
  showProvider: true,
  enableActions: true,
  autoRefresh: false,
  refreshInterval: 30000,
  theme: "light"
};

export default React.memo(BookingTimelineModal);