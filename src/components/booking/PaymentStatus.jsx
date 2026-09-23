// src/components/booking/PaymentStatus.jsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Chip,
  Button,
  Stack,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  IconButton,
  Collapse,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  InputAdornment,
  Skeleton,
  Snackbar,
  Fade
} from '@mui/material';
import {
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCreditCard,
  FaMoneyBillWave,
  FaWallet,
  FaQrcode,
  FaMobileAlt,
  FaLock,
  FaShieldAlt,
  FaReceipt,
  FaPrint,
  FaDownload,
  FaShare,
  FaCopy,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaSpinner,
  FaArrowLeft,
  FaArrowRight
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { toast } from 'react-hot-toast';
import api from '../../api/api';

// ==========================================================
// CONSTANTS
// ==========================================================
const PAYMENT_STATUS = {
  COMPLETED: {
    label: 'Payment Completed',
    color: 'success',
    icon: FaCheckCircle,
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    progress: 100,
    statusCode: 'success'
  },
  PENDING: {
    label: 'Payment Pending',
    color: 'warning',
    icon: FaClock,
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#f59e0b',
    progress: 50,
    statusCode: 'pending'
  },
  FAILED: {
    label: 'Payment Failed',
    color: 'error',
    icon: FaExclamationTriangle,
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    progress: 0,
    statusCode: 'error'
  },
  PROCESSING: {
    label: 'Processing Payment',
    color: 'info',
    icon: FaSpinner,
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
    progress: 75,
    statusCode: 'info'
  },
  REFUNDED: {
    label: 'Refunded',
    color: 'default',
    icon: FaReceipt,
    bgColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: '#6b7280',
    progress: 0,
    statusCode: 'default'
  }
};

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit/Debit Card', icon: FaCreditCard, requiresForm: true },
  { id: 'upi', label: 'UPI', icon: FaMobileAlt, requiresForm: true },
  { id: 'netbanking', label: 'Net Banking', icon: FaWallet, requiresForm: false },
  { id: 'wallet', label: 'Wallet', icon: FaMoneyBillWave, requiresForm: false },
  { id: 'qr', label: 'QR Code', icon: FaQrcode, requiresForm: false }
];

// ==========================================================
// VALIDATION HELPERS
// ==========================================================
const validateCardNumber = (value) => {
  const cleaned = value.replace(/\s/g, '');
  if (!cleaned) return 'Card number is required';
  if (!/^\d{16}$/.test(cleaned)) return 'Please enter a valid 16-digit card number';
  return null;
};

const validateExpiryDate = (value) => {
  if (!value) return 'Expiry date is required';
  if (!/^\d{2}\/\d{2}$/.test(value)) return 'Please use MM/YY format';
  const [month, year] = value.split('/').map(Number);
  if (month < 1 || month > 12) return 'Invalid month';
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return 'Card has expired';
  }
  return null;
};

const validateCVV = (value) => {
  if (!value) return 'CVV is required';
  if (!/^\d{3,4}$/.test(value)) return 'Please enter a valid CVV (3-4 digits)';
  return null;
};

const validateUPI = (value) => {
  if (!value) return 'UPI ID is required';
  if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(value)) {
    return 'Please enter a valid UPI ID (e.g., username@bank)';
  }
  return null;
};

// ==========================================================
// PAYMENT MODAL COMPONENT
// ==========================================================
const PaymentModal = ({ 
  open, 
  onClose, 
  booking, 
  onSuccess, 
  onFailure,
  onPaymentMethodChange 
}) => {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    upiId: '',
    cardholderName: ''
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setPaymentData({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        upiId: '',
        cardholderName: ''
      });
      setErrors({});
      setTouched({});
      setProcessing(false);
    }
  }, [open]);

  const handleInputChange = useCallback((field, value) => {
    // Sanitize input
    let sanitizedValue = value;
    if (field === 'cardNumber') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 16);
    } else if (field === 'cvv') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 4);
    } else if (field === 'expiryDate') {
      sanitizedValue = value.replace(/\D/g, '').slice(0, 4);
      if (sanitizedValue.length >= 2) {
        sanitizedValue = sanitizedValue.slice(0, 2) + '/' + sanitizedValue.slice(2);
      }
    }
    
    setPaymentData(prev => ({ ...prev, [field]: sanitizedValue }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const handlePaymentMethodChange = useCallback((e) => {
    const method = e.target.value;
    setPaymentMethod(method);
    setErrors({});
    setTouched({});
    onPaymentMethodChange?.(method);
  }, [onPaymentMethodChange]);

  const validatePaymentForm = useCallback(() => {
    const newErrors = {};
    
    if (paymentMethod === 'card') {
      const cardError = validateCardNumber(paymentData.cardNumber);
      if (cardError) newErrors.cardNumber = cardError;
      
      const expiryError = validateExpiryDate(paymentData.expiryDate);
      if (expiryError) newErrors.expiryDate = expiryError;
      
      const cvvError = validateCVV(paymentData.cvv);
      if (cvvError) newErrors.cvv = cvvError;
      
      if (!paymentData.cardholderName.trim()) {
        newErrors.cardholderName = 'Cardholder name is required';
      }
    } else if (paymentMethod === 'upi') {
      const upiError = validateUPI(paymentData.upiId);
      if (upiError) newErrors.upiId = upiError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [paymentMethod, paymentData]);

  const handlePayment = useCallback(async () => {
    // Validate form
    if (!validatePaymentForm()) {
      toast.error('Please fix the errors before proceeding');
      return;
    }

    setProcessing(true);
    
    try {
      // Prepare payment payload
      const payload = {
        bookingId: booking.id,
        amount: booking.amount,
        paymentMethod,
        paymentDetails: {
          ...paymentData,
          // Don't send sensitive data in production without encryption
          // This is a simplified version - use secure payment gateway
        }
      };

      // Call API to process payment
      const response = await api.post(`/api/v1/bookings/${booking.id}/pay`, payload);
      
      if (response.data.status === 'success') {
        toast.success('Payment completed successfully!');
        onSuccess?.(response.data);
        onClose();
      } else {
        throw new Error(response.data.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = error.response?.data?.message || 'Payment failed. Please try again.';
      toast.error(errorMessage);
      onFailure?.(error);
      
      // Track payment failure (analytics)
      try {
        // window.gtag?.('event', 'payment_failed', { 
        //   bookingId: booking.id,
        //   method: paymentMethod,
        //   error: errorMessage 
        // });
      } catch (analyticsError) {
        // Ignore analytics errors
      }
    } finally {
      setProcessing(false);
    }
  }, [booking, paymentMethod, paymentData, validatePaymentForm, onSuccess, onFailure, onClose]);

  // Format card number for display
  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : value;
  };

  const getMethodIcon = useCallback((methodId) => {
    const method = PAYMENT_METHODS.find(m => m.id === methodId);
    return method?.icon || FaCreditCard;
  }, []);

  // Check if current method requires form
  const requiresForm = PAYMENT_METHODS.find(m => m.id === paymentMethod)?.requiresForm ?? false;

  return (
    <Dialog 
      open={open} 
      onClose={processing ? undefined : onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh' }
      }}
      aria-labelledby="payment-dialog-title"
    >
      <DialogTitle id="payment-dialog-title" sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            Complete Payment
          </Typography>
          <IconButton onClick={onClose} size="small" disabled={processing} aria-label="Close">
            <FaTimes />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Booking #{booking.id} • Amount: ₹{booking.amount?.toLocaleString()}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Payment Methods */}
          <Box role="radiogroup" aria-label="Payment methods">
            <Typography variant="subtitle2" gutterBottom>
              Select Payment Method
            </Typography>
            <RadioGroup 
              value={paymentMethod} 
              onChange={handlePaymentMethodChange}
              aria-label="Payment method"
            >
              <Grid container spacing={1}>
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <Grid item xs={12} sm={6} key={method.id}>
                      <Paper
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                          bgcolor: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: '#6366f1',
                            bgcolor: 'rgba(99, 102, 241, 0.05)'
                          },
                          '&:focus-within': {
                            outline: '2px solid #6366f1',
                            outlineOffset: 2
                          }
                        }}
                        onClick={() => setPaymentMethod(method.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setPaymentMethod(method.id);
                          }
                        }}
                      >
                        <FormControlLabel
                          value={method.id}
                          control={<Radio />}
                          label={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Icon size={20} color={isSelected ? '#6366f1' : '#94a3b8'} />
                              <Typography variant="body2">{method.label}</Typography>
                            </Stack>
                          }
                          sx={{ width: '100%', m: 0 }}
                        />
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </RadioGroup>
          </Box>

          {/* Payment Form */}
          {requiresForm && (
            <Fade in={true}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {paymentMethod === 'card' ? 'Card Details' : 'UPI Details'}
                </Typography>
                
                {paymentMethod === 'card' && (
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Card Number"
                      placeholder="1234 5678 9012 3456"
                      value={formatCardNumber(paymentData.cardNumber)}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      error={touched.cardNumber && !!errors.cardNumber}
                      helperText={touched.cardNumber && errors.cardNumber}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FaCreditCard size={16} color="#94a3b8" />
                          </InputAdornment>
                        )
                      }}
                      aria-label="Card number"
                      aria-describedby="card-number-helper"
                    />
                    <TextField
                      fullWidth
                      label="Cardholder Name"
                      placeholder="John Doe"
                      value={paymentData.cardholderName}
                      onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                      error={touched.cardholderName && !!errors.cardholderName}
                      helperText={touched.cardholderName && errors.cardholderName}
                      aria-label="Cardholder name"
                    />
                    <Stack direction="row" spacing={2}>
                      <TextField
                        fullWidth
                        label="Expiry Date"
                        placeholder="MM/YY"
                        value={paymentData.expiryDate}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                        error={touched.expiryDate && !!errors.expiryDate}
                        helperText={touched.expiryDate && errors.expiryDate}
                        aria-label="Expiry date"
                      />
                      <TextField
                        fullWidth
                        label="CVV"
                        placeholder="123"
                        type="password"
                        value={paymentData.cvv}
                        onChange={(e) => handleInputChange('cvv', e.target.value)}
                        error={touched.cvv && !!errors.cvv}
                        helperText={touched.cvv && errors.cvv}
                        inputProps={{ maxLength: 4, autoComplete: 'cc-csc' }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="3-digit security code" arrow>
                                <FaInfoCircle size={14} color="#94a3b8" />
                              </Tooltip>
                            </InputAdornment>
                          )
                        }}
                        aria-label="CVV"
                      />
                    </Stack>
                  </Stack>
                )}

                {paymentMethod === 'upi' && (
                  <TextField
                    fullWidth
                    label="UPI ID"
                    placeholder="username@okhdfcbank"
                    value={paymentData.upiId}
                    onChange={(e) => handleInputChange('upiId', e.target.value)}
                    error={touched.upiId && !!errors.upiId}
                    helperText={touched.upiId && errors.upiId}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FaMobileAlt size={16} color="#94a3b8" />
                        </InputAdornment>
                      )
                    }}
                    aria-label="UPI ID"
                  />
                )}
              </Box>
            </Fade>
          )}

          {/* Security Notice */}
          <Alert 
            severity="info" 
            icon={<FaLock />}
            sx={{ '& .MuiAlert-icon': { color: '#6366f1' } }}
          >
            Your payment is secure. We use 256-bit SSL encryption.
          </Alert>

          {/* Payment summary */}
          <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Booking Amount</Typography>
              <Typography variant="body2" fontWeight="bold">₹{booking.amount?.toLocaleString()}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Convenience Fee</Typography>
              <Typography variant="body2">₹0.00</Typography>
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body1" fontWeight="bold">Total</Typography>
              <Typography variant="body1" fontWeight="bold" color="primary">
                ₹{booking.amount?.toLocaleString()}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          onClick={onClose} 
          disabled={processing}
          aria-label="Cancel payment"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handlePayment}
          disabled={processing}
          sx={{ 
            bgcolor: '#6366f1', 
            '&:hover': { bgcolor: '#4f46e5' },
            minWidth: 120
          }}
          aria-label={`Pay ₹${booking.amount?.toLocaleString()}`}
        >
          {processing ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            `Pay ₹${booking.amount?.toLocaleString()}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// PropTypes for PaymentModal
PaymentModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  booking: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    amount: PropTypes.number.isRequired,
    paymentStatus: PropTypes.string
  }).isRequired,
  onSuccess: PropTypes.func,
  onFailure: PropTypes.func,
  onPaymentMethodChange: PropTypes.func
};

// ==========================================================
// PAYMENT RECEIPT COMPONENT
// ==========================================================
const PaymentReceipt = ({ booking, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate download
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error('Failed to download receipt');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCopy = useCallback(() => {
    if (booking.transactionId) {
      navigator.clipboard?.writeText(booking.transactionId)
        .then(() => {
          setCopied(true);
          toast.success('Transaction ID copied');
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          toast.error('Failed to copy');
        });
    }
  }, [booking.transactionId]);

  if (loading) {
    return (
      <Card sx={{ mt: 2, p: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Skeleton variant="text" width="60%" height={30} />
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="rectangular" height={100} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 2, p: 2, bgcolor: '#f8fafc' }} ref={receiptRef}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            Payment Receipt
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Print" arrow>
              <IconButton size="small" onClick={handlePrint} aria-label="Print receipt">
                <FaPrint />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download" arrow>
              <IconButton size="small" onClick={handleDownload} aria-label="Download receipt">
                <FaDownload />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share" arrow>
              <IconButton size="small" onClick={() => toast.success('Share link copied')} aria-label="Share receipt">
                <FaShare />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Booking ID</Typography>
            <Typography variant="body2" fontWeight="medium">#{booking.id}</Typography>
          </Stack>
          
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">Transaction ID</Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" fontWeight="medium" sx={{ fontFamily: 'monospace' }}>
                {booking.transactionId || `TXN${Date.now()}`}
              </Typography>
              <IconButton size="small" onClick={handleCopy} aria-label="Copy transaction ID">
                {copied ? <FaCheck size={14} color="#10b981" /> : <FaCopy size={14} />}
              </IconButton>
            </Stack>
          </Stack>
          
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Amount</Typography>
            <Typography variant="body2" fontWeight="bold" color="primary">
              ₹{booking.amount?.toLocaleString()}
            </Typography>
          </Stack>
          
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Payment Date</Typography>
            <Typography variant="body2">
              {format(new Date(), 'dd MMM yyyy, hh:mm a')}
            </Typography>
          </Stack>
          
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Payment Method</Typography>
            <Typography variant="body2">{booking.paymentMethod || 'Card'}</Typography>
          </Stack>
          
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Status</Typography>
            <Chip 
              label="Completed" 
              size="small" 
              color="success" 
              icon={<FaCheckCircle size={12} />}
            />
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
          Thank you for your payment! A confirmation email has been sent.
        </Typography>
      </CardContent>
    </Card>
  );
};

// PropTypes for PaymentReceipt
PaymentReceipt.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    amount: PropTypes.number,
    transactionId: PropTypes.string,
    paymentMethod: PropTypes.string,
    paymentStatus: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func
};

// ==========================================================
// MAIN PAYMENT STATUS COMPONENT
// ==========================================================
const PaymentStatus = ({ 
  booking,
  onPayment,
  onRetry,
  showReceipt = true,
  showActions = true,
  compact = false,
  variant = 'default',
  className = '',
  style = {},
  onStatusChange
}) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Notify when status changes
  useEffect(() => {
    if (booking?.paymentStatus && onStatusChange) {
      onStatusChange(booking.paymentStatus);
    }
  }, [booking?.paymentStatus, onStatusChange]);

  const status = useMemo(() => {
    const paymentStatus = booking?.paymentStatus || booking?.status || 'PENDING';
    return PAYMENT_STATUS[paymentStatus] || PAYMENT_STATUS.PENDING;
  }, [booking]);

  const StatusIcon = status.icon;

  // Handle payment
  const handlePaymentClick = useCallback(async () => {
    if (onPayment) {
      setPaymentProcessing(true);
      try {
        await onPayment(booking.id);
        setPaymentProcessing(false);
      } catch (error) {
        setPaymentProcessing(false);
        setErrorMessage(error.message);
      }
    } else {
      setPaymentModalOpen(true);
    }
  }, [booking?.id, onPayment]);

  // Handle payment success
  const handlePaymentSuccess = useCallback((data) => {
    if (isMounted.current) {
      setShowReceiptDetails(true);
      if (onPayment) onPayment(booking.id, data);
      // Track success
      try {
        // window.gtag?.('event', 'payment_success', { 
        //   bookingId: booking.id,
        //   method: data.paymentMethod 
        // });
      } catch (error) {
        // Ignore analytics errors
      }
    }
  }, [booking?.id, onPayment]);

  // Handle payment failure
  const handlePaymentFailure = useCallback((error) => {
    if (isMounted.current) {
      setErrorMessage(error.message || 'Payment failed');
      setRetryCount(prev => prev + 1);
    }
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    if (onRetry) {
      onRetry(booking.id);
    } else {
      setPaymentModalOpen(true);
    }
  }, [booking?.id, onRetry]);

  // Get payment progress
  const getPaymentProgress = useCallback(() => {
    if (booking?.paymentStatus === 'COMPLETED') return 100;
    if (booking?.paymentStatus === 'PROCESSING') return 75;
    if (booking?.paymentStatus === 'PENDING') return 50;
    if (booking?.paymentStatus === 'FAILED') return 0;
    return 0;
  }, [booking?.paymentStatus]);

  // Compact view
  if (compact) {
    return (
      <Box className={className} style={style}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            icon={<StatusIcon size={14} />}
            label={status.label}
            color={status.color}
            size="small"
            variant={booking?.paymentStatus === 'COMPLETED' ? 'filled' : 'outlined'}
          />
          {booking?.paymentStatus !== 'COMPLETED' && booking?.paymentStatus !== 'FAILED' && (
            <Button
              size="small"
              variant="contained"
              onClick={handlePaymentClick}
              disabled={paymentProcessing}
              sx={{ 
                minWidth: 80,
                bgcolor: '#6366f1',
                '&:hover': { bgcolor: '#4f46e5' }
              }}
            >
              {paymentProcessing ? <CircularProgress size={16} /> : `Pay ₹${booking?.amount}`}
            </Button>
          )}
          {booking?.paymentStatus === 'FAILED' && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleRetry}
            >
              Retry
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box className={className} style={style}>
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: variant === 'detailed' ? 3 : 2,
              borderRadius: 3,
              bgcolor: status.bgColor,
              borderColor: status.borderColor,
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: 2
              }
            }}
            role="status"
            aria-label={`Payment status: ${status.label}`}
          >
            <Stack spacing={variant === 'detailed' ? 3 : 2}>
              {/* Status Header */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <StatusIcon size={variant === 'detailed' ? 24 : 20} color={status.borderColor} />
                  <Typography variant={variant === 'detailed' ? 'h6' : 'subtitle1'} fontWeight={600}>
                    {status.label}
                  </Typography>
                  <Chip
                    label={booking?.paymentStatus}
                    size="small"
                    color={status.color}
                    sx={{ ml: 1 }}
                  />
                </Stack>

                {showActions && booking?.paymentStatus === 'FAILED' && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<FaSpinner className={retryCount > 3 ? 'animate-spin' : ''} />}
                    onClick={handleRetry}
                    sx={{ 
                      '&:hover': { 
                        bgcolor: 'rgba(239, 68, 68, 0.04)' 
                      }
                    }}
                  >
                    Retry Payment
                  </Button>
                )}

                {showActions && booking?.paymentStatus !== 'COMPLETED' && booking?.paymentStatus !== 'FAILED' && (
                  <Button
                    variant="contained"
                    startIcon={paymentProcessing ? <CircularProgress size={16} /> : <FaWallet />}
                    onClick={handlePaymentClick}
                    disabled={paymentProcessing}
                    sx={{ 
                      bgcolor: '#6366f1', 
                      '&:hover': { bgcolor: '#4f46e5' },
                      minWidth: 140
                    }}
                  >
                    {paymentProcessing ? 'Processing...' : `Pay Now ₹${booking?.amount?.toLocaleString()}`}
                  </Button>
                )}
              </Stack>

              {/* Error Message */}
              {errorMessage && (
                <Alert 
                  severity="error" 
                  onClose={() => setErrorMessage(null)}
                  sx={{ 
                    '& .MuiAlert-icon': { color: '#ef4444' },
                    borderRadius: 2
                  }}
                >
                  {errorMessage}
                </Alert>
              )}

              {/* Progress Bar */}
              {booking?.paymentStatus !== 'COMPLETED' && booking?.paymentStatus !== 'FAILED' && (
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={getPaymentProgress()}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'rgba(0,0,0,0.05)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: status.borderColor,
                        borderRadius: 2,
                        transition: 'all 0.5s ease'
                      }
                    }}
                    aria-label="Payment progress"
                  />
                  <Stack direction="row" justifyContent="space-between" mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Payment Progress
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getPaymentProgress()}%
                    </Typography>
                  </Stack>
                </Box>
              )}

              {/* Payment Details */}
              {variant === 'detailed' && (
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={{ xs: 1, sm: 2 }} 
                  flexWrap="wrap" 
                  justifyContent="space-between"
                  sx={{ bgcolor: 'rgba(255,255,255,0.5)', p: 2, borderRadius: 2 }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Amount
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      ₹{booking?.amount?.toLocaleString()}
                    </Typography>
                  </Box>
                  {booking?.paymentDate && isValid(new Date(booking.paymentDate)) && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Payment Date
                      </Typography>
                      <Typography variant="body2">
                        {format(new Date(booking.paymentDate), 'dd MMM yyyy, hh:mm a')}
                      </Typography>
                    </Box>
                  )}
                  {booking?.paymentMethod && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Payment Method
                      </Typography>
                      <Typography variant="body2" textTransform="capitalize">
                        {booking.paymentMethod}
                      </Typography>
                    </Box>
                  )}
                  {booking?.paymentStatus === 'FAILED' && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Error Code
                      </Typography>
                      <Typography variant="body2" color="error">
                        {booking.errorCode || 'ERR-001'}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              )}

              {/* Security Info */}
              <Stack direction="row" alignItems="center" spacing={1}>
                <FaShieldAlt size={12} color="#94a3b8" />
                <Typography variant="caption" color="text.secondary">
                  Secured by 256-bit SSL encryption
                </Typography>
              </Stack>

              {/* Receipt Section */}
              {showReceipt && booking?.paymentStatus === 'COMPLETED' && (
                <Collapse in={showReceiptDetails}>
                  <PaymentReceipt booking={booking} onClose={() => setShowReceiptDetails(false)} />
                </Collapse>
              )}

              {booking?.paymentStatus === 'COMPLETED' && !showReceiptDetails && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<FaReceipt />}
                  onClick={() => setShowReceiptDetails(true)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  View Receipt
                </Button>
              )}
            </Stack>
          </Paper>
        </motion.div>
      </AnimatePresence>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        booking={booking}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onPaymentMethodChange={(method) => {
          // Track payment method selection
          try {
            // window.gtag?.('event', 'payment_method_selected', { method });
          } catch (error) {
            // Ignore analytics errors
          }
        }}
      />
    </Box>
  );
};

// PropTypes for PaymentStatus
PaymentStatus.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    amount: PropTypes.number,
    paymentStatus: PropTypes.oneOf(['COMPLETED', 'PENDING', 'FAILED', 'PROCESSING', 'REFUNDED']),
    paymentDate: PropTypes.string,
    paymentMethod: PropTypes.string,
    transactionId: PropTypes.string,
    errorCode: PropTypes.string,
    status: PropTypes.string
  }).isRequired,
  onPayment: PropTypes.func,
  onRetry: PropTypes.func,
  onStatusChange: PropTypes.func,
  showReceipt: PropTypes.bool,
  showActions: PropTypes.bool,
  compact: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'compact', 'detailed']),
  className: PropTypes.string,
  style: PropTypes.object
};

// Default props
PaymentStatus.defaultProps = {
  showReceipt: true,
  showActions: true,
  compact: false,
  variant: 'default',
  className: '',
  style: {}
};

// ==========================================================
// HELPER COMPONENTS
// ==========================================================
export const CompactPaymentStatus = (props) => (
  <PaymentStatus {...props} compact={true} showReceipt={false} showActions={true} />
);

export const DetailedPaymentStatus = (props) => (
  <PaymentStatus {...props} variant="detailed" showReceipt={true} />
);

export const PaymentStatusLoader = () => (
  <Box sx={{ p: 2 }}>
    <Stack spacing={2}>
      <Skeleton variant="rectangular" height={60} borderRadius={3} />
      <Skeleton variant="text" width="60%" height={30} />
      <Skeleton variant="text" width="40%" height={20} />
    </Stack>
  </Box>
);

export default PaymentStatus;