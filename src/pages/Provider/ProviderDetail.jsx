// src/pages/admin/ProviderDetail.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Chip, 
  Divider, 
  Grid, 
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Avatar,
  Rating,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  LinearProgress,
  Badge
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Block as BlockIcon,
  Verified as VerifiedIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import api from "../../api/api";
import toast from "react-hot-toast";

// ==========================================================
// CONSTANTS
// ==========================================================
const STATUS_CONFIG = {
  APPROVED: { label: "Approved", color: "success", icon: CheckCircleIcon, action: "approve" },
  PENDING: { label: "Pending", color: "warning", icon: ScheduleIcon, action: "pending" },
  REJECTED: { label: "Rejected", color: "error", icon: CancelIcon, action: "reject" },
  SUSPENDED: { label: "Suspended", color: "error", icon: BlockIcon, action: "suspend" },
  BANNED: { label: "Banned", color: "error", icon: BlockIcon, action: "ban" },
  ACTIVE: { label: "Active", color: "success", icon: CheckCircleIcon, action: "activate" },
  INACTIVE: { label: "Inactive", color: "default", icon: ScheduleIcon, action: "deactivate" },
  ON_BREAK: { label: "On Break", color: "info", icon: ScheduleIcon, action: "break" }
};

const TAB_VALUES = {
  OVERVIEW: 0,
  BOOKINGS: 1,
  REVIEWS: 2,
  DOCUMENTS: 3,
  FINANCES: 4,
  ACTIVITY: 5
};

// ==========================================================
// STATS CARD COMPONENT
// ==========================================================
const StatsCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
  <Card sx={{ height: "100%", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" } }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block">
              {subtitle}
            </Typography>
          )}
          {trend !== undefined && (
            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
              <TrendingUpIcon sx={{ fontSize: 12, color: trend >= 0 ? "success.main" : "error.main" }} />
              <Typography variant="caption" color={trend >= 0 ? "success.main" : "error.main"}>
                {Math.abs(trend)}% from last month
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ bgcolor: `${color}.100`, p: 1, borderRadius: 2 }}>
          <Icon sx={{ color: `${color}.main` }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ==========================================================
// BOOKING CARD COMPONENT
// ==========================================================
const BookingCard = ({ booking, onView }) => {
  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  return (
    <Card variant="outlined" sx={{ mb: 2, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }} onClick={() => onView(booking)}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              #{booking.bookingId?.slice(-8).toUpperCase()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {booking.serviceType}
            </Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Chip
                icon={<StatusIcon sx={{ fontSize: 14 }} />}
                label={statusConfig.label}
                size="small"
                color={statusConfig.color}
              />
              <Chip
                label={`₹${(booking.totalAmount || booking.amount || 0).toLocaleString()}`}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary">
              {booking.scheduledAt ? format(new Date(booking.scheduledAt), "MMM dd, yyyy") : "Date TBD"}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {booking.scheduledAt ? format(new Date(booking.scheduledAt), "hh:mm a") : ""}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ==========================================================
// REVIEW CARD COMPONENT
// ==========================================================
const ReviewCard = ({ review }) => (
  <Card variant="outlined" sx={{ mb: 2 }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <Avatar sx={{ bgcolor: "primary.main" }}>
          {review.customerName?.charAt(0) || "C"}
        </Avatar>
        <Box flex={1}>
          <Typography variant="subtitle2" fontWeight="bold">
            {review.customerName || "Anonymous Customer"}
          </Typography>
          <Rating value={review.rating} readOnly size="small" />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : "Recently"}
        </Typography>
      </Box>
      {review.comment && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, pl: 7 }}>
          {review.comment}
        </Typography>
      )}
      {review.providerResponse && (
        <Box sx={{ mt: 2, pl: 7, bgcolor: "action.hover", p: 1.5, borderRadius: 1 }}>
          <Typography variant="caption" color="primary.main" fontWeight="bold">
            Provider Response:
          </Typography>
          <Typography variant="body2">{review.providerResponse}</Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

// ==========================================================
// DOCUMENT CARD COMPONENT
// ==========================================================
const DocumentCard = ({ document, onView, onDownload }) => (
  <Card variant="outlined">
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: "info.light" }}>
            <DescriptionIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {document.name || document.type}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Uploaded: {document.uploadedAt ? format(new Date(document.uploadedAt), "PPP") : "N/A"}
            </Typography>
            {document.verified && (
              <Chip label="Verified" size="small" color="success" sx={{ ml: 1, height: 20 }} />
            )}
          </Box>
        </Box>
        <Box>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => onView(document)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton size="small" onClick={() => onDownload(document)}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ==========================================================
// ACTIVITY ITEM COMPONENT
// ==========================================================
const ActivityItem = ({ activity }) => (
  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
    <Avatar sx={{ bgcolor: "primary.light", width: 32, height: 32 }}>
      <HistoryIcon sx={{ fontSize: 16 }} />
    </Avatar>
    <Box flex={1}>
      <Typography variant="body2">{activity.description}</Typography>
      <Typography variant="caption" color="text.secondary">
        {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : "Recently"}
      </Typography>
    </Box>
  </Box>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const ProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, title: "", message: "" });
  const [noteDialog, setNoteDialog] = useState({ open: false, note: "" });

  // Fetch provider data
  const fetchProvider = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/admin/providers/${id}`);
      const data = response.data?.data || response.data;
      setProvider(data);
    } catch (err) {
      console.error("Fetch error:", err);
      const errorMessage = err.response?.data?.message || "Failed to load provider details";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProvider();
    }
  }, [id, fetchProvider]);

  // Update provider status
  const updateStatus = useCallback(async (newStatus, reason = "") => {
    setUpdating(true);
    try {
      await api.patch(`/admin/providers/${id}/status`, { status: newStatus, reason });
      
      const statusConfig = STATUS_CONFIG[newStatus];
      toast.success(`Provider ${statusConfig?.label?.toLowerCase() || newStatus.toLowerCase()} successfully`);
      setSnackbar({
        open: true,
        message: `Provider ${statusConfig?.label?.toLowerCase() || newStatus.toLowerCase()} successfully`,
        severity: "success"
      });
      
      fetchProvider();
    } catch (err) {
      console.error("Update error:", err);
      const errorMessage = err.response?.data?.message || "Failed to update status";
      toast.error(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error"
      });
    } finally {
      setUpdating(false);
      setConfirmDialog({ open: false, action: null, title: "", message: "" });
    }
  }, [id, fetchProvider]);

  // Toggle suspension
  const toggleSuspension = useCallback(async (suspend) => {
    setUpdating(true);
    try {
      await api.patch(`/admin/providers/${id}/suspension`, { suspended: suspend });
      
      toast.success(suspend ? "Provider suspended" : "Provider activated");
      setSnackbar({
        open: true,
        message: suspend ? "Provider suspended successfully" : "Provider activated successfully",
        severity: "success"
      });
      
      fetchProvider();
    } catch (err) {
      console.error("Suspension error:", err);
      toast.error(err.response?.data?.message || "Failed to toggle suspension");
    } finally {
      setUpdating(false);
      setConfirmDialog({ open: false, action: null, title: "", message: "" });
    }
  }, [id, fetchProvider]);

  // Send notification
  const sendNotification = useCallback(async () => {
    if (!noteDialog.note.trim()) {
      toast.error("Please enter a message");
      return;
    }
    
    setUpdating(true);
    try {
      await api.post(`/admin/providers/${id}/notify`, { message: noteDialog.note });
      
      toast.success("Notification sent successfully");
      setSnackbar({
        open: true,
        message: "Notification sent to provider",
        severity: "success"
      });
      setNoteDialog({ open: false, note: "" });
    } catch (err) {
      console.error("Notification error:", err);
      toast.error(err.response?.data?.message || "Failed to send notification");
    } finally {
      setUpdating(false);
    }
  }, [id, noteDialog.note]);

  // Handle action click
  const handleAction = (action) => {
    const actionConfig = {
      approve: { title: "Approve Provider", message: "Are you sure you want to approve this provider? They will be able to accept bookings immediately.", action: () => updateStatus("APPROVED") },
      reject: { title: "Reject Provider", message: "Please provide a reason for rejection:", action: () => setConfirmDialog({ open: true, action: "reject", title: "Reject Provider", message: "Please provide a reason for rejection:" }) },
      suspend: { title: "Suspend Provider", message: "Are you sure you want to suspend this provider? They will not be able to accept new bookings.", action: () => toggleSuspension(true) },
      activate: { title: "Activate Provider", message: "Are you sure you want to activate this provider?", action: () => toggleSuspension(false) },
      ban: { title: "Ban Provider", message: "Are you sure you want to permanently ban this provider? This action cannot be undone.", action: () => updateStatus("BANNED") }
    };
    
    const config = actionConfig[action];
    if (config) {
      setConfirmDialog({ open: true, ...config });
    }
  };

  // Handle confirm action
  const handleConfirmAction = () => {
    if (confirmDialog.action === "reject") {
      setConfirmDialog({ ...confirmDialog, open: false });
      setNoteDialog({ open: true, note: "" });
    } else {
      confirmDialog.action();
    }
  };

  // Handle confirm reject
  const handleConfirmReject = () => {
    if (noteDialog.note.trim()) {
      updateStatus("REJECTED", noteDialog.note);
      setNoteDialog({ open: false, note: "" });
    } else {
      toast.error("Please provide a rejection reason");
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Memoized values
  const stats = useMemo(() => {
    if (!provider) return [];
    return [
      { title: "Total Bookings", value: provider.stats?.totalBookings || 0, icon: WorkIcon, color: "primary" },
      { title: "Completed Jobs", value: provider.stats?.completedJobs || 0, icon: CheckCircleIcon, color: "success" },
      { title: "Completion Rate", value: `${provider.stats?.completionRate || 0}%`, icon: TrendingUpIcon, color: "info" },
      { title: "Total Earnings", value: `₹${(provider.stats?.totalEarnings || 0).toLocaleString()}`, icon: MoneyIcon, color: "warning" },
      { title: "Active Jobs", value: provider.stats?.activeJobs || 0, icon: ScheduleIcon, color: "secondary" },
      { title: "Response Time", value: `${provider.stats?.avgResponseTime || 0} min`, icon: ScheduleIcon, color: "default" }
    ];
  }, [provider]);

  const statusConfig = useMemo(() => {
    return STATUS_CONFIG[provider?.status] || STATUS_CONFIG.PENDING;
  }, [provider?.status]);

  if (loading) {
    return (
      <AdminLayout>
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography sx={{ mt: 2 }}>Loading provider details...</Typography>
        </Box>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <Box p={4}>
          <Alert severity="error" sx={{ mb: 2 }} action={
            <Button color="inherit" size="small" onClick={fetchProvider}>Retry</Button>
          }>
            {error}
          </Alert>
        </Box>
      </AdminLayout>
    );
  }

  if (!provider) {
    return (
      <AdminLayout>
        <Box p={4}>
          <Alert severity="warning">Provider not found</Alert>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate("/admin/providers")}>
            Back to Providers
          </Button>
        </Box>
      </AdminLayout>
    );
  }

  const StatusIcon = statusConfig.icon;

  return (
    <AdminLayout>
      <Box p={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Typography variant="h4" fontWeight="bold">
            Provider Details
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchProvider} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Send Notification">
              <Button
                variant="outlined"
                startIcon={<SendIcon />}
                onClick={() => setNoteDialog({ open: true, note: "" })}
                disabled={updating}
              >
                Notify
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/admin/providers/${id}/edit`)}
            >
              Edit Provider
            </Button>
          </Box>
        </Box>

        {/* Provider Info Card */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" flexWrap="wrap" gap={3}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              badgeContent={
                provider.verified ? (
                  <VerifiedIcon sx={{ bgcolor: "white", borderRadius: "50%", color: "success.main" }} />
                ) : null
              }
            >
              <Avatar sx={{ width: 100, height: 100, bgcolor: "primary.main", fontSize: 40 }}>
                {provider.fullName?.charAt(0) || provider.name?.charAt(0) || "P"}
              </Avatar>
            </Badge>
            
            <Box flex={1}>
              <Typography variant="h5" fontWeight="bold">
                {provider.fullName || provider.name}
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mt={1} flexWrap="wrap">
                <Chip 
                  icon={<StatusIcon sx={{ fontSize: 16 }} />}
                  label={statusConfig.label} 
                  color={statusConfig.color}
                  size="small"
                />
                {provider.verified && (
                  <Chip 
                    icon={<VerifiedIcon />} 
                    label="Verified" 
                    color="success" 
                    size="small" 
                  />
                )}
                {provider.suspended && (
                  <Chip 
                    icon={<BlockIcon />} 
                    label="Suspended" 
                    color="error" 
                    size="small" 
                  />
                )}
                {provider.topRated && (
                  <Chip 
                    icon={<StarIcon />} 
                    label="Top Rated" 
                    color="warning" 
                    size="small" 
                  />
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={3} mt={2}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <StarIcon sx={{ color: "warning.main", fontSize: 20 }} />
                  <Typography variant="h6">{provider.rating?.toFixed(1) || "0.0"}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({provider.totalReviews || 0} reviews)
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <WorkIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  <Typography variant="body2">
                    {provider.serviceType || "Service Provider"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Contact & Business Info */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Contact Information
              </Typography>
              <Stack spacing={1.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  <EmailIcon color="action" fontSize="small" />
                  <Typography variant="body2">{provider.email || "N/A"}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <PhoneIcon color="action" fontSize="small" />
                  <Typography variant="body2">{provider.phone || provider.phoneNumber || "N/A"}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <LocationIcon color="action" fontSize="small" />
                  <Typography variant="body2">{provider.address || provider.area || "Not specified"}</Typography>
                </Box>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Business Information
              </Typography>
              <Stack spacing={1.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  <BusinessIcon color="action" fontSize="small" />
                  <Typography variant="body2">
                    <strong>Business Name:</strong> {provider.businessName || provider.name || "N/A"}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <GroupIcon color="action" fontSize="small" />
                  <Typography variant="body2">
                    <strong>Team Size:</strong> {provider.teamSize || "Individual"}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <AssessmentIcon color="action" fontSize="small" />
                  <Typography variant="body2">
                    <strong>GST Number:</strong> {provider.gstNumber || "Not provided"}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>

          {/* Bio */}
          {provider.bio && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                About Provider
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {provider.bio}
              </Typography>
            </>
          )}
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
              <StatsCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Action Buttons */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Management Actions
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            {provider.status !== "APPROVED" && provider.status !== "ACTIVE" && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleAction("approve")}
                disabled={updating}
              >
                Approve Provider
              </Button>
            )}
            {provider.status !== "REJECTED" && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => handleAction("reject")}
                disabled={updating}
              >
                Reject Provider
              </Button>
            )}
            {!provider.suspended ? (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<BlockIcon />}
                onClick={() => handleAction("suspend")}
                disabled={updating}
              >
                Suspend Provider
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleAction("activate")}
                disabled={updating}
              >
                Activate Provider
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              startIcon={<WarningIcon />}
              onClick={() => handleAction("ban")}
              disabled={updating}
            >
              Ban Provider
            </Button>
          </Box>
        </Paper>

        {/* Tabs Section */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tab label="Overview" />
            <Tab label="Bookings" />
            <Tab label="Reviews" />
            <Tab label="Documents" />
            <Tab label="Finances" />
            <Tab label="Activity Log" />
          </Tabs>

          <Box p={3}>
            {/* Overview Tab */}
            {activeTab === TAB_VALUES.OVERVIEW && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Languages Spoken
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {(provider.languages || ["English"]).map((lang, idx) => (
                      <Chip key={idx} label={lang} size="small" />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Certifications
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {provider.certifications?.length > 0 ? (
                      provider.certifications.map((cert, idx) => (
                        <Chip key={idx} label={cert} size="small" variant="outlined" />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">No certifications listed</Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Service Areas
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {provider.serviceAreas?.length > 0 ? (
                      provider.serviceAreas.map((area, idx) => (
                        <Chip key={idx} label={area} size="small" color="primary" variant="outlined" />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">No service areas specified</Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Account Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Joined</Typography>
                      <Typography variant="body2">
                        {provider.createdAt ? format(new Date(provider.createdAt), "PPP") : "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Last Active</Typography>
                      <Typography variant="body2">
                        {provider.lastLogin ? formatDistanceToNow(new Date(provider.lastLogin), { addSuffix: true }) : "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                      <Typography variant="body2">
                        {provider.updatedAt ? formatDistanceToNow(new Date(provider.updatedAt), { addSuffix: true }) : "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            )}

            {/* Bookings Tab */}
            {activeTab === TAB_VALUES.BOOKINGS && (
              <Box>
                {provider.recentBookings?.length > 0 ? (
                  provider.recentBookings.map((booking, idx) => (
                    <BookingCard key={idx} booking={booking} onView={(b) => navigate(`/admin/bookings/${b.bookingId}`)} />
                  ))
                ) : (
                  <Alert severity="info">No bookings found for this provider</Alert>
                )}
              </Box>
            )}

            {/* Reviews Tab */}
            {activeTab === TAB_VALUES.REVIEWS && (
              <Box>
                {provider.recentReviews?.length > 0 ? (
                  provider.recentReviews.map((review, idx) => (
                    <ReviewCard key={idx} review={review} />
                  ))
                ) : (
                  <Alert severity="info">No reviews yet for this provider</Alert>
                )}
              </Box>
            )}

            {/* Documents Tab */}
            {activeTab === TAB_VALUES.DOCUMENTS && (
              <Box>
                {provider.documents?.length > 0 ? (
                  <Grid container spacing={2}>
                    {provider.documents.map((doc, idx) => (
                      <Grid item xs={12} sm={6} key={idx}>
                        <DocumentCard
                          document={doc}
                          onView={(d) => window.open(d.url, "_blank")}
                          onDownload={(d) => {
                            const link = document.createElement("a");
                            link.href = d.url;
                            link.download = d.name || d.type;
                            link.click();
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Alert severity="info">No documents uploaded yet</Alert>
                )}
              </Box>
            )}

            {/* Finances Tab */}
            {activeTab === TAB_VALUES.FINANCES && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Earnings Summary
                      </Typography>
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Total Earnings</Typography>
                          <Typography variant="body2" fontWeight="bold">₹{(provider.stats?.totalEarnings || 0).toLocaleString()}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">This Month</Typography>
                          <Typography variant="body2">₹{(provider.stats?.monthlyEarnings || 0).toLocaleString()}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Last Month</Typography>
                          <Typography variant="body2">₹{(provider.stats?.lastMonthEarnings || 0).toLocaleString()}</Typography>
                        </Box>
                        <Divider />
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Pending Payout</Typography>
                          <Typography variant="body2" color="warning.main">₹{(provider.stats?.pendingPayout || 0).toLocaleString()}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Payment Information
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Bank Account</Typography>
                          <Typography variant="body2">{provider.bankAccount?.bankName || "Not set"}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Account: {provider.bankAccount?.accountNumber ? `****${provider.bankAccount.accountNumber.slice(-4)}` : "N/A"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">UPI ID</Typography>
                          <Typography variant="body2">{provider.upiId || "Not set"}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Activity Log Tab */}
            {activeTab === TAB_VALUES.ACTIVITY && (
              <Box>
                {provider.activityLog?.length > 0 ? (
                  provider.activityLog.map((activity, idx) => (
                    <ActivityItem key={idx} activity={activity} />
                  ))
                ) : (
                  <Alert severity="info">No activity recorded yet</Alert>
                )}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
          <DialogTitle>{confirmDialog.title}</DialogTitle>
          <DialogContent>
            <Typography>{confirmDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancel</Button>
            <Button onClick={handleConfirmAction} variant="contained" color="primary">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Note Dialog for Rejection */}
        <Dialog open={noteDialog.open} onClose={() => setNoteDialog({ open: false, note: "" })} maxWidth="sm" fullWidth>
          <DialogTitle>Rejection Reason</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Reason for rejection"
              fullWidth
              multiline
              rows={3}
              value={noteDialog.note}
              onChange={(e) => setNoteDialog({ ...noteDialog, note: e.target.value })}
              placeholder="Please provide a detailed reason for rejecting this provider..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNoteDialog({ open: false, note: "" })}>Cancel</Button>
            <Button onClick={handleConfirmReject} variant="contained" color="error">
              Reject Provider
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </AdminLayout>
  );
};

export default ProviderDetail;