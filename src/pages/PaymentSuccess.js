// src/pages/PaymentSuccess.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Download, 
  Mail, 
  Home, 
  Calendar, 
  Clock, 
  Receipt,
  Share2,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, isValid, parseISO } from 'date-fns';
import api from '../api/api';

// ==========================================================
// CONSTANTS
// ==========================================================
const PAYMENT_STATUS = {
  SUCCEEDED: 'succeeded',
  PROCESSING: 'processing',
  FAILED: 'failed',
  PENDING: 'pending',
  REFUNDED: 'refunded'
};

const PAYMENT_ERRORS = {
  NOT_FOUND: 'Payment not found',
  VERIFICATION_FAILED: 'Payment verification failed',
  EXPIRED: 'Payment session expired',
  INVALID: 'Invalid payment data'
};

const RECEIPT_CONFIG = {
  COMPANY_NAME: 'Quickks',
  COMPANY_EMAIL: 'support@quickks.com',
  COMPANY_PHONE: '+91-1234567890',
  COMPANY_ADDRESS: '123, Business Park, Mumbai, India'
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
  return isValid(date) ? format(date, 'MMMM dd, yyyy') : 'Invalid Date';
};

const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
  return isValid(date) ? format(date, 'hh:mm a') : 'Invalid Time';
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case PAYMENT_STATUS.SUCCEEDED:
      return 'text-green-600 bg-green-100';
    case PAYMENT_STATUS.PROCESSING:
      return 'text-yellow-600 bg-yellow-100';
    case PAYMENT_STATUS.FAILED:
      return 'text-red-600 bg-red-100';
    case PAYMENT_STATUS.REFUNDED:
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-blue-600 bg-blue-100';
  }
};

// ==========================================================
// LOADING SKELETON COMPONENT
// ==========================================================
const PaymentSuccessSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-6 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-80 mx-auto animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  </div>
);

// ==========================================================
// ERROR STATE COMPONENT
// ==========================================================
const PaymentErrorState = ({ error, onRetry, onGoHome }) => {
  const isVerificationError = error?.includes('verification') || error?.includes('verify');
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <motion.div 
          className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
          initial={{ rotate: -180 }}
          animate={{ rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <AlertCircle size={40} className="text-red-600" />
        </motion.div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isVerificationError ? 'Payment Verification Failed' : 'Something went wrong'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {error || 'We could not verify your payment. Please check your email for confirmation or try again.'}
        </p>

        <div className="flex flex-col gap-3">
          {isVerificationError && (
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-yellow-500 rounded-xl text-gray-900 font-semibold hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Retry Verification
            </button>
          )}

          <button
            onClick={onGoHome}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Go to Dashboard
          </button>

          <button
            onClick={() => window.location.href = '/contact'}
            className="px-6 py-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </motion.div>
  );
};

PaymentErrorState.propTypes = {
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onGoHome: PropTypes.func.isRequired
};

// ==========================================================
// RECEIPT DETAILS COMPONENT
// ==========================================================
const ReceiptDetails = ({ paymentDetails, onClose }) => {
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef(null);

  const handleCopyTransaction = useCallback(async () => {
    if (paymentDetails?.id) {
      try {
        await navigator.clipboard.writeText(paymentDetails.id);
        setCopied(true);
        toast.success('Transaction ID copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy');
      }
    }
  }, [paymentDetails?.id]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div 
      ref={receiptRef}
      className="bg-gray-50 rounded-xl p-6 mb-6 print:bg-white print:shadow-none print:p-4"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Receipt size={18} className="text-yellow-500" />
          Payment Receipt
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors print:hidden"
            aria-label="Print receipt"
          >
            <Printer size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors print:hidden"
            aria-label="Close receipt"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Transaction ID with Copy */}
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600">Transaction ID:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-gray-900 break-all max-w-[180px]">
              {paymentDetails?.id?.slice(-12) || 'N/A'}
            </span>
            <button
              onClick={handleCopyTransaction}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors print:hidden"
              aria-label="Copy transaction ID"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        
        {/* Date */}
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600 flex items-center gap-2">
            <Calendar size={16} />
            Date:
          </span>
          <span className="font-medium text-gray-900">
            {formatDate(paymentDetails?.created)}
          </span>
        </div>

        {/* Time */}
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600 flex items-center gap-2">
            <Clock size={16} />
            Time:
          </span>
          <span className="font-medium text-gray-900">
            {formatTime(paymentDetails?.created)}
          </span>
        </div>
        
        {/* Amount */}
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600">Amount:</span>
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(paymentDetails?.amount, paymentDetails?.currency)}
          </span>
        </div>
        
        {/* Payment Method */}
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600">Payment Method:</span>
          <span className="font-medium text-gray-900 capitalize">
            {paymentDetails?.payment_method?.replace('_', ' ') || 'Card'} 
            {paymentDetails?.card_last4 && ` ending in ${paymentDetails.card_last4}`}
          </span>
        </div>
        
        {/* Status */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600">Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(paymentDetails?.status)}`}>
            {paymentDetails?.status || 'Completed'}
          </span>
        </div>
      </div>

      {/* Description if available */}
      {paymentDetails?.description && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Description:</span> {paymentDetails.description}
          </p>
        </div>
      )}
    </div>
  );
};

ReceiptDetails.propTypes = {
  paymentDetails: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

// ==========================================================
// MAIN PAYMENT SUCCESS COMPONENT
// ==========================================================
const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [showReceipt, setShowReceipt] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch payment details
  const fetchPaymentDetails = useCallback(async (paymentId, isRetry = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      if (!isRetry) {
        setLoading(true);
      } else {
        setVerifying(true);
      }
      setError(null);

      // Track analytics
      try {
        // window.gtag?.('event', 'payment_verification_started', {
        //   payment_id: paymentId,
        //   retry: isRetry
        // });
      } catch (analyticsError) {
        // Ignore analytics errors
      }

      // Use API service with timeout
      const response = await api.get(`/api/v1/payments/${paymentId}`, {
        signal: abortControllerRef.current.signal,
        timeout: 15000 // 15 second timeout
      });

      if (!isMountedRef.current) return;

      if (response.data) {
        setPaymentDetails(response.data);
        
        // Track success
        try {
          // window.gtag?.('event', 'payment_verification_success', {
          //   payment_id: paymentId,
          //   status: response.data.status
          // });
        } catch (analyticsError) {
          // Ignore analytics errors
        }

        // Show success toast
        toast.success('Payment verified successfully!');
        
        // Clear any error state
        setError(null);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      // Handle abort error
      if (err.name === 'AbortError') {
        return;
      }

      console.error('Error fetching payment details:', err);

      // Handle different error types
      let errorMessage = 'Failed to verify payment. ';
      if (err.response) {
        // Server responded with error
        const status = err.response.status;
        if (status === 404) {
          errorMessage += PAYMENT_ERRORS.NOT_FOUND;
        } else if (status === 410) {
          errorMessage += PAYMENT_ERRORS.EXPIRED;
        } else if (status === 422) {
          errorMessage += PAYMENT_ERRORS.INVALID;
        } else {
          errorMessage += err.response.data?.message || 'Server error occurred.';
        }
      } else if (err.code === 'ECONNABORTED') {
        errorMessage += 'Request timeout. Please try again.';
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Please try again later.';
      }

      setError(errorMessage);

      // Track failure
      try {
        // window.gtag?.('event', 'payment_verification_failed', {
        //   payment_id: paymentId,
        //   error: errorMessage,
        //   retry: isRetry
        // });
      } catch (analyticsError) {
        // Ignore analytics errors
      }

      // For demo purposes, set mock data if API fails and not in production
      if (process.env.NODE_ENV === 'development') {
        setPaymentDetails({
          id: paymentId,
          amount: 99.99,
          currency: 'usd',
          status: 'succeeded',
          created: new Date().toISOString(),
          payment_method: 'card',
          card_last4: '4242',
          receipt_url: '#',
          customer_email: 'customer@example.com',
          description: 'Premium Service Booking'
        });
        setError(null);
        toast.success('Payment verified (Demo Mode)');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setVerifying(false);
      }
    }
  }, []);

  // Handle payment verification on mount
  useEffect(() => {
    const verifyPayment = async () => {
      // Get payment details from URL or state
      const queryParams = new URLSearchParams(location.search);
      let paymentIntentId = queryParams.get('payment_intent');
      let sessionId = queryParams.get('session_id');
      let bookingId = queryParams.get('booking_id');

      // Check for redirect status
      const redirectStatus = queryParams.get('redirect_status');
      if (redirectStatus === 'failed') {
        setError('Payment verification failed. Please try again or contact support.');
        setLoading(false);
        return;
      }

      // Use payment ID from URL or state
      const paymentId = paymentIntentId || sessionId || location.state?.paymentId;

      if (paymentId) {
        await fetchPaymentDetails(paymentId);
      } else if (location.state?.paymentDetails) {
        // Use payment details from navigation state
        setPaymentDetails(location.state.paymentDetails);
        setLoading(false);
        toast.success('Payment verified successfully!');
      } else if (bookingId) {
        // Fetch payment by booking ID
        try {
          const response = await api.get(`/api/v1/bookings/${bookingId}/payment`);
          if (response.data) {
            setPaymentDetails(response.data);
            setLoading(false);
          }
        } catch (err) {
          setError('Unable to retrieve payment details. Please check your bookings.');
          setLoading(false);
        }
      } else {
        // No payment information found
        setError('No payment information found. Please check your email for confirmation.');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [location, fetchPaymentDetails]);

  // Handle retry verification
  const handleRetry = useCallback(async () => {
    if (paymentDetails?.id) {
      setRetryCount(prev => prev + 1);
      await fetchPaymentDetails(paymentDetails.id, true);
    } else {
      // Get payment ID from URL
      const queryParams = new URLSearchParams(location.search);
      const paymentId = queryParams.get('payment_intent') || queryParams.get('session_id');
      if (paymentId) {
        setRetryCount(prev => prev + 1);
        await fetchPaymentDetails(paymentId, true);
      } else {
        toast.error('Unable to retry verification. No payment ID found.');
      }
    }
  }, [paymentDetails, location.search, fetchPaymentDetails]);

  // Handle download receipt
  const handleDownloadReceipt = useCallback(async () => {
    if (!paymentDetails) {
      toast.error('No payment details available');
      return;
    }

    try {
      // Track download attempt
      try {
        // window.gtag?.('event', 'receipt_download', {
        //   payment_id: paymentDetails.id
        // });
      } catch (analyticsError) {
        // Ignore analytics errors
      }

      // If receipt URL exists, open it
      if (paymentDetails.receipt_url && paymentDetails.receipt_url !== '#') {
        window.open(paymentDetails.receipt_url, '_blank');
        toast.success('Receipt opened in new tab');
        return;
      }

      // Generate receipt PDF
      toast.loading('Generating receipt...', { id: 'receipt' });
      
      // Call API to generate receipt
      const response = await api.post(`/api/v1/payments/${paymentDetails.id}/receipt`, {
        format: 'pdf'
      }, {
        responseType: 'blob'
      });

      toast.dismiss('receipt');

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${paymentDetails.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.dismiss('receipt');
      console.error('Download error:', error);
      
      // Fallback: Create a simple text receipt
      toast.error('Could not download receipt. Please try again or contact support.');
    }
  }, [paymentDetails]);

  // Handle email receipt
  const handleEmailReceipt = useCallback(() => {
    if (!paymentDetails) {
      toast.error('No payment details available');
      return;
    }

    try {
      // Track email attempt
      try {
        // window.gtag?.('event', 'receipt_email', {
        //   payment_id: paymentDetails.id
        // });
      } catch (analyticsError) {
        // Ignore analytics errors
      }

      const subject = encodeURIComponent(`Payment Receipt - ${RECEIPT_CONFIG.COMPANY_NAME}`);
      const body = encodeURIComponent(
        `Dear Customer,\n\n` +
        `Thank you for your payment. Here are your receipt details:\n\n` +
        `Transaction ID: ${paymentDetails.id}\n` +
        `Amount: ${formatCurrency(paymentDetails.amount, paymentDetails.currency)}\n` +
        `Date: ${formatDate(paymentDetails.created)}\n` +
        `Status: ${paymentDetails.status || 'Completed'}\n\n` +
        `If you have any questions, please contact us at ${RECEIPT_CONFIG.COMPANY_EMAIL}\n\n` +
        `Best regards,\n${RECEIPT_CONFIG.COMPANY_NAME}`
      );

      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      toast.success('Email client opened');
    } catch (error) {
      console.error('Email error:', error);
      toast.error('Failed to open email client');
    }
  }, [paymentDetails]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!paymentDetails) {
      toast.error('No payment details available');
      return;
    }

    try {
      const shareData = {
        title: `Payment Confirmation - ${RECEIPT_CONFIG.COMPANY_NAME}`,
        text: `Payment Successful! Transaction ID: ${paymentDetails.id}, Amount: ${formatCurrency(paymentDetails.amount, paymentDetails.currency)}`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared successfully');
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(
          `Payment Successful!\nTransaction ID: ${paymentDetails.id}\nAmount: ${formatCurrency(paymentDetails.amount, paymentDetails.currency)}\n\nView details: ${window.location.href}`
        );
        toast.success('Payment details copied to clipboard');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        toast.error('Failed to share');
      }
    }
  }, [paymentDetails]);

  // Handle go home
  const handleGoHome = useCallback(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  // Loading state
  if (loading) {
    return <PaymentSuccessSkeleton />;
  }

  // Error state
  if (error && !paymentDetails) {
    return (
      <PaymentErrorState
        error={error}
        onRetry={handleRetry}
        onGoHome={handleGoHome}
      />
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full print:shadow-none print:p-4"
      >
        {/* Success Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle size={40} className="text-green-600" />
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-gray-900 mb-2"
          >
            Payment Successful! 🎉
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600"
          >
            Thank you for your payment. Your transaction has been completed successfully.
          </motion.p>

          {/* Verification indicator */}
          {verifying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg"
            >
              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Verifying payment...</span>
            </motion.div>
          )}
        </div>

        {/* Payment Details Card */}
        {paymentDetails && (
          <AnimatePresence mode="wait">
            {showReceipt && (
              <ReceiptDetails 
                paymentDetails={paymentDetails} 
                onClose={() => setShowReceipt(false)}
              />
            )}
          </AnimatePresence>
        )}

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadReceipt}
              className="px-6 py-3 border-2 border-yellow-500 rounded-xl text-yellow-700 font-semibold hover:bg-yellow-50 transition-all flex items-center justify-center gap-2 group"
              aria-label="Download receipt"
            >
              <Download size={18} className="group-hover:scale-110 transition-transform" />
              Download Receipt
            </button>

            <button
              onClick={handleEmailReceipt}
              className="px-6 py-3 border-2 border-yellow-500 rounded-xl text-yellow-700 font-semibold hover:bg-yellow-50 transition-all flex items-center justify-center gap-2 group"
              aria-label="Email receipt"
            >
              <Mail size={18} className="group-hover:scale-110 transition-transform" />
              Email Receipt
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleShare}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 group"
              aria-label="Share payment"
            >
              <Share2 size={18} className="group-hover:scale-110 transition-transform" />
              Share
            </button>

            <button
              onClick={handleGoHome}
              className="px-6 py-3 bg-yellow-500 rounded-xl text-gray-900 font-semibold hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 group"
            >
              <Home size={18} className="group-hover:scale-110 transition-transform" />
              Dashboard
            </button>
          </div>

          <button
            onClick={() => navigate('/services')}
            className="px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} />
            Book Another Service
          </button>
        </motion.div>

        {/* Footer Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 pt-4 border-t border-gray-200"
        >
          <p className="text-xs text-gray-500 text-center">
            A confirmation email has been sent to {paymentDetails?.customer_email || 'your registered email address'}. 
            If you have any questions, please contact our support team.
          </p>
          <p className="text-xs text-gray-400 text-center mt-2">
            Reference: {paymentDetails?.id}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

PaymentSuccess.propTypes = {
  // No props needed as we use location and navigate
};

PaymentSuccess.displayName = 'PaymentSuccess';

export default PaymentSuccess;