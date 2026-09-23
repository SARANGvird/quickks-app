// src/hooks/useBookingActions.js
import { useCallback, useMemo } from "react";
import api from "../api/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

// ==========================================================
// CONSTANTS & ENUMS
// ==========================================================
export const BOOKING_ACTIONS = {
  ACCEPT: "accept",
  REJECT: "reject",
  CANCEL: "cancel",
  COMPLETE: "complete",
  START: "start",
  RESCHEDULE: "reschedule",
  ASSIGN: "assign",
  CONFIRM: "confirm",
  PENDING: "pending",
  IN_PROGRESS: "in-progress"
};

export const BOOKING_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  IN_PROGRESS: "in_progress",
  RESCHEDULED: "rescheduled",
  CONFIRMED: "confirmed"
};

export const ACTION_CONFIGS = {
  [BOOKING_ACTIONS.ACCEPT]: {
    label: "Accept",
    successMessage: "Booking accepted successfully",
    errorMessage: "Failed to accept booking",
    confirmMessage: "Are you sure you want to accept this booking?",
    status: BOOKING_STATUS.ACCEPTED,
    color: "success",
    icon: "check-circle"
  },
  [BOOKING_ACTIONS.REJECT]: {
    label: "Reject",
    successMessage: "Booking rejected successfully",
    errorMessage: "Failed to reject booking",
    confirmMessage: "Are you sure you want to reject this booking?",
    status: BOOKING_STATUS.REJECTED,
    color: "error",
    icon: "cancel"
  },
  [BOOKING_ACTIONS.CANCEL]: {
    label: "Cancel",
    successMessage: "Booking cancelled successfully",
    errorMessage: "Failed to cancel booking",
    confirmMessage: "Are you sure you want to cancel this booking?",
    status: BOOKING_STATUS.CANCELLED,
    color: "error",
    icon: "close"
  },
  [BOOKING_ACTIONS.COMPLETE]: {
    label: "Complete",
    successMessage: "Booking marked as completed",
    errorMessage: "Failed to complete booking",
    confirmMessage: "Mark this booking as completed?",
    status: BOOKING_STATUS.COMPLETED,
    color: "success",
    icon: "check"
  },
  [BOOKING_ACTIONS.START]: {
    label: "Start Service",
    successMessage: "Service started successfully",
    errorMessage: "Failed to start service",
    confirmMessage: "Start service for this booking?",
    status: BOOKING_STATUS.IN_PROGRESS,
    color: "info",
    icon: "play"
  },
  [BOOKING_ACTIONS.CONFIRM]: {
    label: "Confirm",
    successMessage: "Booking confirmed successfully",
    errorMessage: "Failed to confirm booking",
    confirmMessage: "Confirm this booking?",
    status: BOOKING_STATUS.CONFIRMED,
    color: "primary",
    icon: "check"
  }
};

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================
const generateActionId = () => {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const logAction = (action, data) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[BookingAction:${action}]`, data);
  }
};

// ==========================================================
// MAIN HOOK
// ==========================================================
export const useBookingActions = (options = {}) => {
  const {
    onSuccess: externalOnSuccess,
    onError: externalOnError,
    onSettled: externalOnSettled,
    showToast = true,
    autoInvalidate = true,
    invalidateKeys = ["provider-bookings", "bookings", "booking-stats"],
    optimisticUpdate = true,
    retryCount = 3,
    retryDelay = 1000,
    enableLogging = process.env.NODE_ENV === "development"
  } = options;

  const queryClient = useQueryClient();

  // ==========================================================
  // CORE MUTATION FUNCTION
  // ==========================================================
  const actOnBooking = useCallback(async ({ bookingId, action, data = {} }) => {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }
    
    if (!action || !Object.values(BOOKING_ACTIONS).includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

    const actionId = generateActionId();
    logAction(action, { bookingId, actionId, data });

    try {
      // Different endpoints for different actions
      let endpoint;
      let payload = { ...data };

      switch (action) {
        case BOOKING_ACTIONS.ACCEPT:
          endpoint = `/bookings/provider/${bookingId}/accept`;
          break;
        case BOOKING_ACTIONS.REJECT:
          endpoint = `/bookings/provider/${bookingId}/reject`;
          if (data.reason) {
            payload.reason = data.reason;
          }
          break;
        case BOOKING_ACTIONS.CANCEL:
          endpoint = `/bookings/${bookingId}/cancel`;
          if (data.reason) {
            payload.reason = data.reason;
          }
          break;
        case BOOKING_ACTIONS.COMPLETE:
          endpoint = `/bookings/${bookingId}/complete`;
          if (data.feedback) {
            payload.feedback = data.feedback;
          }
          if (data.rating) {
            payload.rating = data.rating;
          }
          break;
        case BOOKING_ACTIONS.START:
          endpoint = `/bookings/${bookingId}/start`;
          break;
        case BOOKING_ACTIONS.RESCHEDULE:
          endpoint = `/bookings/${bookingId}/reschedule`;
          if (!data.newDate) {
            throw new Error("New date is required for rescheduling");
          }
          payload.newDate = data.newDate;
          break;
        case BOOKING_ACTIONS.ASSIGN:
          endpoint = `/bookings/${bookingId}/assign`;
          if (!data.providerId) {
            throw new Error("Provider ID is required for assignment");
          }
          payload.providerId = data.providerId;
          break;
        case BOOKING_ACTIONS.CONFIRM:
          endpoint = `/bookings/${bookingId}/confirm`;
          break;
        default:
          endpoint = `/bookings/${bookingId}/${action}`;
      }

      logAction(action, { endpoint, payload });
      
      const response = await api.patch(endpoint, payload);
      
      if (!response.data?.success && response.data?.status !== "success") {
        throw new Error(response.data?.message || `Failed to ${action} booking`);
      }
      
      logAction(action, { success: true, response: response.data });
      
      return {
        success: true,
        data: response.data,
        bookingId,
        action,
        actionId,
        timestamp: Date.now()
      };
    } catch (error) {
      logAction(action, { success: false, error: error.message });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message || 
                          `Failed to ${action} booking`;
      
      throw new Error(errorMessage);
    }
  }, []);

  // ==========================================================
  // OPTIMISTIC UPDATE
  // ==========================================================
  const optimisticUpdateBooking = useCallback((bookingId, action, newData) => {
    const config = ACTION_CONFIGS[action];
    if (!config) return;
    
    // Update booking status in cache optimistically
    queryClient.setQueryData(["provider-bookings"], (oldData) => {
      if (!oldData) return oldData;
      
      const updateBookings = (bookings) => {
        if (!Array.isArray(bookings)) return bookings;
        
        return bookings.map(booking => {
          if (booking.id === bookingId || booking._id === bookingId) {
            return {
              ...booking,
              status: config.status,
              updatedAt: new Date().toISOString(),
              ...newData
            };
          }
          return booking;
        });
      };
      
      if (oldData.pages) {
        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            data: updateBookings(page.data)
          }))
        };
      }
      
      return updateBookings(oldData);
    });
    
    logAction(action, { optimisticUpdate: true, bookingId, status: config.status });
  }, [queryClient]);

  // ==========================================================
  // INVALIDATE QUERIES
  // ==========================================================
  const invalidateRelatedQueries = useCallback(async () => {
    const invalidatePromises = invalidateKeys.map(key => 
      queryClient.invalidateQueries({ queryKey: [key] })
    );
    
    // Also invalidate specific booking query if exists
    invalidatePromises.push(
      queryClient.invalidateQueries({ queryKey: ["booking"] }),
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
    );
    
    await Promise.all(invalidatePromises);
    
    logAction("invalidate", { keys: invalidateKeys });
  }, [queryClient, invalidateKeys]);

  // ==========================================================
  // MUTATION CONFIGURATION
  // ==========================================================
  const mutation = useMutation({
    mutationFn: actOnBooking,
    
    onMutate: async (variables) => {
      logAction("mutate", variables);
      
      // Cancel outgoing refetches
      await Promise.all(
        invalidateKeys.map(key => 
          queryClient.cancelQueries({ queryKey: [key] })
        )
      );
      
      // Snapshot previous values
      const snapshots = {};
      for (const key of invalidateKeys) {
        snapshots[key] = queryClient.getQueryData([key]);
      }
      
      // Optimistic update
      if (optimisticUpdate) {
        optimisticUpdateBooking(variables.bookingId, variables.action, variables.data);
      }
      
      return { snapshots };
    },
    
    onSuccess: async (result, variables) => {
      const { action } = variables;
      const config = ACTION_CONFIGS[action];
      
      logAction("success", { result, variables });
      
      // Show success toast
      if (showToast && config) {
        toast.success(config.successMessage, {
          position: "top-right",
          autoClose: 3000,
          icon: "✅"
        });
      } else if (showToast) {
        toast.success(`Booking ${action}ed successfully`);
      }
      
      // Auto invalidate queries
      if (autoInvalidate) {
        await invalidateRelatedQueries();
      }
      
      // Call external success handler
      if (externalOnSuccess) {
        externalOnSuccess(result, variables);
      }
    },
    
    onError: (error, variables, context) => {
      const { action } = variables;
      const config = ACTION_CONFIGS[action];
      
      logAction("error", { error: error.message, variables });
      
      // Rollback optimistic update
      if (optimisticUpdate && context?.snapshots) {
        for (const [key, snapshot] of Object.entries(context.snapshots)) {
          queryClient.setQueryData([key], snapshot);
        }
      }
      
      // Show error toast
      if (showToast) {
        const errorMsg = config?.errorMessage || `Failed to ${action} booking`;
        toast.error(`${errorMsg}: ${error.message}`, {
          position: "top-right",
          autoClose: 5000
        });
      }
      
      // Call external error handler
      if (externalOnError) {
        externalOnError(error, variables, context);
      }
    },
    
    onSettled: (data, error, variables) => {
      logAction("settled", { data, error, variables });
      
      // Always refetch after error or success to ensure consistency
      if (autoInvalidate) {
        invalidateRelatedQueries();
      }
      
      if (externalOnSettled) {
        externalOnSettled(data, error, variables);
      }
    },
    
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.message?.includes("400") || error.message?.includes("401") || 
          error.message?.includes("403") || error.message?.includes("404")) {
        return false;
      }
      return failureCount < retryCount;
    },
    
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * 2 ** attemptIndex, retryDelay * 10);
    }
  });

  // ==========================================================
  // WRAPPED ACTION FUNCTIONS
  // ==========================================================
  const acceptBooking = useCallback((bookingId, options = {}) => {
    return mutation.mutate({ 
      bookingId, 
      action: BOOKING_ACTIONS.ACCEPT,
      data: options
    });
  }, [mutation]);

  const rejectBooking = useCallback((bookingId, reason = null) => {
    return mutation.mutate({ 
      bookingId, 
      action: BOOKING_ACTIONS.REJECT,
      data: reason ? { reason } : {}
    });
  }, [mutation]);

  const cancelBooking = useCallback((bookingId, reason = null) => {
    return mutation.mutate({ 
      bookingId, 
      action: BOOKING_ACTIONS.CANCEL,
      data: reason ? { reason } : {}
    });
  }, [mutation]);

  const completeBooking = useCallback((bookingId, feedback = null, rating = null) => {
    return mutation.mutate({ 
      bookingId, 
      action: BOOKING_ACTIONS.COMPLETE,
      data: { feedback, rating }
    });
  }, [mutation]);

  const startBooking = useCallback((bookingId) => {
    return mutation.mutate({ 
      bookingId, 
      action: BOOKING_ACTIONS.START
    });
  }, [mutation]);

  const rescheduleBooking = useCallback((bookingId, newDate) => {
    return mutation.mutate({ 
      bookingId, 
      action: BOOKING_ACTIONS.RESCHEDULE,
      data: { newDate }
    });
  }, [mutation]);

  const assignProvider = useCallback((bookingId, providerId) => {
    return mutation.mutate({ 
      bookingId, 
      action: BOOKING_ACTIONS.ASSIGN,
      data: { providerId }
    });
  }, [mutation]);

  const confirmBooking = useCallback((bookingId) => {
    return mutation.mutate({ 
      bookingId, 
      action: BOOKING_ACTIONS.CONFIRM
    });
  }, [mutation]);

  // ==========================================================
  // ASYNC ACTION FUNCTIONS (for use with try/catch)
  // ==========================================================
  const acceptBookingAsync = useCallback(async (bookingId, options = {}) => {
    return await mutation.mutateAsync({ 
      bookingId, 
      action: BOOKING_ACTIONS.ACCEPT,
      data: options
    });
  }, [mutation]);

  const rejectBookingAsync = useCallback(async (bookingId, reason = null) => {
    return await mutation.mutateAsync({ 
      bookingId, 
      action: BOOKING_ACTIONS.REJECT,
      data: reason ? { reason } : {}
    });
  }, [mutation]);

  const cancelBookingAsync = useCallback(async (bookingId, reason = null) => {
    return await mutation.mutateAsync({ 
      bookingId, 
      action: BOOKING_ACTIONS.CANCEL,
      data: reason ? { reason } : {}
    });
  }, [mutation]);

  const completeBookingAsync = useCallback(async (bookingId, feedback = null, rating = null) => {
    return await mutation.mutateAsync({ 
      bookingId, 
      action: BOOKING_ACTIONS.COMPLETE,
      data: { feedback, rating }
    });
  }, [mutation]);

  // ==========================================================
  // HELPER FUNCTIONS
  // ==========================================================
  const canPerformAction = useCallback((booking, action) => {
    const currentStatus = booking?.status?.toLowerCase();
    const config = ACTION_CONFIGS[action];
    
    if (!config) return false;
    
    // Define allowed transitions
    const allowedTransitions = {
      [BOOKING_STATUS.PENDING]: [BOOKING_ACTIONS.ACCEPT, BOOKING_ACTIONS.REJECT, BOOKING_ACTIONS.CANCEL],
      [BOOKING_STATUS.ACCEPTED]: [BOOKING_ACTIONS.START, BOOKING_ACTIONS.CANCEL],
      [BOOKING_STATUS.IN_PROGRESS]: [BOOKING_ACTIONS.COMPLETE, BOOKING_ACTIONS.CANCEL],
      [BOOKING_STATUS.CONFIRMED]: [BOOKING_ACTIONS.START, BOOKING_ACTIONS.CANCEL],
      [BOOKING_STATUS.COMPLETED]: [],
      [BOOKING_STATUS.CANCELLED]: [],
      [BOOKING_STATUS.REJECTED]: []
    };
    
    return allowedTransitions[currentStatus]?.includes(action) || false;
  }, []);

  const getActionConfig = useCallback((action) => {
    return ACTION_CONFIGS[action] || null;
  }, []);

  // ==========================================================
  // RESET MUTATION STATE
  // ==========================================================
  const reset = useCallback(() => {
    mutation.reset();
  }, [mutation]);

  // ==========================================================
  // MEMOIZED RETURN VALUE
  // ==========================================================
  return useMemo(() => ({
    // Mutation state
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    
    // Action functions (mutate)
    acceptBooking,
    rejectBooking,
    cancelBooking,
    completeBooking,
    startBooking,
    rescheduleBooking,
    assignProvider,
    confirmBooking,
    
    // Async action functions (mutateAsync)
    acceptBookingAsync,
    rejectBookingAsync,
    cancelBookingAsync,
    completeBookingAsync,
    
    // Utility functions
    canPerformAction,
    getActionConfig,
    reset,
    
    // Raw mutation object for advanced use cases
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    
    // Constants
    BOOKING_ACTIONS,
    BOOKING_STATUS,
    ACTION_CONFIGS
  }), [
    mutation.isPending,
    mutation.isError,
    mutation.isSuccess,
    mutation.error,
    mutation.data,
    mutation.mutate,
    mutation.mutateAsync,
    acceptBooking,
    rejectBooking,
    cancelBooking,
    completeBooking,
    startBooking,
    rescheduleBooking,
    assignProvider,
    confirmBooking,
    acceptBookingAsync,
    rejectBookingAsync,
    cancelBookingAsync,
    completeBookingAsync,
    canPerformAction,
    getActionConfig,
    reset
  ]);
};

// ==========================================================
// CUSTOM HOOK FOR BULK ACTIONS
// ==========================================================
export const useBulkBookingActions = (options = {}) => {
  const { onProgress, onComplete, ...restOptions } = options;
  const { acceptBooking, rejectBooking, cancelBooking, isLoading } = useBookingActions(restOptions);
  
  const processBulkActions = useCallback(async (bookings, action, actionData = null) => {
    const results = {
      success: [],
      failed: [],
      total: bookings.length
    };
    
    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      onProgress?.(i + 1, bookings.length, booking);
      
      try {
        let result;
        switch (action) {
          case BOOKING_ACTIONS.ACCEPT:
            result = await acceptBooking(booking.id || booking._id);
            break;
          case BOOKING_ACTIONS.REJECT:
            result = await rejectBooking(booking.id || booking._id, actionData);
            break;
          case BOOKING_ACTIONS.CANCEL:
            result = await cancelBooking(booking.id || booking._id, actionData);
            break;
          default:
            throw new Error(`Unsupported bulk action: ${action}`);
        }
        
        results.success.push({ booking, result });
      } catch (error) {
        results.failed.push({ booking, error: error.message });
      }
    }
    
    onComplete?.(results);
    return results;
  }, [acceptBooking, rejectBooking, cancelBooking, onProgress, onComplete]);
  
  return {
    processBulkActions,
    isLoading,
    BOOKING_ACTIONS
  };
};

// ==========================================================
// CUSTOM HOOK FOR BOOKING VALIDATION
// ==========================================================
export const useBookingValidation = () => {
  const validateAction = useCallback((booking, action, userRole = "provider") => {
    const errors = [];
    
    if (!booking) {
      errors.push("Booking not found");
      return { valid: false, errors };
    }
    
    if (!booking.id && !booking._id) {
      errors.push("Invalid booking ID");
    }
    
    // Check if booking is already completed or cancelled
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      errors.push("Cannot perform action on completed booking");
    }
    
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      errors.push("Cannot perform action on cancelled booking");
    }
    
    // Role-based validation
    if (userRole === "provider" && booking.providerId !== userRole) {
      errors.push("You are not authorized to perform this action on this booking");
    }
    
    if (userRole === "customer" && booking.customerId !== userRole) {
      errors.push("You are not authorized to perform this action on this booking");
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }, []);
  
  return { validateAction, BOOKING_STATUS };
};

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default useBookingActions;