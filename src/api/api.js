// src/api/api.js - v11.1 PROD - FIX FOR ALL 6 ERRORS
import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'https://api.quickks.in/quickks/api/v1').replace(/\/+$/, '');
const WS_URL = process.env.REACT_APP_WS_URL || 'wss://api.quickks.in/quickks/ws';
const isDebug = process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true';

// Token Manager - SINGLE SOURCE
export const TokenManager = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (access, refresh) => {
    if (access) localStorage.setItem('accessToken', access);
    if (refresh) localStorage.setItem('refreshToken', refresh);
  },
  removeTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
  clearTokens: function() { this.removeTokens(); },
  isAuthenticated: () => !!localStorage.getItem('accessToken'),
  getUser: () => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } },
  setUser: (u) => localStorage.setItem('user', JSON.stringify(u)),
  getTokens: function() { return { accessToken: this.getAccessToken(), refreshToken: this.getRefreshToken() }; },
};
// lowercase alias - tujhya LoginPage sathi
export const tokenManager = TokenManager;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = TokenManager.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const rt = TokenManager.getRefreshToken();
          const res = await api.post('/auth/refresh', { refreshToken: rt });
          const newAccess = res.data?.data?.token || res.data?.token;
          TokenManager.setTokens(newAccess, res.data?.refreshToken);
          return newAccess;
        })().finally(() => { refreshPromise = null; });
      }
      try {
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        TokenManager.removeTokens();
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

// Health check - june file sathi - never throws
export const checkHealth = async () => {
  try {
    const res = await api.get('/auth/ping', { timeout: 5000, validateStatus: () => true });
    return { success: true, online: res.status < 400, data: res.data };
  } catch {
    return { success: true, online: false };
  }
};

export const testConnection = async () => {
  const h = await checkHealth();
  return { success: true, online: h.online, message: h.online ? 'Connected' : 'Offline' };
};

export const testBackendHealth = testConnection;

// Endpoints
export const API_ENDPOINTS = {
  AUTH: { LOGIN: '/auth/login', REFRESH: '/auth/refresh', ME: '/auth/me', REGISTER: '/auth/register' },
  USER: { ALL: '/users', DETAILS: (id) => `/users/${id}`, STATUS: (id) => `/users/${id}/status`, STATISTICS: '/users/statistics', ENABLE: (id) => `/users/${id}/enable`, DISABLE: (id) => `/users/${id}/disable`, DELETE: (id) => `/users/${id}`, EXPORT: '/admin/users/export' },
  PROVIDER: { ALL: '/providers', DETAILS: (id) => `/providers/${id}`, APPROVE: (id) => `/providers/${id}/approve`, REJECT: (id) => `/providers/${id}/reject` },
  BOOKING: { ALL: '/bookings', STATISTICS: '/bookings/statistics' },
  DASHBOARD: { STATS: '/admin/dashboard/stats', REVENUE_TREND: '/admin/dashboard/revenue-trend', RECENT_ACTIVITIES: '/admin/dashboard/recent-activities', TOP_PROVIDERS: '/admin/dashboard/top-providers', RECENT_BOOKINGS: '/admin/dashboard/recent-bookings', SERVICE_DEMAND: '/admin/dashboard/service-demand', PROVIDER_DISTRIBUTION: '/admin/dashboard/provider-distribution', USER_STATS: '/admin/dashboard/user-stats', BOOKING_STATS: '/admin/dashboard/booking-stats', EXPORT: '/admin/dashboard/export' },
};

// june adminService sathi lagtat - empty pan error yenar nahi
export const responseHelpers = {
  ok: (d) => ({ success: true, data: d }),
  fail: (e) => ({ success: false, error: e?.message }),
};

export const defaultData = {
  dashboardStats: { totalUsers: 0, totalBookings: 0 },
  generateTrendData: (days = 7) => Array.from({ length: days }, (_, i) => ({ name: `Day ${i+1}`, value: 0 })),
  serviceDemand: [],
  providerDistribution: {},
};

export const wsConfig = {
  getWsUrl: () => WS_URL,
  getSockJSUrl: () => API_BASE_URL.replace(/\/api\/v1\/?$/, ''),
};

export default api;