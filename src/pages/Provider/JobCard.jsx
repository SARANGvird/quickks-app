// src/components/Provider/JobCard.jsx
import React, { useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Stack,
  Avatar,
  Button,
  Divider,
  Tooltip,
  IconButton,
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
  CircularProgress,
  LinearProgress,
  Paper
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
  CheckCircle,
  Cancel,
  Visibility,
  Chat,
  Share,
  Print,
  Star,
  Warning,
  AttachMoney,
  DirectionsCar,
  HomeWork,
  Schedule,
  ThumbUp,
  ThumbDown
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { FaRupeeSign, FaClock, FaMapMarkerAlt, FaUser, FaPhone, FaEnvelope, FaWhatsapp } from "react-icons/fa";
import StatusBadge from "./StatusBadge";
import api from "../../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const JOB_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
};

const STATUS_COLORS = {
  PENDING: "warning",
  ACCEPTED: "success",
  REJECTED: "error",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "error"
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

const getTimeRemaining = (scheduledAt) => {
  if (!scheduledAt) return null;
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  const diff = scheduled - now;
  
  if (diff < 0) return "Past due";
  if (diff < 3600000) return `${Math.round(diff / 60000)} minutes`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)} hours`;
  return `${Math.round(diff / 86400000)} days`;
};

// ==========================================================
// DETAILS SECTION
// ==========================================================
const DetailsSection = ({ job, onViewDetails }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mt: 2 }}>
      <Button
        size="small"
        onClick={() => setExpanded(!expanded)}
        endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
        sx={{ textTransform: "none" }}
      >
        {expanded ? "Show Less" : "View Details"}
      </Button>
      
      <Collapse in={expanded}>
        <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: "grey.50" }}>
          <Stack spacing={1.5}>
            {job.jobId && (
              <Box display="flex" alignItems="center" gap={1}>
                <Info fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Job ID:</strong> {job.jobId}
                </Typography>
              </Box>
            )}
            
            {job.createdAt && (
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Created:</strong> {formatDateTime(job.createdAt)}
                </Typography>
              </Box>
            )}
            
            {job.estimatedDuration && (
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTime fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Est. Duration:</strong> {job.estimatedDuration} mins
                </Typography>
              </Box>
            )}
            
            {job.notes && (
              <Box display="flex" alignItems="center" gap={1}>
                <Comment fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Notes:</strong> {job.notes}
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
const JobCardSkeleton = () => (
  <Card sx={{ p: 3, borderRadius: 3 }}>
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
      </Stack>
    </Stack>
  </Card>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const JobCard = ({
  job,
  isNew = false,
  loading = false,
  onAccept,
  onReject,
  onViewDetails,
  onChat,
  onNavigate,
  showActions = true,
  variant = "default",
  className = ""
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // Memoized values
  const statusColor = STATUS_COLORS[job?.status] || "default";
  const isPending = job?.status === JOB_STATUS.PENDING;
  const isAccepted = job?.status === JOB_STATUS.ACCEPTED;
  const isRejected = job?.status === JOB_STATUS.REJECTED;
  const isCancelled = job?.status === JOB_STATUS.CANCELLED;
  const timeRemaining = getTimeRemaining(job?.scheduledAt);
  const isUrgent = timeRemaining && timeRemaining.includes("minutes") && parseInt(timeRemaining) < 60;

  // Handle action
  const handleAction = useCallback((action, handler) => {
    if (actionLoading) return;
    
    setPendingAction(action);
    setConfirmDialogOpen(true);
  }, [actionLoading]);

  const confirmAction = useCallback(async () => {
    setActionLoading(true);
    try {
      switch (pendingAction) {
        case 'accept':
          await onAccept?.(job.jobId);
          setSnackbar({ open: true, message: "Job accepted successfully", severity: "success" });
          break;
        case 'reject':
          await onReject?.(job.jobId);
          setSnackbar({ open: true, message: "Job rejected", severity: "info" });
          break;
        default:
          break;
      }
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || `Failed to ${pendingAction} job`, 
        severity: "error" 
      });
    } finally {
      setActionLoading(false);
      setConfirmDialogOpen(false);
      setPendingAction(null);
    }
  }, [pendingAction, job?.jobId, onAccept, onReject]);

  // Get directions
  const handleGetDirections = useCallback(() => {
    if (!job?.address) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`, "_blank");
  }, [job?.address]);

  // Share job
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: `Job: ${job?.serviceName}`,
        text: `Job details for ${job?.serviceName}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setSnackbar({ open: true, message: "Link copied to clipboard", severity: "success" });
    }
  }, [job]);

  // Loading state
  if (loading) {
    return <JobCardSkeleton />;
  }

  // No job data
  if (!job) {
    return (
      <Card sx={{ p: 3, textAlign: "center", borderRadius: 3 }}>
        <Typography color="text.secondary">No job data available</Typography>
      </Card>
    );
  }

  // Rejected/Cancelled state
  if (isRejected || isCancelled) {
    return (
      <Card sx={{ p: 3, borderRadius: 3, bgcolor: "#fff1f2", border: "1px solid #fecaca" }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold" color="error">
              Job {isRejected ? "Rejected" : "Cancelled"}
            </Typography>
            <Chip label={isRejected ? "REJECTED" : "CANCELLED"} color="error" size="small" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {job.rejectionReason || job.cancellationReason || 
              (isRejected 
                ? "You have rejected this job request."
                : "This job has been cancelled.")}
          </Typography>
        </Stack>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card sx={{ 
        p: 3, 
        borderRadius: 3, 
        transition: "all 0.3s ease",
        "&:hover": { boxShadow: 6 },
        borderLeft: isNew ? `4px solid #f59e0b` : isUrgent ? `4px solid #ef4444` : "none",
        position: "relative",
        overflow: "visible"
      }}>
        {/* New Badge */}
        {isNew && (
          <Chip
            label="NEW"
            color="warning"
            size="small"
            sx={{ position: "absolute", top: -12, right: 16, fontWeight: "bold" }}
          />
        )}

        {/* Urgent Badge */}
        {isUrgent && !isNew && (
          <Chip
            label="URGENT"
            color="error"
            size="small"
            sx={{ position: "absolute", top: -12, right: 16, fontWeight: "bold" }}
          />
        )}

        <CardContent sx={{ p: 0 }}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {job.serviceName || "Service Job"}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                {job.jobId && (
                  <Typography variant="caption" color="text.secondary">
                    ID: {job.jobId}
                  </Typography>
                )}
                {job.area && (
                  <Chip
                    label={job.area}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.7rem" }}
                  />
                )}
              </Stack>
            </Box>
            <StatusBadge status={job.status} />
          </Stack>

          {/* Address */}
          {job.address && (
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
              <LocationOn sx={{ fontSize: 18, color: "text.secondary", mt: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                {job.address}
              </Typography>
            </Box>
          )}

          {/* Schedule Info */}
          <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarToday sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2">
                {formatDateTime(job.scheduledAt)}
              </Typography>
            </Box>
            {timeRemaining && isPending && (
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTime sx={{ fontSize: 16, color: isUrgent ? "error.main" : "text.secondary" }} />
                <Typography variant="body2" color={isUrgent ? "error.main" : "inherit"}>
                  {timeRemaining}
                </Typography>
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
                  {job.customerName || "Customer"}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  {job.customerPhone && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Phone sx={{ fontSize: 12, color: "text.secondary" }} />
                      <Typography variant="caption">{job.customerPhone}</Typography>
                    </Box>
                  )}
                  {job.customerEmail && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Email sx={{ fontSize: 12, color: "text.secondary" }} />
                      <Typography variant="caption">{job.customerEmail}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                {job.customerPhone && (
                  <Tooltip title="Call">
                    <IconButton size="small" onClick={() => window.open(`tel:${job.customerPhone}`)}>
                      <Phone fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {job.customerPhone && (
                  <Tooltip title="WhatsApp">
                    <IconButton size="small" onClick={() => window.open(`https://wa.me/${job.customerPhone.replace(/\D/g, '')}`, "_blank")}>
                      <FaWhatsapp size={14} />
                    </IconButton>
                  </Tooltip>
                )}
                {onChat && (
                  <Tooltip title="Chat">
                    <IconButton size="small" onClick={onChat}>
                      <Chat fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Stack>
          </Paper>

          {/* Price Info */}
          {job.price && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: "#ecfdf5", borderRadius: 2 }}>
              <Typography variant="body2" color="success.main" fontWeight="500">
                Price: {formatCurrency(job.price)}
              </Typography>
            </Box>
          )}

          {/* Description */}
          {job.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {showFullDescription ? job.description : `${job.description.substring(0, 100)}${job.description.length > 100 ? "..." : ""}`}
              {job.description.length > 100 && (
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

          {/* Details Section */}
          <DetailsSection job={job} onViewDetails={onViewDetails} />

          {/* Action Buttons */}
          {showActions && isPending && (
            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleAction('accept', onAccept)}
                disabled={actionLoading}
                startIcon={actionLoading && pendingAction === 'accept' ? <CircularProgress size={16} /> : <CheckCircle />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Accept Job
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleAction('reject', onReject)}
                disabled={actionLoading}
                startIcon={actionLoading && pendingAction === 'reject' ? <CircularProgress size={16} /> : <Cancel />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Reject
              </Button>
            </Stack>
          )}

          {isAccepted && (
            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={onNavigate}
                startIcon={<DirectionsCar />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Navigate
              </Button>
            </Stack>
          )}
        </CardContent>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to {pendingAction} this job?
              {pendingAction === 'reject' && " This action cannot be undone."}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              variant="contained"
              color={pendingAction === 'reject' ? "error" : "success"}
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
      </Card>
    </motion.div>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
JobCard.propTypes = {
  job: PropTypes.shape({
    jobId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    serviceName: PropTypes.string,
    status: PropTypes.string,
    address: PropTypes.string,
    scheduledAt: PropTypes.string,
    createdAt: PropTypes.string,
    customerName: PropTypes.string,
    customerPhone: PropTypes.string,
    customerEmail: PropTypes.string,
    price: PropTypes.number,
    area: PropTypes.string,
    description: PropTypes.string,
    notes: PropTypes.string,
    estimatedDuration: PropTypes.number,
    rejectionReason: PropTypes.string,
    cancellationReason: PropTypes.string
  }),
  isNew: PropTypes.bool,
  loading: PropTypes.bool,
  onAccept: PropTypes.func,
  onReject: PropTypes.func,
  onViewDetails: PropTypes.func,
  onChat: PropTypes.func,
  onNavigate: PropTypes.func,
  showActions: PropTypes.bool,
  variant: PropTypes.oneOf(["default", "compact"]),
  className: PropTypes.string
};

JobCard.defaultProps = {
  job: null,
  isNew: false,
  loading: false,
  onAccept: null,
  onReject: null,
  onViewDetails: null,
  onChat: null,
  onNavigate: null,
  showActions: true,
  variant: "default",
  className: ""
};

export default React.memo(JobCard);