// src/pages/Customer/BookingHistory.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/api';
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

// Material-UI imports
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Stack,
  Avatar,
  Divider,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Skeleton,
  Alert,
  Snackbar,
  useMediaQuery,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  LinearProgress,
  Fade,
  Zoom,
  Slide
} from '@mui/material';

// Icons
import {
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaStar,
  FaRegClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSync,
  FaDownload,
  FaEye,
  FaComments,
  FaRecycle,
  FaMapMarkerAlt,
  FaUser,
  FaWrench,
  FaCreditCard,
  FaInfoCircle,
  FaExclamationTriangle,
  FaSmile,
  FaFrown,
  FaMeh,
  FaRegCalendarAlt,
  FaArrowLeft,
  FaArrowRight,
  FaSort,
  FaSortUp,
  FaSortDown
} from 'react-icons/fa';

// ==========================================================
// CONSTANTS & CONFIGURATION
// ==========================================================

const BOOKING_STATUS = {
  REQUESTED: { label: 'Requested', color: 'warning', icon: FaRegClock },
  ASSIGNED: { label: 'Assigned', color: 'info', icon: FaUser },
  ACCEPTED: { label: 'Accepted', color: 'info', icon: FaCheckCircle },
  STARTED: { label: 'Started', color: 'primary', icon: FaWrench },
  PROVIDER_STARTED: { label: 'Provider Started', color: 'primary', icon: FaWrench },
  COMPLETED_BY_PROVIDER: { label: 'Completed by Provider', color: 'success', icon: FaCheckCircle },
  COMPLETED: { label: 'Completed', color: 'success', icon: FaCheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'error', icon: FaTimesCircle },
  REJECTED: { label: 'Rejected', color: 'error', icon: FaTimesCircle },
  EXPIRED: { label: 'Expired', color: 'default', icon: FaExclamationTriangle },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'warning', icon: FaCreditCard },
  PAYMENT_COMPLETED: { label: 'Payment Completed', color: 'success', icon: FaCreditCard },
  PAYMENT_FAILED: { label: 'Payment Failed', color: 'error', icon: FaCreditCard }
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: FaArrowDown },
  { value: 'oldest', label: 'Oldest First', icon: FaArrowUp },
  { value: 'highest_amount', label: 'Highest Amount', icon: FaMoneyBillWave },
  { value: 'lowest_amount', label: 'Lowest Amount', icon: FaMoneyBillWave }
];

const DATE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' }
];

const ITEMS_PER_PAGE = 10;

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return 'Date not set';
  try {
    const date = new Date(dateString);
    if (isToday(date)) return `Today at ${format(date, 'hh:mm a')}`;
    if (isYesterday(date)) return `Yesterday at ${format(date, 'hh:mm a')}`;
    if (isThisWeek(date)) return format(date, 'EEEE, hh:mm a');
    return format(date, 'MMM dd, yyyy • hh:mm a');
  } catch {
    return dateString;
  }
};

const getStatusConfig = (status) => {
  return BOOKING_STATUS[status] || { 
    label: status || 'Unknown', 
    color: 'default', 
    icon: FaInfoCircle 
  };
};

// ==========================================================
// LOADING SKELETON COMPONENT
// ==========================================================
const BookingCardSkeleton = () => (
  <Card sx={{ mb: 2, p: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
      </Box>
      <Skeleton variant="circular" width={40} height={40} />
    </Stack>
    <Divider sx={{ my: 2 }} />
    <Stack direction="row" spacing={2}>
      <Skeleton variant="rounded" width={80} height={30} />
      <Skeleton variant="rounded" width={80} height={30} />
      <Skeleton variant="rounded" width={80} height={30} />
    </Stack>
  </Card>
);

// ==========================================================
// BOOKING CARD COMPONENT
// ==========================================================
const BookingCard = ({ booking, onViewDetails, onRate, onRebook, onChat, onDownloadInvoice }) => {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = getStatusConfig(booking.status);
  const StatusIcon = statusConfig.icon;

  const isCompleted = booking.status === 'COMPLETED';
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REJECTED';
  const canRate = isCompleted && !booking.reviewed;
  const canRebook = isCompleted || isCancelled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <Card sx={{ 
        mb: 2, 
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[4]
        }
      }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header Section */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ 
                bgcolor: `${statusConfig.color}.light`, 
                color: `${statusConfig.color}.main`,
                width: 48,
                height: 48
              }}>
                <StatusIcon size={24} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="600">
                  {booking.serviceType || 'Service Booking'}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    #{booking.bookingId?.slice(-8) || booking.id?.slice(-8)}
                  </Typography>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(booking.scheduledAt || booking.createdAt)}
                  </Typography>
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="h6" color="primary.main" fontWeight="700">
                {formatCurrency(booking.totalAmount || booking.amount)}
              </Typography>
            </Stack>
          </Stack>

          {/* Provider Info */}
          {booking.providerName && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                  <FaUser size={16} />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">Service Provider</Typography>
                  <Typography variant="body1" fontWeight="500">{booking.providerName}</Typography>
                </Box>
                {booking.providerPhone && (
                  <Typography variant="caption" color="text.secondary">
                    {booking.providerPhone}
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          {/* Service Details (Expanded) */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  {booking.address && (
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <FaMapMarkerAlt size={14} color="text.secondary" style={{ marginTop: 2 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Location</Typography>
                          <Typography variant="body2">{booking.address}</Typography>
                          {booking.area && (
                            <Typography variant="caption" color="text.secondary">
                              Area: {booking.area}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Grid>
                  )}
                  
                  {booking.description && (
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <FaInfoCircle size={14} color="text.secondary" style={{ marginTop: 2 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Description</Typography>
                          <Typography variant="body2">{booking.description}</Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  )}

                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FaRegCalendarAlt size={14} color="text.secondary" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Created On</Typography>
                        <Typography variant="body2">
                          {format(new Date(booking.createdAt), 'MMM dd, yyyy hh:mm a')}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  {booking.paymentMethod && (
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FaCreditCard size={14} color="text.secondary" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                          <Typography variant="body2">{booking.paymentMethod}</Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  )}

                  {booking.rating && (
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FaStar size={14} color="#f59e0b" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Your Rating</Typography>
                          <Rating value={booking.rating} readOnly size="small" />
                          {booking.reviewComment && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              "{booking.reviewComment}"
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              startIcon={expanded ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />}
            >
              {expanded ? 'Show Less' : 'Show Details'}
            </Button>

            <Stack direction="row" spacing={1}>
              <Tooltip title="View Details">
                <IconButton size="small" onClick={() => onViewDetails(booking)}>
                  <FaEye size={14} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Chat with Provider">
                <IconButton size="small" onClick={() => onChat(booking)}>
                  <FaComments size={14} />
                </IconButton>
              </Tooltip>

              {canRate && (
                <Tooltip title="Rate this service">
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<FaStar />}
                    onClick={() => onRate(booking)}
                    sx={{ borderRadius: 2 }}
                  >
                    Rate
                  </Button>
                </Tooltip>
              )}

              {canRebook && (
                <Tooltip title="Book again">
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<FaRecycle />}
                    onClick={() => onRebook(booking)}
                    sx={{ borderRadius: 2 }}
                  >
                    Rebook
                  </Button>
                </Tooltip>
              )}

              {isCompleted && (
                <Tooltip title="Download Invoice">
                  <IconButton size="small" onClick={() => onDownloadInvoice(booking)}>
                    <FaDownload size={14} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ==========================================================
// FILTERS DRAWER COMPONENT
// ==========================================================
const FiltersDrawer = ({ open, onClose, filters, onApply, onClear }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply({ ...localFilters, dateRange });
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({
      serviceType: 'all',
      minAmount: '',
      maxAmount: '',
      status: 'all'
    });
    setDateRange({ start: null, end: null });
    onClear();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Filter Bookings</Typography>
          <IconButton onClick={onClose} size="small">
            <FaTimesCircle />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Service Type</InputLabel>
            <Select
              value={localFilters.serviceType}
              onChange={(e) => setLocalFilters({ ...localFilters, serviceType: e.target.value })}
              label="Service Type"
            >
              <MenuItem value="all">All Services</MenuItem>
              <MenuItem value="Plumbing">Plumbing</MenuItem>
              <MenuItem value="Electrical">Electrical</MenuItem>
              <MenuItem value="Cleaning">Cleaning</MenuItem>
              <MenuItem value="Carpentry">Carpentry</MenuItem>
              <MenuItem value="Painting">Painting</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={localFilters.status}
              onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
              <MenuItem value="REQUESTED">Requested</MenuItem>
              <MenuItem value="ASSIGNED">Assigned</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle2">Amount Range (₹)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="Min Amount"
                type="number"
                value={localFilters.minAmount}
                onChange={(e) => setLocalFilters({ ...localFilters, minAmount: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="Max Amount"
                type="number"
                value={localFilters.maxAmount}
                onChange={(e) => setLocalFilters({ ...localFilters, maxAmount: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear}>Clear All</Button>
        <Button variant="contained" onClick={handleApply}>Apply Filters</Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// RATING MODAL COMPONENT
// ==========================================================
const RatingModal = ({ open, booking, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.warning('Please select a rating');
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit(booking.bookingId, rating, comment);
      onClose();
    } catch (error) {
      console.error('Rating submission failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Rate Your Experience</Typography>
        <Typography variant="caption" color="text.secondary">
          {booking?.serviceType} with {booking?.providerName}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} alignItems="center" sx={{ py: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              How was your service experience?
            </Typography>
            <Rating
              value={rating}
              onChange={(event, newValue) => setRating(newValue)}
              size="large"
              sx={{ fontSize: 48 }}
            />
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Share your experience (Optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience with the service provider..."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// DETAILS MODAL COMPONENT
// ==========================================================
const DetailsModal = ({ open, booking, onClose }) => {
  if (!booking) return null;
  
  const statusConfig = getStatusConfig(booking.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Booking Details</Typography>
          <Chip
            icon={<StatusIcon size={14} />}
            label={statusConfig.label}
            color={statusConfig.color}
            size="small"
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Booking ID */}
          <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Booking ID</Typography>
            <Typography variant="body1" fontWeight="600">{booking.bookingId}</Typography>
          </Paper>

          {/* Service Info */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Service Type</Typography>
              <Typography variant="body1" fontWeight="500">{booking.serviceType}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Amount</Typography>
              <Typography variant="h6" color="primary.main" fontWeight="700">
                {formatCurrency(booking.totalAmount || booking.amount)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Scheduled Date</Typography>
              <Typography variant="body1">
                {format(new Date(booking.scheduledAt), 'PPP p')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Created On</Typography>
              <Typography variant="body1">
                {format(new Date(booking.createdAt), 'PPP p')}
              </Typography>
            </Grid>
          </Grid>

          {/* Provider Info */}
          {booking.providerName && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" gutterBottom>Service Provider</Typography>
                <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <FaUser />
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="600">{booking.providerName}</Typography>
                      {booking.providerPhone && (
                        <Typography variant="caption" color="text.secondary">
                          Phone: {booking.providerPhone}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            </>
          )}

          {/* Location */}
          {booking.address && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" gutterBottom>Service Location</Typography>
                <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Stack direction="row" spacing={2}>
                    <FaMapMarkerAlt color="text.secondary" />
                    <Box>
                      <Typography variant="body2">{booking.address}</Typography>
                      {booking.area && (
                        <Typography variant="caption" color="text.secondary">
                          Area: {booking.area}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            </>
          )}

          {/* Description */}
          {booking.description && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" gutterBottom>Description</Typography>
                <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="body2">{booking.description}</Typography>
                </Paper>
              </Box>
            </>
          )}

          {/* Payment Info */}
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Payment Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                <Typography variant="body2">{booking.paymentMethod || 'Not specified'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Payment Status</Typography>
                <Chip
                  label={booking.paid ? 'Paid' : 'Pending'}
                  size="small"
                  color={booking.paid ? 'success' : 'warning'}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Timeline */}
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>Booking Timeline</Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.light' }}>
                  <FaCheckCircle size={14} />
                </Avatar>
                <Box>
                  <Typography variant="body2">Booking Created</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(booking.createdAt), 'PPP p')}
                  </Typography>
                </Box>
              </Stack>
              
              {booking.status === 'COMPLETED' && (
                <Stack direction="row" spacing={2}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.light' }}>
                    <FaCheckCircle size={14} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2">Service Completed</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.completedAt ? format(new Date(booking.completedAt), 'PPP p') : 'Completed'}
                    </Typography>
                  </Box>
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {booking.status === 'COMPLETED' && !booking.reviewed && (
          <Button variant="contained" color="warning" startIcon={<FaStar />}>
            Rate Service
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// STATISTICS SUMMARY COMPONENT
// ==========================================================
const StatisticsSummary = ({ bookings }) => {
  const stats = useMemo(() => {
    const totalSpent = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const completed = bookings.filter(b => b.status === 'COMPLETED').length;
    const cancelled = bookings.filter(b => b.status === 'CANCELLED' || b.status === 'REJECTED').length;
    const pending = bookings.filter(b => b.status === 'REQUESTED' || b.status === 'PAYMENT_PENDING').length;
    const avgRating = bookings
      .filter(b => b.rating)
      .reduce((sum, b) => sum + b.rating, 0) / (bookings.filter(b => b.rating).length || 1);
    
    return { totalSpent, completed, cancelled, pending, avgRating: avgRating.toFixed(1) };
  }, [bookings]);

  const summaryCards = [
    { 
      title: 'Total Spent', 
      value: formatCurrency(stats.totalSpent), 
      icon: FaMoneyBillWave, 
      color: 'primary' 
    },
    { 
      title: 'Completed Services', 
      value: stats.completed, 
      icon: FaCheckCircle, 
      color: 'success' 
    },
    { 
      title: 'Cancelled', 
      value: stats.cancelled, 
      icon: FaTimesCircle, 
      color: 'error' 
    },
    { 
      title: 'Avg Rating', 
      value: stats.avgRating, 
      icon: FaStar, 
      color: 'warning',
      suffix: ' ★'
    }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 4 }}>
      {summaryCards.map((card, index) => (
        <Grid item xs={6} sm={3} key={index}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 3 }}>
              <Box sx={{ 
                display: 'inline-flex', 
                p: 1, 
                borderRadius: 2, 
                bgcolor: `${card.color}.light`,
                color: `${card.color}.main`,
                mb: 1
              }}>
                <card.icon size={20} />
              </Box>
              <Typography variant="h5" fontWeight="700">
                {card.value}{card.suffix || ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {card.title}
              </Typography>
            </Paper>
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const BookingHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ITEMS_PER_PAGE);
  const [totalElements, setTotalElements] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    serviceType: 'all',
    minAmount: '',
    maxAmount: '',
    status: 'all'
  });

  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('size', rowsPerPage);
      params.append('sort', sortBy === 'newest' ? 'createdAt,desc' : sortBy === 'oldest' ? 'createdAt,asc' : 'totalAmount,desc');
      
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      
      if (dateFilter !== 'all') {
        params.append('dateFilter', dateFilter);
      }
      
      if (filters.serviceType !== 'all') {
        params.append('serviceType', filters.serviceType);
      }
      
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      
      if (filters.minAmount) {
        params.append('minAmount', filters.minAmount);
      }
      
      if (filters.maxAmount) {
        params.append('maxAmount', filters.maxAmount);
      }
      
      const response = await api.get(`/bookings/customer/history?${params.toString()}`);
      
      const data = response.data?.data || response.data;
      setBookings(data?.content || data || []);
      setTotalElements(data?.totalElements || data?.length || 0);
      
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError(err.response?.data?.message || 'Failed to load booking history');
      toast.error('Failed to load booking history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, rowsPerPage, sortBy, debouncedSearch, dateFilter, filters]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setDetailsModalOpen(true);
  };

  const handleRateBooking = (booking) => {
    setSelectedBooking(booking);
    setRatingModalOpen(true);
  };

  const handleSubmitRating = async (bookingId, rating, comment) => {
    try {
      await api.post(`/bookings/${bookingId}/review`, { rating, comment });
      toast.success('Thank you for your feedback!');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to submit rating');
      throw error;
    }
  };

  const handleRebook = (booking) => {
    navigate('/dashboard/customer/book', { 
      state: { 
        rebookData: {
          serviceType: booking.serviceType,
          address: booking.address,
          area: booking.area
        }
      } 
    });
  };

  const handleChat = (booking) => {
    navigate(`/dashboard/customer/chat/${booking.bookingId}`);
  };

  const handleDownloadInvoice = async (booking) => {
    try {
      const response = await api.get(`/bookings/${booking.bookingId}/invoice`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${booking.bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({
      serviceType: 'all',
      minAmount: '',
      maxAmount: '',
      status: 'all'
    });
    setDateFilter('all');
    setSearchQuery('');
    setPage(0);
  };

  if (loading && bookings.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight="700" gutterBottom>
              Booking History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage all your service bookings
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                <FaSync className={refreshing ? 'fa-spin' : ''} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Filter">
              <IconButton onClick={() => setFiltersOpen(true)}>
                <Badge 
                  color="primary" 
                  variant="dot" 
                  invisible={
                    filters.serviceType === 'all' && 
                    filters.status === 'all' && 
                    !filters.minAmount && 
                    !filters.maxAmount
                  }
                >
                  <FaFilter />
                </Badge>
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Statistics Summary */}
      {bookings.length > 0 && <StatisticsSummary bookings={bookings} />}

      {/* Search and Filters Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by service, provider, or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FaSearch size={14} color="text.secondary" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Date</InputLabel>
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                label="Date"
              >
                {DATE_FILTERS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <option.icon size={12} />
                      <span>{option.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3} md={4}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleClearFilters}
              startIcon={<FaTimesCircle />}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Bookings List */}
      {bookings.length === 0 && !loading ? (
        <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
          <FaCalendarAlt size={64} color="text.disabled" style={{ opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            No Bookings Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You haven't made any bookings yet or no bookings match your filters
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard/customer/book')}
            startIcon={<FaRecycle />}
          >
            Book a Service
          </Button>
        </Paper>
      ) : (
        <>
          <AnimatePresence>
            {bookings.map((booking) => (
              <BookingCard
                key={booking.bookingId || booking.id}
                booking={booking}
                onViewDetails={handleViewDetails}
                onRate={handleRateBooking}
                onRebook={handleRebook}
                onChat={handleChat}
                onDownloadInvoice={handleDownloadInvoice}
              />
            ))}
          </AnimatePresence>

          {/* Pagination */}
          {totalElements > rowsPerPage && (
            <Paper sx={{ p: 2, mt: 3, borderRadius: 3 }}>
              <TablePagination
                component="div"
                count={totalElements}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Bookings per page:"
              />
            </Paper>
          )}
        </>
      )}

      {/* Modals */}
      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <DetailsModal
        open={detailsModalOpen}
        booking={selectedBooking}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedBooking(null);
        }}
      />

      <RatingModal
        open={ratingModalOpen}
        booking={selectedBooking}
        onClose={() => {
          setRatingModalOpen(false);
          setSelectedBooking(null);
        }}
        onSubmit={handleSubmitRating}
      />

      {/* Loading Overlay */}
      {refreshing && (
        <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />
      )}

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .fa-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </Container>
  );
};

export default BookingHistory;