// src/api/adminService.js - v4.0 PROD FINAL - Complete for Quickks Admin
import api from './api';
import { API_ENDPOINTS } from './api';

const logger = {
  error: (...args) => {
    if (process.env.REACT_APP_LOG_LEVEL!== 'silent') {
      console.error('[AdminService]',...args);
    }
  },
  log: (...args) => {
    if (process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true') {
      console.log('[AdminService]',...args);
    }
  }
};

const buildQuery = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v!== '' && v!== null && v!== undefined && v!== 'all') q.append(k, v);
  });
  return q.toString();
};

const extractPage = (res) => {
  const d = res.data?.data || res.data || {};
  return {
    content: d.content || d.data || d.users || [],
    totalElements: d.totalElements || d.total || 0,
    totalPages: d.totalPages || 0,
    pageNumber: d.pageNumber || d.page || 0,
    empty:!(d.content?.length || d.data?.length || d.users?.length),
    raw: d
  };
};

const unwrap = (res) => res.data?.data || res.data || {};

class AdminService {
  // ============ DASHBOARD ============
  async getDashboardStats(signal) {
    try {
      const res = await api.get(API_ENDPOINTS.DASHBOARD.STATS, { signal });
      return res.data?.data || res.data;
    } catch (err) {
      logger.error('[DashboardStats]', err);
      throw err;
    }
  }

  async getRevenueTrend(days = 7, signal) {
    try {
      const res = await api.get(`${API_ENDPOINTS.DASHBOARD.REVENUE_TREND}?days=${days}`, { signal });
      return res.data?.data || res.data || [];
    } catch (err) {
      logger.error('[RevenueTrend]', err);
      return [];
    }
  }

  async getRecentActivities(signal) {
    const res = await api.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES, { signal });
    return unwrap(res);
  }

  async getTopProviders(signal) {
    const res = await api.get(API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS, { signal });
    return unwrap(res);
  }

  async getRecentBookings(signal) {
    const res = await api.get(API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS, { signal });
    return unwrap(res);
  }

  async getServiceDemand(signal) {
    const res = await api.get(API_ENDPOINTS.DASHBOARD.SERVICE_DEMAND, { signal });
    return unwrap(res);
  }

  async getProviderDistribution(signal) {
    const res = await api.get(API_ENDPOINTS.DASHBOARD.PROVIDER_DISTRIBUTION, { signal });
    return unwrap(res);
  }

  async getUserStats(signal) {
    const res = await api.get(API_ENDPOINTS.DASHBOARD.USER_STATS, { signal });
    return unwrap(res);
  }

  async getBookingStats(signal) {
    const res = await api.get(API_ENDPOINTS.DASHBOARD.BOOKING_STATS, { signal });
    return unwrap(res);
  }

  // ============ USERS - COMPLETE FOR UsersPage v4 ============
  async getAllUsers(params = {}, signal) {
    const query = buildQuery({
      page: params.page?? 0,
      size: params.size?? 10,
      search: params.search,
      role: params.role,
      status: params.status,
      sortBy: params.sortBy || 'createdAt',
      sortDir: params.sortDir || 'desc',
    });
    const res = await api.get(`${API_ENDPOINTS.USER.ALL}?${query}`, { signal });
    return extractPage(res);
  }

  // Alias for backward compat
  async getUsers(params, signal) {
    return this.getAllUsers(params, signal);
  }

  async getUserDetails(id, signal) {
    const res = await api.get(API_ENDPOINTS.USER.DETAILS(id), { signal });
    return unwrap(res);
  }

  async getUserById(id, signal) {
    return this.getUserDetails(id, signal);
  }

  async getUserStatistics(signal) {
    try {
      const res = await api.get(API_ENDPOINTS.USER.STATISTICS, { signal });
      return unwrap(res);
    } catch (err) {
      logger.error('[UserStats]', err);
      return { totalUsers: 0, admins: 0, providers: 0, customers: 0, active: 0 };
    }
  }

  async updateUser(id, data) {
    const res = await api.put(API_ENDPOINTS.USER.DETAILS(id), data);
    return unwrap(res);
  }

  async enableUser(id) {
    const res = await api.put(API_ENDPOINTS.USER.ENABLE(id));
    return unwrap(res);
  }

  async disableUser(id) {
    const res = await api.put(API_ENDPOINTS.USER.DISABLE(id));
    return unwrap(res);
  }

  async toggleUserStatus(userId) {
    try {
      // Try toggle endpoint first
      const res = await api.patch(API_ENDPOINTS.USER.STATUS(userId));
      return res.data;
    } catch (e) {
      // Fallback: get user and toggle via enable/disable
      try {
        const user = await this.getUserDetails(userId);
        if (user.enabled === false) {
          return await this.enableUser(userId);
        } else {
          return await this.disableUser(userId);
        }
      } catch (err) {
        logger.error('[ToggleStatus]', err);
        throw err;
      }
    }
  }

  async updateUserStatus(id, status) {
    const res = await api.put(API_ENDPOINTS.USER.STATUS(id), { status });
    return unwrap(res);
  }

  async deleteUser(id) {
    const res = await api.delete(API_ENDPOINTS.USER.DELETE(id));
    return unwrap(res);
  }

  async exportUsers(params = {}) {
    const query = buildQuery(params);
    const res = await api.get(`${API_ENDPOINTS.USER.EXPORT}?${query}`, { responseType: 'blob' });
    return res;
  }

  // ============ PROVIDERS ============
  async getProviders(params = {}, signal) {
    const query = buildQuery(params);
    const res = await api.get(`${API_ENDPOINTS.PROVIDER.ALL}?${query}`, { signal });
    return extractPage(res);
  }

  async getAllProviders(params = {}, signal) {
    return this.getProviders(params, signal);
  }

  async getProviderDetails(id, signal) {
    const res = await api.get(API_ENDPOINTS.PROVIDER.DETAILS(id), { signal });
    return unwrap(res);
  }

  async approveProvider(id) {
    const res = await api.put(API_ENDPOINTS.PROVIDER.APPROVE(id));
    return unwrap(res);
  }

  async rejectProvider(id, reason) {
    const res = await api.put(API_ENDPOINTS.PROVIDER.REJECT(id), { reason });
    return unwrap(res);
  }

  // ============ BOOKINGS ============
  async getAllBookings(params = {}, signal) {
    const query = buildQuery(params);
    const res = await api.get(`${API_ENDPOINTS.BOOKING.ALL}?${query}`, { signal });
    return extractPage(res);
  }

  async getBookingStatistics(signal) {
    const res = await api.get(API_ENDPOINTS.BOOKING.STATISTICS, { signal });
    return unwrap(res);
  }
}

export const adminService = new AdminService();
export default adminService;