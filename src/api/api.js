import axios from "axios";

const isBrowser = typeof window !== "undefined";
const env = import.meta.env || {};

const clean = (v) => {
  if (!v) return "";
  return String(v).trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "").replace(/\s+/g, "").replace(/\/+$/, "");
};

const dedupApiV1 = (url) => {
  if (!url) return url;
  return url
    .replace(/(\/api\/v1)(\/api\/v1)+/gi, "/api/v1")
    .replace(/\/api\/v1\/api\/v1/gi, "/api/v1")
    .replace(/\/quickks\/api\/v1\/api\/v1/gi, "/api/v1")
    .replace(/\/quickks\/api\/v1/gi, "/api/v1");
};

const RAW_API_RAW = clean(env.VITE_API_BASE_URL || "https://api.quickks.in");
const RAW_API_DEDUPED = dedupApiV1(RAW_API_RAW);

const normalizeApiBase = (raw) => {
  if (!raw) return "https://api.quickks.in/api/v1";
  let url = raw.replace(/\/+$/, "");
  url = url.replace(/\/quickks$/i, "").replace(/\/quickks\/api\/v1$/i, "/api/v1");
  if (!/\/api\/v1$/i.test(url)) url = `${url}/api/v1`;
  return dedupApiV1(url);
};

export const API_BASE_URL = normalizeApiBase(RAW_API_DEDUPED);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/i, "").replace(/\/+$/, "") || "https://api.quickks.in";
export const WS_URL = clean(env.VITE_WS_URL) || `${API_ORIGIN}/ws`;
export const SOCKJS_BASE = API_ORIGIN;

const KEYS = {
  ACCESS: "accessToken",
  REFRESH: "refreshToken",
  USER: "user",
  LEGACY_A: "quickks_access",
  LEGACY_R: "quickks_refresh",
  LEGACY_U: "quickks_user",
  LEGACY_TOKEN: "quickks_token",
  LEGACY_TOKEN2: "token",
};

const safeGet = (k) => {
  try { return isBrowser ? localStorage.getItem(k) : null; } catch { return null; }
};
const safeSet = (k, v) => {
  try { if (isBrowser) v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {}
};
const safeRemove = (...ks) => { try { ks.forEach((k) => isBrowser && localStorage.removeItem(k)); } catch {} };

const sanitizeUser = (u) => {
  if (!u || typeof u !== "object") return null;
  const allowed = ["id", "email", "fullName", "name", "firstName", "lastName", "role", "authorities", "verified", "avatar", "phone", "enabled", "isVerified"];
  const out = {};
  for (const k of allowed) if (u[k] !== undefined) out[k] = u[k];
  return Object.keys(out).length ? out : null;
};

export const TokenManager = {
  getAccessToken: () => {
    const t = safeGet(KEYS.ACCESS) || safeGet(KEYS.LEGACY_A) || safeGet(KEYS.LEGACY_TOKEN) || safeGet(KEYS.LEGACY_TOKEN2);
    if (!t || t.length < 20) return null;
    return t;
  },
  getRefreshToken: () => {
    const t = safeGet(KEYS.REFRESH) || safeGet(KEYS.LEGACY_R);
    if (!t || t.length < 20) return null;
    return t;
  },
  getUser: () => {
    try {
      const raw = safeGet(KEYS.USER) || safeGet(KEYS.LEGACY_U);
      if (!raw || raw === "undefined" || raw === "null") return null;
      const parsed = JSON.parse(raw);
      return sanitizeUser(parsed) || parsed;
    } catch {
      safeRemove(KEYS.USER, KEYS.LEGACY_U);
      return null;
    }
  },
  setTokens: (a, r) => {
    if (a && typeof a === "string" && a.length > 20) {
      safeSet(KEYS.ACCESS, a);
      safeSet(KEYS.LEGACY_A, a);
      safeSet(KEYS.LEGACY_TOKEN, a);
    }
    if (r && typeof r === "string" && r.length > 20) {
      safeSet(KEYS.REFRESH, r);
      safeSet(KEYS.LEGACY_R, r);
    }
  },
  setUser: (u) => {
    const s = sanitizeUser(u);
    if (!s) return;
    try {
      const str = JSON.stringify(s);
      safeSet(KEYS.USER, str);
      safeSet(KEYS.LEGACY_U, str);
    } catch {}
  },
  removeTokens: () => safeRemove(KEYS.ACCESS, KEYS.REFRESH, KEYS.USER, KEYS.LEGACY_A, KEYS.LEGACY_R, KEYS.LEGACY_U, KEYS.LEGACY_TOKEN, KEYS.LEGACY_TOKEN2),
  isAuthenticated: () => !!TokenManager.getAccessToken(),
  hasRole: (role) => {
    const user = TokenManager.getUser();
    if (!user) return false;
    const r = String(user.role || "").toUpperCase().replace(/^ROLE_/, "");
    return r === String(role).toUpperCase().replace(/^ROLE_/, "");
  },
};

export const tokenManager = TokenManager;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = TokenManager.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Request-ID"] = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  config.headers["X-Client-Version"] = "v80-users-fixed";
  if (config.url) {
    config.url = config.url.replace(/^\/api\/v1\//i, "/").replace(/^\/quickks\/api\/v1\//i, "/");
    config.url = dedupApiV1(config.url);
  }
  return config;
});

let refreshPromise = null;
let failedQueue = [];
const processQueue = (err, token = null) => {
  failedQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  failedQueue = [];
};

export const refreshAccessToken = async () => {
  const rt = TokenManager.getRefreshToken();
  if (!rt) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rt }, { timeout: 8000, headers: { "Content-Type": "application/json" } });
    const body = res.data?.data || res.data || {};
    const newAccess = body.accessToken || body.token;
    const newRefresh = body.refreshToken || rt;
    if (!newAccess) return null;
    TokenManager.setTokens(newAccess, newRefresh);
    if (body.user) TokenManager.setUser(body.user);
    return newAccess;
  } catch { return null; }
};
export const refreshToken = refreshAccessToken;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || "";
    const isAuth = url.includes("/auth/login") || url.includes("/auth/refresh") || url.includes("/auth/register") || url.includes("/auth/send-otp") || url.includes("/auth/verify-otp");
    if (status === 401 && !original._retry && !isAuth) {
      if (refreshPromise) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); }).then((t) => {
          original.headers.Authorization = `Bearer ${t}`;
          return api(original);
        });
      }
      original._retry = true;
      refreshPromise = (async () => {
        try {
          const rt = TokenManager.getRefreshToken();
          if (!rt) throw new Error("No refresh");
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rt }, { timeout: 8000 });
          const body = res.data?.data || res.data || {};
          const newAccess = body.accessToken || body.token;
          const newRefresh = body.refreshToken || rt;
          if (!newAccess) throw new Error("Refresh failed");
          TokenManager.setTokens(newAccess, newRefresh);
          if (body.user) TokenManager.setUser(body.user);
          processQueue(null, newAccess);
          return newAccess;
        } catch (e) {
          processQueue(e, null);
          TokenManager.removeTokens();
          if (isBrowser && !window.location.pathname.includes("/login")) window.location.href = "/login?expired=true";
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

// ========= SAFE UNWRAP HELPERS - PRODUCTION v80 =========
const extractPayload = (res) => {
  if (!res) return null;
  const root = res.data ?? res;
  if (!root) return null;
  if (root.data !== undefined) {
    const inner = root.data;
    if (inner && typeof inner === "object" && inner.data !== undefined && !Array.isArray(inner)) {
      if (inner.data !== null && typeof inner.data === "object") return inner.data;
    }
    return inner;
  }
  return root;
};

const toChartArray = (payload) => {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === "object") {
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.data)) return payload.data;
    const entries = Object.entries(payload);
    if (entries.length > 0 && entries.every(([, v]) => typeof v === "number" || typeof v === "string")) {
      return entries.map(([name, value]) => ({ name, label: name, value: typeof value === "number" ? value : Number(value) || 0, count: typeof value === "number" ? value : Number(value) || 0 }));
    }
    if (entries.length > 0 && typeof entries[0][1] === "object") {
      return entries.map(([k, v]) => ({ name: k, ...(typeof v === "object" ? v : { value: v }) }));
    }
  }
  return [];
};

const unwrapArray = (res) => {
  const payload = extractPayload(res);
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  return toChartArray(payload);
};

const unwrapObject = (res) => {
  const payload = extractPayload(res);
  if (payload == null) return {};
  if (Array.isArray(payload)) return payload[0] || {};
  return payload;
};

const unwrap = (res) => {
  const payload = extractPayload(res);
  return payload ?? [];
};

const unwrapPaginated = (res) => {
  const payload = extractPayload(res);
  if (!payload) return { content: [], totalElements: 0, totalPages: 0 };
  if (Array.isArray(payload)) return { content: payload, totalElements: payload.length, totalPages: 1 };
  return {
    content: payload.content || payload.data || payload.items || [],
    totalElements: payload.totalElements ?? payload.total ?? payload.content?.length ?? 0,
    totalPages: payload.totalPages ?? 1,
    ...payload
  };
};

export const wsConfig = {
  getWsUrl: () => WS_URL,
  getSockJSUrl: () => `${SOCKJS_BASE}/ws`,
  getStompUrl: () => `${SOCKJS_BASE}/ws`,
  getNativeUrl: () => `${SOCKJS_BASE.replace(/^http/, "ws")}/ws-native`,
};

export const checkHealth = async () => {
  try {
    const res = await api.get("/auth/ping", { timeout: 4000, validateStatus: () => true });
    return { online: res.status < 500, status: res.status };
  } catch {
    try {
      const res2 = await axios.get(`${API_ORIGIN}/actuator/health`, { timeout: 4000, validateStatus: () => true });
      return { online: res2.status < 500, status: res2.status };
    } catch { return { online: false, status: 0 }; }
  }
};

// ========= ENDPOINTS - PRODUCTION COMPLETE =========
export const API_ENDPOINTS = {
  AUTH: { LOGIN: "/auth/login", REGISTER: "/auth/register", SEND_OTP: "/auth/send-otp", VERIFY_OTP: "/auth/verify-otp", REFRESH: "/auth/refresh", ME: "/auth/me", PING: "/auth/ping", LOGOUT: "/auth/logout" },
  HOME: { STATS: "/home/stats", FEATURED: "/home/featured-providers", ANNOUNCEMENTS: "/announcements", POPULAR_SERVICES: "/services/popular" },
  DASHBOARD: {
    STATS: "/admin/dashboard/stats",
    REVENUE_TREND: "/admin/charts/revenue-trend",
    PROVIDER_DISTRIBUTION: "/admin/charts/provider-distribution",
    RECENT_ACTIVITIES: "/admin/dashboard/recent-activities",
    TOP_PROVIDERS: "/admin/dashboard/top-providers",
    RECENT_BOOKINGS: "/admin/dashboard/recent-bookings",
    SERVICE_DEMAND: "/admin/charts/service-demand",
  },
  USERS: {
    LIST: "/admin/users",
    STATS: "/admin/users/stats",
    DETAIL: (id) => `/admin/users/${id}`,
    TOGGLE_STATUS: (id) => `/admin/users/${id}/toggle-status`,
    EXPORT: "/admin/users/export",
  },
  PROVIDERS: {
    LIST: "/admin/providers",
    DETAIL: (id) => `/admin/providers/${id}`,
    VERIFY: (id) => `/admin/providers/${id}/verify`,
  },
  BOOKINGS: {
    LIST: "/admin/bookings",
    DETAIL: (id) => `/admin/bookings/${id}`,
  }
};

// ========= SERVICES - PRODUCTION v80 =========
export const adminService = {
  // Dashboard
  getDashboardStats: (signal) => api.get(API_ENDPOINTS.DASHBOARD.STATS, { signal }).then(unwrapObject),
  getRevenueTrend: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.REVENUE_TREND, { params, signal }).then(unwrapArray),
  getProviderDistribution: (signal) => api.get(API_ENDPOINTS.DASHBOARD.PROVIDER_DISTRIBUTION, { signal }).then(unwrapArray),
  getRecentActivities: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES, { params, signal }).then(unwrapArray),
  getTopProviders: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS, { params, signal }).then(unwrapArray),
  getRecentBookings: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS, { params, signal }).then(unwrapArray),
  getServiceDemand: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.SERVICE_DEMAND, { params, signal }).then(unwrapArray),
  
  // Compat aliases for old dashboard code
  getProviderDistributionCompat: (signal) => api.get(API_ENDPOINTS.DASHBOARD.PROVIDER_DISTRIBUTION, { signal }).then(unwrapArray),
  getRevenueTrendCompat: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.REVENUE_TREND, { params, signal }).then(unwrapArray),
  getRecentActivitiesCompat: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES, { params, signal }).then(unwrapArray),
  getTopProvidersCompat: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS, { params, signal }).then(unwrapArray),
  getRecentBookingsCompat: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS, { params, signal }).then(unwrapArray),
  getServiceDemandCompat: (params, signal) => api.get(API_ENDPOINTS.DASHBOARD.SERVICE_DEMAND, { params, signal }).then(unwrapArray),

  // ===== USERS - NEW PRODUCTION MODULE =====
  getAllUsers: (params, signal) => api.get(API_ENDPOINTS.USERS.LIST, { params, signal }).then(unwrapPaginated),
  getUserStatistics: (signal) => api.get(API_ENDPOINTS.USERS.STATS, { signal }).then(unwrapObject),
  getUserStats: (signal) => api.get(API_ENDPOINTS.USERS.STATS, { signal }).then(unwrapObject),
  getUserById: (id, signal) => api.get(API_ENDPOINTS.USERS.DETAIL(id), { signal }).then(unwrapObject),
  getUser: (id, signal) => api.get(API_ENDPOINTS.USERS.DETAIL(id), { signal }).then(unwrapObject),
  updateUser: (id, data) => api.put(API_ENDPOINTS.USERS.DETAIL(id), data).then(unwrapObject),
  toggleUserStatus: (id) => api.patch(API_ENDPOINTS.USERS.TOGGLE_STATUS(id)).then(unwrapObject),
  deleteUser: (id) => api.delete(API_ENDPOINTS.USERS.DETAIL(id)).then(unwrapObject),
  exportUsers: (params) => api.get(API_ENDPOINTS.USERS.EXPORT, { params, responseType: 'blob' }),

  // Providers & Bookings (for future use)
  getProviders: (params, signal) => api.get(API_ENDPOINTS.PROVIDERS.LIST, { params, signal }).then(unwrapPaginated),
  getBookings: (params, signal) => api.get(API_ENDPOINTS.BOOKINGS.LIST, { params, signal }).then(unwrapPaginated),
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
  verifyOtp: (data, signal) => api.post(API_ENDPOINTS.AUTH.VERIFY_OTP, data, { signal }).then(unwrap),
  refresh: (data) => api.post(API_ENDPOINTS.AUTH.REFRESH, data).then(unwrap),
  me: (signal) => api.get(API_ENDPOINTS.AUTH.ME, { signal }).then(unwrap),
  ping: () => checkHealth(),
  logout: () => api.post(API_ENDPOINTS.AUTH.LOGOUT).then(unwrap).catch(() => ({ message: "Logged out" })),
};

export const dashboardService = adminService;
export const userService = adminService;
export default api;
