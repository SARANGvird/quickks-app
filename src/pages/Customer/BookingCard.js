import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

// Material-UI imports
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Box,
  Button,
  Avatar,
  LinearProgress,
  Grid,
  Tooltip,
  IconButton,
  Paper,
  Collapse,
  Divider,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Skeleton
} from "@mui/material";

// React Icons
import {
  FaMapMarkerAlt,
  FaUser,
  FaCheckCircle,
  FaClock,
  FaPhone,
  FaEnvelope,
  FaRupeeSign,
  FaComments,
  FaExternalLinkAlt,
  FaCheck,
  FaEye,
  FaExclamationTriangle,
  FaIdCard,
  FaTools,
  FaStar,
  FaHourglassHalf,
  FaSpinner,
  FaTimesCircle,
  FaBan,
  FaCalendarAlt,
  FaWhatsapp,
  FaInfoCircle,
  FaMotorcycle,
  FaWrench,
  FaBox,
  FaCreditCard,
  FaMobile,
  FaGooglePay,
  FaApplePay,
  FaQrcode,
  FaCopy,
  FaShare,
  FaEllipsisV
} from "react-icons/fa";
import { SiPhonepe, SiPaytm, SiGooglepay, SiRazorpay } from "react-icons/si";

// ------------------- THEME & STYLES -------------------
const theme = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryDark: "#4f46e5",
  success: "#10b981",
  successLight: "#34d399",
  successDark: "#059669",
  warning: "#f59e0b",
  warningLight: "#fbbf24",
  warningDark: "#d97706",
  danger: "#ef4444",
  dangerLight: "#f87171",
  dangerDark: "#dc2626",
  info: "#3b82f6",
  infoLight: "#60a5fa",
  infoDark: "#2563eb",
  purple: "#8b5cf6",
  purpleLight: "#a78bfa",
  purpleDark: "#7c3aed",
  dark: "#1e293b",
  lightGray: "#e2e8f0",
  background: "#f8fafc",
  white: "#ffffff",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  border: "#e2e8f0"
};

// ------------------- STATUS CONFIGURATION -------------------
const STATUS_CONFIG = {
  // Customer side states
  "REQUESTED": { 
    color: theme.warning, 
    label: "New Request", 
    icon: FaSpinner, 
    progress: 10,
    description: "Waiting for provider response",
    actions: ['cancel']
  },
  "PENDING": { 
    color: theme.warning, 
    label: "Pending", 
    icon: FaHourglassHalf, 
    progress: 20,
    description: "Processing your request",
    actions: ['cancel']
  },
  "PAYMENT_PENDING": {
    color: theme.warning,
    label: "Payment Required",
    icon: FaClock,
    progress: 15,
    description: "Complete payment to confirm booking",
    actions: ['pay', 'cancel']
  },
  "PAYMENT_PROCESSING": {
    color: theme.info,
    label: "Processing Payment",
    icon: FaSpinner,
    progress: 25,
    description: "Your payment is being processed",
    actions: []
  },
  "PAYMENT_COMPLETED": {
    color: theme.success,
    label: "Payment Completed",
    icon: FaCheckCircle,
    progress: 30,
    description: "Finding a provider for you",
    actions: []
  },
  "PAYMENT_FAILED": {
    color: theme.danger,
    label: "Payment Failed",
    icon: FaExclamationTriangle,
    progress: 15,
    description: "Payment failed. Please try again.",
    actions: ['pay', 'cancel']
  },
  "ASSIGNED": { 
    color: theme.primary, 
    label: "Provider Assigned", 
    icon: FaUser, 
    progress: 40,
    description: "Provider has been assigned",
    actions: ['chat']
  },
  "ACCEPTED": { 
    color: theme.success, 
    label: "Accepted", 
    icon: FaCheckCircle, 
    progress: 50,
    description: "Provider accepted the booking",
    actions: ['chat']
  },
  "PROVIDER_STARTED": { 
    color: theme.purple, 
    label: "Provider En Route", 
    icon: FaMotorcycle, 
    progress: 60,
    description: "Provider is on the way",
    actions: ['chat', 'track']
  },
  "STARTED": { 
    color: theme.info, 
    label: "In Progress", 
    icon: FaWrench, 
    progress: 75,
    description: "Service in progress",
    actions: ['chat', 'track']
  },
  "COMPLETED_BY_PROVIDER": { 
    color: theme.success, 
    label: "Completed", 
    icon: FaCheckCircle, 
    progress: 90,
    description: "Provider marked as complete",
    actions: ['confirm', 'chat']
  },
  "COMPLETED": { 
    color: theme.success, 
    label: "Verified", 
    icon: FaCheckCircle, 
    progress: 100,
    description: "Service completed successfully",
    actions: ['review']
  },
  "CANCELLED": { 
    color: theme.danger, 
    label: "Cancelled", 
    icon: FaTimesCircle, 
    progress: 0,
    description: "Booking was cancelled",
    actions: ['rebook']
  },
  "REJECTED": { 
    color: theme.danger, 
    label: "Rejected", 
    icon: FaBan, 
    progress: 0,
    description: "Provider rejected the request",
    actions: ['rebook']
  },
  "EXPIRED": { 
    color: theme.dark, 
    label: "Expired", 
    icon: FaClock, 
    progress: 0,
    description: "Booking request expired",
    actions: ['rebook']
  },
  
  // Provider side states
  "PROVIDER_PENDING": {
    color: theme.warning,
    label: "New Request",
    icon: FaSpinner,
    description: "New booking request",
    actions: ['accept', 'reject']
  },
  "PROVIDER_ACCEPTED": {
    color: theme.success,
    label: "Accepted",
    icon: FaCheckCircle,
    description: "You accepted this booking",
    actions: ['start']
  },
  "PROVIDER_REJECTED": {
    color: theme.danger,
    label: "Rejected",
    icon: FaBan,
    description: "You rejected this booking",
    actions: []
  },
  "PROVIDER_STARTED": {
    color: theme.purple,
    label: "Started",
    icon: FaWrench,
    description: "Service in progress",
    actions: ['complete']
  },
  "PROVIDER_COMPLETED": {
    color: theme.success,
    label: "Completed",
    icon: FaCheckCircle,
    description: "Service completed",
    actions: []
  }
};

// ------------------- UTILITIES -------------------
const getStatusMeta = (status, role = 'customer') => {
  const s = status?.toUpperCase();
  
  if (role === 'provider') {
    const providerStatusMap = {
      'REQUESTED': 'PROVIDER_PENDING',
      'PENDING': 'PROVIDER_PENDING',
      'PAYMENT_PENDING': 'PROVIDER_PENDING',
      'PAYMENT_COMPLETED': 'PROVIDER_PENDING',
      'ASSIGNED': 'PROVIDER_PENDING',
      'ACCEPTED': 'PROVIDER_ACCEPTED',
      'REJECTED': 'PROVIDER_REJECTED',
      'STARTED': 'PROVIDER_STARTED',
      'PROVIDER_STARTED': 'PROVIDER_STARTED',
      'COMPLETED_BY_PROVIDER': 'PROVIDER_COMPLETED',
      'COMPLETED': 'PROVIDER_COMPLETED'
    };
    const mappedStatus = providerStatusMap[s] || s;
    return STATUS_CONFIG[mappedStatus] || STATUS_CONFIG['PROVIDER_PENDING'];
  }
  
  return STATUS_CONFIG[s] || STATUS_CONFIG['REQUESTED'];
};

const formatDateTime = (dateString) => {
  if (!dateString) return "Not scheduled";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
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

const getPaymentMethodIcon = (method) => {
  switch(method?.toLowerCase()) {
    case 'upi': return FaMobile;
    case 'card': return FaCreditCard;
    case 'googlepay': return FaGooglePay;
    case 'phonepe': return SiPhonepe;
    case 'paytm': return SiPaytm;
    case 'razorpay': return SiRazorpay;
    default: return FaCreditCard;
  }
};

// ------------------- PAYMENT DIALOG -------------------
const PaymentDialog = ({ open, onClose, amount, bookingId, onPay, processing }) => {
  const [method, setMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [savedCards, setSavedCards] = useState([]);
  const [showSavedCards, setShowSavedCards] = useState(false);

  // Load saved cards on mount
  useEffect(() => {
    // In production, fetch from API
    setSavedCards([
      { id: 1, last4: '4242', brand: 'Visa', expiry: '12/25' },
      { id: 2, last4: '1234', brand: 'Mastercard', expiry: '08/24' }
    ]);
  }, []);

  const paymentMethods = [
    { id: 'upi', name: 'UPI', icon: FaMobile, description: 'Google Pay, PhonePe, Paytm' },
    { id: 'card', name: 'Credit/Debit Card', icon: FaCreditCard, description: 'Visa, MasterCard, RuPay' },
    { id: 'saved', name: 'Saved Cards', icon: FaCreditCard, description: 'Use saved card' },
    { id: 'qr', name: 'QR Code', icon: FaQrcode, description: 'Scan to pay' }
  ];

  const handleUPIPayment = () => {
    onPay({
      method: 'upi',
      details: { upiId: upiId || 'customer@okhdfcbank' }
    });
  };

  const handleCardPayment = () => {
    onPay({
      method: 'card',
      details: cardDetails
    });
  };

  const handleSavedCardPayment = (card) => {
    onPay({
      method: 'saved_card',
      details: card
    });
  };

  const copyUPIId = () => {
    navigator.clipboard.writeText('quickks@okhdfcbank');
    // Show toast notification
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ 
            bgcolor: theme.primary + '10', 
            p: 1, 
            borderRadius: 2,
            color: theme.primary
          }}>
            <FaRupeeSign size={20} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="700">Complete Payment</Typography>
            <Typography variant="caption" color="text.secondary">
              Booking #{bookingId?.slice(-8).toUpperCase()}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Amount Display */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              bgcolor: theme.primary + '05', 
              borderRadius: 3,
              border: `1px solid ${theme.primary}20`,
              textAlign: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Amount
            </Typography>
            <Typography variant="h2" sx={{ 
              color: theme.primary, 
              fontWeight: 700, 
              fontSize: { xs: '2.5rem', sm: '3rem' }
            }}>
              {formatCurrency(amount)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Including all taxes
            </Typography>
          </Paper>

          {/* Payment Methods */}
          <Box>
            <Typography variant="subtitle2" fontWeight="600" gutterBottom>
              Select Payment Method
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {paymentMethods.map((pm) => (
                <Tooltip key={pm.id} title={pm.description}>
                  <Paper
                    onClick={() => {
                      setMethod(pm.id);
                      setShowSavedCards(pm.id === 'saved');
                    }}
                    sx={{
                      p: 1.5,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: method === pm.id ? theme.primary + '10' : '#f5f5f5',
                      border: method === pm.id ? `2px solid ${theme.primary}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: theme.primary + '10'
                      }
                    }}
                  >
                    <pm.icon size={16} color={method === pm.id ? theme.primary : theme.textSecondary} />
                    <Typography variant="body2" fontWeight={method === pm.id ? 600 : 400}>
                      {pm.name}
                    </Typography>
                  </Paper>
                </Tooltip>
              ))}
            </Stack>
          </Box>

          {/* UPI Payment */}
          {method === 'upi' && (
            <Stack spacing={2}>
              <TextField
                label="UPI ID (optional)"
                placeholder="username@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                fullWidth
                size="small"
                helperText="Leave empty to use Quickks UPI ID"
              />
              
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FaQrcode size={24} color={theme.primary} />
                    <Box>
                      <Typography variant="body2" fontWeight="600">Quickks UPI ID</Typography>
                      <Typography variant="caption" color="text.secondary">
                        quickks@okhdfcbank
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    size="small"
                    startIcon={<FaCopy />}
                    onClick={copyUPIId}
                    sx={{ textTransform: 'none' }}
                  >
                    Copy
                  </Button>
                </Stack>
              </Paper>

              <Button
                variant="contained"
                fullWidth
                onClick={handleUPIPayment}
                disabled={processing}
                sx={{ 
                  borderRadius: 2,
                  bgcolor: theme.primary,
                  py: 1.5
                }}
              >
                {processing ? 'Processing...' : `Pay ${formatCurrency(amount)} via UPI`}
              </Button>
            </Stack>
          )}

          {/* Card Payment */}
          {method === 'card' && (
            <Stack spacing={2}>
              <TextField
                label="Card Number"
                placeholder="4242 4242 4242 4242"
                value={cardDetails.number}
                onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                fullWidth
                size="small"
              />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="MM/YY"
                    placeholder="12/25"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="CVV"
                    placeholder="123"
                    type="password"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>

              <TextField
                label="Name on Card"
                placeholder="John Doe"
                value={cardDetails.name}
                onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                fullWidth
                size="small"
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handleCardPayment}
                disabled={processing}
                sx={{ 
                  borderRadius: 2,
                  bgcolor: theme.primary,
                  py: 1.5
                }}
              >
                {processing ? 'Processing...' : `Pay ${formatCurrency(amount)} via Card`}
              </Button>
            </Stack>
          )}

          {/* Saved Cards */}
          {method === 'saved' && showSavedCards && (
            <Stack spacing={2}>
              {savedCards.map((card) => (
                <Paper
                  key={card.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${theme.border}`,
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: theme.primary,
                      bgcolor: theme.primary + '05'
                    }
                  }}
                  onClick={() => handleSavedCardPayment(card)}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FaCreditCard size={20} color={theme.primary} />
                      <Box>
                        <Typography variant="body2" fontWeight="600">
                          {card.brand} •••• {card.last4}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Expires {card.expiry}
                        </Typography>
                      </Box>
                    </Stack>
                    <Button size="small" variant="outlined">
                      Pay
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          {/* QR Code Payment */}
          {method === 'qr' && (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Box sx={{ 
                width: 200, 
                height: 200, 
                bgcolor: 'white', 
                mx: 'auto', 
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${theme.primary}`,
                borderRadius: 2
              }}>
                <FaQrcode size={120} color={theme.primary} />
              </Box>
              <Typography variant="body2" fontWeight="600" gutterBottom>
                Scan with any UPI app
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Amount: {formatCurrency(amount)}
              </Typography>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          fullWidth
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ------------------- CANCELLATION DIALOG -------------------
const CancellationDialog = ({ open, onClose, onConfirm, processing }) => {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  const reasons = [
    'Changed my mind',
    'Found another provider',
    'Schedule conflict',
    'Service not needed',
    'Other'
  ];

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Other' ? otherReason : selectedReason;
    onConfirm(finalReason || 'No reason provided');
    setReason('');
    setOtherReason('');
    setSelectedReason('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FaExclamationTriangle color={theme.danger} />
        Cancel Booking
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please tell us why you're cancelling:
        </Typography>
        <Stack spacing={2}>
          {reasons.map((r) => (
            <Button
              key={r}
              variant={selectedReason === r ? "contained" : "outlined"}
              color={selectedReason === r ? "error" : "inherit"}
              onClick={() => setSelectedReason(r)}
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              disabled={processing}
            >
              {r}
            </Button>
          ))}
          {selectedReason === 'Other' && (
            <TextField
              autoFocus
              multiline
              rows={2}
              placeholder="Please specify..."
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              fullWidth
              size="small"
              disabled={processing}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={processing}>Back</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={!selectedReason || (selectedReason === 'Other' && !otherReason) || processing}
        >
          {processing ? 'Processing...' : 'Confirm Cancellation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ------------------- REVIEW DIALOG -------------------
const ReviewDialog = ({ open, onClose, onSubmit, processing }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [hover, setHover] = useState(-1);

  const labels = {
    0.5: 'Useless',
    1: 'Useless+',
    1.5: 'Poor',
    2: 'Poor+',
    2.5: 'Ok',
    3: 'Ok+',
    3.5: 'Good',
    4: 'Good+',
    4.5: 'Excellent',
    5: 'Excellent+'
  };

  const handleSubmit = () => {
    onSubmit({ rating, review });
    setRating(0);
    setReview('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rate Your Experience</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Rating
              value={rating}
              onChange={(e, newValue) => setRating(newValue)}
              onChangeActive={(e, newHover) => setHover(newHover)}
              size="large"
              precision={0.5}
              sx={{ mb: 1 }}
            />
            {rating !== null && (
              <Typography variant="body2" color="text.secondary">
                {labels[hover !== -1 ? hover : rating]}
              </Typography>
            )}
          </Box>
          
          <TextField
            multiline
            rows={4}
            placeholder="Share your experience (optional)"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            fullWidth
            disabled={processing}
          />

          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={1}>
              <FaInfoCircle size={12} />
              Your feedback helps us improve our service quality
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={processing}>Skip</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={rating === 0 || processing}
        >
          {processing ? 'Submitting...' : 'Submit Review'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ------------------- ACTION MENU -------------------
const ActionMenu = ({ bookingId, onAction }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    onAction(action);
    handleClose();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ color: theme.textMuted }}
      >
        <FaEllipsisV size={14} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 200 }
        }}
      >
        <MenuItem onClick={() => handleAction('share')}>
          <ListItemIcon><FaShare size={14} /></ListItemIcon>
          <ListItemText>Share Booking</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('copy')}>
          <ListItemIcon><FaCopy size={14} /></ListItemIcon>
          <ListItemText>Copy ID</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('report')}>
          <ListItemIcon><FaExclamationTriangle size={14} color={theme.danger} /></ListItemIcon>
          <ListItemText sx={{ color: theme.danger }}>Report Issue</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

// ------------------- MAIN COMPONENT -------------------
const BookingCard = ({ 
  booking = {}, 
  role = "customer",
  onConfirm, 
  onChat, 
  onDismiss, 
  onCancel,
  onAccept,
  onReject,
  onStart,
  onComplete,
  onTrack,
  onPay,
  onReview,
  onViewDetails,
  onRebook,
  onShare,
  onReport,
  isProcessing = false,
  showDetails = false,
  className = "",
}) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const meta = getStatusMeta(booking.status, role);
  const StatusIcon = meta.icon;
  const status = booking.status?.toUpperCase();
  
  const isCompletedByProvider = status === "COMPLETED_BY_PROVIDER";
  const isCompleted = status === "COMPLETED";
  const isRejected = status === "REJECTED";
  const isCancelled = status === "CANCELLED";
  const isPending = ["REQUESTED", "PENDING", "PAYMENT_PENDING"].includes(status);
  const isProviderView = role === 'provider';
  const needsPayment = status === "PAYMENT_PENDING" || status === "PAYMENT_FAILED";

  // Safely extract data with fallbacks
  const bookingId = booking.bookingId || booking.id || "N/A";
  const serviceType = booking.serviceType || booking.service || "Service Booking";
  const customerName = booking.customerName || booking.customer?.name || "Customer";
  const providerName = booking.providerName || booking.provider?.name || "Provider";
  const address = booking.address || booking.location || booking.area || "";
  const scheduledAt = booking.scheduledAt || booking.scheduledTime || booking.date;
  const totalAmount = booking.totalAmount || booking.amount || 0;
  const customerPhone = booking.customerPhone || booking.customer?.phone;
  const customerEmail = booking.customerEmail || booking.customer?.email;
  const providerImage = booking.providerImage || booking.provider?.avatar;
  const customerImage = booking.customerImage || booking.customer?.avatar;
  const rating = booking.rating || booking.provider?.rating || 0;
  const reviewCount = booking.reviewCount || booking.provider?.reviewCount || 0;
  const description = booking.description || booking.details || "";
  const timeRemaining = getTimeRemaining(scheduledAt);
  const paymentMethod = booking.paymentMethod;
  const paymentId = booking.paymentId;

  // Handle action clicks
  const handleCancel = async (reason) => {
    await onCancel?.(bookingId, reason);
    setSnackbar({ open: true, message: 'Booking cancelled', severity: 'info' });
  };

  const handlePayment = async (paymentData) => {
    setPaymentProcessing(true);
    try {
      await onPay?.(bookingId, paymentData);
      setSnackbar({ open: true, message: 'Payment successful!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'Payment failed', severity: 'error' });
    } finally {
      setPaymentProcessing(false);
      setShowPaymentDialog(false);
    }
  };

  const handleReview = async (reviewData) => {
    await onReview?.(bookingId, reviewData);
    setSnackbar({ open: true, message: 'Thank you for your review!', severity: 'success' });
  };

  const handleAccept = async () => {
    await onAccept?.(bookingId);
    setSnackbar({ open: true, message: 'Booking accepted', severity: 'success' });
  };

  const handleReject = async () => {
    await onReject?.(bookingId);
    setSnackbar({ open: true, message: 'Booking rejected', severity: 'info' });
  };

  const handleStart = async () => {
    await onStart?.(bookingId);
    setSnackbar({ open: true, message: 'Service started', severity: 'info' });
  };

  const handleComplete = async () => {
    await onComplete?.(bookingId);
    setSnackbar({ open: true, message: 'Service completed', severity: 'success' });
  };

  const handleTrack = () => {
    onTrack?.(bookingId);
  };

  const handleRebook = () => {
    onRebook?.(booking);
  };

  const handleActionMenu = (action) => {
    switch(action) {
      case 'share':
        onShare?.(booking);
        break;
      case 'copy':
        navigator.clipboard.writeText(bookingId);
        setSnackbar({ open: true, message: 'Booking ID copied!', severity: 'success' });
        break;
      case 'report':
        onReport?.(booking);
        break;
      default:
        break;
    }
  };

  // Handle rejected/cancelled state
  if (isRejected || isCancelled) {
    return (
      <Paper sx={{ 
        p: 3, 
        borderRadius: 3, 
        bgcolor: '#fff1f2', 
        border: `1px solid ${theme.danger}30`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{ position: 'absolute', top: 10, right: 10, opacity: 0.1 }}>
          <FaTimesCircle size={60} color={theme.danger} />
        </Box>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight="700" color={theme.danger} gutterBottom>
              Booking {isRejected ? 'Rejected' : 'Cancelled'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {booking.cancellationReason || booking.rejectionReason || 
                (isRejected 
                  ? "The provider is unavailable. Please try booking another professional."
                  : "This booking has been cancelled.")}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {onDismiss && (
              <Button 
                variant="contained" 
                onClick={onDismiss} 
                size="small" 
                sx={{ bgcolor: theme.primary, borderRadius: 2 }}
              >
                Dismiss
              </Button>
            )}
            {onRebook && (
              <Button
                variant="outlined"
                onClick={handleRebook}
                size="small"
                sx={{ borderRadius: 2 }}
              >
                Book Again
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <>
      <Card 
        sx={{ 
          borderRadius: 3, 
          overflow: 'hidden', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease',
          border: `1px solid ${meta.color}20`,
          '&:hover': {
            boxShadow: `0 20px 40px ${meta.color}10`,
            transform: 'translateY(-2px)'
          },
          position: 'relative'
        }}
        className={className}
      >
        {/* Status Bar */}
        <Box sx={{ height: 4, bgcolor: meta.color, width: `${meta.progress}%` }} />
        
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ 
                bgcolor: meta.color, 
                color: 'white', 
                width: 48, 
                height: 48,
                boxShadow: `0 4px 12px ${meta.color}40`
              }}>
                <StatusIcon size={20} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="700">{serviceType}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Chip
                    size="small"
                    label={meta.label}
                    sx={{ 
                      bgcolor: meta.color, 
                      color: 'white', 
                      fontWeight: 600, 
                      fontSize: '0.7rem',
                      height: 20
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FaIdCard size={10} />
                    #{bookingId.slice(-6).toUpperCase()}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
            
            <Stack direction="row" spacing={1} alignItems="center">
              {totalAmount > 0 && (
                <Chip
                  icon={<FaRupeeSign size={12} />}
                  label={formatCurrency(totalAmount)}
                  sx={{ 
                    bgcolor: theme.success + '10',
                    color: theme.success,
                    fontWeight: 600,
                    border: `1px solid ${theme.success}30`
                  }}
                />
              )}
              <ActionMenu bookingId={bookingId} onAction={handleActionMenu} />
            </Stack>
          </Stack>

          {/* Time Info */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: theme.background, borderRadius: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FaCalendarAlt color={theme.primary} size={14} />
                  <Typography variant="body2">
                    <strong>Scheduled:</strong> {formatDateTime(scheduledAt)}
                  </Typography>
                </Stack>
              </Grid>
              {timeRemaining && status === 'REQUESTED' && (
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FaHourglassHalf color={theme.warning} size={14} />
                    <Typography variant="body2">
                      <strong>Respond by:</strong> {timeRemaining}
                    </Typography>
                  </Stack>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Provider/Customer Info */}
          {!isProviderView && providerName && providerName !== "Provider" && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: theme.background, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={providerImage} sx={{ width: 40, height: 40 }}>
                    <FaUser size={16} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="700">{providerName}</Typography>
                    {rating > 0 && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Rating value={rating} readOnly size="small" precision={0.5} />
                        <Typography variant="caption" color="text.secondary">
                          ({reviewCount})
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Stack>
                {onChat && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<FaComments size={14} />}
                    onClick={onChat}
                    sx={{ 
                      borderRadius: 2, 
                      textTransform: 'none',
                      bgcolor: theme.primary,
                      '&:hover': { bgcolor: theme.primaryDark }
                    }}
                  >
                    Chat
                  </Button>
                )}
              </Stack>
            </Paper>
          )}

          {isProviderView && customerName && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: theme.background, borderRadius: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={customerImage} sx={{ width: 40, height: 40 }}>
                  <FaUser size={16} />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight="700">{customerName}</Typography>
                  {customerPhone && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FaPhone size={10} /> {customerPhone}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Location */}
          {address && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              mb: 2, 
              p: 1.5, 
              bgcolor: theme.lightGray + '50', 
              borderRadius: 2 
            }}>
              <FaMapMarkerAlt color={theme.danger} size={14} />
              <Typography variant="body2" flex={1}>{address}</Typography>
              <Tooltip title="Get Directions">
                <IconButton 
                  size="small" 
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank')}
                  sx={{ color: theme.primary }}
                >
                  <FaExternalLinkAlt size={10} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Description */}
          {description && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            </Box>
          )}

          {/* Contact Information */}
          {!isProviderView && (customerPhone || customerEmail) && (
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
              {customerPhone && (
                <Chip
                  icon={<FaPhone size={10} />}
                  label={customerPhone}
                  size="small"
                  onClick={() => window.open(`tel:${customerPhone}`)}
                  clickable
                  sx={{ borderRadius: 2, bgcolor: theme.primary + '10' }}
                />
              )}
              {customerPhone && (
                <Chip
                  icon={<FaWhatsapp size={10} />}
                  label="WhatsApp"
                  size="small"
                  onClick={() => window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}`, '_blank')}
                  clickable
                  sx={{ borderRadius: 2, bgcolor: '#25D36610', color: '#25D366' }}
                />
              )}
              {customerEmail && (
                <Chip
                  icon={<FaEnvelope size={10} />}
                  label={customerEmail}
                  size="small"
                  onClick={() => window.open(`mailto:${customerEmail}`)}
                  clickable
                  sx={{ borderRadius: 2 }}
                />
              )}
            </Stack>
          )}

          {/* Payment Info */}
          {paymentMethod && paymentId && (
            <Paper sx={{ p: 1.5, mb: 2, bgcolor: theme.success + '10', borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {React.createElement(getPaymentMethodIcon(paymentMethod), { size: 14, color: theme.success })}
                <Typography variant="caption" color={theme.success}>
                  Paid via {paymentMethod} • ID: {paymentId.slice(-8)}
                </Typography>
              </Stack>
            </Paper>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
            {/* Provider Actions */}
            {isProviderView && (
              <>
                {meta.actions.includes('accept') && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleAccept}
                    disabled={isProcessing}
                    startIcon={<FaCheck size={14} />}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Accept
                  </Button>
                )}
                
                {meta.actions.includes('reject') && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleReject}
                    disabled={isProcessing}
                    startIcon={<FaBan size={14} />}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Reject
                  </Button>
                )}

                {meta.actions.includes('start') && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleStart}
                    disabled={isProcessing}
                    startIcon={<FaTools size={14} />}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Start Service
                  </Button>
                )}

                {meta.actions.includes('complete') && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleComplete}
                    disabled={isProcessing}
                    startIcon={<FaCheckCircle size={14} />}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Complete
                  </Button>
                )}
              </>
            )}

            {/* Customer Actions */}
            {!isProviderView && (
              <>
                {meta.actions.includes('pay') && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => setShowPaymentDialog(true)}
                    disabled={isProcessing || paymentProcessing}
                    startIcon={<FaRupeeSign size={14} />}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Pay Now
                  </Button>
                )}

                {isCompletedByProvider && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => onConfirm?.(bookingId)}
                    disabled={isProcessing}
                    startIcon={<FaCheck size={14} />}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    {isProcessing ? 'Processing...' : 'Confirm Completion'}
                  </Button>
                )}

                {isCompleted && meta.actions.includes('review') && (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setShowReviewDialog(true)}
                    startIcon={<FaStar size={14} />}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Rate Experience
                  </Button>
                )}
              </>
            )}

            {/* Common Actions */}
            {meta.actions.includes('chat') && onChat && (
              <Button
                variant="outlined"
                color="primary"
                onClick={onChat}
                startIcon={<FaComments size={14} />}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Chat
              </Button>
            )}

            {meta.actions.includes('track') && onTrack && (
              <Button
                variant="outlined"
                color="info"
                onClick={handleTrack}
                startIcon={<FaEye size={14} />}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Track
              </Button>
            )}

            {meta.actions.includes('rebook') && onRebook && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleRebook}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Book Again
              </Button>
            )}

            {isPending && !isProviderView && onCancel && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowCancelDialog(true)}
                size="small"
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Cancel
              </Button>
            )}

            {/* View Details Button */}
            {showDetails && onViewDetails && (
              <Button
                variant="text"
                size="small"
                onClick={() => setShowFullDetails(!showFullDetails)}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                {showFullDetails ? 'Show Less' : 'View Details'}
              </Button>
            )}
          </Stack>

          {/* Expanded Details */}
          <Collapse in={showFullDetails}>
            <Box sx={{ mt: 2, p: 2, bgcolor: theme.background, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                Booking Details
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Booking ID:</strong> {bookingId}
                </Typography>
                <Typography variant="body2">
                  <strong>Created:</strong> {formatDateTime(booking.createdAt)}
                </Typography>
                {booking.updatedAt && (
                  <Typography variant="body2">
                    <strong>Last Updated:</strong> {formatDateTime(booking.updatedAt)}
                  </Typography>
                )}
                {paymentMethod && (
                  <Typography variant="body2">
                    <strong>Payment Method:</strong> {paymentMethod}
                  </Typography>
                )}
                {paymentId && (
                  <Typography variant="body2">
                    <strong>Payment ID:</strong> {paymentId}
                  </Typography>
                )}
                {booking.couponCode && (
                  <Typography variant="body2">
                    <strong>Coupon Applied:</strong> {booking.couponCode}
                  </Typography>
                )}
                {booking.discountAmount && (
                  <Typography variant="body2">
                    <strong>Discount:</strong> {formatCurrency(booking.discountAmount)}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CancellationDialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        processing={isProcessing}
      />

      <ReviewDialog
        open={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        onSubmit={handleReview}
        processing={isProcessing}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        amount={totalAmount}
        bookingId={bookingId}
        onPay={handlePayment}
        processing={paymentProcessing}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// ------------------- PROPTYPES -------------------
BookingCard.propTypes = {
  booking: PropTypes.object,
  role: PropTypes.oneOf(['customer', 'provider']),
  onConfirm: PropTypes.func,
  onChat: PropTypes.func,
  onDismiss: PropTypes.func,
  onCancel: PropTypes.func,
  onAccept: PropTypes.func,
  onReject: PropTypes.func,
  onStart: PropTypes.func,
  onComplete: PropTypes.func,
  onTrack: PropTypes.func,
  onPay: PropTypes.func,
  onReview: PropTypes.func,
  onViewDetails: PropTypes.func,
  onRebook: PropTypes.func,
  onShare: PropTypes.func,
  onReport: PropTypes.func,
  isProcessing: PropTypes.bool,
  showDetails: PropTypes.bool,
  className: PropTypes.string,
};

BookingCard.defaultProps = {
  booking: {},
  role: 'customer',
  onConfirm: null,
  onChat: null,
  onDismiss: null,
  onCancel: null,
  onAccept: null,
  onReject: null,
  onStart: null,
  onComplete: null,
  onTrack: null,
  onPay: null,
  onReview: null,
  onViewDetails: null,
  onRebook: null,
  onShare: null,
  onReport: null,
  isProcessing: false,
  showDetails: false,
  className: '',
};

export default BookingCard;