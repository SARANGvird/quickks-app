// src/api/api.js - v16.1 FINAL - PUNE PRODUCTION - BUILD PASS
import axios from 'axios';

const isBrowser = typeof window !== 'undefined';
const env = import.meta.env || {};

// ---------- 1. CLEAN + DEDUP /api/v1 ----------
const clean = (v) => {
  if (!v) return '';
  return String(v).trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').replace(/\s+/g, '').replace(/\/+$/, '');
};

const dedupApiV1 = (url) => {
  return url
    .replace(/(\/api\/v1)(\/api\/v1)+/gi, '/api/v1')
    .replace(/\/api\/v1\/api\/v1/gi, '/api/v1');
};

const RAW_API_RAW = clean(env.VITE_API_BASE_URL || 'https://api.quickks.in/quickks/api/v1');
const RAW_API = dedupApiV1(RAW_API_RAW);
const RAW_WS = clean(env.VITE_WS_URL || '');

export const API_BASE_URL = RAW_API || 'https://api.quickks.in/quickks/api/v1';
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/\/+$/, '') || 'https://api.quickks.in';
export const WS_URL = RAW_WS || `${API_ORIGIN.replace(/^http/i, 'ws').replace(/^ws:/i, 'wss:')}/ws`;
export const SOCKJS_BASE = API_ORIGIN;

const isDebug = env.VITE_ENABLE_DEBUG_LOGS === 'true';
const log = (...a) => { if (isDebug && isBrowser) console.log('[API]', ...a); };

// ---------- 2. TOKEN + LEGACY SUPPORT ----------
const KEYS = { ACCESS: 'accessToken', REFRESH: 'refreshToken', USER: 'user', LEGACY_A: 'quickks_access', LEGACY_R: 'quickks_refresh', LEGACY_U: 'quickks_user' };
const safeGet = (k) => { try { return isBrowser ? localStorage.getItem(k) : null; } catch { return null; } };
const safeSet = (k, v) => { try { if (isBrowser) { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } } catch {} };
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
  setTokens: (a, r) => {
    if (a) { safeSet(KEYS.ACCESS, a); safeSet(KEYS.LEGACY_A, a); }
    if (r) { safeSet(KEYS.REFRESH, r); safeSet(KEYS.LEGACY_R, r); }
  },
  setUser: (u) => { try { const s = JSON.stringify(u); safeSet(KEYS.USER, s); safeSet(KEYS.LEGACY_U, s); } catch {} },
  removeTokens: () => safeRemove(KEYS.ACCESS, KEYS.REFRESH, KEYS.USER, KEYS.LEGACY_A, KEYS.LEGACY_R, KEYS.LEGACY_U),
  isAuthenticated: () => !!(safeGet(KEYS.ACCESS) || safeGet(KEYS.LEGACY_A)),
};
export const tokenManager = TokenManager;

// ---------- 3. AXIOS ----------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

api.interceptors.request.use((config) => {
  const token = TokenManager.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  log(`${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

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
    const isAuth = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register');
    if (status === 401 && !original._retry && !isAuth) {
      if (refreshPromise) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(t => { original.headers.Authorization = `Bearer ${t}`; return api(original); });
      }
      original._retry = true;
      refreshPromise = (async () => {
        try {
          const rt = TokenManager.getRefreshToken();
          if (!rt) throw new Error('No refresh');
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
  return res?.data?.data?.data || res?.data?.data || res?.data || {};
};

export const wsConfig = {
  getWsUrl: () => WS_URL,
  getSockJSUrl: () => `${SOCKJS_BASE}/ws`,
  getStompUrl: () => `${SOCKJS_BASE}/ws`,
};

// ✅ FIX: checkHealth - AuthContext.js la lagto - he missing hota
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

// ---------- 5. SERVICES ----------
export const API_ENDPOINTS = {
  AUTH: { LOGIN: '/auth/login', REFRESH: '/auth/refresh', ME: '/auth/me', REGISTER: '/auth/register', PING: '/auth/ping', LOGOUT: '/auth/logout' },
  DASHBOARD: {
    STATS: '/admin/dashboard/stats',
    REVENUE_TREND: '/admin/dashboard/revenue-trend',
    PROVIDER_DISTRIBUTION: '/admin/dashboard/provider-distribution',
    RECENT_ACTIVITIES: '/admin/dashboard/recent-activities',
    TOP_PROVIDERS: '/admin/dashboard/top-providers',
    RECENT_BOOKINGS: '/admin/dashboard/recent-bookings',
    SERVICE_DEMAND: '/admin/dashboard/service-demand',
  },
};

export const adminService = {
  getDashboardStats: (signal) => api.get(API_ENDPOINTS.DASHBOARD.STATS, { signal }).then(unwrap).catch(e => { console.error('Dashboard Stats Error:', e?.response?.status); throw e; }),
  getRevenueTrend: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.REVENUE_TREND, { params, signal }).then(unwrap),
  getProviderDistribution: (signal) => api.get(API_ENDPOINTS.DASHBOARD.PROVIDER_DISTRIBUTION, { signal }).then(unwrap),
  getRecentActivities: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES, { params, signal }).then(unwrap),
  getTopProviders: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS, { params, signal }).then(unwrap),
  getRecentBookings: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS, { params, signal }).then(unwrap),
  getServiceDemand: (signal) => api.get(API_ENDPOINTS.DASHBOARD.SERVICE_DEMAND, { signal }).then(unwrap),
};

export const authService = {
  login: (data, signal) => api.post(API_ENDPOINTS.AUTH.LOGIN, data, { signal }).then(unwrap),
  register: (data, signal) => api.post(API_ENDPOINTS.AUTH.REGISTER, data, { signal }).then(unwrap),
  refresh: (data) => api.post(API_ENDPOINTS.AUTH.REFRESH, data).then(unwrap),
  me: (signal) => api.get(API_ENDPOINTS.AUTH.ME, { signal }).then(unwrap),
  ping: () => checkHealth(),
};

export const dashboardService = adminService;
export default api;