// src/contexts/PaymentContext.js
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/api';
import { toast } from 'react-toastify';

// Payment Status Constants
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// Payment Methods
export const PAYMENT_METHODS = {
  RAZORPAY: 'razorpay',
  CASH: 'cash',
  UPI: 'upi',
  CARD: 'card',
  NETBANKING: 'netbanking'
};

// Event Types
const PAYMENT_EVENTS = {
  INITIATED: 'payment:initiated',
  SUCCESS: 'payment:success',
  FAILED: 'payment:failed',
  VERIFIED: 'payment:verified',
  REFUNDED: 'payment:refunded'
};

const PaymentContext = createContext();

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within PaymentProvider');
  }
  return context;
};

// Helper function to validate amount
const validateAmount = (amount) => {
  const numAmount = Number(amount);
  if (isNaN(numAmount)) throw new Error('Invalid amount format');
  if (numAmount < 1) throw new Error('Minimum amount is ₹1');
  if (numAmount > 1000000) throw new Error('Maximum amount is ₹10,00,000');
  return numAmount;
};

// Helper function to format currency
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export const PaymentProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [retryAttempts, setRetryAttempts] = useState({});
  
  const razorpayInstanceRef = useRef(null);
  const eventListenersRef = useRef(new Map());
  const abortControllerRef = useRef(null);

  // Load Razorpay script with improved retry mechanism
  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve) => {
      // Check if already loaded
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        resolve(true);
        return;
      }

      // Check if script is already loading
      const existingScript = document.querySelector('script[src*="razorpay"]');
      if (existingScript) {
        const checkInterval = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(checkInterval);
            setRazorpayLoaded(true);
            resolve(true);
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 10000);
        return;
      }

      // Create new script with multiple CDN fallbacks
      const cdnUrls = [
        'https://checkout.razorpay.com/v1/checkout.js',
        'https://cdn.razorpay.com/static/checkout/v1/checkout.js',
        'https://checkout.razorpay.com/v1/checkout.js?version=1'
      ];
      
      let currentCdnIndex = 0;
      
      const loadScript = (url) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.defer = true;
        script.integrity = process.env.REACT_APP_RAZORPAY_SRI || '';
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
          console.log(`✅ Razorpay script loaded from ${url}`);
          setRazorpayLoaded(true);
          resolve(true);
        };
        
        script.onerror = () => {
          console.error(`❌ Failed to load Razorpay from ${url}`);
          currentCdnIndex++;
          if (currentCdnIndex < cdnUrls.length) {
            loadScript(cdnUrls[currentCdnIndex]);
          } else {
            console.error('❌ Failed to load Razorpay from all CDNs');
            resolve(false);
          }
        };
        
        document.body.appendChild(script);
      };
      
      loadScript(cdnUrls[currentCdnIndex]);
    });
  }, []);

  // Preload Razorpay script on component mount
  useEffect(() => {
    loadRazorpayScript();
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (razorpayInstanceRef.current) {
        razorpayInstanceRef.current = null;
      }
    };
  }, [loadRazorpayScript]);

  // Create payment order on backend
  const createOrder = useCallback(async (amount, bookingId, metadata = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Validate amount
      const validatedAmount = validateAmount(amount);
      
      // Validate booking ID
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      console.log('Creating payment order:', { amount: validatedAmount, bookingId });

      const response = await api.post('/payments/razorpay/create-order', {
        amount: validatedAmount,
        currency: 'INR',
        bookingId,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      });

      console.log('Order created:', response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to create order');
      }

      const orderData = response.data.data || response.data;
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent(PAYMENT_EVENTS.INITIATED, { 
        detail: { orderId: orderData.orderId, amount: validatedAmount, bookingId } 
      }));
      
      return orderData;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create payment order';
      console.error('❌ Create order error:', errorMessage);
      setError(errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize Razorpay payment
  const initiatePayment = useCallback(async (orderData, userDetails, onSuccess, onFailure) => {
    try {
      setLoading(true);
      setError(null);
      setPaymentStatus(PAYMENT_STATUS.PROCESSING);
      setCurrentPayment(orderData);

      // Validate Razorpay key
      const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        throw new Error('Razorpay key not configured. Please check environment variables.');
      }

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway. Please check your internet connection.');
      }

      // Validate required data
      if (!orderData?.orderId) {
        throw new Error('Invalid order data. Missing order ID.');
      }

      // Validate user details
      if (!userDetails?.name || !userDetails?.email || !userDetails?.phone) {
        console.warn('⚠️ Incomplete user details for prefill');
      }

      // Prepare Razorpay options
      const options = {
        key: razorpayKey,
        amount: orderData.amount, // Amount in paise
        currency: orderData.currency || 'INR',
        name: 'QuickServe',
        description: orderData.description || `Payment for Booking #${orderData.bookingId || 'N/A'}`,
        order_id: orderData.orderId,
        image: `${process.env.PUBLIC_URL}/logo.png`,
        handler: async (response) => {
          console.log('✅ Razorpay payment successful:', response);
          
          try {
            // Verify payment on backend
            const verification = await api.post('/payments/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: orderData.bookingId,
              metadata: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
              }
            });
            
            if (verification.data?.success) {
              console.log('✅ Payment verified successfully');
              setPaymentStatus(PAYMENT_STATUS.SUCCESS);
              
              // Dispatch success event
              window.dispatchEvent(new CustomEvent(PAYMENT_EVENTS.SUCCESS, { 
                detail: { ...response, bookingId: orderData.bookingId } 
              }));
              
              toast.success('Payment successful!');
              onSuccess?.({
                ...response,
                verified: true,
                amount: orderData.amount / 100, // Convert back to rupees
                bookingId: orderData.bookingId,
                transactionId: response.razorpay_payment_id
              });
            } else {
              throw new Error(verification.data?.message || 'Payment verification failed');
            }
          } catch (err) {
            console.error('❌ Payment verification error:', err);
            setPaymentStatus(PAYMENT_STATUS.FAILED);
            toast.error(err.message || 'Payment verification failed');
            onFailure?.(err.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: userDetails.name || 'Customer',
          email: userDetails.email || 'customer@example.com',
          contact: userDetails.phone || '9999999999'
        },
        notes: {
          bookingId: orderData.bookingId || 'N/A',
          userId: userDetails.userId || 'N/A',
          timestamp: new Date().toISOString(),
          ...orderData.notes
        },
        theme: {
          color: process.env.REACT_APP_PRIMARY_COLOR || '#fbbf24',
          hide_topbar: false
        },
        modal: {
          ondismiss: () => {
            console.log('⚠️ Payment modal dismissed by user');
            setPaymentStatus(PAYMENT_STATUS.CANCELLED);
            setError('Payment cancelled by user');
            toast.info('Payment cancelled');
            onFailure?.('Payment cancelled by user');
          },
          confirm_close: true,
          animation: true,
          escape: false
        },
        retry: {
          enabled: true,
          max_count: 3,
          retry: {
            enabled: true
          }
        },
        timeout: 300, // 5 minutes in seconds
        readonly: {
          email: false,
          contact: false,
          name: false
        },
        send_sms_hash: true,
        allow_rotation: false,
        remember_customer: true,
        customer_id: userDetails.userId,
        callback_url: `${window.location.origin}/payment/callback`,
        callback_method: 'get'
      };

      console.log('🚀 Opening Razorpay checkout...');
      const razorpay = new window.Razorpay(options);
      razorpayInstanceRef.current = razorpay;

      // Add event handlers
      razorpay.on('payment.failed', (response) => {
        console.error('❌ Payment failed:', response.error);
        const errorMsg = response.error?.description || response.error?.reason || 'Payment failed';
        setPaymentStatus(PAYMENT_STATUS.FAILED);
        setError(errorMsg);
        
        // Dispatch failure event
        window.dispatchEvent(new CustomEvent(PAYMENT_EVENTS.FAILED, { 
          detail: { error: errorMsg, orderId: orderData.orderId } 
        }));
        
        toast.error(errorMsg);
        onFailure?.(errorMsg);
        
        // Increment retry attempts
        setRetryAttempts(prev => ({
          ...prev,
          [orderData.orderId]: (prev[orderData.orderId] || 0) + 1
        }));
      });

      razorpay.on('payment.authorized', (response) => {
        console.log('✅ Payment authorized:', response);
      });

      razorpay.on('payment.captured', (response) => {
        console.log('✅ Payment captured:', response);
      });

      razorpay.on('payment.attempt', (response) => {
        console.log('Payment attempt:', response);
      });

      // Open Razorpay
      razorpay.open();
      
    } catch (err) {
      console.error('❌ Payment initiation error:', err);
      const errorMsg = err.message || 'Failed to initiate payment';
      setPaymentStatus(PAYMENT_STATUS.FAILED);
      setError(errorMsg);
      toast.error(errorMsg);
      onFailure?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loadRazorpayScript]);

  // Verify payment with backend
  const verifyPayment = useCallback(async (paymentData) => {
    try {
      setLoading(true);
      setError(null);

      if (!paymentData?.razorpay_order_id || !paymentData?.razorpay_payment_id) {
        throw new Error('Missing required payment data');
      }

      console.log('Verifying payment:', paymentData);

      const response = await api.post('/payments/razorpay/verify', paymentData);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Payment verification failed');
      }

      // Dispatch verified event
      window.dispatchEvent(new CustomEvent(PAYMENT_EVENTS.VERIFIED, { 
        detail: { paymentId: paymentData.razorpay_payment_id } 
      }));

      toast.success('Payment verified successfully');
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Payment verification failed';
      console.error('❌ Verify payment error:', errorMsg);
      setError(errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get payment history with pagination and filters
  const getPaymentHistory = useCallback(async (filters = {}, page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        ...filters
      };

      const response = await api.get('/payments/history', { params });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch payment history');
      }

      const historyData = response.data.data || response.data;
      setPaymentHistory(historyData.payments || historyData);
      
      return historyData;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch payment history';
      console.error('❌ Get payment history error:', errorMsg);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get payment details by ID
  const getPaymentDetails = useCallback(async (paymentId) => {
    try {
      setLoading(true);
      setError(null);

      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      const response = await api.get(`/payments/${paymentId}`);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to fetch payment details');
      }

      return response.data.data || response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch payment details';
      console.error('❌ Get payment details error:', errorMsg);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Process refund
  const processRefund = useCallback(async (paymentId, refundData = {}) => {
    try {
      setLoading(true);
      setError(null);

      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      const response = await api.post(`/payments/${paymentId}/refund`, refundData);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to process refund');
      }

      setPaymentStatus(PAYMENT_STATUS.REFUNDED);
      
      // Dispatch refund event
      window.dispatchEvent(new CustomEvent(PAYMENT_EVENTS.REFUNDED, { 
        detail: { paymentId, refundData } 
      }));
      
      toast.success('Refund processed successfully');
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to process refund';
      console.error('❌ Refund error:', errorMsg);
      setError(errorMsg);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset payment state
  const resetPayment = useCallback(() => {
    setPaymentStatus(null);
    setCurrentPayment(null);
    setError(null);
  }, []);

  // Retry failed payment
  const retryPayment = useCallback(async (paymentData, userDetails, onSuccess, onFailure) => {
    try {
      const retryCount = retryAttempts[paymentData.orderId] || 0;
      
      if (retryCount >= 3) {
        throw new Error('Maximum retry attempts reached. Please try again later.');
      }

      // Recreate order
      const newOrder = await createOrder(
        paymentData.amount / 100, // Convert paise to rupees
        paymentData.bookingId,
        { 
          retry: true, 
          originalOrderId: paymentData.orderId,
          retryCount: retryCount + 1
        }
      );

      // Initiate new payment
      await initiatePayment(
        {
          ...newOrder,
          description: paymentData.description,
          bookingId: paymentData.bookingId,
          notes: {
            ...paymentData.notes,
            retryAttempt: retryCount + 1
          }
        },
        userDetails,
        onSuccess,
        onFailure
      );
    } catch (err) {
      onFailure?.(err.message);
    }
  }, [createOrder, initiatePayment, retryAttempts]);

  // Subscribe to payment events
  const subscribeToPaymentEvents = useCallback((eventName, callback) => {
    if (!eventListenersRef.current.has(eventName)) {
      eventListenersRef.current.set(eventName, new Set());
    }
    eventListenersRef.current.get(eventName).add(callback);
    
    // Return unsubscribe function
    return () => {
      eventListenersRef.current.get(eventName)?.delete(callback);
    };
  }, []);

  // Add global event listeners
  useEffect(() => {
    const handlePaymentSuccess = (event) => {
      console.log('Global payment success:', event.detail);
    };
    
    window.addEventListener(PAYMENT_EVENTS.SUCCESS, handlePaymentSuccess);
    
    return () => {
      window.removeEventListener(PAYMENT_EVENTS.SUCCESS, handlePaymentSuccess);
    };
  }, []);

  const value = {
    // State
    loading,
    error,
    razorpayLoaded,
    paymentStatus,
    currentPayment,
    paymentHistory,
    retryAttempts,
    
    // Methods
    createOrder,
    initiatePayment,
    verifyPayment,
    getPaymentHistory,
    getPaymentDetails,
    processRefund,
    retryPayment,
    clearError,
    resetPayment,
    subscribeToPaymentEvents,
    
    // Utilities
    formatCurrency,
    PAYMENT_STATUS,
    PAYMENT_METHODS
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};

// Custom hook for payment status polling
export const usePaymentStatus = (paymentId, interval = 3000) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getPaymentDetails } = usePayment();

  useEffect(() => {
    if (!paymentId) return;

    let mounted = true;
    let timeoutId;

    const pollStatus = async () => {
      try {
        const payment = await getPaymentDetails(paymentId);
        if (mounted) {
          setStatus(payment.status);
          setLoading(false);
          
          // Stop polling if payment is completed or failed
          if (payment.status === PAYMENT_STATUS.SUCCESS || 
              payment.status === PAYMENT_STATUS.FAILED ||
              payment.status === PAYMENT_STATUS.REFUNDED) {
            return;
          }
          
          // Continue polling
          timeoutId = setTimeout(pollStatus, interval);
        }
      } catch (err) {
        console.error('Failed to poll payment status:', err);
        if (mounted) {
          timeoutId = setTimeout(pollStatus, interval);
        }
      }
    };

    pollStatus();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [paymentId, interval, getPaymentDetails]);

  return { status, loading };
};

// Custom hook for Razorpay script loading
export const useRazorpayScript = () => {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkScript = setInterval(() => {
      if (window.Razorpay) {
        setLoaded(true);
        setLoading(false);
        clearInterval(checkScript);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkScript);
      setLoading(false);
    }, 10000);

    return () => {
      clearInterval(checkScript);
      clearTimeout(timeout);
    };
  }, []);

  return { loaded, loading };
};

export default PaymentProvider;