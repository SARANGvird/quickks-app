// src/hooks/useCreateBooking.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { useNotifications } from "../contexts/NotificationContext";

// ==========================================================
// CONSTANTS
// ==========================================================
export const BOOKING_QUERY_KEYS = {
  ALL: ["bookings"],
  USER_BOOKINGS: (userId) => ["bookings", "user", userId],
  PROVIDER_BOOKINGS: (providerId) => ["bookings", "provider", providerId],
  BOOKING_DETAILS: (bookingId) => ["bookings", "detail", bookingId],
  UPCOMING: ["bookings", "upcoming"],
  PAST: ["bookings", "past"],
  CANCELLED: ["bookings", "cancelled"]
};

export const BOOKING_ERROR_CODES = {
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  TIME_SLOT_CONFLICT: "TIME_SLOT_CONFLICT",
  INVALID_ADDRESS: "INVALID_ADDRESS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  SERVICE_NOT_AVAILABLE: "SERVICE_NOT_AVAILABLE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_SCHEDULE: "INVALID_SCHEDULE",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE"
};

const BOOKING_ERROR_MESSAGES = {
  [BOOKING_ERROR_CODES.PROVIDER_UNAVAILABLE]: "The selected professional is not available at this time. Please choose another time or professional.",
  [BOOKING_ERROR_CODES.TIME_SLOT_CONFLICT]: "This time slot is no longer available. Please select a different time.",
  [BOOKING_ERROR_CODES.INVALID_ADDRESS]: "Please provide a valid service address.",
  [BOOKING_ERROR_CODES.PAYMENT_FAILED]: "Payment processing failed. Please check your payment method and try again.",
  [BOOKING_ERROR_CODES.SERVICE_NOT_AVAILABLE]: "This service is currently unavailable in your area.",
  [BOOKING_ERROR_CODES.RATE_LIMIT_EXCEEDED]: "Too many booking attempts. Please wait a moment before trying again.",
  [BOOKING_ERROR_CODES.VALIDATION_ERROR]: "Please check your booking details and try again.",
  [BOOKING_ERROR_CODES.UNAUTHORIZED]: "Please login to continue with your booking.",
  [BOOKING_ERROR_CODES.NETWORK_ERROR]: "Network error. Please check your internet connection and try again.",
  [BOOKING_ERROR_CODES.INVALID_SCHEDULE]: "Please select a valid date and time (at least 2 hours in advance).",
  [BOOKING_ERROR_CODES.SERVICE_UNAVAILABLE]: "This service is temporarily unavailable. Please try again later."
};

const DEFAULT_CONFIG = {
  MAX_RETRY_COUNT: 2,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000,
  MIN_ADVANCE_HOURS: 2,
  MAX_FUTURE_DAYS: 30
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const generateIdempotencyKey = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const uuid = crypto.randomUUID ? crypto.randomUUID() : `${timestamp}${random}`;
  return `${timestamp}_${random}_${uuid}`;
};

const validateBookingData = (data) => {
  const errors = [];
  
  // Provider validation
  if (!data.providerId) {
    errors.push({ field: 'providerId', message: 'Please select a service provider' });
  }
  
  // Service type validation
  if (!data.serviceType) {
    errors.push({ field: 'serviceType', message: 'Please select a service type' });
  }
  
  // Address validation
  if (!data.address || data.address.trim() === '') {
    errors.push({ field: 'address', message: 'Please enter your service address' });
  } else if (data.address.length < 10) {
    errors.push({ field: 'address', message: 'Please enter a complete address' });
  }
  
  // Schedule validation
  if (!data.scheduledAt) {
    errors.push({ field: 'scheduledAt', message: 'Please select a date and time' });
  } else {
    const scheduledDate = new Date(data.scheduledAt);
    const now = new Date();
    const minDate = new Date(now.getTime() + DEFAULT_CONFIG.MIN_ADVANCE_HOURS * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + DEFAULT_CONFIG.MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000);
    
    if (isNaN(scheduledDate.getTime())) {
      errors.push({ field: 'scheduledAt', message: 'Invalid date format' });
    } else if (scheduledDate < minDate) {
      errors.push({ 
        field: 'scheduledAt', 
        message: `Please book at least ${DEFAULT_CONFIG.MIN_ADVANCE_HOURS} hours in advance` 
      });
    } else if (scheduledDate > maxDate) {
      errors.push({ 
        field: 'scheduledAt', 
        message: `Bookings can only be made up to ${DEFAULT_CONFIG.MAX_FUTURE_DAYS} days in advance` 
      });
    }
  }
  
  // Location validation (if required)
  if (data.requireLocation && (!data.latitude || !data.longitude)) {
    errors.push({ field: 'location', message: 'Please select your location on the map' });
  }
  
  // Contact info validation (if required)
  if (data.requireContact && (!data.phone || !data.email)) {
    if (!data.phone) errors.push({ field: 'phone', message: 'Please provide your phone number' });
    if (!data.email) errors.push({ field: 'email', message: 'Please provide your email address' });
  }
  
  // Additional notes length validation
  if (data.notes && data.notes.length > 500) {
    errors.push({ field: 'notes', message: 'Additional notes cannot exceed 500 characters' });
  }
  
  return errors;
};

const formatBookingData = (data) => {
  const formattedData = { ...data };
  
  // Format scheduledAt date
  if (formattedData.scheduledAt) {
    const date = formattedData.scheduledAt instanceof Date 
      ? formattedData.scheduledAt 
      : new Date(formattedData.scheduledAt);
    
    if (!isNaN(date.getTime())) {
      formattedData.scheduledAt = date.toISOString();
    } else {
      throw new Error('Invalid scheduled date/time');
    }
  }
  
  // Ensure numeric fields are numbers
  if (formattedData.providerId) {
    formattedData.providerId = Number(formattedData.providerId);
  }
  
  if (formattedData.latitude) {
    formattedData.latitude = parseFloat(formattedData.latitude);
  }
  
  if (formattedData.longitude) {
    formattedData.longitude = parseFloat(formattedData.longitude);
  }
  
  // Add metadata
  formattedData.metadata = {
    ...formattedData.metadata,
    userAgent: navigator.userAgent,
    platform: process.env.REACT_APP_PLATFORM || 'web',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language
  };
  
  // Remove undefined/null values
  Object.keys(formattedData).forEach(key => {
    if (formattedData[key] === undefined || formattedData[key] === null) {
      delete formattedData[key];
    }
  });
  
  // Remove internal fields that shouldn't be sent to API
  const internalFields = ['requireLocation', 'requireContact'];
  internalFields.forEach(field => {
    delete formattedData[field];
  });
  
  return formattedData;
};

const trackBookingEvent = (eventName, data) => {
  try {
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, data);
    }
    
    // Facebook Pixel
    if (window.fbq) {
      window.fbq('track', eventName, data);
    }
    
    // Custom analytics
    if (window.analytics) {
      window.analytics.track(eventName, data);
    }
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

// ==========================================================
// CUSTOM HOOK
// ==========================================================
export const useCreateBooking = (options = {}) => {
  const {
    onSuccess: onSuccessCallback,
    onError: onErrorCallback,
    onValidationError: onValidationErrorCallback,
    enableAutoInvalidate = true,
    redirectOnSuccess = false,
    redirectPath = '/dashboard/customer',
    showNotification = true,
    retryCount = DEFAULT_CONFIG.MAX_RETRY_COUNT,
    retryDelay = DEFAULT_CONFIG.RETRY_DELAY,
    timeout = DEFAULT_CONFIG.TIMEOUT,
    requireLocation = true,
    requireContact = false,
    trackAnalytics = true,
    successMessage = "Booking Confirmed! 🎉",
    onPaymentRequired,
    onRateLimited
  } = options;
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // MUTATION FUNCTION
  // ==========================================================
  const createBooking = async (data) => {
    // Validate booking data with options
    const validationErrors = validateBookingData({
      ...data,
      requireLocation,
      requireContact
    });
    
    if (validationErrors.length > 0) {
      const error = new Error('Validation failed');
      error.validationErrors = validationErrors;
      error.code = BOOKING_ERROR_CODES.VALIDATION_ERROR;
      throw error;
    }
    
    // Format data for API
    const formattedData = formatBookingData(data);
    
    // Generate idempotency key to prevent duplicate bookings
    const idempotencyKey = generateIdempotencyKey();
    
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      const error = new Error('Authentication required');
      error.code = BOOKING_ERROR_CODES.UNAUTHORIZED;
      throw error;
    }
    
    // Log booking attempt
    console.log('📝 Creating booking:', {
      providerId: formattedData.providerId,
      serviceType: formattedData.serviceType,
      scheduledAt: formattedData.scheduledAt,
      idempotencyKey
    });
    
    // Track booking attempt
    if (trackAnalytics) {
      trackBookingEvent('begin_checkout', {
        provider_id: formattedData.providerId,
        service_type: formattedData.serviceType,
        amount: formattedData.amount
      });
    }
    
    // Make API request
    const response = await api.post("/bookings", formattedData, {
      headers: {
        "Idempotency-Key": idempotencyKey,
        "X-Booking-Source": "web",
        "X-Booking-Version": "2.0"
      },
      timeout
    });
    
    return response.data;
  };
  
  // ==========================================================
  // SUCCESS HANDLER
  // ==========================================================
  const handleSuccess = (data) => {
    console.log('✅ Booking created successfully:', data);
    
    // Track successful booking
    if (trackAnalytics) {
      trackBookingEvent('booking_created', {
        booking_id: data.bookingId || data.id,
        provider_id: data.providerId,
        service_type: data.serviceType,
        amount: data.amount,
        status: data.status
      });
    }
    
    // Invalidate relevant queries
    if (enableAutoInvalidate) {
      queryClient.invalidateQueries({ queryKey: BOOKING_QUERY_KEYS.ALL });
      
      const userId = localStorage.getItem('userId');
      if (userId) {
        queryClient.invalidateQueries({ 
          queryKey: BOOKING_QUERY_KEYS.USER_BOOKINGS(userId) 
        });
      }
      
      queryClient.invalidateQueries({ queryKey: BOOKING_QUERY_KEYS.UPCOMING });
      
      // Prefetch booking details
      const bookingId = data.bookingId || data.id;
      if (bookingId) {
        queryClient.prefetchQuery({
          queryKey: BOOKING_QUERY_KEYS.BOOKING_DETAILS(bookingId),
          queryFn: () => api.get(`/bookings/${bookingId}`).then(res => res.data),
          staleTime: 5 * 60 * 1000
        });
      }
    }
    
    // Show success notification
    if (showNotification) {
      const bookingId = data.bookingId || data.id;
      addNotification({
        type: 'success',
        title: successMessage,
        message: `Your booking has been successfully created. Booking ID: ${bookingId}`,
        duration: 5000,
        onClick: () => navigate(`/bookings/${bookingId}`),
        action: {
          label: 'View Booking',
          onClick: () => navigate(`/bookings/${bookingId}`)
        }
      });
    }
    
    // Call custom success callback
    onSuccessCallback?.(data);
    
    // Redirect if enabled
    if (redirectOnSuccess) {
      setTimeout(() => {
        navigate(redirectPath, {
          state: { 
            bookingCreated: true, 
            bookingId: data.bookingId || data.id,
            bookingData: data 
          }
        });
      }, 1500);
    }
    
    return data;
  };
  
  // ==========================================================
  // ERROR HANDLER
  // ==========================================================
  const handleError = (error) => {
    console.error('❌ Booking creation failed:', error);
    
    let errorMessage = "Booking creation failed. Please try again.";
    let errorCode = error.code || 'UNKNOWN_ERROR';
    let shouldShowNotification = true;
    
    // Handle validation errors
    if (error.validationErrors && error.validationErrors.length > 0) {
      errorMessage = error.validationErrors.map(err => err.message).join(', ');
      onValidationErrorCallback?.(error.validationErrors);
      shouldShowNotification = error.validationErrors.length <= 2;
    }
    // Handle API response errors
    else if (error.response?.data) {
      const apiError = error.response.data;
      errorCode = apiError.code || apiError.error;
      errorMessage = BOOKING_ERROR_MESSAGES[errorCode] || 
                     apiError.message || 
                     apiError.error || 
                     errorMessage;
      
      // Handle specific error cases
      switch (errorCode) {
        case BOOKING_ERROR_CODES.PROVIDER_UNAVAILABLE:
        case BOOKING_ERROR_CODES.TIME_SLOT_CONFLICT:
          if (apiError.alternativeSlots?.length > 0) {
            errorMessage += `\n\nAvailable slots: ${apiError.alternativeSlots.join(', ')}`;
          }
          break;
          
        case BOOKING_ERROR_CODES.PAYMENT_FAILED:
          if (onPaymentRequired) {
            onPaymentRequired(apiError);
            shouldShowNotification = false;
          }
          break;
          
        case BOOKING_ERROR_CODES.RATE_LIMIT_EXCEEDED:
          if (onRateLimited) {
            onRateLimited(apiError);
          }
          errorMessage += " Please wait a moment before trying again.";
          break;
          
        default:
          break;
      }
    }
    // Handle network errors
    else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      errorCode = BOOKING_ERROR_CODES.NETWORK_ERROR;
      errorMessage = BOOKING_ERROR_MESSAGES[BOOKING_ERROR_CODES.NETWORK_ERROR];
    }
    // Handle timeout errors
    else if (error.code === 'ECONNABORTED') {
      errorMessage = "Request timed out. Please check your connection and try again.";
    }
    
    // Track error
    if (trackAnalytics) {
      trackBookingEvent('booking_error', {
        error_code: errorCode,
        error_message: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
    
    // Show error notification
    if (showNotification && shouldShowNotification) {
      addNotification({
        type: 'error',
        title: 'Booking Failed',
        message: errorMessage,
        duration: 8000,
        persistent: false,
        action: {
          label: 'Try Again',
          onClick: () => {}
        }
      });
    }
    
    // Call custom error callback
    onErrorCallback?.(errorMessage, errorCode, error);
    
    // Throw error for component-level handling
    throw new Error(errorMessage);
  };
  
  // ==========================================================
  // RETRY LOGIC
  // ==========================================================
  const retryLogic = (failureCount, error) => {
    // Don't retry on validation errors
    if (error.validationErrors || error.code === BOOKING_ERROR_CODES.VALIDATION_ERROR) {
      return false;
    }
    
    // Don't retry on unauthorized
    if (error.code === BOOKING_ERROR_CODES.UNAUTHORIZED) {
      return false;
    }
    
    // Don't retry on rate limit exceeded
    if (error.code === BOOKING_ERROR_CODES.RATE_LIMIT_EXCEEDED) {
      return false;
    }
    
    // Don't retry on payment failure (user needs to fix payment)
    if (error.code === BOOKING_ERROR_CODES.PAYMENT_FAILED) {
      return false;
    }
    
    // Retry network errors and server errors (5xx)
    const shouldRetry = 
      error.code === BOOKING_ERROR_CODES.NETWORK_ERROR ||
      error.response?.status >= 500 ||
      error.message === 'Network Error' ||
      error.code === 'ECONNABORTED';
    
    if (shouldRetry && failureCount < retryCount) {
      const delay = retryDelay * Math.pow(2, failureCount - 1);
      console.log(`🔄 Retrying booking creation (attempt ${failureCount + 1}) in ${delay}ms...`);
      return delay;
    }
    
    return false;
  };
  
  // ==========================================================
  // USE MUTATION HOOK
  // ==========================================================
  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: handleSuccess,
    onError: handleError,
    retry: retryLogic,
    retryDelay: (failureCount) => retryDelay * Math.pow(2, failureCount - 1),
    useErrorBoundary: false
  });
  
  // ==========================================================
  // WRAPPER FUNCTIONS
  // ==========================================================
  const createBookingWithTracking = async (data, trackingData = {}) => {
    const enhancedData = {
      ...data,
      tracking: {
        source: trackingData.source || 'web',
        utm_source: trackingData.utm_source,
        utm_medium: trackingData.utm_medium,
        utm_campaign: trackingData.utm_campaign,
        utm_term: trackingData.utm_term,
        utm_content: trackingData.utm_content,
        referrer: document.referrer,
        landing_page: window.location.href,
        ...trackingData
      }
    };
    
    return mutation.mutateAsync(enhancedData);
  };
  
  const resetMutation = () => {
    mutation.reset();
  };
  
  // ==========================================================
  // RETURN VALUE
  // ==========================================================
  return {
    // Core mutation functions
    createBooking: mutation.mutate,
    createBookingAsync: mutation.mutateAsync,
    createBookingWithTracking,
    
    // Status flags
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    isIdle: mutation.isIdle,
    
    // Data and error
    data: mutation.data,
    error: mutation.error,
    
    // Reset mutation state
    reset: resetMutation,
    
    // Custom status
    status: mutation.status,
    
    // Helper functions
    validate: (data) => validateBookingData({ ...data, requireLocation, requireContact }),
    
    // Constants
    errorCodes: BOOKING_ERROR_CODES,
    queryKeys: BOOKING_QUERY_KEYS,
    
    // Mutation object for advanced use
    mutation
  };
};

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default useCreateBooking;