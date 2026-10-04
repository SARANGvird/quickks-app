// src/api/api.js - v13.3 VITE FINAL - Vercel + Spring Boot
import axios from 'axios';

const isBrowser = typeof window !== 'undefined';

// VITE FIX: process.env -> import.meta.env
const env = import.meta.env || {};
const isDebug = env.VITE_ENABLE_DEBUG_LOGS === 'true' || env.REACT_APP_ENABLE_DEBUG_LOGS === 'true';

const RAW_BASE = env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || env.VITE_API_URL || env.REACT_APP_API_URL || 'https://api.quickks.in/quickks/api/v1';
const API_BASE_URL = RAW_BASE.replace(/\/+$/, '');
const WS_URL = (env.VITE_WS_URL || env.REACT_APP_WS_URL || 'wss://api.quickks.in/quickks/ws').replace(/\/+$/, '');

const debugLog = (...args) => { if (isDebug && isBrowser) console.log('[API]', ...args); };

const safeGet = (key, fallback = null) => {
  try { if (!isBrowser) return fallback; return localStorage.getItem(key); } catch { return fallback; }
};
const safeSet = (key, value) => {
  try { if (!isBrowser) return; if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch {}
};
const safeRemove = (...keys) => {
  try { if (!isBrowser) return; keys.forEach(k => localStorage.removeItem(k)); } catch {}
};
const safeParse = (value) => {
  try { 
    if (!value || value === "undefined" || value === "null" || value === "" ) return null; 
    return JSON.parse(value); 
  } catch { return null; }
};

const KEYS = {
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
  USER: 'user',
  LEGACY_ACCESS: 'quickks_access',
  LEGACY_REFRESH: 'quickks_refresh',
  LEGACY_USER: 'quickks_user',
};

export const TokenManager = {
  getAccessToken: () => safeGet(KEYS.ACCESS) || safeGet(KEYS.LEGACY_ACCESS),
  getRefreshToken: () => safeGet(KEYS.REFRESH) || safeGet(KEYS.LEGACY_REFRESH),
  getUserRaw: () => safeGet(KEYS.USER) || safeGet(KEYS.LEGACY_USER),
  getUser: () => {
    const raw = safeGet(KEYS.USER) || safeGet(KEYS.LEGACY_USER);
    const parsed = safeParse(raw);
    if (raw && !parsed) safeRemove(KEYS.USER, KEYS.LEGACY_USER);
    return parsed;
  },
  getTokens: function() { return { accessToken: this.getAccessToken(), refreshToken: this.getRefreshToken() }; },
  setTokens: (access, refresh) => {
    if (access) { safeSet(KEYS.ACCESS, access); safeSet(KEYS.LEGACY_ACCESS, access); }
    if (refresh) { safeSet(KEYS.REFRESH, refresh); safeSet(KEYS.LEGACY_REFRESH, refresh); }
  },
  setUser: (u) => {
    try { if (!isBrowser) return; const str = JSON.stringify(u); safeSet(KEYS.USER, str); safeSet(KEYS.LEGACY_USER, str); } catch {}
  },
  removeTokens: () => { safeRemove(KEYS.ACCESS, KEYS.REFRESH, KEYS.USER, KEYS.LEGACY_ACCESS, KEYS.LEGACY_REFRESH, KEYS.LEGACY_USER); },
  clearTokens: function() { this.removeTokens(); },
  isAuthenticated: function() { return !!this.getAccessToken(); },
};
export const tokenManager = TokenManager;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = TokenManager.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  debugLog(`${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
}, (error) => Promise.reject(error));

let refreshPromise = null;
let failedQueue = [];
const processQueue = (error, token = null) => {
  failedQueue.forEach(p => { if (error) p.reject(error); else p.resolve(token); });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';
    const isAuthUrl = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register') || url.includes('/auth/send-otp') || url.includes('/auth/verify-otp');
    if (status === 401 && !original._retry && !isAuthUrl) {
      if (refreshPromise) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); }).then(newToken => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        });
      }
      original._retry = true;
      refreshPromise = (async () => {
        try {
          const rt = TokenManager.getRefreshToken();
          if (!rt) throw new Error('No refresh token');
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rt }, { timeout: 10000 });
          const body = res.data?.data || res.data || {};
          const newAccess = body.accessToken || body.token || body.data?.accessToken;
          const newRefresh = body.refreshToken || body.data?.refreshToken;
          if (!newAccess) throw new Error('Refresh returned no token');
          TokenManager.setTokens(newAccess, newRefresh);
          processQueue(null, newAccess);
          return newAccess;
        } catch (e) {
          processQueue(e, null);
          TokenManager.removeTokens();
          if (isBrowser && !window.location.pathname.includes('/login')) {
            window.dispatchEvent(new CustomEvent('LOGOUT'));
            window.location.href = '/login?expired=true';
          }
          throw e;
        } finally { refreshPromise = null; }
      })();
      try {
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) { return Promise.reject(e); }
    }
    return Promise.reject(error);
  }
);

export const checkHealth = async () => {
  try {
    const res = await api.get('/auth/ping', { timeout: 5000, validateStatus: () => true });
    return { success: true, online: res.status < 500, status: res.status, data: res.data };
  } catch {
    try {
      const res2 = await axios.get(`${API_BASE_URL.replace('/api/v1','')}/actuator/health`, { timeout: 5000, validateStatus: () => true });
      return { success: true, online: res2.status < 500, data: res2.data };
    } catch { return { success: true, online: false, status: 0 }; }
  }
};
export const testConnection = async () => {
  const h = await checkHealth();
  return { success: true, online: h.online, message: h.online ? 'Connected to api.quickks.in' : 'Backend offline' };
};
export const testBackendHealth = testConnection;

export const API_ENDPOINTS = {
  AUTH: { LOGIN: '/auth/login', REFRESH: '/auth/refresh', ME: '/auth/me', REGISTER: '/auth/register', SEND_OTP: '/auth/send-otp', VERIFY_OTP: '/auth/verify-otp', FORGOT_PASSWORD: '/auth/forgot-password', RESET_PASSWORD: '/auth/reset-password', LOGOUT: '/auth/logout', PING: '/auth/ping', },
  USER: { ALL: '/users', DETAILS: (id) => `/users/${id}`, STATUS: (id) => `/users/${id}/status`, STATISTICS: '/users/statistics', ENABLE: (id) => `/users/${id}/enable`, DISABLE: (id) => `/users/${id}/disable`, DELETE: (id) => `/users/${id}`, EXPORT: '/admin/users/export', },
  PROVIDER: { ALL: '/providers', DETAILS: (id) => `/providers/${id}`, APPROVE: (id) => `/providers/${id}/approve`, REJECT: (id) => `/providers/${id}/reject`, },
  BOOKING: { ALL: '/bookings', STATISTICS: '/bookings/statistics' },
  DASHBOARD: { STATS: '/admin/dashboard/stats', REVENUE_TREND: '/admin/dashboard/revenue-trend', RECENT_ACTIVITIES: '/admin/dashboard/recent-activities', TOP_PROVIDERS: '/admin/dashboard/top-providers', RECENT_BOOKINGS: '/admin/dashboard/recent-bookings', SERVICE_DEMAND: '/admin/dashboard/service-demand', PROVIDER_DISTRIBUTION: '/admin/dashboard/provider-distribution', USER_STATS: '/admin/dashboard/user-stats', BOOKING_STATS: '/admin/dashboard/booking-stats', EXPORT: '/admin/dashboard/export', },
};

export const responseHelpers = {
  ok: (d, m = 'Success') => ({ success: true, data: d, message: m }),
  fail: (e, m = 'Failed') => ({ success: false, error: e?.message || e, message: m }),
  unwrap: (res) => res?.data?.data || res?.data || res,
};

export const defaultData = {
  dashboardStats: { totalUsers: 0, totalProviders: 0, totalBookings: 0, totalRevenue: 0 },
  generateTrendData: (days = 7) => Array.from({ length: days }, (_, i) => ({ name: `Day ${i + 1}`, value: 0, revenue: 0 })),
  serviceDemand: [], providerDistribution: {}, revenueTrend: [], recentActivities: [],
};

export const wsConfig = {
  getWsUrl: () => WS_URL,
  getSockJSUrl: () => API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/quickks\/api\/v1\/?$/, '/quickks'),
  getStompUrl: () => `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/ws`,
};

const unwrap = (res) => res?.data?.data || res?.data?.data?.data || res?.data || {};

export const adminService = {
  getAllUsers: (params) => api.get(API_ENDPOINTS.USER.ALL, { params }).then(unwrap),
  getUsers: (params) => api.get(API_ENDPOINTS.USER.ALL, { params }).then(unwrap),
  getUserDetails: (id) => api.get(API_ENDPOINTS.USER.DETAILS(id)).then(unwrap),
  getUserById: (id) => api.get(API_ENDPOINTS.USER.DETAILS(id)).then(unwrap),
  updateUserStatus: (id, status) => api.put(API_ENDPOINTS.USER.STATUS(id), { status }).then(unwrap),
  enableUser: (id) => api.put(API_ENDPOINTS.USER.ENABLE(id)).then(unwrap),
  disableUser: (id) => api.put(API_ENDPOINTS.USER.DISABLE(id)).then(unwrap),
  deleteUser: (id) => api.delete(API_ENDPOINTS.USER.DELETE(id)).then(unwrap),
  getUserStatistics: () => api.get(API_ENDPOINTS.USER.STATISTICS).then(unwrap),
  exportUsers: () => api.get(API_ENDPOINTS.USER.EXPORT, { responseType: 'blob' }),
  getAllProviders: (params) => api.get(API_ENDPOINTS.PROVIDER.ALL, { params }).then(unwrap),
  getProviderDetails: (id) => api.get(API_ENDPOINTS.PROVIDER.DETAILS(id)).then(unwrap),
  approveProvider: (id) => api.put(API_ENDPOINTS.PROVIDER.APPROVE(id)).then(unwrap),
  rejectProvider: (id, reason) => api.put(API_ENDPOINTS.PROVIDER.REJECT(id), { reason }).then(unwrap),
  getDashboardStats: () => api.get(API_ENDPOINTS.DASHBOARD.STATS).then(unwrap),
  getRevenueTrend: (params) => api.get(API_ENDPOINTS.DASHBOARD.REVENUE_TREND, { params }).then(unwrap),
  getRecentActivities: () => api.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES).then(unwrap),
  getTopProviders: () => api.get(API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS).then(unwrap),
  getRecentBookings: () => api.get(API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS).then(unwrap),
  getAllBookings: (params) => api.get(API_ENDPOINTS.BOOKING.ALL, { params }).then(unwrap),
  getBookingStatistics: () => api.get(API_ENDPOINTS.BOOKING.STATISTICS).then(unwrap),
};

export const userService = adminService;
export const providerService = adminService;
export const bookingService = adminService;
export const dashboardService = adminService;

export { API_BASE_URL, WS_URL };
export default api;