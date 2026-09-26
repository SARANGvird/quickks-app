// src/api/adminService.js - v3.0 PROD
import api from './api';
import { API_ENDPOINTS } from './api';
import { format, subDays } from 'date-fns';

// Prod logger - env respect karto
const logger = {
  error: (...args) => {
    if (process.env.REACT_APP_LOG_LEVEL!== 'silent') {
      console.error(...args);
    }
  }
};

// Common helper - query build
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
    content: d.content || [],
    totalElements: d.totalElements || 0,
    totalPages: d.totalPages || 0,
    pageNumber: d.pageNumber || 0,
    empty:!d.content?.length,
  };
};

class AdminService {
  // Dashboard - throw kar, default data nako
  async getDashboardStats(signal) {
    try {
      const res = await api.get(API_ENDPOINTS.DASHBOARD.STATS, { signal });
      return res.data?.data || res.data;
    } catch (err) {
      logger.error('[DashboardStats]', err);
      throw err; // react-query la error kalu de
    }
  }

  async getRevenueTrend(days = 7, signal) {
    const res = await api.get(`${API_ENDPOINTS.DASHBOARD.REVENUE_TREND}?days=${days}`, { signal });
    return res.data?.data || res.data || [];
  }

  // Users - clean
  async getAllUsers(params = {}, signal) {
    const query = buildQuery({
      page: params.page || 0,
      size: params.size || 10,
      search: params.search,
      role: params.role,
      status: params.status,
      sortBy: params.sortBy || 'createdAt',
      sortDir: params.sortDir || 'desc',
    });
    const res = await api.get(`${API_ENDPOINTS.USER.ALL}?${query}`, { signal });
    return extractPage(res);
  }

  async toggleUserStatus(userId) {
    const res = await api.patch(API_ENDPOINTS.USER.STATUS(userId));
    return res.data;
  }

  // Providers - same pattern
  async getProviders(params = {}, signal) {
    const query = buildQuery(params);
    const res = await api.get(`${API_ENDPOINTS.PROVIDER.ALL}?${query}`, { signal });
    return extractPage(res);
  }
}

export const adminService = new AdminService();
export default adminService;