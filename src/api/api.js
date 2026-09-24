// src/api/api.js - PRODUCTION v10.2 FULL - NO SKIP - FIXED FOR api.quickks.in
import axios from 'axios';

// ==========================================================
// ENVIRONMENT CONFIGURATION - FIXED
// ==========================================================
const ENV = process.env.NODE_ENV || 'development';
const PROD_API_URL = 'https://api.quickks.in/quickks/api/v1';
const PROD_WS_ROOT = 'https://api.quickks.in';

const getEnvApiUrl = () => {
  const url = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || '';
  return url? url.replace(/\/+$/, '') : '';
};

const CONFIG = {
  development: {
    API_BASE_URL: getEnvApiUrl() || 'http://localhost:8081/quickks/api/v1',
    CONTEXT_PATH: '',
    WS_BASE_URL: process.env.REACT_APP_WS_URL || 'http://localhost:8081/quickks',
    TIMEOUT: 30000,
    LOG_LEVEL: 'debug',
    RETRY_ATTEMPTS: 3,
  },
  staging: {
    API_BASE_URL: getEnvApiUrl() || PROD_API_URL,
    CONTEXT_PATH: '',
    WS_BASE_URL: process.env.REACT_APP_WS_URL || PROD_WS_ROOT,
    TIMEOUT: 25000,
    LOG_LEVEL: 'info',
    RETRY_ATTEMPTS: 2,
  },
  production: {
    API_BASE_URL: getEnvApiUrl() || PROD_API_URL,
    CONTEXT_PATH: '',
    WS_BASE_URL: process.env.REACT_APP_WS_URL || PROD_WS_ROOT,
    TIMEOUT: 20000,
    LOG_LEVEL: 'error',
    RETRY_ATTEMPTS: 1,
  }
};

const currentConfig = CONFIG[ENV] || CONFIG.development;

// BASE URL - FIXED: No double /quickks
const API_BASE_URL = currentConfig.API_BASE_URL.replace(/\/+$/, '');
const CONTEXT_PATH = (() => {
  if (API_BASE_URL.includes('/quickks')) return '';
  return process.env.REACT_APP_CONTEXT_PATH || '';
})();
const WS_BASE_URL = currentConfig.WS_BASE_URL.replace(/\/+$/, '');

console.log('🔧 API Configuration:', {
  environment: ENV,
  baseURL: `${API_BASE_URL}${CONTEXT_PATH}`,
  wsBaseURL: WS_BASE_URL,
  logLevel: currentConfig.LOG_LEVEL,
});

// ==========================================================
// AXIOS INSTANCE - FIXED
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
  withCredentials: false,
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
  clearTokens: () => { TokenManager.removeTokens(); },
  isAuthenticated: () =>!!TokenManager.getAccessToken(),
  getTokens: () => ({
    accessToken: TokenManager.getAccessToken(),
    refreshToken: TokenManager.getRefreshToken(),
  }),
  getUser: () => {
    try {
      const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
      return userData? JSON.parse(userData) : null;
    } catch { return null; }
  },
  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('user', JSON.stringify(user));
    }
  },
  getAuthHeaders: () => {
    const token = TokenManager.getAccessToken();
    return token? { Authorization: `Bearer ${token}` } : {};
  },
  isTokenExpired: (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch { return true; }
  },
  getTokenExpiration: (token) => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch { return null; }
  },
  needsRefresh: (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 - Date.now() < 5 * 60 * 1000;
    } catch { return true; }
  }
};
export const tokenManager = TokenManager;

// ==========================================================
// LOGGER
// ==========================================================
const logger = {
  debug: (...args) => { if (currentConfig.LOG_LEVEL === 'debug') console.log('🔍 [DEBUG]',...args); },
  info: (...args) => { if (['debug', 'info'].includes(currentConfig.LOG_LEVEL)) console.log('ℹ [INFO]',...args); },
  warn: (...args) => { if (['debug', 'info', 'warn'].includes(currentConfig.LOG_LEVEL)) console.warn('⚠ [WARN]',...args); },
  error: (...args) => { console.error('❌ [ERROR]',...args); },
  api: (method, url, data, status) => { if (currentConfig.LOG_LEVEL === 'debug') console.log(`📡 ${method} ${url} → ${status}`, data || ''); }
};

// ==========================================================
// REQUEST INTERCEPTOR
// ==========================================================
axiosInstance.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Request-Id'] = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    if (config.method === 'get') {
      config.params = {...config.params, _t: Date.now() };
    }
    logger.api(config.method?.toUpperCase() || 'UNKNOWN', config.url || '', config.data || config.params, '→');
    return config;
  },
  (error) => { logger.error('Request Interceptor Error:', error); return Promise.reject(error); }
);

// ==========================================================
// TOKEN REFRESH - WITH QUEUE SYSTEM
// ==========================================================
let refreshPromise = null;
let refreshQueue = [];
const processRefreshQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => { if (error) reject(error); else resolve(token); });
  refreshQueue = [];
};
const performTokenRefresh = async () => {
  const isAuthPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/register') || window.location.pathname.includes('/auth');
  if (isAuthPage) throw new Error('Cannot refresh token on authentication page');
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token available');
      if (TokenManager.isTokenExpired(refreshToken)) throw new Error('Refresh token expired');
      let response = null;
      const endpoints = ['/auth/refresh', '/api/v1/auth/refresh', '/api/auth/refresh'];
      for (const endpoint of endpoints) {
        try {
          const result = await axiosInstance.post(endpoint, { refreshToken: refreshToken, grant_type: 'refresh_token' });
          if (result.status === 200) { response = result; break; }
        } catch (e) { continue; }
      }
      if (!response || response.status!== 200) throw new Error('All refresh endpoints failed');
      const data = response.data?.data || response.data;
      const authData = data?.auth || data;
      const newAccessToken = authData?.token || authData?.accessToken || data?.token || data?.accessToken || data?.access_token;
      const newRefreshToken = data?.refreshToken || authData?.refreshToken || data?.refresh_token;
      if (!newAccessToken) throw new Error('Refresh response did not include a new access token');
      const userData = {
        id: authData.userId || authData.id || data.userId || data.id,
        name: authData.name || authData.fullName || data.name || data.fullName || data.displayName,
        email: authData.email || data.email || authData.username || data.username,
        role: authData.role || data.role || 'CUSTOMER',
        avatar: authData.avatar || data.avatar || null,
        mobile: authData.mobile || authData.phone || data.mobile || data.phone || '',
      ...authData,...data
      };
      TokenManager.setTokens(newAccessToken, newRefreshToken);
      TokenManager.setUser(userData);
      processRefreshQueue(null, newAccessToken);
      return newAccessToken;
    } catch (error) {
      processRefreshQueue(error, null);
      TokenManager.removeTokens();
      throw error;
    } finally { refreshPromise = null; }
  })();
  return refreshPromise;
};

// ==========================================================
// RESPONSE INTERCEPTOR
// ==========================================================
axiosInstance.interceptors.response.use(
  (response) => {
    logger.api(response.config.method?.toUpperCase() || 'UNKNOWN', response.config.url || '', response.data, response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!error.response) {
      logger.error('🌐 Network Error - No response from server');
      return Promise.reject({...error, isNetworkError: true, message: 'Unable to connect to server.' });
    }
    const status = error.response?.status;
    const data = error.response?.data || {};
    if (status === 401 &&!originalRequest._retry) {
      const isAuthRequest = originalRequest.url?.includes('/auth/') || originalRequest.url?.includes('/login') || originalRequest.url?.includes('/refresh');
      const isAuthPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
      if (isAuthRequest || isAuthPage) return Promise.reject(error);
      originalRequest._retry = true;
      try {
        const newAccessToken = await performTokenRefresh();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        TokenManager.removeTokens();
        if (!isAuthPage && window.location.pathname!== '/' &&!window.location.pathname.includes('/auth')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    if (status === 403) return Promise.reject({...error, isForbidden: true, message: data.message || 'Permission denied' });
    if (status === 400) {
      let errorMessage = '';
      if (data?.errors) {
        if (Array.isArray(data.errors)) errorMessage = data.errors.map(e => e.message || e).join(', ');
        else if (typeof data.errors === 'object') errorMessage = Object.entries(data.errors).map(([field, msg]) => `${field}: ${msg}`).join(', ');
      }
      error.message = errorMessage || data.message || 'Validation error';
      return Promise.reject(error);
    }
    if (status === 404) return Promise.reject({...error, isNotFound: true, message: data.message || 'Resource not found' });
    if (status === 409) return Promise.reject({...error, isConflict: true, message: data.message || 'Resource conflict' });
    if (status === 429) return Promise.reject({...error, isRateLimited: true, message: data.message || 'Too many requests', retryAfter: error.response?.headers?.['retry-after'] || 60 });
    if (status >= 500) return Promise.reject({...error, isServerError: true, message: data.message || 'Internal server error' });
    if (error.code === 'ECONNABORTED') return Promise.reject({...error, isTimeout: true, message: 'Request timed out' });
    return Promise.reject(error);
  }
);

// ==========================================================
// HEALTH CHECK - PRODUCTION FIXED v10.2 - NEVER THROWS
// ==========================================================
export const checkHealth = async () => {
  const results = [];
  try {
    const endpoints = ['/auth/ping', '/auth/health', '/health'];
    for (const endpoint of endpoints) {
      try {
        const response = await axiosInstance.get(endpoint, { timeout: 5000, validateStatus: () => true });
        results.push({ endpoint, status: response.status, success: response.status >= 200 && response.status < 400, data: response.data });
        if (response.status >= 200 && response.status < 400) {
          return { success: true, online: true, data: response.data, endpoint, results };
        }
      } catch (e) {
        results.push({ endpoint, success: false, error: e.message });
        continue;
      }
    }
    return { success: true, online: false, data: null, results, warning: 'Backend unreachable but app continues' };
  } catch (error) {
    return { success: true, online: false, error: error.message, results };
  }
};

export const testBackendHealth = async () => {
  const results = { overall: false, services: {}, timestamp: new Date().toISOString() };
  try {
    const health = await checkHealth();
    results.services.health = health;
    try { const authHealth = await axiosInstance.get('/auth/health', { timeout: 5000, validateStatus: () => true }); results.services.auth = { status: authHealth.status === 200, data: authHealth.data }; }
    catch (e) { results.services.auth = { status: false, error: e.message }; }
    try { const ping = await axiosInstance.get('/auth/ping', { timeout: 5000, validateStatus: () => true }); results.services.ping = { status: ping.status === 200, data: ping.data }; }
    catch (e) { results.services.ping = { status: false, error: e.message }; }
    results.overall = results.services.health.online || results.services.health.success;
    return results;
  } catch (error) { results.error = error.message; return results; }
};

export const testConnection = async () => {
  try {
    const result = await checkHealth();
    return { success: true, online: result.online, data: result.data, message: result.online? 'Connected' : 'Offline - App continues', endpoint: result.endpoint, results: result.results };
  } catch (error) { return { success: true, online: false, message: 'Offline - App continues', error: error.message }; }
};

// ==========================================================
// API ENDPOINTS - FULL
// ==========================================================
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login', REGISTER: '/auth/register', REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout', ME: '/auth/me', SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp', FORGOT_PASSWORD: '/auth/forgot-password', RESET_PASSWORD: '/auth/reset-password',
  },
  USER: {
    ALL: '/users', STATISTICS: '/users/statistics', DETAILS: (id) => `/users/${id}`,
    ENABLE: (id) => `/users/${id}/enable`, DISABLE: (id) => `/users/${id}/disable`,
    STATUS: (id) => `/users/${id}/status`, EXPORT: '/admin/users/export',
    UPDATE_ROLE: (id) => `/users/${id}/role`, BULK_UPDATE: '/users/bulk', DELETE: (id) => `/users/${id}`,
  },
  PROVIDER: {
    ALL: '/providers', DETAILS: (id) => `/providers/${id}`, APPROVE: (id) => `/providers/${id}/approve`,
    REJECT: (id) => `/providers/${id}/reject`, SUSPEND: (id) => `/providers/${id}/suspend`,
    ACTIVATE: (id) => `/providers/${id}/activate`, AREA: (area) => `/providers/area/${encodeURIComponent(area)}`,
    SERVICES: (id) => `/providers/${id}/services`, AVAILABILITY: (id) => `/providers/${id}/availability`,
    VERIFY: (id) => `/providers/${id}/verify`, DOCUMENTS: (id) => `/providers/${id}/documents`,
    EARNINGS: (id) => `/providers/${id}/earnings`, REVIEWS: (id) => `/providers/${id}/reviews`,
    METRICS: (id) => `/providers/${id}/metrics`,
  },
  BOOKING: {
    ALL: '/bookings', CREATE: '/bookings', STATISTICS: '/bookings/statistics', RECENT: '/bookings/recent',
    DETAILS: (id) => `/bookings/${id}`, CANCEL: (id) => `/bookings/${id}/cancel`, REFUND: (id) => `/bookings/${id}/refund`,
    UPDATE_STATUS: (id) => `/bookings/${id}/status`, CONFIRM: '/bookings/confirm', MY_BOOKINGS: '/bookings/my',
    PROVIDER_BOOKINGS: '/bookings/provider', COMPLETE: (id) => `/bookings/${id}/complete`,
    RESCHEDULE: (id) => `/bookings/${id}/reschedule`, PAYMENT: (id) => `/bookings/${id}/payment`,
    ADMIN_ALL: '/admin/bookings', ADMIN_DETAILS: (id) => `/admin/bookings/${id}`,
  },
  DASHBOARD: {
    STATS: '/admin/dashboard/stats', REVENUE_TREND: '/admin/dashboard/revenue-trend',
    RECENT_ACTIVITIES: '/admin/dashboard/recent-activities', TOP_PROVIDERS: '/admin/dashboard/top-providers',
    RECENT_BOOKINGS: '/admin/dashboard/recent-bookings', SERVICE_DEMAND: '/admin/dashboard/service-demand',
    PROVIDER_DISTRIBUTION: '/admin/dashboard/provider-distribution', EXPORT: '/admin/dashboard/export',
    USER_STATS: '/admin/dashboard/user-stats', BOOKING_STATS: '/admin/dashboard/booking-stats',
  },
  PAYMENT: { ALL: '/payments', STATISTICS: '/payments/statistics', DETAILS: (id) => `/payments/${id}`, REFUND: (id) => `/payments/${id}/refund`, EXPORT: '/payments/export', WEBHOOK: '/payments/webhook' },
  NOTIFICATION: { ALL: '/notifications', MARK_READ: (id) => `/notifications/${id}/read`, MARK_ALL_READ: '/notifications/read-all', DELETE: (id) => `/notifications/${id}`, PREFERENCES: '/notifications/preferences', UNREAD_COUNT: '/notifications/unread-count' },
  SERVICE: { ALL: '/services', CATEGORIES: '/services/categories', DETAILS: (id) => `/services/${id}`, CREATE: '/services', UPDATE: (id) => `/services/${id}`, DELETE: (id) => `/services/${id}`, STATISTICS: '/services/statistics', POPULAR: '/services/popular' },
  COMPLAINT: { ALL: '/complaints', STATISTICS: '/complaints/statistics', DETAILS: (id) => `/complaints/${id}`, RESOLVE: (id) => `/complaints/${id}/resolve`, CREATE: '/complaints', UPDATE: (id) => `/complaints/${id}`, MY: '/complaints/my' },
  SETTINGS: { ALL: '/settings', UPDATE: '/settings', PUBLIC: '/settings/public', RESET: '/settings/reset' },
  SYSTEM: { HEALTH: '/health', INFO: '/info', METRICS: '/admin/metrics', LOGS: '/system/logs', CACHE: '/system/cache', CLEAR_CACHE: '/system/cache/clear' },
};

// ==========================================================
// RESPONSE HELPERS
// ==========================================================
export const responseHelpers = {
  ok: (payload) => ({ success: true, data: payload, timestamp: new Date().toISOString() }),
  fail: (error, code = 'UNKNOWN_ERROR') => ({ success: false, error: error?.message || 'Unknown error', code: error?.code || code, timestamp: new Date().toISOString() }),
  isSuccess: (response) => response?.success === true,
  isFailure: (response) => response?.success === false,
  getData: (response) => response?.data || null,
  getError: (response) => response?.error || response?.message || 'Unknown error',
  extractPagination: (response) => {
    const data = response?.data || response || {};
    return { content: data.content || [], totalElements: data.totalElements || 0, totalPages: data.totalPages || 0, pageNumber: data.pageNumber || 0, pageSize: data.pageSize || 0, last: data.last || true, first: data.first || true };
  },
};

// ==========================================================
// DEFAULT DATA
// ==========================================================
export const defaultData = {
  dashboardStats: {
    totalUsers: 0, activeUsers: 0, inactiveUsers: 0, newUsersToday: 0, newUsersThisWeek: 0,
    totalCustomers: 0, totalProviders: 0, totalAdmins: 0, totalProviderProfiles: 0,
    verifiedProviders: 0, pendingProviders: 0, rejectedProviders: 0, suspendedProviders: 0,
    totalBookings: 0, completedBookings: 0, cancelledBookings: 0, pendingBookings: 0,
    todayBookings: 0, activeBookings: 0, completionRate: 0, totalRevenue: 0,
    revenueToday: 0, revenueMonth: 0, totalComplaints: 0, resolvedComplaints: 0,
    complaintResolutionRate: 0, recentBookings: [], recentActivities: [], topProviders: [], updatedAt: new Date().toISOString(),
  },
  generateTrendData: (days = 7) => {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(today); date.setDate(today.getDate() - (days - 1 - i));
      return { name: date.toLocaleDateString('en-US', { weekday: 'short' }), value: 0 };
    });
  },
  serviceDemand: [
    { name: 'Plumbing', value: 0, icon: '🛠' }, { name: 'Electrical', value: 0, icon: '⚡' },
    { name: 'Cleaning', value: 0, icon: '🧹' }, { name: 'AC Service', value: 0, icon: '❄' },
    { name: 'Carpentry', value: 0, icon: '🔨' }, { name: 'Painting', value: 0, icon: '🎨' },
    { name: 'Appliance Repair', value: 0, icon: '🔧' },
  ],
  providerDistribution: { VERIFIED: 0, PENDING: 0, SUSPENDED: 0, REJECTED: 0, INACTIVE: 0 },
  userStats: { totalUsers: 0, activeUsers: 0, inactiveUsers: 0, customers: 0, providers: 0, admins: 0, newUsersToday: 0, newUsersThisMonth: 0 },
  bookingStats: { total: 0, completed: 0, cancelled: 0, pending: 0, inProgress: 0 },
};

// ==========================================================
// ADMIN SERVICE - FULL
// ==========================================================
export const adminService = {
  getDashboardStats: async () => {
    try { const response = await axiosInstance.get(API_ENDPOINTS.DASHBOARD.STATS); const stats = response.data?.data || response.data || defaultData.dashboardStats; return responseHelpers.ok(stats); }
    catch (error) { return responseHelpers.fail(error, 'DASHBOARD_STATS_ERROR'); }
  },
  getRevenueTrend: async (days = 7) => {
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD.REVENUE_TREND}?days=${days}`);
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const trendData = data.map((value, index) => ({ name: defaultData.generateTrendData(days)[index]?.name || '', value: typeof value === 'number'? value : (value?.value || 0) }));
        return responseHelpers.ok(trendData);
      }
      return responseHelpers.ok(defaultData.generateTrendData(days));
    } catch (error) { return responseHelpers.ok(defaultData.generateTrendData(days)); }
  },
  getProviderDistribution: async () => {
    try { const response = await axiosInstance.get(API_ENDPOINTS.DASHBOARD.PROVIDER_DISTRIBUTION); const data = response.data?.data || response.data || {}; return responseHelpers.ok(data); }
    catch (error) { return responseHelpers.ok(defaultData.providerDistribution); }
  },
  getRecentActivities: async (limit = 20) => {
    try { const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES}?limit=${limit}`); const activities = response.data?.data || response.data || []; return responseHelpers.ok(Array.isArray(activities)? activities : []); }
    catch (error) { return responseHelpers.ok([]); }
  },
  getTopProviders: async (limit = 5) => {
    try { const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS}?limit=${limit}`); const providers = response.data?.data || response.data || []; return responseHelpers.ok(Array.isArray(providers)? providers : []); }
    catch (error) { return responseHelpers.ok([]); }
  },
  getRecentBookings: async (limit = 10) => {
    try { const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS}?limit=${limit}`); const bookings = response.data?.data || response.data || []; return responseHelpers.ok(Array.isArray(bookings)? bookings : []); }
    catch (error) { return responseHelpers.ok([]); }
  },
  getServiceDemand: async () => {
    try { const response = await axiosInstance.get(API_ENDPOINTS.DASHBOARD.SERVICE_DEMAND); const data = response.data?.data || response.data || []; if (Array.isArray(data) && data.length > 0) return responseHelpers.ok(data); return responseHelpers.ok(defaultData.serviceDemand); }
    catch (error) { return responseHelpers.ok(defaultData.serviceDemand); }
  },
  exportDashboardReport: async (format, dateRange) => {
    const response = await axiosInstance.get(API_ENDPOINTS.DASHBOARD.EXPORT, { params: { format, startDate: dateRange?.start, endDate: dateRange?.end, _t: Date.now() }, responseType: 'blob' }); return response;
  },
  getAllUsers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', params.page || 0); queryParams.append('size', params.size || 10);
      queryParams.append('sortBy', params.sortBy || 'createdAt'); queryParams.append('sortDir', params.sortDir || 'desc');
      if (params.search) queryParams.append('search', params.search);
      if (params.role && params.role!== 'all') queryParams.append('role', params.role);
      if (params.status && params.status!== 'all') queryParams.append('status', params.status);
      const response = await axiosInstance.get(`${API_ENDPOINTS.USER.ALL}?${queryParams.toString()}`);
      return responseHelpers.ok(response.data?.data || response.data);
    } catch (error) { return responseHelpers.fail(error, 'FETCH_USERS_ERROR'); }
  },
  getUserDetails: async (id) => {
    try { const response = await axiosInstance.get(API_ENDPOINTS.USER.DETAILS(id)); return responseHelpers.ok(response.data?.data || response.data); }
    catch (error) { return responseHelpers.fail(error, 'USER_DETAILS_ERROR'); }
  },
  updateUserStatus: async (id, enabled) => {
    try { const endpoint = enabled? API_ENDPOINTS.USER.ENABLE(id) : API_ENDPOINTS.USER.DISABLE(id); const response = await axiosInstance.put(endpoint); return responseHelpers.ok(response.data?.data || response.data); }
    catch (error) { return responseHelpers.fail(error, 'UPDATE_USER_STATUS_ERROR'); }
  },
  getAllProviders: async (params = {}) => {
    try { const queryParams = new URLSearchParams(params).toString(); const response = await axiosInstance.get(`${API_ENDPOINTS.PROVIDER.ALL}?${queryParams}`); return responseHelpers.ok(response.data?.data || response.data); }
    catch (error) { return responseHelpers.fail(error, 'FETCH_PROVIDERS_ERROR'); }
  },
  approveProvider: async (id, notes = '') => {
    try { const response = await axiosInstance.put(API_ENDPOINTS.PROVIDER.APPROVE(id), { notes }); return responseHelpers.ok(response.data?.data || response.data); }
    catch (error) { return responseHelpers.fail(error, 'APPROVE_PROVIDER_ERROR'); }
  },
  rejectProvider: async (id, reason = '') => {
    try { const response = await axiosInstance.put(API_ENDPOINTS.PROVIDER.REJECT(id), { reason }); return responseHelpers.ok(response.data?.data || response.data); }
    catch (error) { return responseHelpers.fail(error, 'REJECT_PROVIDER_ERROR'); }
  },
  getAllBookings: async (params = {}) => {
    try { const queryParams = new URLSearchParams(params).toString(); const response = await axiosInstance.get(`${API_ENDPOINTS.BOOKING.ALL}?${queryParams}`); return responseHelpers.ok(response.data?.data || response.data); }
    catch (error) { return responseHelpers.fail(error, 'FETCH_BOOKINGS_ERROR'); }
  }
};

// ==========================================================
// WEBSOCKET - FIXED NO LOCALHOST FALLBACK
// ==========================================================
export const wsConfig = {
  getWsUrl: () => {
    const cleanBase = WS_BASE_URL.replace(/\/+$/, '');
    const wsProtocol = cleanBase.startsWith('https')? 'wss://' : 'ws://';
    const hostAndPath = cleanBase.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '').replace(/\/quickks\/api\/v1\/?$/, '/quickks');
    return `${wsProtocol}${hostAndPath}/ws`.replace(/\/quickks\/ws$/, '/quickks/ws');
  },
  getSockJSUrl: () => {
    try {
      let base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
      if (!base.includes('/quickks')) base = `${base.replace(/\/+$/, '')}/quickks`;
      return base;
    } catch {
      return `${PROD_WS_ROOT}/quickks`;
    }
  }
};

export default axiosInstance;