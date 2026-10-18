import axios from 'axios';

const isBrowser = typeof window !== 'undefined';
const env = import.meta.env || {};

const clean = (v) => {
  if (!v) return '';
  return String(v).trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').replace(/\s+/g, '').replace(/\/+$/, '');
};

const dedupApiV1 = (url) => {
  return url
    .replace(/(\/api\/v1)(\/api\/v1)+/gi, '/api/v1')
    .replace(/\/api\/v1\/api\/v1/gi, '/api/v1')
    .replace(/\/quickks\/api\/v1\/api\/v1/gi, '/api/v1')
    .replace(/\/quickks\/api\/v1/gi, '/api/v1');
};

const RAW_API_RAW = clean(env.VITE_API_BASE_URL || 'https://api.quickks.in');
const RAW_API_DEDUPED = dedupApiV1(RAW_API_RAW);

const normalizeApiBase = (raw) => {
  if (!raw) return 'https://api.quickks.in/api/v1';
  let url = raw.replace(/\/+$/, '');
  url = url.replace(/\/quickks$/i, '').replace(/\/quickks\/api\/v1$/i, '/api/v1');
  if (!/\/api\/v1$/i.test(url)) url = `${url}/api/v1`;
  return dedupApiV1(url);
};

export const API_BASE_URL = normalizeApiBase(RAW_API_DEDUPED);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/i, '').replace(/\/+$/, '') || 'https://api.quickks.in';
export const WS_URL = clean(env.VITE_WS_URL) || `${API_ORIGIN.replace(/^http/i, 'ws').replace(/^ws:/i, 'wss:').replace(/\/+$/, '')}/ws`;
export const SOCKJS_BASE = API_ORIGIN;

const KEYS = {
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
  USER: 'user',
  LEGACY_A: 'quickks_access',
  LEGACY_R: 'quickks_refresh',
  LEGACY_U: 'quickks_user',
};

const safeGet = (k) => { try { return isBrowser ? localStorage.getItem(k) : null; } catch { return null; } };
const safeSet = (k, v) => { try { if (isBrowser) { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } } catch {} };
const safeRemove = (...ks) => { try { ks.forEach(k => isBrowser && localStorage.removeItem(k)); } catch {} };

const sanitizeUser = (u) => {
  if (!u || typeof u !== 'object') return null;
  const allowed = ['id', 'email', 'fullName', 'name', 'firstName', 'lastName', 'role', 'authorities', 'verified', 'avatar'];
  const out = {};
  for (const k of allowed) if (u[k] !== undefined) out[k] = u[k];
  return out;
};

export const TokenManager = {
  getAccessToken: () => {
    const t = safeGet(KEYS.ACCESS) || safeGet(KEYS.LEGACY_A);
    if (!t || t.length < 10) return null;
    return t;
  },
  getRefreshToken: () => {
    const t = safeGet(KEYS.REFRESH) || safeGet(KEYS.LEGACY_R);
    if (!t || t.length < 10) return null;
    return t;
  },
  getUser: () => {
    try {
      const raw = safeGet(KEYS.USER) || safeGet(KEYS.LEGACY_U);
      if (!raw || raw === 'undefined' || raw === 'null') return null;
      const parsed = JSON.parse(raw);
      return sanitizeUser(parsed) || parsed;
    } catch { safeRemove(KEYS.USER, KEYS.LEGACY_U); return null; }
  },
  setTokens: (a, r) => {
    if (a && typeof a === 'string' && a.length > 10) { safeSet(KEYS.ACCESS, a); safeSet(KEYS.LEGACY_A, a); }
    if (r && typeof r === 'string' && r.length > 10) { safeSet(KEYS.REFRESH, r); safeSet(KEYS.LEGACY_R, r); }
  },
  setUser: (u) => {
    const s = sanitizeUser(u);
    if (!s) return;
    try { const str = JSON.stringify(s); safeSet(KEYS.USER, str); safeSet(KEYS.LEGACY_U, str); } catch {}
  },
  removeTokens: () => safeRemove(KEYS.ACCESS, KEYS.REFRESH, KEYS.USER, KEYS.LEGACY_A, KEYS.LEGACY_R, KEYS.LEGACY_U),
  isAuthenticated: () => !!TokenManager.getAccessToken(),
  hasRole: (role) => {
    const user = TokenManager.getUser();
    if (!user) return false;
    const r = String(user.role || '').toUpperCase().replace(/^ROLE_/, '');
    return r === String(role).toUpperCase().replace(/^ROLE_/, '');
  },
};

export const tokenManager = TokenManager;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = TokenManager.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  config.headers['X-Client-Version'] = 'v67';
  if (config.url) {
    config.url = config.url.replace(/^\/api\/v1\//i, '/').replace(/^\/quickks\/api\/v1\//i, '/');
    config.url = dedupApiV1(config.url);
  }
  return config;
});

let refreshPromise = null;
let failedQueue = [];
const processQueue = (err, token = null) => {
  failedQueue.forEach(p => err ? p.reject(err) : p.resolve(token));
  failedQueue = [];
};

export const refreshAccessToken = async () => {
  const rt = TokenManager.getRefreshToken();
  if (!rt) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rt }, { timeout: 8000, headers: { 'Content-Type': 'application/json' } });
    const body = res.data?.data || res.data || {};
    const newAccess = body.accessToken || body.token;
    const newRefresh = body.refreshToken;
    if (!newAccess) return null;
    TokenManager.setTokens(newAccess, newRefresh || rt);
    return newAccess;
  } catch {
    return null;
  }
};

export const refreshToken = refreshAccessToken;

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
          if (isBrowser && !window.location.pathname.includes('/login')) window.location.href = '/login?expired=true';
          throw e;
        } finally { refreshPromise = null; }
      })();
      try {
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) { return Promise.reject(e); }
    }
    if (status === 403) {
      console.warn('[API] 403 Forbidden:', url);
    }
    return Promise.reject(error);
  }
);

const unwrap = (res) => {
  if (!res) return [];
  const data = res?.data?.data ?? res?.data ?? res;
  if (data?.success === false) return [];
  if (data?.data !== undefined) {
    if (Array.isArray(data.data)) return data.data;
    return data.data;
  }
  return data;
};

const unwrapSafe = (res) => {
  const d = unwrap(res);
  if (d == null) return [];
  return d;
};

export const wsConfig = {
  getWsUrl: () => WS_URL,
  getSockJSUrl: () => `${SOCKJS_BASE}/ws`,
  getStompUrl: () => `${SOCKJS_BASE}/ws`,
  getNativeUrl: () => `${SOCKJS_BASE.replace(/^http/, 'ws')}/ws-native`,
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

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    SEND_OTP: '/auth/send-otp',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    PING: '/auth/ping',
    LOGOUT: '/auth/logout',
    FORGOT: '/auth/forgot-password',
    RESET: '/auth/reset-password',
  },
  HOME: {
    STATS: '/home/stats',
    FEATURED: '/home/featured-providers',
    ANNOUNCEMENTS: '/announcements',
    POPULAR_SERVICES: '/services/popular',
  },
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
  getDashboardStats: (signal) => api.get(API_ENDPOINTS.DASHBOARD.STATS, { signal }).then(unwrapSafe),
  getRevenueTrend: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.REVENUE_TREND, { params, signal }).then(unwrapSafe),
  getProviderDistribution: (signal) => api.get(API_ENDPOINTS.DASHBOARD.PROVIDER_DISTRIBUTION, { signal }).then(unwrapSafe),
  getRecentActivities: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES, { params, signal }).then(unwrapSafe),
  getTopProviders: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS, { params, signal }).then(unwrapSafe),
  getRecentBookings: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS, { params, signal }).then(unwrapSafe),
  getServiceDemand: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.SERVICE_DEMAND, { params, signal }).then(unwrapSafe),
};

export const homeService = {
  getStats: (signal) => api.get(API_ENDPOINTS.HOME.STATS, { signal }).then(unwrap),
  getFeatured: (signal) => api.get(API_ENDPOINTS.HOME.FEATURED, { signal }).then(unwrap),
  getAnnouncements: (signal) => api.get(API_ENDPOINTS.HOME.ANNOUNCEMENTS, { signal }).then(unwrap).catch(() => []),
  getPopularServices: (signal) => api.get(API_ENDPOINTS.HOME.POPULAR_SERVICES, { signal }).then(unwrap).catch(() => []),
};

export const authService = {
  login: (data, signal) => api.post(API_ENDPOINTS.AUTH.LOGIN, data, { signal }).then(unwrap),
  register: (data, signal) => api.post(API_ENDPOINTS.AUTH.REGISTER, data, { signal }).then(unwrap),
  sendOtp: (data, signal) => api.post(API_ENDPOINTS.AUTH.SEND_OTP, data, { signal }).then(unwrap),
  refresh: (data) => api.post(API_ENDPOINTS.AUTH.REFRESH, data).then(unwrap),
  me: (signal) => api.get(API_ENDPOINTS.AUTH.ME, { signal }).then(unwrap),
  ping: () => checkHealth(),
  logout: () => api.post(API_ENDPOINTS.AUTH.LOGOUT).then(unwrap).catch(() => ({ message: 'Logged out' })),
};

export const dashboardService = adminService;
export default api;