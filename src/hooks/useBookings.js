// src/hooks/useBookings.js
import { useCallback, useEffect, useState, useMemo, useReducer, useRef } from "react";
import api from "../api/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

// ==========================================================
// ENHANCED LOGGER WITH LEVELS
// ==========================================================
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

const currentLevel = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.WARN 
  : LOG_LEVELS.DEBUG;

const logger = {
  debug: (...args) => currentLevel <= LOG_LEVELS.DEBUG && console.debug('[BookingsHook]', ...args),
  info: (...args) => currentLevel <= LOG_LEVELS.INFO && console.info('[BookingsHook]', ...args),
  warn: (...args) => currentLevel <= LOG_LEVELS.WARN && console.warn('[BookingsHook]', ...args),
  error: (...args) => currentLevel <= LOG_LEVELS.ERROR && console.error('[BookingsHook]', ...args),
};

// ==========================================================
// CONSTANTS & ENUMS
// ==========================================================
export const BOOKING_STATUS = {
  REQUESTED: "REQUESTED",
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  ACCEPTED: "ACCEPTED",
  STARTED: "STARTED",
  PROVIDER_STARTED: "PROVIDER_STARTED",
  COMPLETED_BY_PROVIDER: "COMPLETED_BY_PROVIDER",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  RESCHEDULED: "RESCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  CONFIRMED: "CONFIRMED"
};

export const SORT_OPTIONS = {
  NEWEST: "newest",
  OLDEST: "oldest",
  HIGHEST_AMOUNT: "highest_amount",
  LOWEST_AMOUNT: "lowest_amount"
};

export const FILTER_OPTIONS = {
  ALL: "all",
  ...BOOKING_STATUS
};

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 500;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================
const generateCacheKey = (filters, page, size, sort) => {
  return `${JSON.stringify(filters)}_${page}_${size}_${sort}`;
};

const validatePageNumber = (page) => {
  return Math.max(0, parseInt(page) || 0);
};

const validatePageSize = (size) => {
  return Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(size) || DEFAULT_PAGE_SIZE));
};

const formatDateForAPI = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================================
// REDUCER FOR STATE MANAGEMENT
// ==========================================================
const bookingsReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    
    case "SET_REFRESHING":
      return { ...state, isRefreshing: action.payload };
    
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false, isRefreshing: false };
    
    case "SET_DATA":
      return {
        ...state,
        data: action.payload.data,
        pagination: action.payload.pagination,
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastFetched: Date.now()
      };
    
    case "UPDATE_BOOKING": {
      const content = state.data.content.map(booking =>
        (booking.id === action.payload.id || booking.bookingId === action.payload.id)
          ? { ...booking, ...action.payload.updates, updatedAt: new Date().toISOString() }
          : booking
      );
      return {
        ...state,
        data: { ...state.data, content }
      };
    }
    
    case "REMOVE_BOOKING": {
      const newContent = state.data.content.filter(booking =>
        booking.id !== action.payload && booking.bookingId !== action.payload
      );
      const newTotalElements = Math.max(0, state.data.totalElements - 1);
      return {
        ...state,
        data: {
          ...state.data,
          content: newContent,
          totalElements: newTotalElements,
          totalPages: Math.ceil(newTotalElements / state.pageSize)
        }
      };
    }
    
    case "ADD_BOOKING": {
      const newContent = [action.payload, ...state.data.content];
      const newTotal = state.data.totalElements + 1;
      return {
        ...state,
        data: {
          ...state.data,
          content: newContent,
          totalElements: newTotal,
          totalPages: Math.ceil(newTotal / state.pageSize)
        }
      };
    }
    
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload }, currentPage: 0 };
    
    case "SET_PAGE":
      return { ...state, currentPage: validatePageNumber(action.payload) };
    
    case "SET_PAGE_SIZE":
      return { ...state, pageSize: validatePageSize(action.payload), currentPage: 0 };
    
    case "SET_SORT":
      return { ...state, sortBy: action.payload, currentPage: 0 };
    
    case "CLEAR_FILTERS":
      return { ...state, filters: initialState.filters, currentPage: 0 };
    
    case "RESET":
      return { ...initialState, pageSize: state.pageSize };
    
    default:
      return state;
  }
};

const initialState = {
  data: {
    content: [],
    pageNumber: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    last: true,
    first: true
  },
  pagination: {
    currentPage: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 0,
    totalElements: 0,
    hasNext: false,
    hasPrevious: false
  },
  filters: {
    status: FILTER_OPTIONS.ALL,
    startDate: null,
    endDate: null,
    searchQuery: "",
    minAmount: null,
    maxAmount: null
  },
  sortBy: SORT_OPTIONS.NEWEST,
  currentPage: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  isLoading: true,
  isRefreshing: false,
  error: null,
  lastFetched: null
};

// ==========================================================
// MAIN HOOK
// ==========================================================
export const useBookings = (options = {}) => {
  const {
    autoFetch = true,
    enableCache = true,
    showToasts = true,
    pageSize: defaultPageSize = DEFAULT_PAGE_SIZE,
    initialFilters = {},
    onSuccess,
    onError,
    websocketEnabled = true,
    bookingEvents = null,
    staleTime = 60000, // 1 minute default stale time
    retryOnError = true
  } = options;

  const { isAuthenticated, user } = useAuth();
  const [state, dispatch] = useReducer(bookingsReducer, {
    ...initialState,
    pageSize: validatePageSize(defaultPageSize),
    filters: { ...initialState.filters, ...initialFilters }
  });
  
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const initialFetchDone = useRef(false);
  const toastIdsRef = useRef(new Set());
  const fetchDebounceRef = useRef(null);
  const lastFetchTimeRef = useRef(0);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);

  // Helper to show unique toasts
  const showUniqueToast = useCallback((type, message, id) => {
    if (!showToasts) return;
    const toastId = `${id}`;
    if (!toastIdsRef.current.has(id)) {
      toastIdsRef.current.add(id);
      toast[type](message, { toastId });
      setTimeout(() => toastIdsRef.current.delete(id), 3000);
    }
  }, [showToasts]);

  // ==========================================================
  // CACHE MANAGEMENT
  // ==========================================================
  const getCachedData = useCallback((cacheKey) => {
    if (!enableCache) return null;
    
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.debug('Using cached data for:', cacheKey);
      return cached.data;
    }
    if (cached) {
      cacheRef.current.delete(cacheKey);
    }
    return null;
  }, [enableCache]);

  const setCachedData = useCallback((cacheKey, data) => {
    if (!enableCache) return;
    
    // Limit cache size to prevent memory issues
    if (cacheRef.current.size > 50) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }, [enableCache]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    logger.debug('Cache cleared');
  }, []);

  // Check if data is stale
  const isDataStale = useCallback(() => {
    if (!state.lastFetched) return true;
    return Date.now() - state.lastFetched > staleTime;
  }, [state.lastFetched, staleTime]);

  // ==========================================================
  // FETCH BOOKINGS WITH RETRY LOGIC
  // ==========================================================
  const fetchBookings = useCallback(async (fetchOptions = {}) => {
    const {
      page = state.currentPage,
      size = state.pageSize,
      sortBy = state.sortBy,
      filters = state.filters,
      silent = false,
      forceRefresh = false,
      retryCount = 0
    } = fetchOptions;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    // Set loading states
    if (!silent && !state.isRefreshing) {
      dispatch({ type: "SET_LOADING", payload: true });
    }
    dispatch({ type: "SET_ERROR", payload: null });

    const cacheKey = generateCacheKey(filters, page, size, sortBy);
    
    // Check cache first
    if (!forceRefresh && enableCache) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        dispatch({ type: "SET_DATA", payload: cachedData });
        if (!silent && showToasts) {
          logger.debug('Using cached bookings data');
        }
        return cachedData.data;
      }
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastFetchTimeRef.current < DEBOUNCE_DELAY && !forceRefresh) {
      logger.debug('Skipping fetch due to rate limiting');
      return null;
    }
    lastFetchTimeRef.current = now;

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("size", size);
      
      // Handle sorting
      let sortParam = "createdAt,desc";
      switch (sortBy) {
        case SORT_OPTIONS.NEWEST:
          sortParam = "createdAt,desc";
          break;
        case SORT_OPTIONS.OLDEST:
          sortParam = "createdAt,asc";
          break;
        case SORT_OPTIONS.HIGHEST_AMOUNT:
          sortParam = "totalAmount,desc";
          break;
        case SORT_OPTIONS.LOWEST_AMOUNT:
          sortParam = "totalAmount,asc";
          break;
        default:
          sortParam = "createdAt,desc";
      }
      params.append("sort", sortParam);
      
      // Apply filters
      if (filters.status && filters.status !== FILTER_OPTIONS.ALL) {
        params.append("status", filters.status);
      }
      if (filters.startDate) {
        const formattedDate = formatDateForAPI(filters.startDate);
        if (formattedDate) params.append("startDate", formattedDate);
      }
      if (filters.endDate) {
        const formattedDate = formatDateForAPI(filters.endDate);
        if (formattedDate) params.append("endDate", formattedDate);
      }
      if (filters.searchQuery && filters.searchQuery.trim()) {
        params.append("search", filters.searchQuery.trim());
      }
      if (filters.minAmount && filters.minAmount > 0) {
        params.append("minAmount", filters.minAmount);
      }
      if (filters.maxAmount && filters.maxAmount > 0) {
        params.append("maxAmount", filters.maxAmount);
      }

      logger.debug('Fetching bookings with params:', params.toString());

      // ✅ FIXED: Correct API endpoint with /api/v1/ prefix
      const response = await api.get(`/api/v1/bookings/my-bookings?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
        timeout: 30000 // 30 second timeout
      });
      
      // Reset retry count on success
      retryCountRef.current = 0;
      
      const res = response.data;
      
      // Transform response to consistent format
      let content = [];
      let totalElements = 0;
      let totalPages = 0;
      let pageNumber = 0;
      
      // Handle different response formats
      if (res.data) {
        // Response wrapped in data
        const data = res.data;
        content = data.content || data.bookings || data;
        totalElements = data.totalElements || data.total || content.length;
        totalPages = data.totalPages || data.pages || Math.ceil(totalElements / size);
        pageNumber = data.pageNumber || data.page || page;
      } else {
        // Direct response
        content = res.content || res.bookings || res;
        totalElements = res.totalElements || res.total || content.length;
        totalPages = res.totalPages || res.pages || Math.ceil(totalElements / size);
        pageNumber = res.pageNumber || res.page || page;
      }
      
      // Ensure content is an array
      if (!Array.isArray(content)) {
        content = [];
      }
      
      // Ensure each booking has an id
      content = content.map(booking => ({
        ...booking,
        bookingId: booking.bookingId || booking.id,
        id: booking.id || booking.bookingId
      }));
      
      const transformedData = {
        data: {
          content,
          pageNumber,
          pageSize: size,
          totalElements,
          totalPages,
          last: pageNumber >= totalPages - 1,
          first: pageNumber === 0
        },
        pagination: {
          currentPage: page,
          pageSize: size,
          totalPages,
          totalElements,
          hasNext: pageNumber < totalPages - 1,
          hasPrevious: page > 0
        }
      };
      
      // Cache the result
      setCachedData(cacheKey, transformedData);
      dispatch({ type: "SET_DATA", payload: transformedData });
      
      // Show empty state message if needed
      if (!silent && showToasts && transformedData.data.content.length === 0 && page === 0) {
        showUniqueToast("info", "No bookings found", "no-bookings");
      }
      
      logger.info(`✅ Fetched ${content.length} bookings (total: ${totalElements})`);
      
      onSuccess?.(transformedData.data);
      return transformedData.data;
      
    } catch (err) {
      // Handle abort errors gracefully
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
        logger.debug('Request cancelled');
        return null;
      }
      
      // Handle timeout errors
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        const timeoutError = "Request timeout. Please check your connection.";
        if (!silent) {
          dispatch({ type: "SET_ERROR", payload: timeoutError });
          if (showToasts) {
            showUniqueToast("error", timeoutError, "timeout-error");
          }
        }
        onError?.(new Error(timeoutError));
        
        // Retry logic for timeout
        if (retryOnError && retryCount < MAX_RETRIES) {
          logger.warn(`Retrying fetch (${retryCount + 1}/${MAX_RETRIES})...`);
          await sleep(RETRY_DELAY * Math.pow(2, retryCount));
          return fetchBookings({ ...fetchOptions, retryCount: retryCount + 1 });
        }
        return null;
      }
      
      logger.error('Failed to load bookings:', err);
      
      // User-friendly error messages
      let errorMessage = "Failed to load bookings. Please try again.";
      if (err.response?.status === 401) {
        errorMessage = "Session expired. Please login again.";
      } else if (err.response?.status === 403) {
        errorMessage = "You don't have permission to view bookings.";
      } else if (err.response?.status === 404) {
        errorMessage = "Unable to fetch bookings. Please contact support.";
      } else if (err.code === "ERR_NETWORK") {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      if (!silent) {
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        if (showToasts) {
          showUniqueToast("error", errorMessage, "fetch-error");
        }
      }
      
      onError?.(err);
      
      // Retry logic for network errors
      if (retryOnError && retryCount < MAX_RETRIES && err.code === "ERR_NETWORK") {
        logger.warn(`Retrying fetch (${retryCount + 1}/${MAX_RETRIES})...`);
        await sleep(RETRY_DELAY * Math.pow(2, retryCount));
        return fetchBookings({ ...fetchOptions, retryCount: retryCount + 1 });
      }
      
      return null;
      
    } finally {
      if (!silent) {
        dispatch({ type: "SET_LOADING", payload: false });
      }
      abortControllerRef.current = null;
    }
  }, [state.currentPage, state.pageSize, state.sortBy, state.filters, 
      state.isRefreshing, enableCache, getCachedData, setCachedData, 
      showToasts, onSuccess, onError, showUniqueToast, retryOnError]);

  // ==========================================================
  // REFRESH FUNCTION
  // ==========================================================
  const refetch = useCallback(async (forceRefresh = true) => {
    if (state.isRefreshing) return;
    
    dispatch({ type: "SET_REFRESHING", payload: true });
    try {
      await fetchBookings({ forceRefresh, silent: false });
      logger.debug('Bookings refreshed successfully');
    } catch (err) {
      logger.error('Failed to refresh bookings:', err);
    } finally {
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, [fetchBookings, state.isRefreshing]);

  // ==========================================================
  // PAGINATION FUNCTIONS
  // ==========================================================
  const goToPage = useCallback((page) => {
    const newPage = validatePageNumber(page);
    if (newPage !== state.currentPage) {
      dispatch({ type: "SET_PAGE", payload: newPage });
    }
  }, [state.currentPage]);

  const nextPage = useCallback(() => {
    if (state.pagination.hasNext) {
      dispatch({ type: "SET_PAGE", payload: state.currentPage + 1 });
    }
  }, [state.currentPage, state.pagination.hasNext]);

  const previousPage = useCallback(() => {
    if (state.currentPage > 0) {
      dispatch({ type: "SET_PAGE", payload: state.currentPage - 1 });
    }
  }, [state.currentPage]);

  const setPageSize = useCallback((size) => {
    const validatedSize = validatePageSize(size);
    if (validatedSize !== state.pageSize) {
      dispatch({ type: "SET_PAGE_SIZE", payload: validatedSize });
    }
  }, [state.pageSize]);

  // ==========================================================
  // FILTER FUNCTIONS
  // ==========================================================
  const setFilters = useCallback((filters) => {
    dispatch({ type: "SET_FILTERS", payload: filters });
  }, []);

  const setStatusFilter = useCallback((status) => {
    dispatch({ type: "SET_FILTERS", payload: { status } });
  }, []);

  const setDateRange = useCallback((startDate, endDate) => {
    dispatch({ type: "SET_FILTERS", payload: { startDate, endDate } });
  }, []);

  const setSearchQuery = useCallback((searchQuery) => {
    // Debounce search query to avoid too many requests
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    
    dispatch({ type: "SET_FILTERS", payload: { searchQuery } });
    
    // Optional: Auto-fetch after debounce
    if (autoFetch) {
      fetchDebounceRef.current = setTimeout(() => {
        fetchBookings({ silent: true });
      }, DEBOUNCE_DELAY);
    }
  }, [autoFetch, fetchBookings]);

  const setAmountRange = useCallback((minAmount, maxAmount) => {
    dispatch({ type: "SET_FILTERS", payload: { minAmount, maxAmount } });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: "CLEAR_FILTERS" });
  }, []);

  // ==========================================================
  // SORT FUNCTIONS
  // ==========================================================
  const setSortBy = useCallback((sortBy) => {
    if (Object.values(SORT_OPTIONS).includes(sortBy)) {
      dispatch({ type: "SET_SORT", payload: sortBy });
    }
  }, []);

  // ==========================================================
  // CRUD OPERATIONS
  // ==========================================================
  const removeBooking = useCallback((bookingId) => {
    dispatch({ type: "REMOVE_BOOKING", payload: bookingId });
    if (showToasts) {
      showUniqueToast("info", "Booking removed from list", "remove-booking");
    }
  }, [showToasts, showUniqueToast]);

  const updateBooking = useCallback((bookingId, updates) => {
    dispatch({ type: "UPDATE_BOOKING", payload: { id: bookingId, updates } });
  }, []);

  const addBooking = useCallback((newBooking) => {
    dispatch({ type: "ADD_BOOKING", payload: newBooking });
    if (showToasts) {
      showUniqueToast("success", "New booking added", "add-booking");
    }
  }, [showToasts, showUniqueToast]);

  // ==========================================================
  // WEBSOCKET REAL-TIME UPDATES
  // ==========================================================
  useEffect(() => {
    if (!websocketEnabled || !bookingEvents || !isAuthenticated) return;
    
    const handleBookingEvent = (event) => {
      if (!event?.type) return;
      
      logger.debug('WebSocket booking event received:', event);
      
      switch (event.type) {
        case "NEW_BOOKING":
          addBooking(event.data);
          showUniqueToast("info", `New booking: ${event.data.serviceType}`, "new-booking");
          break;
        case "BOOKING_UPDATED":
          updateBooking(event.data.id || event.data.bookingId, event.data);
          break;
        case "BOOKING_CANCELLED":
          removeBooking(event.data.id || event.data.bookingId);
          break;
        case "BOOKING_STATUS_CHANGED":
          updateBooking(event.data.bookingId, { status: event.data.newStatus });
          showUniqueToast("info", `Booking status changed to ${event.data.newStatus}`, "status-change");
          break;
        default:
          logger.debug('Unhandled booking event type:', event.type);
      }
    };
    
    const unsubscribe = bookingEvents.subscribe(handleBookingEvent);
    
    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [websocketEnabled, bookingEvents, isAuthenticated, addBooking, updateBooking, removeBooking, showUniqueToast]);

  // ==========================================================
  // AUTO-FETCH ON DEPENDENCIES CHANGE
  // ==========================================================
  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      // Debounce fetch to avoid multiple rapid requests
      const timer = setTimeout(() => {
        fetchBookings({ silent: initialFetchDone.current });
        initialFetchDone.current = true;
      }, initialFetchDone.current ? DEBOUNCE_DELAY : 0);
      
      return () => clearTimeout(timer);
    }
  }, [autoFetch, isAuthenticated, state.currentPage, state.pageSize, state.sortBy, 
      state.filters.status, state.filters.startDate, state.filters.endDate, 
      state.filters.searchQuery, state.filters.minAmount, state.filters.maxAmount,
      fetchBookings]);

  // ==========================================================
  // CLEANUP ON UNMOUNT
  // ==========================================================
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // ==========================================================
  // MEMOIZED VALUES
  // ==========================================================
  const bookings = useMemo(() => state.data.content, [state.data.content]);
  const total = useMemo(() => state.data.totalElements, [state.data.totalElements]);
  const hasMore = useMemo(() => state.pagination.hasNext, [state.pagination.hasNext]);
  const isEmpty = useMemo(() => !state.isLoading && !state.isRefreshing && bookings.length === 0, 
    [state.isLoading, state.isRefreshing, bookings.length]);
  const isStale = useMemo(() => isDataStale(), [isDataStale]);

  // ==========================================================
  // ADVANCED STATISTICS
  // ==========================================================
  const stats = useMemo(() => {
    const completed = bookings.filter(b => b.status === BOOKING_STATUS.COMPLETED).length;
    const cancelled = bookings.filter(b => b.status === BOOKING_STATUS.CANCELLED).length;
    const rejected = bookings.filter(b => b.status === BOOKING_STATUS.REJECTED).length;
    const pending = bookings.filter(b => 
      b.status === BOOKING_STATUS.PENDING || 
      b.status === BOOKING_STATUS.REQUESTED || 
      b.status === BOOKING_STATUS.PAYMENT_PENDING
    ).length;
    const inProgress = bookings.filter(b => 
      b.status === BOOKING_STATUS.ASSIGNED ||
      b.status === BOOKING_STATUS.ACCEPTED ||
      b.status === BOOKING_STATUS.STARTED ||
      b.status === BOOKING_STATUS.PROVIDER_STARTED
    ).length;
    const totalAmount = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const active = bookings.filter(b => 
      b.status === BOOKING_STATUS.IN_PROGRESS || 
      b.status === BOOKING_STATUS.ACCEPTED || 
      b.status === BOOKING_STATUS.CONFIRMED ||
      b.status === BOOKING_STATUS.ASSIGNED ||
      b.status === BOOKING_STATUS.STARTED ||
      b.status === BOOKING_STATUS.PROVIDER_STARTED
    ).length;
    
    // Calculate completion rate
    const completionRate = bookings.length > 0 
      ? ((completed / bookings.length) * 100).toFixed(1) 
      : 0;
    
    // Calculate average rating if available
    const ratedBookings = bookings.filter(b => b.rating && b.rating > 0);
    const averageRating = ratedBookings.length > 0
      ? (ratedBookings.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBookings.length).toFixed(1)
      : 0;
    
    return {
      completed,
      cancelled,
      rejected,
      pending,
      inProgress,
      totalAmount,
      averageAmount: bookings.length ? totalAmount / bookings.length : 0,
      active,
      totalBookings: bookings.length,
      completionRate: parseFloat(completionRate),
      averageRating: parseFloat(averageRating),
      ratedCount: ratedBookings.length
    };
  }, [bookings]);

  // ==========================================================
  // RETURN VALUES
  // ==========================================================
  return {
    // Data
    data: state.data,
    bookings,
    total,
    stats,
    
    // Status
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    error: state.error,
    isEmpty,
    hasMore,
    isStale,
    lastFetched: state.lastFetched,
    
    // Pagination
    pagination: state.pagination,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    
    // Filters
    filters: state.filters,
    setFilters,
    setStatusFilter,
    setDateRange,
    setSearchQuery,
    setAmountRange,
    clearFilters,
    
    // Sorting
    sortBy: state.sortBy,
    setSortBy,
    SORT_OPTIONS,
    
    // CRUD Operations
    removeBooking,
    updateBooking,
    addBooking,
    
    // Fetch Operations
    refetch,
    fetchBookings,
    clearCache,
    
    // Helper Methods
    isDataStale,
    
    // Constants
    BOOKING_STATUS,
    FILTER_OPTIONS
  };
};

// ==========================================================
// CUSTOM HOOK FOR BOOKING DETAILS WITH CACHE
// ==========================================================
export const useBookingDetails = (bookingId, options = {}) => {
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { 
    autoFetch = true, 
    showToasts = true, 
    onSuccess, 
    onError,
    cacheDuration = 5 * 60 * 1000 // 5 minutes
  } = options;
  
  const cacheRef = useRef(new Map());
  
  const fetchBookingDetails = useCallback(async (forceRefresh = false) => {
    if (!bookingId) {
      setIsLoading(false);
      return null;
    }
    
    // Check cache
    if (!forceRefresh && cacheRef.current.has(bookingId)) {
      const cached = cacheRef.current.get(bookingId);
      if (Date.now() - cached.timestamp < cacheDuration) {
        setBooking(cached.data);
        setIsLoading(false);
        return cached.data;
      }
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // ✅ FIXED: Correct API endpoint
      const response = await api.get(`/api/v1/bookings/${bookingId}`);
      const data = response.data?.data || response.data;
      setBooking(data);
      
      // Update cache
      cacheRef.current.set(bookingId, {
        data,
        timestamp: Date.now()
      });
      
      onSuccess?.(data);
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to fetch booking details";
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage, { toastId: "booking-details-error" });
      }
      onError?.(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, showToasts, onSuccess, onError, cacheDuration]);
  
  useEffect(() => {
    if (autoFetch && bookingId) {
      fetchBookingDetails();
    }
  }, [autoFetch, bookingId, fetchBookingDetails]);
  
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);
  
  return {
    booking,
    isLoading,
    error,
    refetch: () => fetchBookingDetails(true),
    clearCache
  };
};

// ==========================================================
// CUSTOM HOOK FOR BOOKING STATISTICS WITH DATE RANGE
// ==========================================================
export const useBookingStats = (options = {}) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { 
    autoFetch = true, 
    dateRange = null, 
    showToasts = true,
    onSuccess,
    onError
  } = options;
  
  const abortControllerRef = useRef(null);
  
  const fetchStats = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    try {
      const params = {};
      if (dateRange?.startDate) {
        const formattedDate = formatDateForAPI(dateRange.startDate);
        if (formattedDate) params.startDate = formattedDate;
      }
      if (dateRange?.endDate) {
        const formattedDate = formatDateForAPI(dateRange.endDate);
        if (formattedDate) params.endDate = formattedDate;
      }
      
      // ✅ FIXED: Correct API endpoint
      const response = await api.get("/api/v1/bookings/statistics", { 
        params,
        signal: abortControllerRef.current.signal
      });
      const data = response.data?.data || response.data;
      setStats(data);
      onSuccess?.(data);
      return data;
    } catch (err) {
      if (err.name === "AbortError") {
        return null;
      }
      const errorMessage = err.response?.data?.message || "Failed to fetch booking statistics";
      setError(errorMessage);
      if (showToasts) {
        toast.error(errorMessage, { toastId: "stats-error" });
      }
      onError?.(err);
      return null;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [dateRange, showToasts, onSuccess, onError]);
  
  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, fetchStats]);
  
  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  };
};

// ==========================================================
// CUSTOM HOOK FOR BOOKING ACTIONS WITH OPTIMISTIC UPDATES
// ==========================================================
export const useBookingActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionType, setActionType] = useState(null);
  
  const cancelBooking = useCallback(async (bookingId, reason = "Customer requested cancellation", options = {}) => {
    const { optimisticUpdate = true, onSuccess: customOnSuccess, onError: customOnError } = options;
    
    if (!bookingId) {
      const err = new Error("Booking ID is required");
      setError(err.message);
      throw err;
    }
    
    setIsLoading(true);
    setActionType("CANCEL");
    setError(null);
    
    try {
      // ✅ FIXED: Correct API endpoint
      const response = await api.patch(`/api/v1/bookings/${bookingId}/cancel`, { reason });
      toast.success("Booking cancelled successfully", { toastId: "cancel-success" });
      logger.info('Booking cancelled:', bookingId);
      customOnSuccess?.();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to cancel booking";
      setError(errorMessage);
      toast.error(errorMessage, { toastId: "cancel-error" });
      logger.error('Cancel booking failed:', err);
      customOnError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  }, []);
  
  const confirmCompletion = useCallback(async (bookingId, options = {}) => {
    const { onSuccess: customOnSuccess, onError: customOnError } = options;
    
    if (!bookingId) {
      const err = new Error("Booking ID is required");
      setError(err.message);
      throw err;
    }
    
    setIsLoading(true);
    setActionType("CONFIRM");
    setError(null);
    
    try {
      // ✅ FIXED: Correct API endpoint
      const response = await api.patch(`/api/v1/bookings/${bookingId}/confirm-completion`);
      toast.success("Service confirmed! Thank you for your feedback.", { toastId: "confirm-success" });
      logger.info('Booking confirmed:', bookingId);
      customOnSuccess?.();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to confirm completion";
      setError(errorMessage);
      toast.error(errorMessage, { toastId: "confirm-error" });
      logger.error('Confirm completion failed:', err);
      customOnError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  }, []);
  
  const submitReview = useCallback(async (bookingId, rating, comment, options = {}) => {
    const { onSuccess: customOnSuccess, onError: customOnError } = options;
    
    if (!bookingId) {
      const err = new Error("Booking ID is required");
      setError(err.message);
      throw err;
    }
    
    if (!rating || rating < 1 || rating > 5) {
      const err = new Error("Rating must be between 1 and 5");
      setError(err.message);
      throw err;
    }
    
    setIsLoading(true);
    setActionType("REVIEW");
    setError(null);
    
    try {
      // ✅ FIXED: Correct API endpoint
      const response = await api.post(`/api/v1/bookings/${bookingId}/review`, { rating, comment });
      toast.success("Thank you for your review!", { toastId: "review-success" });
      logger.info('Review submitted for booking:', bookingId);
      customOnSuccess?.();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to submit review";
      setError(errorMessage);
      toast.error(errorMessage, { toastId: "review-error" });
      logger.error('Submit review failed:', err);
      customOnError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  }, []);
  
  const rescheduleBooking = useCallback(async (bookingId, newScheduleData, options = {}) => {
    const { onSuccess: customOnSuccess, onError: customOnError } = options;
    
    if (!bookingId) {
      const err = new Error("Booking ID is required");
      setError(err.message);
      throw err;
    }
    
    setIsLoading(true);
    setActionType("RESCHEDULE");
    setError(null);
    
    try {
      // ✅ FIXED: Correct API endpoint
      const response = await api.patch(`/api/v1/bookings/${bookingId}/reschedule`, newScheduleData);
      toast.success("Booking rescheduled successfully", { toastId: "reschedule-success" });
      logger.info('Booking rescheduled:', bookingId);
      customOnSuccess?.();
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to reschedule booking";
      setError(errorMessage);
      toast.error(errorMessage, { toastId: "reschedule-error" });
      logger.error('Reschedule booking failed:', err);
      customOnError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    cancelBooking,
    confirmCompletion,
    submitReview,
    rescheduleBooking,
    isLoading,
    isCancelling: isLoading && actionType === "CANCEL",
    isConfirming: isLoading && actionType === "CONFIRM",
    isReviewing: isLoading && actionType === "REVIEW",
    isRescheduling: isLoading && actionType === "RESCHEDULE",
    error,
    clearError
  };
};

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default useBookings;