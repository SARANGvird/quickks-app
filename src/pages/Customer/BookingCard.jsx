// src/components/Booking/BookingCard.jsx
import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Stack,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  Button,
  Skeleton,
  Paper,
  Rating
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
  Receipt
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { format } from "date-fns";
import StatusBadge from "./StatusBadge";
import ActionButtons from "./ActionButtons";
import LiveDirectionsMap from "../../components/maps/LiveDirectionsMap";

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

const formatAddress = (address) => {
  if (!address) return "Address not provided";
  if (typeof address === "string") return address;
  return `${address.line1 || ""} ${address.line2 || ""} ${address.city || ""} ${address.pincode || ""}`.trim();
};

const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// ==========================================================
// DETAILS SECTION COMPONENT
// ==========================================================
const DetailsSection = ({ booking }) => {
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
            
            {booking.amount > 0 && (
              <Box display="flex" alignItems="center" gap={1}>
                <Receipt fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Amount:</strong> ₹{booking.amount.toLocaleString()}
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
  <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
    <CardContent>
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
      </Stack>
    </CardContent>
  </Card>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const BookingCard = ({ 
  booking, 
  loading = false, 
  onCancel, 
  onUpdateStatus,
  onViewDetails,
  onChat,
  onTrack,
  showMap = false,
  variant = "default",
  className = ""
}) => {
  const [showMapView, setShowMapView] = useState(false);

  // Memoized values
  const hasProvider = useMemo(() => {
    return booking?.providerName && booking?.providerName !== "Pending";
  }, [booking?.providerName]);

  const isActive = useMemo(() => {
    const activeStatuses = ["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "STARTED"];
    return activeStatuses.includes(booking?.status?.toUpperCase());
  }, [booking?.status]);

  // Loading state
  if (loading) {
    return <BookingCardSkeleton />;
  }

  // No booking data
  if (!booking) {
    return (
      <Card sx={{ borderRadius: 3, p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">No booking data available</Typography>
      </Card>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <Card 
        className={className}
        sx={{ 
          borderRadius: 2, 
          overflow: "hidden",
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: 3
          }
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {booking.serviceType || "Service Booking"}
            </Typography>
            <StatusBadge status={booking.status} size="small" />
          </Stack>
          
          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {formatAddress(booking.address)}
          </Typography>
          
          <Typography variant="caption" color="text.secondary" display="block">
            {formatDateTime(booking.scheduledAt)}
          </Typography>
          
          <Divider sx={{ my: 1 }} />
          
          <ActionButtons
            booking={booking}
            loading={loading}
            onCancel={onCancel}
            onUpdateStatus={onUpdateStatus}
            size="small"
            variant="compact"
          />
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card sx={{ 
        borderRadius: 3, 
        overflow: "hidden",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: 6
        },
        borderLeft: isActive ? `4px solid #fbbf24` : "none"
      }}>
        <CardContent sx={{ p: 3 }}>
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
            <StatusBadge status={booking.status} />
          </Stack>

          {/* Address */}
          {booking.address && (
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 2 }}>
              <LocationOn sx={{ fontSize: 18, color: "text.secondary", mt: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                {formatAddress(booking.address)}
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

          {/* Provider Info */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "grey.50", borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
                <Person />
              </Avatar>
              <Box flex={1}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {hasProvider ? booking.providerName : "Provider Pending"}
                </Typography>
                {hasProvider && booking.providerRating && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Rating value={booking.providerRating} readOnly size="small" />
                    <Typography variant="caption" color="text.secondary">
                      ({booking.providerReviewCount || 0} reviews)
                    </Typography>
                  </Stack>
                )}
                {!hasProvider && (
                  <Typography variant="caption" color="text.secondary">
                    Finding the best professional for you...
                  </Typography>
                )}
              </Box>
              {hasProvider && onChat && (
                <Tooltip title="Chat with provider">
                  <IconButton size="small" onClick={onChat} color="primary">
                    <Comment fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
            
            {hasProvider && booking.providerPhone && (
              <Stack direction="row" spacing={2} sx={{ mt: 1, ml: 6 }}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Phone sx={{ fontSize: 12, color: "text.secondary" }} />
                  <Typography variant="caption">{booking.providerPhone}</Typography>
                </Box>
                {booking.providerEmail && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Email sx={{ fontSize: 12, color: "text.secondary" }} />
                    <Typography variant="caption">{booking.providerEmail}</Typography>
                  </Box>
                )}
              </Stack>
            )}
          </Paper>

          {/* Description */}
          {booking.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {truncateText(booking.description)}
            </Typography>
          )}

          {/* Map View Toggle */}
          {showMap && isActive && hasProvider && (
            <Box sx={{ mb: 2 }}>
              <Button
                size="small"
                startIcon={<Navigation />}
                onClick={() => setShowMapView(!showMapView)}
                sx={{ textTransform: "none", mb: 1 }}
              >
                {showMapView ? "Hide Map" : "View Live Location"}
              </Button>
              {showMapView && (
                <LiveDirectionsMap
                  providerLocation={booking.providerLocation}
                  customerLocation={booking.address}
                  height={300}
                />
              )}
            </Box>
          )}

          {/* Details Section */}
          <DetailsSection booking={booking} />

          {/* Action Buttons */}
          <ActionButtons
            booking={booking}
            loading={loading}
            onCancel={onCancel}
            onUpdateStatus={onUpdateStatus}
            onViewDetails={onViewDetails}
            size="medium"
          />
        </CardContent>
      </Card>
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
    address: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    scheduledAt: PropTypes.string,
    createdAt: PropTypes.string,
    providerName: PropTypes.string,
    providerPhone: PropTypes.string,
    providerEmail: PropTypes.string,
    providerRating: PropTypes.number,
    providerReviewCount: PropTypes.number,
    providerLocation: PropTypes.object,
    amount: PropTypes.number,
    duration: PropTypes.number,
    area: PropTypes.string,
    description: PropTypes.string,
    notes: PropTypes.string
  }),
  loading: PropTypes.bool,
  onCancel: PropTypes.func,
  onUpdateStatus: PropTypes.func,
  onViewDetails: PropTypes.func,
  onChat: PropTypes.func,
  onTrack: PropTypes.func,
  showMap: PropTypes.bool,
  variant: PropTypes.oneOf(["default", "compact"]),
  className: PropTypes.string
};

BookingCard.defaultProps = {
  booking: null,
  loading: false,
  onCancel: null,
  onUpdateStatus: null,
  onViewDetails: null,
  onChat: null,
  onTrack: null,
  showMap: false,
  variant: "default",
  className: ""
};

export default React.memo(BookingCard);