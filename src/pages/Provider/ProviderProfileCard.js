// src/components/provider/ProviderProfileCard.jsx
import React, { useState, useMemo } from "react";
import {
  Paper,
  Box,
  Typography,
  Button,
  Chip,
  Avatar,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  Skeleton,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Stack,
  LinearProgress,
  Card,
  CardContent
} from "@mui/material";
import {
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Verified as VerifiedIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Share as ShareIcon,
  FileCopy as CopyIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

// ==========================================================
// CONSTANTS
// ==========================================================
const statusConfig = {
  APPROVED: { 
    label: "Approved", 
    color: "success", 
    icon: CheckCircleIcon,
    description: "Provider is verified and active"
  },
  PENDING: { 
    label: "Pending Verification", 
    color: "warning", 
    icon: TimeIcon,
    description: "Provider application is under review"
  },
  REJECTED: { 
    label: "Rejected", 
    color: "error", 
    icon: CancelIcon,
    description: "Provider application was rejected"
  },
  SUSPENDED: { 
    label: "Suspended", 
    color: "error", 
    icon: WarningIcon,
    description: "Provider account is temporarily suspended"
  },
  ACTIVE: { 
    label: "Active", 
    color: "success", 
    icon: CheckCircleIcon,
    description: "Provider is actively accepting bookings"
  },
  INACTIVE: { 
    label: "Inactive", 
    label: "Inactive", 
    color: "default", 
    icon: TimeIcon,
    description: "Provider account is inactive"
  }
};

const SERVICE_TYPES = {
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  CARPENTRY: "Carpentry",
  PAINTING: "Painting",
  CLEANING: "Cleaning",
  AC_REPAIR: "AC Repair",
  APPLIANCE_REPAIR: "Appliance Repair",
  PEST_CONTROL: "Pest Control",
  PACKERS_MOVERS: "Packers & Movers",
  HOME_RENOVATION: "Home Renovation"
};

// ==========================================================
// STATISTICS CARD COMPONENT
// ==========================================================
const StatCard = ({ title, value, icon: Icon, color = "primary", loading }) => (
  <Card sx={{ height: "100%" }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={80} height={40} />
          ) : (
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          )}
        </Box>
        <Box sx={{ color: `${color}.main` }}>
          <Icon sx={{ fontSize: 40, opacity: 0.7 }} />
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// ==========================================================
// VERIFICATION BADGE COMPONENT
// ==========================================================
const VerificationBadge = ({ verified, type, value }) => {
  if (!verified) return null;

  const badges = {
    email: { label: "Email Verified", icon: EmailIcon },
    phone: { label: "Phone Verified", icon: PhoneIcon },
    id: { label: "ID Verified", icon: VerifiedIcon },
    background: { label: "Background Checked", icon: VerifiedIcon },
    address: { label: "Address Verified", icon: LocationIcon }
  };

  const badge = badges[type] || badges.email;
  const Icon = badge.icon;

  return (
    <Tooltip title={badge.label}>
      <Chip
        icon={<Icon sx={{ fontSize: 14 }} />}
        label={value || badge.label}
        size="small"
        variant="outlined"
        color="success"
        sx={{ height: 24 }}
      />
    </Tooltip>
  );
};

// ==========================================================
// SERVICE CARD COMPONENT
// ==========================================================
const ServiceCard = ({ service, price, duration, isActive }) => (
  <Card variant="outlined" sx={{ p: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="body1" fontWeight="600">
          {service}
        </Typography>
        <Stack direction="row" spacing={2} mt={0.5}>
          {price && (
            <Typography variant="caption" color="primary.main" fontWeight="bold">
              ₹{price.toLocaleString()}
            </Typography>
          )}
          {duration && (
            <Typography variant="caption" color="text.secondary">
              ~{duration} mins
            </Typography>
          )}
        </Stack>
      </Box>
      <Chip
        label={isActive ? "Available" : "Unavailable"}
        size="small"
        color={isActive ? "success" : "default"}
      />
    </Stack>
  </Card>
);

// ==========================================================
// REVIEW CARD COMPONENT
// ==========================================================
const ReviewCard = ({ review }) => (
  <Card variant="outlined" sx={{ p: 2 }}>
    <Stack direction="row" spacing={2}>
      <Avatar sx={{ bgcolor: "primary.main" }}>
        {review.customerName?.charAt(0) || "C"}
      </Avatar>
      <Box flex={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight="600">
            {review.customerName}
          </Typography>
          <Rating value={review.rating} readOnly size="small" />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : "Recently"}
        </Typography>
        {review.comment && (
          <Typography variant="body2" color="text.secondary" mt={1}>
            {review.comment}
          </Typography>
        )}
      </Box>
    </Stack>
  </Card>
);

// ==========================================================
// MAIN PROVIDER PROFILE CARD COMPONENT
// ==========================================================
const ProviderProfileCard = ({ 
  profile, 
  loading = false, 
  onEdit, 
  onShare, 
  onRefresh,
  showStats = true,
  showServices = true,
  showReviews = true,
  compact = false 
}) => {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Memoized values
  const status = useMemo(() => {
    return statusConfig[profile?.status] || statusConfig.PENDING;
  }, [profile?.status]);

  const StatusIcon = status.icon;

  const stats = useMemo(() => [
    { title: "Total Bookings", value: profile?.stats?.totalBookings || 0, icon: WorkIcon, color: "primary" },
    { title: "Completed Jobs", value: profile?.stats?.completedJobs || 0, icon: CheckCircleIcon, color: "success" },
    { title: "Rating", value: profile?.rating?.toFixed(1) || "0.0", icon: StarIcon, color: "warning", suffix: "★" },
    { title: "Response Rate", value: `${profile?.stats?.responseRate || 98}%`, icon: TimeIcon, color: "info" }
  ], [profile]);

  // Handlers
  const handleEdit = () => {
    if (onEdit) {
      onEdit(profile);
    } else {
      navigate("/provider/profile/edit");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${profile?.name} - Service Provider`,
      text: `Check out ${profile?.name}'s profile on Quickks!`,
      url: window.location.href
    };

    if (navigator.share && !compact) {
      try {
        await navigator.share(shareData);
        setSnackbar({ open: true, message: "Profile shared successfully!", severity: "success" });
      } catch (error) {
        console.error("Share failed:", error);
      }
    } else {
      setShareDialogOpen(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSnackbar({ open: true, message: "Profile link copied to clipboard!", severity: "success" });
      setShareDialogOpen(false);
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to copy link", severity: "error" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
  };

  // Loading state
  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack spacing={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Skeleton width={200} height={40} />
            <Skeleton width={120} height={36} />
          </Box>
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rectangular" height={100} />
              </Grid>
            ))}
          </Grid>
          <Skeleton variant="rectangular" height={200} />
        </Stack>
      </Paper>
    );
  }

  if (!profile) {
    return (
      <Paper sx={{ p: 4, mb: 4, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Profile Data Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please complete your provider profile to start receiving bookings.
        </Typography>
        <Button
          variant="contained"
          onClick={handleEdit}
          sx={{ mt: 2 }}
        >
          Complete Profile
        </Button>
      </Paper>
    );
  }

  // Compact version for sidebars/list views
  if (compact) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={profile.avatar && !imageError ? profile.avatar : undefined}
            sx={{ width: 56, height: 56, bgcolor: "primary.main" }}
            onError={() => setImageError(true)}
          >
            {profile.name?.charAt(0) || "P"}
          </Avatar>
          <Box flex={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight="bold">
                {profile.name}
              </Typography>
              <Chip
                label={status.label}
                color={status.color}
                size="small"
                icon={<StatusIcon sx={{ fontSize: 14 }} />}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {profile.services?.[0] || profile.serviceType || "Service Provider"}
            </Typography>
            <Stack direction="row" spacing={1} mt={0.5}>
              <Rating value={profile.rating || 0} readOnly size="small" />
              <Typography variant="caption" color="text.secondary">
                ({profile.reviewCount || 0})
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    );
  }

  // Full version
  return (
    <>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box display="flex" gap={2} alignItems="center">
            <Avatar
              src={profile.avatar && !imageError ? profile.avatar : undefined}
              sx={{ width: 80, height: 80, bgcolor: "primary.main", fontSize: 32 }}
              onError={() => setImageError(true)}
            >
              {profile.name?.charAt(0) || "P"}
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h5" fontWeight="bold">
                  {profile.name}
                </Typography>
                {profile.verified && (
                  <Tooltip title="Verified Provider">
                    <VerifiedIcon color="primary" fontSize="small" />
                  </Tooltip>
                )}
                <Chip
                  label={status.label}
                  color={status.color}
                  size="small"
                  icon={<StatusIcon sx={{ fontSize: 14 }} />}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {profile.email} • {profile.phone}
              </Typography>
              {profile.address && (
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} mt={0.5}>
                  <LocationIcon fontSize="inherit" />
                  {profile.address}
                </Typography>
              )}
            </Box>
          </Box>

          <Box display="flex" gap={1}>
            <Tooltip title="Refresh Profile">
              <IconButton onClick={handleRefresh} size="small">
                <TimeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share Profile">
              <IconButton onClick={handleShare} size="small">
                <ShareIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print Profile">
              <IconButton onClick={handlePrint} size="small">
                <PrintIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit Profile
            </Button>
          </Box>
        </Box>

        {/* Description/Bio */}
        {profile.bio && (
          <Box mt={3}>
            <Typography variant="body2" color="text.secondary">
              {profile.bio}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Statistics Section */}
        {showStats && (
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              Performance Statistics
            </Typography>
            <Grid container spacing={2}>
              {stats.map((stat, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <StatCard {...stat} loading={loading} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Services Section */}
        {showServices && profile.services?.length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              Services Offered
            </Typography>
            <Grid container spacing={2}>
              {profile.services.map((service, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <ServiceCard
                    service={service.name || service}
                    price={service.price}
                    duration={service.duration}
                    isActive={service.isActive !== false}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Details Grid */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Service Type
            </Typography>
            <Typography variant="body2" fontWeight="500">
              {profile.serviceType || profile.services?.[0] || "Not specified"}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Experience
            </Typography>
            <Typography variant="body2" fontWeight="500">
              {profile.experienceYears || 0} years
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Member Since
            </Typography>
            <Typography variant="body2" fontWeight="500">
              {profile.createdAt ? format(new Date(profile.createdAt), "MMM dd, yyyy") : "N/A"}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary">
              Languages
            </Typography>
            <Typography variant="body2" fontWeight="500">
              {profile.languages?.join(", ") || "English"}
            </Typography>
          </Grid>
        </Grid>

        {/* Verification Badges */}
        {profile.verifications && Object.values(profile.verifications).some(v => v) && (
          <Box mb={3}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Verification Status
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {profile.verifications.email && <VerificationBadge verified type="email" />}
              {profile.verifications.phone && <VerificationBadge verified type="phone" />}
              {profile.verifications.id && <VerificationBadge verified type="id" />}
              {profile.verifications.background && <VerificationBadge verified type="background" />}
              {profile.verifications.address && <VerificationBadge verified type="address" />}
            </Stack>
          </Box>
        )}

        {/* Certifications */}
        {profile.certifications?.length > 0 && (
          <Box mb={3}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Certifications
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {profile.certifications.map((cert, index) => (
                <Chip
                  key={index}
                  label={cert}
                  size="small"
                  variant="outlined"
                  icon={<SchoolIcon />}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Reviews Section */}
        {showReviews && profile.reviews?.length > 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Customer Reviews
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({profile.reviewCount || profile.reviews.length} reviews)
              </Typography>
            </Typography>
            <Stack spacing={2}>
              {profile.reviews.slice(0, 3).map((review, index) => (
                <ReviewCard key={index} review={review} />
              ))}
              {profile.reviews.length > 3 && (
                <Button variant="text" onClick={() => navigate("/provider/reviews")}>
                  View All Reviews
                </Button>
              )}
            </Stack>
          </Box>
        )}

        {/* Status Description */}
        {status.description && (
          <Alert severity={status.color === "success" ? "success" : status.color === "warning" ? "warning" : "error"} sx={{ mt: 3 }}>
            <Typography variant="body2">{status.description}</Typography>
            {profile.status === "PENDING" && (
              <Typography variant="caption" display="block" mt={1}>
                Your application is being reviewed. This usually takes 2-3 business days.
              </Typography>
            )}
            {profile.status === "REJECTED" && profile.rejectionReason && (
              <Typography variant="caption" display="block" mt={1}>
                Reason: {profile.rejectionReason}
              </Typography>
            )}
          </Alert>
        )}
      </Paper>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Profile</DialogTitle>
        <DialogContent>
          <Stack spacing={3} alignItems="center" sx={{ py: 2 }}>
            <QRCodeSVG value={window.location.href} size={200} />
            <TextField
              fullWidth
              value={window.location.href}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton onClick={handleCopyLink}>
                    <CopyIcon />
                  </IconButton>
                )
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleCopyLink}>Copy Link</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// ==========================================================
// DEFAULT PROPS
// ==========================================================
ProviderProfileCard.defaultProps = {
  loading: false,
  showStats: true,
  showServices: true,
  showReviews: true,
  compact: false,
  onEdit: null,
  onShare: null,
  onRefresh: null
};

// ==========================================================
// EXPORTS
// ==========================================================
export default ProviderProfileCard;
export { statusConfig, SERVICE_TYPES };