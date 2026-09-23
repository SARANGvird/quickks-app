// src/hooks/useProviders.js
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "../api/api";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

// ==========================================================
// CONSTANTS
// ==========================================================
const CACHE_KEY = "quickks_provider_data_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

// Provider status constants
export const PROVIDER_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  SUSPENDED: "SUSPENDED",
  REJECTED: "REJECTED",
  INACTIVE: "INACTIVE"
};

// Provider verification status
export const VERIFICATION_STATUS = {
  NOT_SUBMITTED: "NOT_SUBMITTED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED"
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const getStatusColor = (status) => {
  const colors = {
    [PROVIDER_STATUS.APPROVED]: "#10b981",
    [PROVIDER_STATUS.PENDING]: "#f59e0b",
    [PROVIDER_STATUS.SUSPENDED]: "#ef4444",
    [PROVIDER_STATUS.REJECTED]: "#ef4444",
    [PROVIDER_STATUS.INACTIVE]: "#6b7280"
  };
  return colors[status] || "#6b7280";
};

const getStatusLabel = (status) => {
  const labels = {
    [PROVIDER_STATUS.APPROVED]: "Active",
    [PROVIDER_STATUS.PENDING]: "Pending Approval",
    [PROVIDER_STATUS.SUSPENDED]: "Suspended",
    [PROVIDER_STATUS.REJECTED]: "Rejected",
    [PROVIDER_STATUS.INACTIVE]: "Inactive"
  };
  return labels[status] || "Unknown";
};

const calculateCompletionRate = (stats) => {
  if (!stats?.totalJobs) return 0;
  if (stats.totalJobs === 0) return 0;
  return (stats.completedJobs / stats.totalJobs) * 100;
};

const calculateAverageRating = (stats) => {
  if (!stats?.totalReviews) return 0;
  if (stats.totalReviews === 0) return 0;
  return (stats.totalRating / stats.totalReviews) || 0;
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// ==========================================================
// HOOK: useProviders (For Provider Users)
// ==========================================================
export const useProviders = (options = {}) => {
  const {
    autoFetch = true,
    enableCache = true,
    enableRealtime = true,
    onSuccess,
    onError,
    retryOnFailure = true,
    includeStats = true,
    fetchByRole = 'provider' // 'provider' | 'customer' | 'all'
  } = options;

  const { user, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();

  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================
  const isApproved = useMemo(() => 
    profile?.status === PROVIDER_STATUS.APPROVED, [profile]);
  
  const isPending = useMemo(() => 
    profile?.status === PROVIDER_STATUS.PENDING, [profile]);
  
  const isVerified = useMemo(() => 
    profile?.verificationStatus === VERIFICATION_STATUS.VERIFIED, [profile]);
  
  const completionRate = useMemo(() => 
    calculateCompletionRate(stats), [stats]);
  
  const averageRating = useMemo(() => 
    calculateAverageRating(stats), [stats]);
  
  const totalEarnings = useMemo(() => 
    stats?.totalEarnings || 0, [stats]);
  
  const monthlyEarnings = useMemo(() => 
    stats?.monthlyEarnings || [], [stats]);

  const formattedTotalEarnings = useMemo(() => 
    formatCurrency(totalEarnings), [totalEarnings]);

  // ==========================================================
  // CACHE MANAGEMENT
  // ==========================================================
  const loadFromCache = useCallback(() => {
    if (!enableCache) return null;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp, providerId } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        const isValidProvider = providerId === user?.id;
        
        if (!isExpired && isValidProvider && data) {
          console.log("📦 Loading provider data from cache");
          if (data.profile) setProfile(data.profile);
          if (includeStats && data.stats) setStats(data.stats);
          setLastUpdated(new Date(timestamp));
          return data;
        }
      }
    } catch (err) {
      console.warn("Failed to load from cache:", err);
    }
    return null;
  }, [enableCache, user?.id, includeStats]);

  const saveToCache = useCallback((profileData, statsData) => {
    if (!enableCache) return;
    if (!profileData) return;
    
    try {
      const cacheData = {
        profile: profileData,
        stats: statsData || null,
        timestamp: Date.now(),
        providerId: user?.id
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log("💾 Provider data saved to cache");
    } catch (err) {
      console.warn("Failed to save to cache:", err);
    }
  }, [enableCache, user?.id]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log("🗑️ Provider cache cleared");
    } catch (err) {
      console.warn("Failed to clear cache:", err);
    }
  }, []);

  // ==========================================================
  // API CALLS
  // ==========================================================
  
  // ✅ FIXED: Check if user is actually a provider before fetching
  const fetchProviderProfile = useCallback(async (signal) => {
    // If user is not a provider, return null gracefully
    if (user?.role !== 'PROVIDER' && fetchByRole === 'provider') {
      console.log('ℹ️ User is not a provider, skipping profile fetch');
      return null;
    }
    
    try {
      const response = await api.get("/api/v1/providers/me", { signal });
      return response.data?.data || response.data;
    } catch (err) {
      // If 404, user is not a provider - this is expected
      if (err.response?.status === 404) {
        console.log('ℹ️ No provider profile found (user is not a provider)');
        return null;
      }
      throw err;
    }
  }, [user?.role, fetchByRole]);

  const fetchProviderStats = useCallback(async (signal) => {
    // If user is not a provider, return null gracefully
    if (user?.role !== 'PROVIDER' && fetchByRole === 'provider') {
      console.log('ℹ️ User is not a provider, skipping stats fetch');
      return null;
    }
    
    try {
      const response = await api.get("/api/v1/providers/stats/me", { signal });
      return response.data?.data || response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        console.log('ℹ️ No provider stats found');
        return null;
      }
      throw err;
    }
  }, [user?.role, fetchByRole]);

  // ==========================================================
  // REFRESH FUNCTION
  // ==========================================================
  const refresh = useCallback(async (skipCache = false) => {
    if (!isAuthenticated || !user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Try cache first
    if (!skipCache && enableCache && !loading) {
      const cached = loadFromCache();
      if (cached) {
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const promises = [fetchProviderProfile(abortController.signal)];
      if (includeStats && user?.role === 'PROVIDER') {
        promises.push(fetchProviderStats(abortController.signal));
      }
      
      const results = await Promise.all(promises);
      const profileData = results[0];
      const statsData = includeStats && user?.role === 'PROVIDER' ? results[1] : null;
      
      if (!mountedRef.current) return;
      
      setProfile(profileData);
      if (includeStats && statsData && user?.role === 'PROVIDER') setStats(statsData);
      setLastUpdated(new Date());
      setRetryCount(0);
      
      // Save to cache
      if (profileData) {
        saveToCache(profileData, statsData);
      }
      
      // Success callback
      if (onSuccess) {
        onSuccess({ profile: profileData, stats: statsData });
      }
      
      console.log("✅ Provider data loaded successfully");
      
    } catch (err) {
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
        console.log("Request cancelled");
        return;
      }
      
      console.error("❌ Provider load failed:", err);
      
      let errorMessage = "Failed to load provider data";
      let errorCode = "UNKNOWN_ERROR";
      
      if (err.response?.status === 401) {
        errorMessage = "Session expired. Please login again.";
        errorCode = "UNAUTHORIZED";
      } else if (err.response?.status === 403) {
        errorMessage = "You don't have permission to access provider data.";
        errorCode = "FORBIDDEN";
      } else if (err.response?.status === 404) {
        errorMessage = "Provider profile not found. Please complete your profile.";
        errorCode = "NOT_FOUND";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
        errorCode = err.response.data.code || "API_ERROR";
      } else if (err.code === "ERR_NETWORK") {
        errorMessage = "Network error. Please check your connection.";
        errorCode = "NETWORK_ERROR";
      }
      
      if (mountedRef.current) {
        setError(errorMessage);
        
        // Retry logic
        if (retryOnFailure && retryCount < MAX_RETRY_ATTEMPTS && errorCode !== "UNAUTHORIZED" && errorCode !== "FORBIDDEN") {
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setRetryCount(prev => prev + 1);
              refresh(skipCache);
            }
          }, delay);
        } else if (onError) {
          onError(errorMessage, errorCode);
        } else {
          addNotification?.({
            type: "error",
            title: "Loading Failed",
            message: errorMessage,
            duration: 5000
          });
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, [isAuthenticated, user?.id, user?.role, enableCache, loadFromCache, includeStats, 
      fetchProviderProfile, fetchProviderStats, saveToCache, onSuccess, 
      onError, retryOnFailure, retryCount, addNotification, loading]);

  // ==========================================================
  // UPDATE FUNCTIONS - ✅ FIXED
  // ==========================================================
  const updateProfile = useCallback(async (updates) => {
    if (!profile) {
      addNotification?.({
        type: "error",
        title: "Update Failed",
        message: "Profile not loaded. Please refresh and try again.",
        duration: 5000
      });
      return { success: false, error: "Profile not loaded" };
    }
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await api.put("/api/v1/providers/me", updates);
      const updatedProfile = response.data?.data || response.data;
      
      setProfile(updatedProfile);
      saveToCache(updatedProfile, stats);
      
      addNotification?.({
        type: "success",
        title: "Profile Updated",
        message: "Your profile has been updated successfully.",
        duration: 3000
      });
      
      return { success: true, data: updatedProfile };
      
    } catch (err) {
      console.error("Profile update failed:", err);
      const errorMessage = err.response?.data?.message || "Failed to update profile";
      setError(errorMessage);
      
      addNotification?.({
        type: "error",
        title: "Update Failed",
        message: errorMessage,
        duration: 5000
      });
      
      return { success: false, error: errorMessage };
      
    } finally {
      setIsUpdating(false);
    }
  }, [profile, stats, saveToCache, addNotification]);

  const updateAvailability = useCallback(async (availability) => {
    setIsUpdating(true);
    
    try {
      const response = await api.patch("/api/v1/providers/me/availability", availability);
      const updatedAvailability = response.data?.data || response.data;
      
      setProfile(prev => ({ ...prev, availability: updatedAvailability }));
      saveToCache({ ...profile, availability: updatedAvailability }, stats);
      
      addNotification?.({
        type: "success",
        title: "Availability Updated",
        message: "Your availability has been updated.",
        duration: 3000
      });
      
      return { success: true, data: updatedAvailability };
      
    } catch (err) {
      console.error("Availability update failed:", err);
      
      // Fallback: Try updating profile directly
      if (err.response?.status === 404 || err.response?.status === 405) {
        return updateProfile({ availability });
      }
      
      const errorMessage = err.response?.data?.message || "Failed to update availability";
      
      addNotification?.({
        type: "error",
        title: "Update Failed",
        message: errorMessage,
        duration: 5000
      });
      
      return { success: false, error: errorMessage };
      
    } finally {
      setIsUpdating(false);
    }
  }, [profile, stats, saveToCache, addNotification, updateProfile]);

  // ==========================================================
  // REAL-TIME UPDATES (WebSocket)
  // ==========================================================
  useEffect(() => {
    if (!enableRealtime || !isAuthenticated || !user?.id) return;
    
    const handleUpdate = (data) => {
      console.log("Real-time provider update:", data);
      if (data.profile) {
        setProfile(prev => ({ ...prev, ...data.profile }));
        saveToCache({ ...profile, ...data.profile }, stats);
      }
      if (data.stats) {
        setStats(prev => ({ ...prev, ...data.stats }));
      }
      setLastUpdated(new Date());
    };
    
    return () => {};
  }, [enableRealtime, isAuthenticated, user?.id, profile, stats, saveToCache]);

  // ==========================================================
  // AUTO-REFRESH INTERVAL
  // ==========================================================
  useEffect(() => {
    if (!autoFetch) return;
    
    refreshIntervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        refresh(true);
      }
    }, 5 * 60 * 1000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        refresh(true);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoFetch, refresh]);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    
    if (autoFetch && isAuthenticated && user?.role === 'PROVIDER') {
      refresh();
    } else if (!isAuthenticated || user?.role !== 'PROVIDER') {
      setLoading(false);
      setProfile(null);
      setStats(null);
    }
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [autoFetch, isAuthenticated, user?.role, refresh]);

  // ==========================================================
  // RETURN VALUE
  // ==========================================================
  return {
    // Data
    profile,
    stats,
    
    // Status flags
    loading,
    error,
    isUpdating,
    isApproved,
    isPending,
    isVerified,
    lastUpdated,
    
    // Derived values
    completionRate,
    averageRating,
    totalEarnings,
    formattedTotalEarnings,
    monthlyEarnings,
    
    // Helper functions
    getStatusColor,
    getStatusLabel,
    
    // Actions
    refresh,
    updateProfile,
    updateAvailability,
    updateServices: updateServices,
    uploadDocument,
    clearCache,
    
    // Utility
    PROVIDER_STATUS,
    VERIFICATION_STATUS,
    isProvider: user?.role === 'PROVIDER'
  };
};

// ==========================================================
// HOOK: useAreaProviders (For Customer Users - Get Providers by Area)
// ==========================================================
export const useAreaProviders = (area, serviceType = null, options = {}) => {
  const {
    autoFetch = true,
    includeAvailableOnly = true,
    includeVerifiedOnly = true,
    onSuccess,
    onError
  } = options;

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mountedRef = useRef(true);

  const fetchProviders = useCallback(async () => {
    if (!area) {
      setProviders([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📍 Fetching providers for area: ${area}`);
      
      // Build URL with filters
      let url = `/api/v1/providers/area/${encodeURIComponent(area)}`;
      const params = new URLSearchParams();
      
      if (serviceType) {
        params.append('serviceType', serviceType);
      }
      if (includeAvailableOnly) {
        params.append('available', 'true');
      }
      if (includeVerifiedOnly) {
        params.append('verified', 'true');
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      
      let data = response.data || [];
      
      // Handle different response formats
      if (response.data?.data) {
        data = response.data.data;
      }
      if (data.content) {
        data = data.content;
      }
      
      // Ensure array
      data = Array.isArray(data) ? data : [];
      
      // Filter by service type if provided and not already filtered
      if (serviceType && data.length > 0) {
        data = data.filter(p => 
          p.serviceType?.toLowerCase() === serviceType.toLowerCase() ||
          p.serviceType?.toLowerCase().includes(serviceType.toLowerCase())
        );
      }
      
      // Filter only approved providers
      if (includeAvailableOnly) {
        data = data.filter(p => 
          p.status === 'APPROVED' || p.status === 'approved'
        );
      }
      
      console.log(`✅ Found ${data.length} providers in ${area}`);
      
      if (mountedRef.current) {
        setProviders(data);
        setLastUpdated(new Date());
        onSuccess?.(data);
      }
      
      if (data.length === 0 && mountedRef.current) {
        setError(`No professionals available in ${area}${serviceType ? ` for ${serviceType}` : ''}`);
      }
      
      return data;
      
    } catch (err) {
      console.error("❌ Error fetching providers:", err);
      
      let errorMessage = `Failed to load providers in ${area}`;
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      if (mountedRef.current) {
        setError(errorMessage);
        setProviders([]);
        onError?.(err);
      }
      
      return [];
      
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [area, serviceType, includeAvailableOnly, includeVerifiedOnly, onSuccess, onError]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (autoFetch && area) {
      fetchProviders();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, area, fetchProviders]);

  return {
    providers,
    loading,
    error,
    lastUpdated,
    refetch: fetchProviders,
    isEmpty: providers.length === 0 && !loading,
    hasProviders: providers.length > 0
  };
};

// ==========================================================
// HOOK: useProviderDetails (For Customer - Get Single Provider)
// ==========================================================
export const useProviderDetails = (providerId, options = {}) => {
  const { autoFetch = true, onSuccess, onError } = options;
  
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchProvider = useCallback(async () => {
    if (!providerId) {
      setProvider(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/v1/providers/${providerId}`);
      const data = response.data?.data || response.data;
      
      if (mountedRef.current) {
        setProvider(data);
        onSuccess?.(data);
      }
      
      return data;
      
    } catch (err) {
      console.error(`❌ Error fetching provider ${providerId}:`, err);
      
      const errorMessage = err.response?.data?.message || "Failed to load provider details";
      
      if (mountedRef.current) {
        setError(errorMessage);
        setProvider(null);
        onError?.(err);
      }
      
      return null;
      
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [providerId, onSuccess, onError]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (autoFetch && providerId) {
      fetchProvider();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, providerId, fetchProvider]);

  return {
    provider,
    loading,
    error,
    refetch: fetchProvider
  };
};

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default useProviders;

// ==========================================================
// ADDITIONAL EXPORTS
// ==========================================================
export { 
  PROVIDER_STATUS, 
  VERIFICATION_STATUS, 
  getStatusColor, 
  getStatusLabel, 
  formatCurrency,
  useProviders as default
};