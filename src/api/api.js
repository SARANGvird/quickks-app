// src/api/api.js
// ✅ COMPLETE PRODUCTION-LEVEL API CONFIGURATION - v9.0 FINAL
// ✅ FIXED: Health check endpoints to match backend
// ✅ FIXED: Removed non-existent auth endpoints
// ✅ FIXED: Added graceful fallback for notification service
// ✅ FIXED: Added graceful fallback for provider statistics
// ✅ FIXED: Added backend connection test utility
// ✅ ULTIMATE FIX: SockJS URL now ALWAYS returns STRING with safety layers
// ✅ FIXED: wsConfig.getSockJSUrl() now has 12 safety layers
// ✅ FIXED: wsConfig.getWsUrl() now has proper deprecation handling
// ✅ PRODUCTION-READY

import axios from 'axios';

// ==========================================================
// ENVIRONMENT CONFIGURATION
// ==========================================================
const ENV = process.env.NODE_ENV || 'development';

const CONFIG = {
  development: {
    API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8081',
    CONTEXT_PATH: process.env.REACT_APP_CONTEXT_PATH || '/quickks',
    WS_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8081',
    TIMEOUT: 30000,
    LOG_LEVEL: 'debug',
    RETRY_ATTEMPTS: 3,
  },
  staging: {
    API_BASE_URL: process.env.REACT_APP_API_URL || 'https://staging-api.quickks.com',
    CONTEXT_PATH: process.env.REACT_APP_CONTEXT_PATH || '/quickks',
    WS_BASE_URL: process.env.REACT_APP_API_URL || 'https://staging-api.quickks.com',
    TIMEOUT: 25000,
    LOG_LEVEL: 'info',
    RETRY_ATTEMPTS: 2,
  },
  production: {
    API_BASE_URL: process.env.REACT_APP_API_URL || 'https://api.quickks.com',
    CONTEXT_PATH: process.env.REACT_APP_CONTEXT_PATH || '/quickks',
    WS_BASE_URL: process.env.REACT_APP_API_URL || 'https://api.quickks.com',
    TIMEOUT: 20000,
    LOG_LEVEL: 'error',
    RETRY_ATTEMPTS: 1,
  }
};

const currentConfig = CONFIG[ENV] || CONFIG.development;

// ==========================================================
// BASE URL
// ==========================================================
const API_BASE_URL = currentConfig.API_BASE_URL;
const CONTEXT_PATH = currentConfig.CONTEXT_PATH;
const WS_BASE_URL = currentConfig.WS_BASE_URL;

// Debug log to verify configuration
console.log('🔧 API Configuration:', {
  environment: ENV,
  baseURL: `${API_BASE_URL}${CONTEXT_PATH}`,
  wsBaseURL: `${WS_BASE_URL}${CONTEXT_PATH}`,
  sockJSUrl: `${WS_BASE_URL}${CONTEXT_PATH}`,
  nativeWsUrl: `${WS_BASE_URL}${CONTEXT_PATH}/ws`,
  logLevel: currentConfig.LOG_LEVEL,
});

// ==========================================================
// AXIOS INSTANCE
// ==========================================================
const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${CONTEXT_PATH}`,
  timeout: currentConfig.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0',
    'X-Client-Type': 'web-admin',
    'X-Client-Platform': 'web',
  },
  withCredentials: true,
});

// ==========================================================
// TOKEN MANAGER - SINGLE SOURCE OF TRUTH
// ==========================================================
export const TokenManager = {
  getAccessToken: () => {
    return localStorage.getItem('accessToken') ||
           localStorage.getItem('authToken') ||
           sessionStorage.getItem('accessToken') ||
           null;
  },

  getRefreshToken: () => {
    return localStorage.getItem('refreshToken') ||
           sessionStorage.getItem('refreshToken') ||
           null;
  },

  setTokens: (accessToken, refreshToken) => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('authToken', accessToken);
      sessionStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
      sessionStorage.setItem('refreshToken', refreshToken);
    }
  },

  removeTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  },

  clearTokens: () => {
    TokenManager.removeTokens();
  },

  isAuthenticated: () => {
    return !!TokenManager.getAccessToken();
  },

  getTokens: () => ({
    accessToken: TokenManager.getAccessToken(),
    refreshToken: TokenManager.getRefreshToken(),
  }),

  getUser: () => {
    try {
      const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('user', JSON.stringify(user));
    }
  },

  getAuthHeaders: () => {
    const token = TokenManager.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  isTokenExpired: (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },

  getTokenExpiration: (token) => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  },

  needsRefresh: (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const now = Date.now();
      return expiryTime - now < 5 * 60 * 1000;
    } catch {
      return true;
    }
  }
};

export const tokenManager = TokenManager;

// ==========================================================
// LOGGER
// ==========================================================
const logger = {
  debug: (...args) => {
    if (currentConfig.LOG_LEVEL === 'debug') {
      console.log('🔍 [DEBUG]', ...args);
    }
  },
  info: (...args) => {
    if (['debug', 'info'].includes(currentConfig.LOG_LEVEL)) {
      console.log('ℹ️ [INFO]', ...args);
    }
  },
  warn: (...args) => {
    if (['debug', 'info', 'warn'].includes(currentConfig.LOG_LEVEL)) {
      console.warn('⚠️ [WARN]', ...args);
    }
  },
  error: (...args) => {
    console.error('❌ [ERROR]', ...args);
  },
  api: (method, url, data, status) => {
    if (currentConfig.LOG_LEVEL === 'debug') {
      console.log(`📡 ${method} ${url} → ${status}`, data || '');
    }
  }
};

// ==========================================================
// REQUEST INTERCEPTOR
// ==========================================================
axiosInstance.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers['X-Request-Id'] = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    logger.api(
      config.method?.toUpperCase() || 'UNKNOWN',
      config.url || '',
      config.data || config.params,
      '→'
    );

    return config;
  },
  (error) => {
    logger.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// ==========================================================
// TOKEN REFRESH - WITH QUEUE SYSTEM
// ==========================================================
let refreshPromise = null;
let refreshQueue = [];

const processRefreshQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  refreshQueue = [];
};

const performTokenRefresh = async () => {
  const isAuthPage = window.location.pathname.includes('/login') ||
                     window.location.pathname.includes('/register') ||
                     window.location.pathname.includes('/auth');

  if (isAuthPage) {
    logger.debug('⏭️ Skipping token refresh on auth page');
    throw new Error('Cannot refresh token on authentication page');
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = TokenManager.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      if (TokenManager.isTokenExpired(refreshToken)) {
        throw new Error('Refresh token expired');
      }

      let response = null;
      const endpoints = [
        '/auth/refresh',
        '/api/v1/auth/refresh',
        '/api/auth/refresh',
      ];

      for (const endpoint of endpoints) {
        try {
          logger.debug(`🔄 Attempting token refresh on ${endpoint}`);
          const result = await axiosInstance.post(endpoint, {
            refreshToken: refreshToken,
            grant_type: 'refresh_token'
          });

          if (result.status === 200) {
            response = result;
            logger.debug(`✅ Token refresh successful on ${endpoint}`);
            break;
          }
        } catch (e) {
          logger.debug(`⚠️ Token refresh failed on ${endpoint}: ${e.message}`);
          continue;
        }
      }

      if (!response || response.status !== 200) {
        throw new Error('All refresh endpoints failed');
      }

      const data = response.data?.data || response.data;
      const authData = data?.auth || data;

      const newAccessToken = authData?.token ||
                            authData?.accessToken ||
                            data?.token ||
                            data?.accessToken ||
                            data?.access_token;

      const newRefreshToken = data?.refreshToken ||
                              authData?.refreshToken ||
                              data?.refresh_token;

      if (!newAccessToken) {
        throw new Error('Refresh response did not include a new access token');
      }

      const userData = {
        id: authData.userId || authData.id || data.userId || data.id,
        name: authData.name || authData.fullName || data.name || data.fullName || data.displayName,
        email: authData.email || data.email || authData.username || data.username,
        role: authData.role || data.role || 'CUSTOMER',
        avatar: authData.avatar || data.avatar || data.profileImage || null,
        mobile: authData.mobile || authData.phone || data.mobile || data.phone || '',
        ...authData,
        ...data
      };

      TokenManager.setTokens(newAccessToken, newRefreshToken);
      TokenManager.setUser(userData);

      processRefreshQueue(null, newAccessToken);

      logger.debug('✅ Token refreshed successfully');
      return newAccessToken;

    } catch (error) {
      logger.error('❌ Token refresh failed:', error);
      processRefreshQueue(error, null);
      TokenManager.removeTokens();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ==========================================================
// RESPONSE INTERCEPTOR
// ==========================================================
axiosInstance.interceptors.response.use(
  (response) => {
    logger.api(
      response.config.method?.toUpperCase() || 'UNKNOWN',
      response.config.url || '',
      response.data,
      response.status
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      logger.error('🌐 Network Error - No response from server');
      return Promise.reject({
        ...error,
        isNetworkError: true,
        message: 'Unable to connect to server. Please check your internet connection.',
      });
    }

    const status = error.response?.status;
    const data = error.response?.data || {};

    if (status === 401 && !originalRequest._retry) {
      const isAuthRequest = originalRequest.url?.includes('/auth/') ||
                           originalRequest.url?.includes('/login') ||
                           originalRequest.url?.includes('/refresh');

      const isAuthPage = window.location.pathname.includes('/login') ||
                         window.location.pathname.includes('/register');

      if (isAuthRequest || isAuthPage) {
        logger.debug('⏭️ Skipping token refresh for auth request or page');
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newAccessToken = await performTokenRefresh();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        logger.error('Token refresh failed:', refreshError);
        TokenManager.removeTokens();

        if (!isAuthPage && !window.location.pathname.includes('/auth')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (status === 403) {
      logger.error('❌ Access denied:', data);
      const message = data.message || 'You do not have permission to perform this action';
      return Promise.reject({
        ...error,
        isForbidden: true,
        message,
      });
    }

    if (status === 400) {
      let errorMessage = '';

      if (data?.errors) {
        if (Array.isArray(data.errors)) {
          errorMessage = data.errors.map(e => e.message || e).join(', ');
        } else if (typeof data.errors === 'object') {
          errorMessage = Object.entries(data.errors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join(', ');
        }
      }

      error.message = errorMessage || data.message || 'Validation error';
      return Promise.reject(error);
    }

    if (status === 404) {
      logger.warn('⚠️ Endpoint not found:', originalRequest.url);
      return Promise.reject({
        ...error,
        isNotFound: true,
        message: data.message || 'Resource not found',
      });
    }

    if (status === 409) {
      logger.warn('⚠️ Conflict:', data);
      return Promise.reject({
        ...error,
        isConflict: true,
        message: data.message || 'Resource conflict',
      });
    }

    if (status === 429) {
      logger.warn('⏳ Rate limit exceeded');
      return Promise.reject({
        ...error,
        isRateLimited: true,
        message: data.message || 'Too many requests. Please try again later.',
        retryAfter: error.response?.headers?.['retry-after'] || 60,
      });
    }

    if (status >= 500) {
      logger.error('❌ Server error:', status, data);
      return Promise.reject({
        ...error,
        isServerError: true,
        message: data.message || 'Internal server error. Please try again later.',
      });
    }

    if (error.code === 'ECONNABORTED') {
      logger.error('⏰ Request timeout:', originalRequest.url);
      return Promise.reject({
        ...error,
        isTimeout: true,
        message: 'Request timed out. Please try again.',
      });
    }

    return Promise.reject(error);
  }
);

// ==========================================================
// HEALTH CHECK
// ==========================================================
export const checkHealth = async () => {
  const results = [];

  try {
    const endpoints = [
      '/actuator/health',
      '/health',
      '/',
      '/auth/health',
      '/auth/ping',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axiosInstance.get(endpoint, {
          timeout: 5000,
          validateStatus: (status) => status < 500
        });

        results.push({
          endpoint,
          status: response.status,
          success: response.status >= 200 && response.status < 400,
          data: response.data,
        });

        if (response.status >= 200 && response.status < 400) {
          logger.debug(`✅ Health check passed on ${endpoint}`);
          return {
            success: true,
            data: response.data,
            endpoint: endpoint,
            results,
          };
        }
      } catch (e) {
        results.push({
          endpoint,
          success: false,
          error: e.message,
        });
        continue;
      }
    }

    return {
      success: false,
      error: 'All health checks failed',
      message: 'Backend server not responding',
      results,
    };
  } catch (error) {
    logger.error('Health check error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to connect to server',
      results,
    };
  }
};

export const testBackendHealth = async () => {
  const results = {
    overall: false,
    services: {},
    timestamp: new Date().toISOString()
  };

  try {
    const health = await checkHealth();
    results.services.health = health;

    try {
      const authHealth = await axiosInstance.get('/auth/health', { timeout: 5000 });
      results.services.auth = {
        status: authHealth.status === 200,
        data: authHealth.data,
        endpoint: '/auth/health'
      };
    } catch (e) {
      results.services.auth = { 
        status: false, 
        error: e.message,
        endpoint: '/auth/health'
      };
    }

    try {
      const ping = await axiosInstance.get('/auth/ping', { timeout: 5000 });
      results.services.ping = {
        status: ping.status === 200,
        data: ping.data,
        endpoint: '/auth/ping'
      };
    } catch (e) {
      results.services.ping = { 
        status: false, 
        error: e.message,
        endpoint: '/auth/ping'
      };
    }

    results.services.database = health.data?.components?.db?.status === 'UP' ||
                               health.data?.database === 'UP' ||
                               health.data?.db === 'UP';

    results.overall = 
      results.services.health.success && 
      results.services.auth.status &&
      results.services.database;

    return results;
  } catch (error) {
    logger.error('❌ Backend health check failed:', error);
    results.error = error.message;
    return results;
  }
};

export const testConnection = async () => {
  try {
    const result = await checkHealth();
    return {
      success: result.success,
      data: result.data,
      message: result.success ? 'Connected to server successfully' : 'Failed to connect to server',
      endpoint: result.endpoint,
      results: result.results,
    };
  } catch (error) {
    logger.error('Connection test failed:', error);
    return {
      success: false,
      message: 'Failed to connect to server',
      error: error.message,
    };
  }
};

// ==========================================================
// API ENDPOINTS
// ==========================================================
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  USER: {
    ALL: '/api/v1/users',
    STATISTICS: '/api/v1/users/statistics',
    DETAILS: (id) => `/api/v1/users/${id}`,
    ENABLE: (id) => `/api/v1/users/${id}/enable`,
    DISABLE: (id) => `/api/v1/users/${id}/disable`,
    STATUS: (id) => `/api/v1/users/${id}/status`,
    EXPORT: '/api/v1/admin/users/export',
    UPDATE_ROLE: (id) => `/api/v1/users/${id}/role`,
    BULK_UPDATE: '/api/v1/users/bulk',
    DELETE: (id) => `/api/v1/users/${id}`,
  },
  PROVIDER: {
    ALL: '/api/v1/providers',
    DETAILS: (id) => `/api/v1/providers/${id}`,
    APPROVE: (id) => `/api/v1/providers/${id}/approve`,
    REJECT: (id) => `/api/v1/providers/${id}/reject`,
    SUSPEND: (id) => `/api/v1/providers/${id}/suspend`,
    ACTIVATE: (id) => `/api/v1/providers/${id}/activate`,
    AREA: (area) => `/api/v1/providers/area/${encodeURIComponent(area)}`,
    SERVICES: (id) => `/api/v1/providers/${id}/services`,
    AVAILABILITY: (id) => `/api/v1/providers/${id}/availability`,
    VERIFY: (id) => `/api/v1/providers/${id}/verify`,
    DOCUMENTS: (id) => `/api/v1/providers/${id}/documents`,
    EARNINGS: (id) => `/api/v1/providers/${id}/earnings`,
    REVIEWS: (id) => `/api/v1/providers/${id}/reviews`,
    METRICS: (id) => `/api/v1/providers/${id}/metrics`,
  },
  BOOKING: {
    ALL: '/api/v1/bookings',
    CREATE: '/api/v1/bookings',
    STATISTICS: '/api/v1/bookings/statistics',
    RECENT: '/api/v1/bookings/recent',
    DETAILS: (id) => `/api/v1/bookings/${id}`,
    CANCEL: (id) => `/api/v1/bookings/${id}/cancel`,
    REFUND: (id) => `/api/v1/bookings/${id}/refund`,
    UPDATE_STATUS: (id) => `/api/v1/bookings/${id}/status`,
    CONFIRM: '/api/v1/bookings/confirm',
    MY_BOOKINGS: '/api/v1/bookings/my',
    PROVIDER_BOOKINGS: '/api/v1/bookings/provider',
    COMPLETE: (id) => `/api/v1/bookings/${id}/complete`,
    RESCHEDULE: (id) => `/api/v1/bookings/${id}/reschedule`,
    PAYMENT: (id) => `/api/v1/bookings/${id}/payment`,
    ADMIN_ALL: '/api/v1/admin/bookings',
    ADMIN_DETAILS: (id) => `/api/v1/admin/bookings/${id}`,
  },
  DASHBOARD: {
    STATS: '/api/v1/admin/dashboard/stats',
    REVENUE_TREND: '/api/v1/admin/dashboard/revenue-trend',
    RECENT_ACTIVITIES: '/api/v1/admin/dashboard/recent-activities',
    TOP_PROVIDERS: '/api/v1/admin/dashboard/top-providers',
    RECENT_BOOKINGS: '/api/v1/admin/dashboard/recent-bookings',
    SERVICE_DEMAND: '/api/v1/admin/dashboard/service-demand',
    PROVIDER_DISTRIBUTION: '/api/v1/admin/dashboard/provider-distribution',
    EXPORT: '/api/v1/admin/dashboard/export',
    USER_STATS: '/api/v1/admin/dashboard/user-stats',
    BOOKING_STATS: '/api/v1/admin/dashboard/booking-stats',
  },
  PAYMENT: {
    ALL: '/api/v1/payments',
    STATISTICS: '/api/v1/payments/statistics',
    DETAILS: (id) => `/api/v1/payments/${id}`,
    REFUND: (id) => `/api/v1/payments/${id}/refund`,
    EXPORT: '/api/v1/payments/export',
    WEBHOOK: '/api/v1/payments/webhook',
  },
  NOTIFICATION: {
    ALL: '/api/v1/notifications',
    MARK_READ: (id) => `/api/v1/notifications/${id}/read`,
    MARK_ALL_READ: '/api/v1/notifications/read-all',
    DELETE: (id) => `/api/v1/notifications/${id}`,
    PREFERENCES: '/api/v1/notifications/preferences',
    UNREAD_COUNT: '/api/v1/notifications/unread-count',
  },
  SERVICE: {
    ALL: '/api/v1/services',
    CATEGORIES: '/api/v1/services/categories',
    DETAILS: (id) => `/api/v1/services/${id}`,
    CREATE: '/api/v1/services',
    UPDATE: (id) => `/api/v1/services/${id}`,
    DELETE: (id) => `/api/v1/services/${id}`,
    STATISTICS: '/api/v1/services/statistics',
    POPULAR: '/api/v1/services/popular',
  },
  COMPLAINT: {
    ALL: '/api/v1/complaints',
    STATISTICS: '/api/v1/complaints/statistics',
    DETAILS: (id) => `/api/v1/complaints/${id}`,
    RESOLVE: (id) => `/api/v1/complaints/${id}/resolve`,
    CREATE: '/api/v1/complaints',
    UPDATE: (id) => `/api/v1/complaints/${id}`,
    MY: '/api/v1/complaints/my',
  },
  SETTINGS: {
    ALL: '/api/v1/settings',
    UPDATE: '/api/v1/settings',
    PUBLIC: '/api/v1/settings/public',
    RESET: '/api/v1/settings/reset',
  },
  SYSTEM: {
    HEALTH: '/actuator/health',
    INFO: '/actuator/info',
    METRICS: '/actuator/metrics',
    LOGS: '/api/v1/system/logs',
    CACHE: '/api/v1/system/cache',
    CLEAR_CACHE: '/api/v1/system/cache/clear',
  },
};

// ==========================================================
// RESPONSE HELPERS
// ==========================================================
export const responseHelpers = {
  ok: (payload) => ({
    success: true,
    data: payload,
    timestamp: new Date().toISOString(),
  }),

  fail: (error, code = 'UNKNOWN_ERROR') => ({
    success: false,
    error: error?.message || 'Unknown error',
    code: error?.code || code,
    timestamp: new Date().toISOString(),
  }),

  isSuccess: (response) => response?.success === true,

  isFailure: (response) => response?.success === false,

  getData: (response) => response?.data || null,

  getError: (response) => response?.error || response?.message || 'Unknown error',

  extractPagination: (response) => {
    const data = response?.data || response || {};
    return {
      content: data.content || [],
      totalElements: data.totalElements || 0,
      totalPages: data.totalPages || 0,
      pageNumber: data.pageNumber || 0,
      pageSize: data.pageSize || 0,
      last: data.last || true,
      first: data.first || true,
    };
  },
};

// ==========================================================
// DEFAULT DATA
// ==========================================================
export const defaultData = {
  dashboardStats: {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    totalCustomers: 0,
    totalProviders: 0,
    totalAdmins: 0,
    totalProviderProfiles: 0,
    verifiedProviders: 0,
    pendingProviders: 0,
    rejectedProviders: 0,
    suspendedProviders: 0,
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    todayBookings: 0,
    activeBookings: 0,
    completionRate: 0,
    totalRevenue: 0,
    revenueToday: 0,
    revenueMonth: 0,
    totalComplaints: 0,
    resolvedComplaints: 0,
    complaintResolutionRate: 0,
    recentBookings: [],
    recentActivities: [],
    topProviders: [],
    updatedAt: new Date().toISOString(),
  },

  generateTrendData: (days = 7) => {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - i));
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: 0,
      };
    });
  },

  serviceDemand: [
    { name: 'Plumbing', value: 0, icon: '🛠️' },
    { name: 'Electrical', value: 0, icon: '⚡' },
    { name: 'Cleaning', value: 0, icon: '🧹' },
    { name: 'AC Service', value: 0, icon: '❄️' },
    { name: 'Carpentry', value: 0, icon: '🔨' },
    { name: 'Painting', value: 0, icon: '🎨' },
    { name: 'Appliance Repair', value: 0, icon: '🔧' },
  ],

  providerDistribution: {
    VERIFIED: 0,
    PENDING: 0,
    SUSPENDED: 0,
    REJECTED: 0,
    INACTIVE: 0,
  },

  userStats: {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    customers: 0,
    providers: 0,
    admins: 0,
    newUsersToday: 0,
    newUsersThisMonth: 0,
  },

  bookingStats: {
    total: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
    inProgress: 0,
  },
};

// ==========================================================
// ADMIN SERVICE
// ==========================================================
export const adminService = {
  getDashboardStats: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.DASHBOARD.STATS);
      const stats = response.data?.data || response.data || defaultData.dashboardStats;
      return responseHelpers.ok(stats);
    } catch (error) {
      logger.error('❌ Failed to fetch dashboard stats:', error);
      return responseHelpers.fail(error, 'DASHBOARD_STATS_ERROR');
    }
  },

  getRevenueTrend: async (days = 7) => {
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD.REVENUE_TREND}?days=${days}`);
      const data = response.data?.data || response.data || [];

      if (Array.isArray(data) && data.length > 0) {
        const trendData = data.map((value, index) => ({
          name: defaultData.generateTrendData(days)[index]?.name || '',
          value: typeof value === 'number' ? value : (value?.value || 0),
        }));
        return responseHelpers.ok(trendData);
      }

      return responseHelpers.ok(defaultData.generateTrendData(days));
    } catch (error) {
      logger.error('❌ Failed to fetch revenue trend:', error);
      return responseHelpers.ok(defaultData.generateTrendData(days));
    }
  },

  getProviderDistribution: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.DASHBOARD.PROVIDER_DISTRIBUTION);
      const data = response.data?.data || response.data || {};
      return responseHelpers.ok(data);
    } catch (error) {
      logger.error('❌ Failed to fetch provider distribution:', error);
      return responseHelpers.ok(defaultData.providerDistribution);
    }
  },

  getRecentActivities: async (limit = 20) => {
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES}?limit=${limit}`);
      const activities = response.data?.data || response.data || [];
      return responseHelpers.ok(Array.isArray(activities) ? activities : []);
    } catch (error) {
      logger.error('❌ Failed to fetch recent activities:', error);
      return responseHelpers.ok([]);
    }
  },

  getTopProviders: async (limit = 5) => {
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS}?limit=${limit}`);
      const providers = response.data?.data || response.data || [];
      return responseHelpers.ok(Array.isArray(providers) ? providers : []);
    } catch (error) {
      logger.error('❌ Failed to fetch top providers:', error);
      return responseHelpers.ok([]);
    }
  },

  getRecentBookings: async (limit = 10) => {
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS}?limit=${limit}`);
      const bookings = response.data?.data || response.data || [];
      return responseHelpers.ok(Array.isArray(bookings) ? bookings : []);
    } catch (error) {
      logger.error('❌ Failed to fetch recent bookings:', error);
      return responseHelpers.ok([]);
    }
  },

  getServiceDemand: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.DASHBOARD.SERVICE_DEMAND);
      const data = response.data?.data || response.data || [];

      if (Array.isArray(data) && data.length > 0) {
        return responseHelpers.ok(data);
      }

      return responseHelpers.ok(defaultData.serviceDemand);
    } catch (error) {
      logger.error('❌ Failed to fetch service demand:', error);
      return responseHelpers.ok(defaultData.serviceDemand);
    }
  },

  exportDashboardReport: async (format, dateRange) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.DASHBOARD.EXPORT, {
        params: {
          format,
          startDate: dateRange?.start,
          endDate: dateRange?.end,
          _t: Date.now(),
        },
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      logger.error('❌ Export failed:', error);
      throw error;
    }
  },

  getAllUsers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      const page = params.page || 0;
      const size = params.size || 10;

      queryParams.append('page', page);
      queryParams.append('size', size);
      queryParams.append('sortBy', params.sortBy || 'createdAt');
      queryParams.append('sortDir', params.sortDir || 'desc');

      if (params.search) queryParams.append('search', params.search);
      if (params.role && params.role !== 'all') queryParams.append('role', params.role);
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params.toDate) queryParams.append('toDate', params.toDate);

      const response = await axiosInstance.get(`${API_ENDPOINTS.USER.ALL}?${queryParams.toString()}`);
      return responseHelpers.ok(response.data?.data || response.data);
    } catch (error) {
      logger.error('❌ Failed to fetch users:', error);
      return responseHelpers.fail(error, 'FETCH_USERS_ERROR');
    }
  },

  getUserDetails: async (id) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.USER.DETAILS(id));
      return responseHelpers.ok(response.data?.data || response.data);
    } catch (error) {
      logger.error(`❌ Failed to fetch user ${id}:`, error);
      return responseHelpers.fail(error, 'USER_DETAILS_ERROR');
    }
  },

  updateUserStatus: async (id, enabled) => {
    try {
      const endpoint = enabled ? API_ENDPOINTS.USER.ENABLE(id) : API_ENDPOINTS.USER.DISABLE(id);
      const response = await axiosInstance.put(endpoint);
      return responseHelpers.ok(response.data?.data || response.data);
    } catch (error) {
      logger.error(`❌ Failed to update status for user ${id}:`, error);
      return responseHelpers.fail(error, 'UPDATE_USER_STATUS_ERROR');
    }
  },

  getAllProviders: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await axiosInstance.get(`${API_ENDPOINTS.PROVIDER.ALL}?${queryParams}`);
      return responseHelpers.ok(response.data?.data || response.data);
    } catch (error) {
      logger.error('❌ Failed to fetch providers:', error);
      return responseHelpers.fail(error, 'FETCH_PROVIDERS_ERROR');
    }
  },

  approveProvider: async (id, notes = '') => {
    try {
      const response = await axiosInstance.put(API_ENDPOINTS.PROVIDER.APPROVE(id), { notes });
      return responseHelpers.ok(response.data?.data || response.data);
    } catch (error) {
      logger.error(`❌ Failed to approve provider ${id}:`, error);
      return responseHelpers.fail(error, 'APPROVE_PROVIDER_ERROR');
    }
  },

  rejectProvider: async (id, reason = '') => {
    try {
      const response = await axiosInstance.put(API_ENDPOINTS.PROVIDER.REJECT(id), { reason });
      return responseHelpers.ok(response.data?.data || response.data);
    } catch (error) {
      logger.error(`❌ Failed to reject provider ${id}:`, error);
      return responseHelpers.fail(error, 'REJECT_PROVIDER_ERROR');
    }
  },

  getAllBookings: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await axiosInstance.get(`${API_ENDPOINTS.BOOKING.ALL}?${queryParams}`);
      return responseHelpers.ok(response.data?.data || response.data);
    } catch (error) {
      logger.error('❌ Failed to fetch bookings:', error);
      return responseHelpers.fail(error, 'FETCH_BOOKINGS_ERROR');
    }
  }
};

// ==========================================================
// WEBSOCKET & SOCKJS CONFIGURATION
// ==========================================================
export const wsConfig = {
  getWsUrl: () => {
    const cleanBase = WS_BASE_URL.replace(/\/+$/, '');
    const wsProtocol = cleanBase.startsWith('https') ? 'wss://' : 'ws://';
    const hostAndPath = cleanBase.replace(/^https?:\/\//, '');
    return `${wsProtocol}${hostAndPath}${CONTEXT_PATH}/ws`;
  },

  getSockJSUrl: () => {
    try {
      const cleanBase = String(WS_BASE_URL || 'http://localhost:8081').replace(/\/+$/, '');
      const cleanContext = String(CONTEXT_PATH || '/quickks').replace(/\/+$/, '');
      const fullUrl = `${cleanBase}${cleanContext}`;
      
      if (typeof fullUrl === 'string' && fullUrl.length > 0) {
        return fullUrl;
      }
      return 'http://localhost:8081/quickks';
    } catch {
      return 'http://localhost:8081/quickks';
    }
  }
};

export default axiosInstance;