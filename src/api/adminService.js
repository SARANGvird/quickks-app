// src/api/adminService.js - COMPLETE PRODUCTION VERSION v2.0
import api from './api';
import { API_ENDPOINTS, responseHelpers, defaultData } from './api';

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

/**
 * Standard response wrapper
 */
const ok = (payload) => ({ 
  data: payload, 
  success: true,
  timestamp: new Date().toISOString()
});

const fail = (payload, error, code = 'UNKNOWN_ERROR') => ({ 
  data: payload, 
  success: false, 
  error: error?.message || 'Unknown error',
  code: error?.code || code,
  timestamp: new Date().toISOString()
});

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Generate day name for trend data
 */
const getDayName = (index, totalDays) => {
  const today = new Date();
  const date = new Date();
  date.setDate(today.getDate() - (totalDays - 1 - index));
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

/**
 * Extract pagination data from response
 */
const extractPagination = (response) => {
  const data = response?.data || response || {};
  return {
    content: data.content || [],
    totalElements: data.totalElements || 0,
    totalPages: data.totalPages || 0,
    pageNumber: data.pageNumber || 0,
    pageSize: data.pageSize || 0,
    last: data.last || true,
    first: data.first || true,
    empty: data.content?.length === 0 || false,
  };
};

// ==========================================================
// DEFAULT DATA
// ==========================================================

const DEFAULT_DASHBOARD_STATS = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  newUsersToday: 0,
  newUsersThisWeek: 0,
  totalCustomers: 0,
  totalProviders: 0,
  totalAdmins: 0,
  totalProviderProfiles: 0,
  verifiedProviders: 0,
  pendingProviders: 0,
  rejectedProviders: 0,
  suspendedProviders: 0,
  totalBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  pendingBookings: 0,
  todayBookings: 0,
  activeBookings: 0,
  completionRate: 0,
  totalRevenue: 0,
  revenueToday: 0,
  revenueMonth: 0,
  revenueGrowthRate: 0,
  totalComplaints: 0,
  resolvedComplaints: 0,
  complaintResolutionRate: 0,
  recentBookings: [],
  recentActivities: [],
  topProviders: [],
  updatedAt: new Date().toISOString()
};

const DEFAULT_TREND_DATA = (days = 7) => {
  return Array.from({ length: days }, (_, i) => ({
    name: getDayName(i, days),
    value: 0
  }));
};

const DEFAULT_SERVICE_DEMAND = [
  { name: 'Plumbing', value: 0, icon: '🛠️', color: '#3b82f6' },
  { name: 'Electrical', value: 0, icon: '⚡', color: '#f59e0b' },
  { name: 'Cleaning', value: 0, icon: '🧹', color: '#10b981' },
  { name: 'AC Repair', value: 0, icon: '❄️', color: '#8b5cf6' },
  { name: 'Carpentry', value: 0, icon: '🔨', color: '#ef4444' },
  { name: 'Painting', value: 0, icon: '🎨', color: '#ec4899' },
  { name: 'Appliance Repair', value: 0, icon: '🔧', color: '#06b6d4' },
];

const DEFAULT_PROVIDER_DISTRIBUTION = {
  VERIFIED: 0,
  PENDING: 0,
  SUSPENDED: 0,
  REJECTED: 0,
  INACTIVE: 0
};

// ==========================================================
// ADMIN SERVICE CLASS - COMPLETE FIXED
// ==========================================================

class AdminService {
  
  // ==========================================================
  // 1. DASHBOARD - ✅ FIXED ENDPOINTS
  // ==========================================================

  /**
   * Get complete dashboard statistics
   * ✅ Uses correct dashboard endpoint
   */
  async getDashboardStats() {
    try {
      // ✅ CORRECT: Use dashboard stats endpoint
      const response = await api.get(API_ENDPOINTS.DASHBOARD.STATS);
      const stats = response.data?.data || response.data || DEFAULT_DASHBOARD_STATS;
      
      // ✅ Ensure all required fields exist
      return ok({
        ...DEFAULT_DASHBOARD_STATS,
        ...stats,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to fetch dashboard stats:', error);
      return fail(DEFAULT_DASHBOARD_STATS, error, 'DASHBOARD_STATS_ERROR');
    }
  }

  /**
   * Get revenue trend data
   * ✅ Uses correct revenue trend endpoint
   */
  async getRevenueTrend(days = 7) {
    try {
      // ✅ CORRECT: Use revenue trend endpoint
      const response = await api.get(`${API_ENDPOINTS.DASHBOARD.REVENUE_TREND}?days=${days}`);
      const data = response.data?.data || response.data || [];
      
      if (Array.isArray(data) && data.length > 0) {
        const trendData = data.map((item, index) => ({
          name: item.name || getDayName(index, days),
          value: typeof item === 'number' ? item : (item.value || 0),
          date: item.date || new Date().toISOString(),
        }));
        return ok(trendData);
      }
      
      return ok(DEFAULT_TREND_DATA(days));
    } catch (error) {
      console.error('❌ Failed to fetch revenue trend:', error);
      return ok(DEFAULT_TREND_DATA(days));
    }
  }

  /**
   * Get provider distribution
   * ✅ Uses correct provider distribution endpoint
   */
  async getProviderDistribution() {
    try {
      // ✅ CORRECT: Use provider distribution endpoint
      const response = await api.get(API_ENDPOINTS.DASHBOARD.PROVIDER_DISTRIBUTION);
      const data = response.data?.data || response.data || DEFAULT_PROVIDER_DISTRIBUTION;
      
      // ✅ Convert to chart-friendly format
      const distribution = Object.entries(data).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
        value: value || 0,
        label: name,
      }));
      
      return ok({
        raw: data,
        chartData: distribution,
        total: Object.values(data).reduce((sum, val) => sum + (val || 0), 0)
      });
    } catch (error) {
      console.error('❌ Failed to fetch provider distribution:', error);
      return fail({
        raw: DEFAULT_PROVIDER_DISTRIBUTION,
        chartData: Object.entries(DEFAULT_PROVIDER_DISTRIBUTION).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
          value: 0,
          label: name,
        })),
        total: 0
      }, error, 'PROVIDER_DISTRIBUTION_ERROR');
    }
  }

  /**
   * Get recent activities
   * ✅ Uses correct recent activities endpoint
   */
  async getRecentActivities(limit = 20) {
    try {
      // ✅ CORRECT: Use recent activities endpoint
      const response = await api.get(`${API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES}?limit=${limit}`);
      const activities = response.data?.data || response.data || [];
      
      // ✅ Format activities consistently
      const formattedActivities = Array.isArray(activities) ? activities.map(activity => ({
        id: activity.id || `act-${Date.now()}-${Math.random()}`,
        type: activity.type || 'activity',
        title: activity.title || 'Activity',
        description: activity.description || activity.message || '',
        timestamp: activity.timestamp || activity.createdAt || new Date().toISOString(),
        icon: activity.icon || this._getActivityIcon(activity.type),
        color: activity.color || this._getActivityColor(activity.type),
        user: activity.user || activity.userId || null,
        metadata: activity.metadata || {},
        read: activity.read || false,
      })) : [];
      
      return ok(formattedActivities);
    } catch (error) {
      console.error('❌ Failed to fetch recent activities:', error);
      return ok([]);
    }
  }

  /**
   * Get top providers
   * ✅ Uses correct top providers endpoint
   */
  async getTopProviders(limit = 5) {
    try {
      // ✅ CORRECT: Use top providers endpoint
      const response = await api.get(`${API_ENDPOINTS.DASHBOARD.TOP_PROVIDERS}?limit=${limit}`);
      const providers = response.data?.data || response.data || [];
      
      const formattedProviders = Array.isArray(providers) ? providers.map(provider => ({
        id: provider.providerId || provider.id,
        name: provider.name || provider.fullName || provider.businessName || 'Provider',
        businessName: provider.businessName || provider.name || '',
        serviceType: provider.serviceType || provider.specialization || 'General',
        rating: provider.rating || 0,
        totalReviews: provider.totalReviews || 0,
        completedJobs: provider.completedJobs || provider.completedJobsCount || 0,
        totalEarnings: provider.totalEarnings || 0,
        avatar: provider.avatar || provider.profileImage || null,
        status: provider.status || 'ACTIVE',
        verified: provider.verified || false,
        area: provider.area || provider.location || '',
        city: provider.city || '',
      })) : [];
      
      return ok(formattedProviders);
    } catch (error) {
      console.error('❌ Failed to fetch top providers:', error);
      return ok([]);
    }
  }

  /**
   * Get recent bookings
   * ✅ Uses correct recent bookings endpoint
   */
  async getRecentBookings(limit = 10) {
    try {
      // ✅ CORRECT: Use recent bookings endpoint
      const response = await api.get(`${API_ENDPOINTS.DASHBOARD.RECENT_BOOKINGS}?limit=${limit}`);
      const bookings = response.data?.data || response.data || [];
      
      const formattedBookings = Array.isArray(bookings) ? bookings.map(booking => ({
        id: booking.id || booking.bookingId,
        customerName: booking.customerName || booking.customer?.name || 'Customer',
        customerId: booking.customerId || booking.customer?.id,
        service: booking.service || booking.serviceType || 'Service',
        serviceType: booking.serviceType || booking.service || '',
        amount: booking.amount || booking.totalAmount || 0,
        status: booking.status || 'PENDING',
        providerName: booking.providerName || booking.provider?.name || '',
        providerId: booking.providerId || booking.provider?.id,
        createdAt: booking.createdAt || booking.bookingDate || new Date().toISOString(),
        completedAt: booking.completedAt || booking.completedDate || null,
        paymentStatus: booking.paymentStatus || 'PENDING',
        rating: booking.rating || null,
      })) : [];
      
      return ok(formattedBookings);
    } catch (error) {
      console.error('❌ Failed to fetch recent bookings:', error);
      return ok([]);
    }
  }

  /**
   * Get service demand data
   * ✅ Uses correct service demand endpoint
   */
  async getServiceDemand() {
    try {
      // ✅ CORRECT: Use service demand endpoint
      const response = await api.get(API_ENDPOINTS.DASHBOARD.SERVICE_DEMAND);
      const data = response.data?.data || response.data || [];
      
      if (Array.isArray(data) && data.length > 0) {
        const demandData = data.map(item => ({
          name: item.name || item.service || 'Unknown',
          value: item.value || item.count || 0,
          icon: item.icon || this._getServiceIcon(item.name || item.service),
          color: item.color || this._getServiceColor(item.name || item.service),
        }));
        return ok(demandData);
      }
      
      return ok(DEFAULT_SERVICE_DEMAND);
    } catch (error) {
      console.error('❌ Failed to fetch service demand:', error);
      return ok(DEFAULT_SERVICE_DEMAND);
    }
  }

  /**
   * Get user statistics
   * ✅ Uses correct user stats endpoint
   */
  async getUserStats() {
    try {
      const response = await api.get(API_ENDPOINTS.DASHBOARD.USER_STATS);
      const stats = response.data?.data || response.data || {};
      return ok({
        totalUsers: stats.totalUsers || 0,
        activeUsers: stats.activeUsers || 0,
        inactiveUsers: stats.inactiveUsers || 0,
        customers: stats.customers || 0,
        providers: stats.providers || 0,
        admins: stats.admins || 0,
        newUsersToday: stats.newUsersToday || 0,
        newUsersThisWeek: stats.newUsersThisWeek || 0,
        newUsersThisMonth: stats.newUsersThisMonth || 0,
        growthRate: stats.growthRate || 0,
        ...stats
      });
    } catch (error) {
      console.error('❌ Failed to fetch user stats:', error);
      return ok({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        customers: 0,
        providers: 0,
        admins: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
        growthRate: 0
      });
    }
  }

  /**
   * Get booking statistics
   * ✅ Uses correct booking stats endpoint
   */
  async getBookingStats() {
    try {
      const response = await api.get(API_ENDPOINTS.DASHBOARD.BOOKING_STATS);
      const stats = response.data?.data || response.data || {};
      return ok({
        total: stats.total || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0,
        pending: stats.pending || 0,
        inProgress: stats.inProgress || 0,
        todayBookings: stats.todayBookings || 0,
        completionRate: stats.completionRate || 0,
        averageBookingValue: stats.averageBookingValue || 0,
        ...stats
      });
    } catch (error) {
      console.error('❌ Failed to fetch booking stats:', error);
      return ok({
        total: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        inProgress: 0,
        todayBookings: 0,
        completionRate: 0,
        averageBookingValue: 0
      });
    }
  }

  /**
   * Export dashboard report
   * ✅ Uses correct export endpoint
   */
  async exportDashboardReport(format, dateRange) {
    try {
      const response = await api.get(API_ENDPOINTS.DASHBOARD.EXPORT, {
        params: {
          format: format || 'csv',
          startDate: dateRange?.start,
          endDate: dateRange?.end,
          _t: Date.now(),
        },
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      console.error('❌ Export failed:', error);
      throw error;
    }
  }

  // ==========================================================
  // 2. USER MANAGEMENT - ✅ COMPLETE
  // ==========================================================

  /**
   * Get all users with pagination
   */
  async getAllUsers(params = {}) {
    try {
      const {
        page = 0,
        size = 10,
        search = '',
        role = '',
        status = '',
        sortBy = 'createdAt',
        sortDir = 'desc',
        fromDate = null,
        toDate = null,
      } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('size', size);
      queryParams.append('sortBy', sortBy);
      queryParams.append('sortDir', sortDir);
      
      if (search) queryParams.append('search', search);
      if (role && role !== 'all') queryParams.append('role', role);
      if (status && status !== 'all') queryParams.append('status', status);
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);

      const response = await api.get(`${API_ENDPOINTS.USER.ALL}?${queryParams.toString()}`);
      return extractPagination(response.data);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        pageNumber: params.page || 0,
        pageSize: params.size || 10,
        last: true,
        first: true,
        empty: true,
        error: error.message
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics() {
    try {
      const response = await api.get(API_ENDPOINTS.USER.STATISTICS);
      const data = response.data?.data || response.data || {};
      return {
        totalUsers: data.totalUsers || data.total || 0,
        activeUsers: data.activeUsers || data.active || 0,
        inactiveUsers: data.inactiveUsers || data.inactive || 0,
        customers: data.customers || data.customerCount || 0,
        providers: data.providers || data.providerCount || 0,
        admins: data.admins || data.adminCount || 0,
        newUsersToday: data.newUsersToday || 0,
        newUsersThisWeek: data.newUsersThisWeek || 0,
        newUsersThisMonth: data.newUsersThisMonth || 0,
        growthRate: data.growthRate || 0,
        ...data
      };
    } catch (error) {
      console.error('❌ Error fetching user statistics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        customers: 0,
        providers: 0,
        admins: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
        growthRate: 0
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const response = await api.get(API_ENDPOINTS.USER.DETAILS(userId));
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, userData) {
    try {
      const response = await api.put(API_ENDPOINTS.USER.DETAILS(userId), userData);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  /**
   * Enable user
   */
  async enableUser(userId) {
    try {
      const response = await api.patch(API_ENDPOINTS.USER.ENABLE(userId));
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error enabling user:', error);
      throw error;
    }
  }

  /**
   * Disable user
   */
  async disableUser(userId) {
    try {
      const response = await api.patch(API_ENDPOINTS.USER.DISABLE(userId));
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error disabling user:', error);
      throw error;
    }
  }

  /**
   * Toggle user status
   */
  async toggleUserStatus(userId) {
    try {
      const response = await api.patch(API_ENDPOINTS.USER.STATUS(userId));
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error toggling user status:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    try {
      const response = await api.delete(API_ENDPOINTS.USER.DELETE(userId));
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Export users
   */
  async exportUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', params.format || 'csv');
      if (params.search) queryParams.append('search', params.search);
      if (params.role && params.role !== 'all') queryParams.append('role', params.role);
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      
      const response = await api.get(`${API_ENDPOINTS.USER.EXPORT}?${queryParams.toString()}`, {
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      console.error('❌ Error exporting users:', error);
      throw error;
    }
  }

  // ==========================================================
  // 3. PROVIDER MANAGEMENT - ✅ COMPLETE
  // ==========================================================

  /**
   * Get all providers with pagination
   */
  async getProviders(params = {}) {
    try {
      const {
        page = 0,
        size = 10,
        search = '',
        status = '',
        serviceType = '',
        minRating = 0,
        area = '',
        sortBy = 'createdAt',
        sortDir = 'desc'
      } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('size', size);
      queryParams.append('sortBy', sortBy);
      queryParams.append('sortDir', sortDir);
      
      if (search) queryParams.append('search', search);
      if (status && status !== 'all') queryParams.append('status', status);
      if (serviceType && serviceType !== 'all') queryParams.append('serviceType', serviceType);
      if (minRating > 0) queryParams.append('minRating', minRating);
      if (area) queryParams.append('area', area);

      const response = await api.get(`${API_ENDPOINTS.PROVIDER.ALL}?${queryParams.toString()}`);
      return extractPagination(response.data);
    } catch (error) {
      console.error('❌ Error fetching providers:', error);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        pageNumber: params.page || 0,
        pageSize: params.size || 10,
        last: true,
        first: true,
        empty: true,
        error: error.message
      };
    }
  }

  /**
   * Get provider statistics
   */
  async getProviderStatistics() {
    try {
      const response = await api.get(API_ENDPOINTS.PROVIDER.STATISTICS);
      const stats = response.data?.data || response.data || {};
      return {
        total: stats.total || 0,
        active: stats.active || 0,
        pending: stats.pending || 0,
        suspended: stats.suspended || 0,
        rejected: stats.rejected || 0,
        verified: stats.verified || 0,
        avgRating: stats.avgRating || 0,
        totalEarnings: stats.totalEarnings || 0,
        totalJobs: stats.totalJobs || 0,
        completedJobs: stats.completedJobs || 0,
        growthRate: stats.growthRate || 0,
        acceptanceRate: stats.acceptanceRate || 0,
        responseTime: stats.responseTime || 0,
        ...stats
      };
    } catch (error) {
      console.error('❌ Error fetching provider statistics:', error);
      return {
        total: 0,
        active: 0,
        pending: 0,
        suspended: 0,
        rejected: 0,
        verified: 0,
        avgRating: 0,
        totalEarnings: 0,
        totalJobs: 0,
        completedJobs: 0,
        growthRate: 0,
        acceptanceRate: 0,
        responseTime: 0
      };
    }
  }

  /**
   * Get provider by ID
   */
  async getProviderById(providerId) {
    try {
      const response = await api.get(API_ENDPOINTS.PROVIDER.DETAILS(providerId));
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching provider:', error);
      throw error;
    }
  }

  /**
   * Get provider metrics (performance, earnings, etc.)
   */
  async getProviderMetrics(providerId) {
    try {
      const response = await api.get(API_ENDPOINTS.PROVIDER.METRICS(providerId));
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching provider metrics:', error);
      throw error;
    }
  }

  /**
   * Approve provider
   */
  async approveProvider(providerId) {
    try {
      const response = await api.post(API_ENDPOINTS.PROVIDER.APPROVE(providerId), {});
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error approving provider:', error);
      throw error;
    }
  }

  /**
   * Reject provider
   */
  async rejectProvider(providerId, reason) {
    try {
      const response = await api.post(API_ENDPOINTS.PROVIDER.REJECT(providerId), { 
        reason: reason || 'Application rejected by admin' 
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error rejecting provider:', error);
      throw error;
    }
  }

  /**
   * Suspend provider
   */
  async suspendProvider(providerId, reason) {
    try {
      const response = await api.post(API_ENDPOINTS.PROVIDER.SUSPEND(providerId), { 
        reason: reason || 'Suspended by admin' 
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error suspending provider:', error);
      throw error;
    }
  }

  /**
   * Activate provider
   */
  async activateProvider(providerId) {
    try {
      const response = await api.post(API_ENDPOINTS.PROVIDER.ACTIVATE(providerId), {});
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error activating provider:', error);
      throw error;
    }
  }

  /**
   * Verify provider documents
   */
  async verifyProvider(providerId) {
    try {
      const response = await api.post(API_ENDPOINTS.PROVIDER.VERIFY(providerId), {});
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error verifying provider:', error);
      throw error;
    }
  }

  /**
   * Get provider earnings
   */
  async getProviderEarnings(providerId, period = 'month') {
    try {
      const response = await api.get(`${API_ENDPOINTS.PROVIDER.EARNINGS(providerId)}?period=${period}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching provider earnings:', error);
      throw error;
    }
  }

  /**
   * Get provider reviews
   */
  async getProviderReviews(providerId, params = {}) {
    try {
      const { page = 0, size = 10 } = params;
      const response = await api.get(`${API_ENDPOINTS.PROVIDER.REVIEWS(providerId)}?page=${page}&size=${size}`);
      return extractPagination(response.data);
    } catch (error) {
      console.error('❌ Error fetching provider reviews:', error);
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  }

  // ==========================================================
  // 4. BOOKING MANAGEMENT - ✅ COMPLETE FIXED
  // ==========================================================

  /**
   * Get all bookings with pagination
   */
  async getBookings(params = {}) {
    try {
      const {
        page = 0,
        size = 10,
        status = '',
        type = '',
        providerId = '',
        customerId = '',
        fromDate = '',
        toDate = '',
        search = ''
      } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('size', size);
      queryParams.append('sortBy', 'createdAt');
      queryParams.append('sortDir', 'desc');
      
      if (status) queryParams.append('status', status);
      if (type) queryParams.append('type', type);
      if (providerId) queryParams.append('providerId', providerId);
      if (customerId) queryParams.append('customerId', customerId);
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);
      if (search) queryParams.append('search', search);

      // ✅ CORRECT: Use /api/v1/bookings for admin
      const response = await api.get(`${API_ENDPOINTS.BOOKING.ALL}?${queryParams.toString()}`);
      return extractPagination(response.data);
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        pageNumber: params.page || 0,
        pageSize: params.size || 10,
        last: true,
        first: true,
        empty: true,
        error: error.message
      };
    }
  }

  /**
   * Get admin bookings with additional details
   */
  async getAdminBookings(params = {}) {
    try {
      const {
        page = 0,
        size = 10,
        status = '',
        type = '',
        providerId = '',
        customerId = '',
        fromDate = '',
        toDate = ''
      } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('size', size);
      queryParams.append('sortBy', 'createdAt');
      queryParams.append('sortDir', 'desc');
      
      if (status) queryParams.append('status', status);
      if (type) queryParams.append('type', type);
      if (providerId) queryParams.append('providerId', providerId);
      if (customerId) queryParams.append('customerId', customerId);
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);

      // ✅ Admin-specific endpoint
      const response = await api.get(`${API_ENDPOINTS.BOOKING.ADMIN_ALL}?${queryParams.toString()}`);
      return extractPagination(response.data);
    } catch (error) {
      console.error('❌ Error fetching admin bookings:', error);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        pageNumber: params.page || 0,
        pageSize: params.size || 10,
        last: true,
        first: true,
        empty: true,
        error: error.message
      };
    }
  }

  /**
   * Get booking statistics
   */
  async getBookingStatistics(startDate, endDate) {
    try {
      let url = API_ENDPOINTS.BOOKING.STATISTICS;
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      const response = await api.get(url);
      const stats = response.data?.data || response.data || {};
      return {
        total: stats.total || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0,
        pending: stats.pending || 0,
        inProgress: stats.inProgress || 0,
        todayBookings: stats.todayBookings || 0,
        weeklyBookings: stats.weeklyBookings || 0,
        monthlyBookings: stats.monthlyBookings || 0,
        completionRate: stats.completionRate || 0,
        cancellationRate: stats.cancellationRate || 0,
        averageBookingValue: stats.averageBookingValue || 0,
        totalRevenue: stats.totalRevenue || 0,
        ...stats
      };
    } catch (error) {
      console.error('❌ Error fetching booking statistics:', error);
      return {
        total: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        inProgress: 0,
        todayBookings: 0,
        weeklyBookings: 0,
        monthlyBookings: 0,
        completionRate: 0,
        cancellationRate: 0,
        averageBookingValue: 0,
        totalRevenue: 0
      };
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId) {
    try {
      const response = await api.get(API_ENDPOINTS.BOOKING.DETAILS(bookingId));
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching booking:', error);
      throw error;
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId, reason) {
    try {
      const response = await api.post(API_ENDPOINTS.BOOKING.CANCEL(bookingId), { 
        reason: reason || 'Cancelled by admin' 
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId, status, notes = '') {
    try {
      const response = await api.patch(API_ENDPOINTS.BOOKING.UPDATE_STATUS(bookingId), { 
        status, 
        notes 
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Process refund for booking
   */
  async processRefund(bookingId, refundData) {
    try {
      const response = await api.post(API_ENDPOINTS.BOOKING.REFUND(bookingId), refundData);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get booking timeline
   */
  async getBookingTimeline(bookingId) {
    try {
      const response = await api.get(`${API_ENDPOINTS.BOOKING.DETAILS(bookingId)}/timeline`);
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('❌ Error fetching booking timeline:', error);
      return [];
    }
  }

  // ==========================================================
  // 5. COMPLAINT MANAGEMENT - ✅ COMPLETE
  // ==========================================================

  /**
   * Get all complaints with pagination
   */
  async getComplaints(params = {}) {
    try {
      const { page = 0, size = 10, status = '', category = '', fromDate = '', toDate = '' } = params;
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('size', size);
      queryParams.append('sortBy', 'createdAt');
      queryParams.append('sortDir', 'desc');
      
      if (status) queryParams.append('status', status);
      if (category) queryParams.append('category', category);
      if (fromDate) queryParams.append('fromDate', fromDate);
      if (toDate) queryParams.append('toDate', toDate);

      const response = await api.get(`${API_ENDPOINTS.COMPLAINT.ALL}?${queryParams.toString()}`);
      return extractPagination(response.data);
    } catch (error) {
      console.error('❌ Error fetching complaints:', error);
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        pageNumber: params.page || 0,
        pageSize: params.size || 10,
        last: true,
        first: true,
        empty: true,
        error: error.message
      };
    }
  }

  /**
   * Get complaint statistics
   */
  async getComplaintStatistics() {
    try {
      const response = await api.get(API_ENDPOINTS.COMPLAINT.STATISTICS);
      const stats = response.data?.data || response.data || {};
      return {
        totalComplaints: stats.totalComplaints || 0,
        openComplaints: stats.openComplaints || 0,
        inProgressComplaints: stats.inProgressComplaints || 0,
        resolvedComplaints: stats.resolvedComplaints || 0,
        closedComplaints: stats.closedComplaints || 0,
        resolutionRate: stats.resolutionRate || 0,
        averageResolutionTime: stats.averageResolutionTime || 0,
        ...stats
      };
    } catch (error) {
      console.error('❌ Error fetching complaint statistics:', error);
      return {
        totalComplaints: 0,
        openComplaints: 0,
        inProgressComplaints: 0,
        resolvedComplaints: 0,
        closedComplaints: 0,
        resolutionRate: 0,
        averageResolutionTime: 0
      };
    }
  }

  /**
   * Get complaint by ID
   */
  async getComplaintById(complaintId) {
    try {
      const response = await api.get(API_ENDPOINTS.COMPLAINT.DETAILS(complaintId));
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error fetching complaint:', error);
      throw error;
    }
  }

  /**
   * Resolve complaint
   */
  async resolveComplaint(complaintId, resolution) {
    try {
      const response = await api.post(API_ENDPOINTS.COMPLAINT.RESOLVE(complaintId), resolution);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error resolving complaint:', error);
      throw error;
    }
  }

  // ==========================================================
  // 6. SYSTEM SETTINGS - ✅ COMPLETE
  // ==========================================================

  /**
   * Get system settings
   */
  async getSettings() {
    try {
      const response = await api.get(API_ENDPOINTS.SETTINGS.ALL);
      return response.data?.data || response.data || {
        bookingFee: 50,
        platformCommission: 10,
        maxBookingsPerProvider: 5,
        cancellationWindowMinutes: 30,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        defaultCurrency: 'INR',
        businessName: 'Quickks',
        timezone: 'Asia/Kolkata',
        providerApprovalRequired: true,
        autoVerifyProviders: false,
        maxProviderDistance: 20,
        bookingBufferMinutes: 15,
        ...response.data?.data || response.data
      };
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
      throw error;
    }
  }

  /**
   * Update system settings
   */
  async updateSettings(settings) {
    try {
      const response = await api.put(API_ENDPOINTS.SETTINGS.UPDATE, settings);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Reset settings to default
   */
  async resetSettings() {
    try {
      const response = await api.post(API_ENDPOINTS.SETTINGS.RESET);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error resetting settings:', error);
      throw error;
    }
  }

  // ==========================================================
  // 7. SYSTEM HEALTH - ✅ NEW
  // ==========================================================

  /**
   * Check system health
   */
  async getSystemHealth() {
    try {
      const response = await api.get(API_ENDPOINTS.SYSTEM.HEALTH);
      const data = response.data || {};
      return {
        status: data.status || 'UNKNOWN',
        healthy: data.status === 'UP' || data.status === 'healthy',
        components: data.components || {},
        timestamp: new Date().toISOString(),
        details: data
      };
    } catch (error) {
      console.error('❌ Error checking system health:', error);
      return {
        status: 'DOWN',
        healthy: false,
        components: {},
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get system info
   */
  async getSystemInfo() {
    try {
      const response = await api.get(API_ENDPOINTS.SYSTEM.INFO);
      return response.data || {};
    } catch (error) {
      console.error('❌ Error fetching system info:', error);
      return {};
    }
  }

  /**
   * Clear system cache
   */
  async clearCache() {
    try {
      const response = await api.post(API_ENDPOINTS.SYSTEM.CLEAR_CACHE);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      throw error;
    }
  }

  // ==========================================================
  // 8. HELPER METHODS
  // ==========================================================

  /**
   * Get activity icon based on type
   */
  _getActivityIcon(type) {
    const icons = {
      'user': '👤',
      'booking': '📋',
      'provider': '🔧',
      'payment': '💰',
      'complaint': '⚠️',
      'system': '⚙️',
      'default': '📌'
    };
    return icons[type] || icons.default;
  }

  /**
   * Get activity color based on type
   */
  _getActivityColor(type) {
    const colors = {
      'user': '#3b82f6',
      'booking': '#f59e0b',
      'provider': '#10b981',
      'payment': '#8b5cf6',
      'complaint': '#ef4444',
      'system': '#6b7280',
      'default': '#6366f1'
    };
    return colors[type] || colors.default;
  }

  /**
   * Get service icon based on name
   */
  _getServiceIcon(name) {
    const icons = {
      'Plumbing': '🛠️',
      'Electrical': '⚡',
      'Cleaning': '🧹',
      'AC Repair': '❄️',
      'Carpentry': '🔨',
      'Painting': '🎨',
      'Appliance Repair': '🔧',
      'default': '📌'
    };
    return icons[name] || icons.default;
  }

  /**
   * Get service color based on name
   */
  _getServiceColor(name) {
    const colors = {
      'Plumbing': '#3b82f6',
      'Electrical': '#f59e0b',
      'Cleaning': '#10b981',
      'AC Repair': '#8b5cf6',
      'Carpentry': '#ef4444',
      'Painting': '#ec4899',
      'Appliance Repair': '#06b6d4',
      'default': '#6366f1'
    };
    return colors[name] || colors.default;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    return formatDate(dateString);
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format status for display
   */
  formatStatus(status) {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
}

// ==========================================================
// EXPORT
// ==========================================================
export const adminService = new AdminService();
export default adminService;