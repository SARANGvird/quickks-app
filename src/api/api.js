// src/api/api.js - v12.0 PRODUCTION - Vercel + Spring Boot Integration
import axios from 'axios';

const isBrowser = typeof window !== 'undefined';
const isDebug = process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'https://api.quickks.in/quickks/api/v1').replace(/\/+$/, '');
const WS_URL = (process.env.REACT_APP_WS_URL || 'wss://api.quickks.in/quickks/ws').replace(/\/+$/, '');

const debugLog = (...args) => { if (isDebug && isBrowser) console.log('[API]', ...args); };

// --- SAFE STORAGE ---
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
  try { if (!value) return null; return JSON.parse(value); } catch { return null; }
};

// --- TOKEN MANAGER - SINGLE SOURCE - Supports both key sets ---
// Primary keys: accessToken, refreshToken, user (your LoginPage)
// Legacy keys: quickks_access, quickks_refresh, quickks_user (for migration)
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
  getUser: () => {
    const raw = safeGet(KEYS.USER) || safeGet(KEYS.LEGACY_USER);
    return safeParse(raw);
  },
  getTokens: function() {
    return { accessToken: this.getAccessToken(), refreshToken: this.getRefreshToken() };
  },
  setTokens: (access, refresh) => {
    if (access) { safeSet(KEYS.ACCESS, access); safeSet(KEYS.LEGACY_ACCESS, access); }
    if (refresh) { safeSet(KEYS.REFRESH, refresh); safeSet(KEYS.LEGACY_REFRESH, refresh); }
  },
  setUser: (u) => {
    try {
      if (!isBrowser) return;
      const str = JSON.stringify(u);
      safeSet(KEYS.USER, str);
      safeSet(KEYS.LEGACY_USER, str);
    } catch {}
  },
  removeTokens: () => {
    safeRemove(KEYS.ACCESS, KEYS.REFRESH, KEYS.USER, KEYS.LEGACY_ACCESS, KEYS.LEGACY_REFRESH, KEYS.LEGACY_USER);
  },
  clearTokens: function() { this.removeTokens(); },
  isAuthenticated: function() { return !!this.getAccessToken(); },
};

export const tokenManager = TokenManager; // lowercase alias for LoginPage

// --- AXIOS INSTANCE ---
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// Request Interceptor
api.interceptors.request.use((config) => {
  const token = TokenManager.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  debugLog(`${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
}, (error) => Promise.reject(error));

// Refresh Queue
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

    // Don't retry auth endpoints
    const isAuthUrl = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register') || url.includes('/auth/send-otp') || url.includes('/auth/verify-otp');

    if (status === 401 && !original._retry && !isAuthUrl) {
      if (refreshPromise) {
        // Queue request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(newToken => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }).catch(err => Promise.reject(err));
      }

      original._retry = true;
      refreshPromise = (async () => {
        try {
          const rt = TokenManager.getRefreshToken();
          if (!rt) throw new Error('No refresh token');
          // Use raw axios to avoid interceptor loop
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
        } finally {
          refreshPromise = null;
        }
      })();

      try {
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

// --- HEALTH CHECKS - Never throw ---
export const checkHealth = async () => {
  try {
    const res = await api.get('/auth/ping', { timeout: 5000, validateStatus: () => true });
    return { success: true, online: res.status < 500, status: res.status, data: res.data };
  } catch {
    // Fallback to actuator if ping not exist
    try {
      const res2 = await axios.get(`${API_BASE_URL.replace('/api/v1','')}/actuator/health`, { timeout: 5000, validateStatus: () => true });
      return { success: true, online: res2.status < 500, data: res2.data };
    } catch {
      return { success: true, online: false, status: 0 };
    }
  }
};

export const testConnection = async () => {
  const h = await checkHealth();
  return { success: true, online: h.online, message: h.online ? 'Connected to api.quickks.in' : 'Backend offline' };
};
export const testBackendHealth = testConnection;

// --- ENDPOINTS ---
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    REGISTER: '/auth/register',
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    LOGOUT: '/auth/logout',
    PING: '/auth/ping',
  },
  USER: {
    ALL: '/users',
    DETAILS: (id) => `/users/${id}`,
    STATUS: (id) => `/users/${id}/status`,
    STATISTICS: '/users/statistics',
    ENABLE: (id) => `/users/${id}/enable`,
    DISABLE: (id) => `/users/${id}/disable`,
    DELETE: (id) => `/users/${id}`,
    EXPORT: '/admin/users/export',
  },
  PROVIDER: {
    ALL: '/providers',
    DETAILS: (id) => `/providers/${id}`,
    APPROVE: (id) => `/providers/${id}/approve`,
    REJECT: (id) => `/providers/${id}/reject`,
  },
  BOOKING: { ALL: '/bookings', STATISTICS: '/bookings/statistics' },
  DASHBOARD: {
    STATS: '/admin/dashboard/stats',
    REVENUE_TREND: '/admin/dashboard/revenue-trend',
    RECENT_ACTIVITIES: '/admin/dashboard/recent-activities',
    TOP_PROVIDERS: '/admin/dashboard/top-providers',
    RECENT_BOOKINGS: '/admin/dashboard/recent-bookings',
    SERVICE_DEMAND: '/admin/dashboard/service-demand',
    PROVIDER_DISTRIBUTION: '/admin/dashboard/provider-distribution',
    USER_STATS: '/admin/dashboard/user-stats',
    BOOKING_STATS: '/admin/dashboard/booking-stats',
    EXPORT: '/admin/dashboard/export',
  },
};

// --- HELPERS FOR ADMIN SERVICES ---
export const responseHelpers = {
  ok: (d, m = 'Success') => ({ success: true, data: d, message: m }),
  fail: (e, m = 'Failed') => ({ success: false, error: e?.message || e, message: m }),
  unwrap: (res) => res?.data?.data || res?.data || res,
};

export const defaultData = {
  dashboardStats: { totalUsers: 0, totalProviders: 0, totalBookings: 0, totalRevenue: 0 },
  generateTrendData: (days = 7) => Array.from({ length: days }, (_, i) => ({ name: `Day ${i + 1}`, value: 0, revenue: 0 })),
  serviceDemand: [],
  providerDistribution: {},
  revenueTrend: [],
  recentActivities: [],
};

export const wsConfig = {
  getWsUrl: () => WS_URL,
  getSockJSUrl: () => API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/quickks\/api\/v1\/?$/, '/quickks'),
  getStompUrl: () => `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/ws`,
};

export { API_BASE_URL, WS_URL };
export default api;
