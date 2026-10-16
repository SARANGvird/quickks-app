// src/api/api.js - v15.0 PUNE PRODUCTION SENIOR FINAL
import axios from 'axios';

const isBrowser = typeof window !== 'undefined';
const env = import.meta.env || {};

// ---------- 1. ENV PARSING (Robust) ----------
const clean = (v) => {
  if (!v) return '';
  return String(v).trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').replace(/\/+$/, '');
};

const RAW_API = clean(env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || env.VITE_API_URL || env.REACT_APP_API_URL || 'https://api.quickks.in/api/v1');
const RAW_WS = clean(env.VITE_WS_URL || env.REACT_APP_WS_URL || '');

export const API_BASE_URL = RAW_API || 'https://api.quickks.in/api/v1';

// WS URL must be derived from API origin, not hardcoded
// https://api.quickks.in/api/v1 -> https://api.quickks.in
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
export const WS_URL = RAW_WS || `${API_ORIGIN.replace(/^http/, 'ws')}/ws`; // https -> wss
export const SOCKJS_BASE = API_ORIGIN;

const isDebug = env.VITE_ENABLE_DEBUG_LOGS === 'true';
const log = (...a) => { if (isDebug && isBrowser) console.log('[API]', ...a); };

// ---------- 2. STORAGE ----------
const KEYS = { ACCESS: 'accessToken', REFRESH: 'refreshToken', USER: 'user', LEGACY_A: 'quickks_access', LEGACY_R: 'quickks_refresh', LEGACY_U: 'quickks_user' };
const safeGet = (k) => { try { return isBrowser ? localStorage.getItem(k) : null; } catch { return null; } };
const safeSet = (k, v) => { try { if (!isBrowser) return; v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };
const safeRemove = (...ks) => { try { ks.forEach(k => isBrowser && localStorage.removeItem(k)); } catch {} };

export const TokenManager = {
  getAccessToken: () => safeGet(KEYS.ACCESS) || safeGet(KEYS.LEGACY_A),
  getRefreshToken: () => safeGet(KEYS.REFRESH) || safeGet(KEYS.LEGACY_R),
  getUser: () => {
    try {
      const raw = safeGet(KEYS.USER) || safeGet(KEYS.LEGACY_U);
      if (!raw || raw === 'undefined' || raw === 'null') return null;
      return JSON.parse(raw);
    } catch { safeRemove(KEYS.USER, KEYS.LEGACY_U); return null; }
  },
  setTokens: (access, refresh) => {
    if (access) { safeSet(KEYS.ACCESS, access); safeSet(KEYS.LEGACY_A, access); }
    if (refresh) { safeSet(KEYS.REFRESH, refresh); safeSet(KEYS.LEGACY_R, refresh); }
  },
  setUser: (u) => { try { const s = JSON.stringify(u); safeSet(KEYS.USER, s); safeSet(KEYS.LEGACY_U, s); } catch {} },
  removeTokens: () => safeRemove(KEYS.ACCESS, KEYS.REFRESH, KEYS.USER, KEYS.LEGACY_A, KEYS.LEGACY_R, KEYS.LEGACY_U),
  isAuthenticated: () => !! (safeGet(KEYS.ACCESS) || safeGet(KEYS.LEGACY_A)),
};
export const tokenManager = TokenManager;

// ---------- 3. AXIOS INSTANCE ----------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

// Request Interceptor
api.interceptors.request.use((config) => {
  const token = TokenManager.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  log(`${config.method?.toUpperCase()} ${config.url}`);
  return config;
}, (e) => Promise.reject(e));

// Response Interceptor - Refresh Queue
let refreshPromise = null;
let failedQueue = [];
const processQueue = (err, token = null) => {
  failedQueue.forEach(p => err ? p.reject(err) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';
    const isAuth = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register') || url.includes('/auth/send-otp');

    if (status === 401 && !original._retry && !isAuth) {
      if (refreshPromise) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((t) => { original.headers.Authorization = `Bearer ${t}`; return api(original); });
      }
      original._retry = true;
      refreshPromise = (async () => {
        try {
          const rt = TokenManager.getRefreshToken();
          if (!rt) throw new Error('No refresh token');
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rt }, { timeout: 8000 });
          const body = res.data?.data || res.data || {};
          const newAccess = body.accessToken || body.token;
          const newRefresh = body.refreshToken;
          if (!newAccess) throw new Error('Refresh failed');
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

// ---------- 4. HELPERS ----------
const unwrap = (res) => {
  // Supports: {data:{data:{...}}} , {data:{...}}, {...}
  return res?.data?.data?.data || res?.data?.data || res?.data || res || {};
};

export const checkHealth = async () => {
  try {
    const res = await api.get('/auth/ping', { timeout: 4000, validateStatus: () => true });
    return { online: res.status < 500, status: res.status };
  } catch {
    try {
      const res2 = await axios.get(`${API_ORIGIN}/actuator/health`, { timeout: 4000, validateStatus: () => true });
      return { online: res2.status < 500, status: res2.status };
    } catch { return { online: false, status: 0 }; }
  }
};

export const wsConfig = {
  getWsUrl: () => WS_URL,
  getSockJSUrl: () => `${SOCKJS_BASE}/ws`,
  getStompUrl: () => `${SOCKJS_BASE}/ws`,
};

// ---------- 5. SERVICES ----------
export const API_ENDPOINTS = {
  AUTH: { LOGIN: '/auth/login', REFRESH: '/auth/refresh', ME: '/auth/me', REGISTER: '/auth/register', PING: '/auth/ping', LOGOUT: '/auth/logout' },
  DASHBOARD: { STATS: '/admin/dashboard/stats', REVENUE_TREND: '/admin/dashboard/revenue-trend', PROVIDER_DISTRIBUTION: '/admin/dashboard/provider-distribution', RECENT_ACTIVITIES: '/admin/dashboard/recent-activities', TOP_PROVIDERS: '/admin/dashboard/top-providers', RECENT_BOOKINGS: '/admin/dashboard/recent-bookings', SERVICE_DEMAND: '/admin/dashboard/service-demand' },
  USER: { ALL: '/users', STATISTICS: '/users/statistics' },
};

export const adminService = {
  getDashboardStats: (signal) => api.get(API_ENDPOINTS.DASHBOARD.STATS, { signal }).then(unwrap),
  getRevenueTrend: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.REVENUE_TREND, { params, signal }).then(unwrap),
  getProviderDistribution: (signal) => api.get(API_ENDPOINTS.DASHBOARD.PROVIDER_DISTRIBUTION, { signal }).then(unwrap),
  getRecentActivities: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES, { params, signal }).then(unwrap),
  getTopProviders: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS, { params, signal }).then(unwrap),
  getRecentBookings: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS, { params, signal }).then(unwrap),
  getServiceDemand: (signal) => api.get(API_ENDPOINTS.DASHBOARD.SERVICE_DEMAND, { signal }).then(unwrap),
};

export const dashboardService = adminService;
export default api;