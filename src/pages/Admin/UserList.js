import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { useAuth } from "../../contexts/AuthContext";
import { 
  FaEdit, FaTrash, FaEye, FaUserCheck, FaUserTimes, 
  FaSearch, FaFilter, FaSync, FaPlus, FaEnvelope,
  FaPhone, FaCalendarAlt, FaShieldAlt, FaUserCog,
  FaSpinner, FaChevronLeft, FaChevronRight,
  FaUserCircle, FaCheckCircle, FaTimesCircle
} from "react-icons/fa";

// ==========================================================
// CONSTANTS
// ==========================================================
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ==========================================================
// TOAST NOTIFICATION COMPONENT
// ==========================================================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                  type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                  type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                  'bg-blue-50 border-blue-200 text-blue-800';

  return (
    <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg border shadow-lg ${bgColor} max-w-md`}>
      <div className="flex items-center gap-3">
        {type === 'success' && <FaCheckCircle className="text-green-500" />}
        {type === 'error' && <FaTimesCircle className="text-red-500" />}
        <span className="flex-1">{message}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
    </div>
  );
};

// ==========================================================
// LOADING SKELETON
// ==========================================================
const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    ))}
  </div>
);

// ==========================================================
// EMPTY STATE
// ==========================================================
const EmptyState = ({ onRefresh, hasFilters }) => (
  <div className="text-center py-12">
    <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
      <FaUserTimes className="text-gray-400 text-3xl" />
    </div>
    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Users Found</h3>
    <p className="text-gray-500 mb-4">
      {hasFilters ? 'No users match your current filters.' : 'No users have been registered yet.'}
    </p>
    <button
      onClick={onRefresh}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <FaSync className="inline mr-2" /> Refresh
    </button>
  </div>
);

// ==========================================================
// DELETE CONFIRM DIALOG
// ==========================================================
const DeleteConfirmDialog = ({ isOpen, onClose, onConfirm, userName, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Delete</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <span className="font-semibold">{userName}</span>? 
          This action cannot be undone and will remove all associated data.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? <FaSpinner className="animate-spin" /> : null}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================================
// USER DETAILS MODAL
// ==========================================================
const UserDetailsModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const getRoleBadge = (role) => {
    const styles = {
      ADMIN: 'bg-purple-100 text-purple-700',
      PROVIDER: 'bg-green-100 text-green-700',
      CUSTOMER: 'bg-blue-100 text-blue-700'
    };
    return styles[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-bold text-gray-800">User Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex items-center gap-4 pb-4 border-b">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <h4 className="text-lg font-semibold">{user.name || 'N/A'}</h4>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500">User ID</p>
            <p className="font-medium font-mono text-sm">{user.userId || user.id}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-medium">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                {user.role || 'CUSTOMER'}
              </span>
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium flex items-center gap-2">
              <FaPhone className="text-gray-400 text-sm" />
              {user.phone || user.phoneNumber || 'N/A'}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {user.enabled ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Joined</p>
            <p className="font-medium flex items-center gap-2">
              <FaCalendarAlt className="text-gray-400 text-sm" />
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Bookings</p>
            <p className="font-medium">{user.bookingCount || 0}</p>
          </div>
          
          {user.role === 'PROVIDER' && (
            <>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Service Type</p>
                <p className="font-medium">{user.serviceType || user.serviceTypeDisplay || 'N/A'}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Experience</p>
                <p className="font-medium">{user.experienceYears || 0} years</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Rating</p>
                <p className="font-medium">{user.rating || 0} ⭐</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Strikes</p>
                <p className="font-medium">{user.strikes || 0}</p>
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================

const UserList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Refs
  const searchTimeoutRef = useRef(null);

  // ==========================================================
  // COMPUTED VALUES
  // ==========================================================
  const hasFilters = searchTerm !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.enabled).length,
    inactive: users.filter(u => !u.enabled).length,
    providers: users.filter(u => u.role === 'PROVIDER').length,
    customers: users.filter(u => u.role === 'CUSTOMER').length,
    admins: users.filter(u => u.role === 'ADMIN').length,
  }), [users]);

  // ==========================================================
  // TOAST HELPERS
  // ==========================================================
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // ==========================================================
  // FETCH USERS
  // ==========================================================
  const fetchUsers = useCallback(async () => {
    if (!user || user.role !== "ADMIN") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = {
        page: currentPage - 1,
        size: itemsPerPage,
        sortBy: sortConfig.key,
        sortDir: sortConfig.direction,
      };

      if (searchTerm) params.search = searchTerm;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get("/api/v1/admin/users", { params });

      // Handle different response structures
      const data = response.data?.data || response.data;
      const usersData = data.content || data || [];
      const total = data.totalElements || data.total || usersData.length;
      const pages = data.totalPages || Math.ceil(total / itemsPerPage);

      setUsers(usersData);
      setTotalElements(total);
      setTotalPages(pages);
      
    } catch (err) {
      console.error("Failed to fetch users:", err);
      const errorMsg = err.response?.data?.message || "❌ Failed to fetch users";
      setError(errorMsg);
      showToast(errorMsg, 'error');
      
      if (err.response?.status === 403) {
        setError("⛔ Access denied. Admin privileges required.");
      }
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, itemsPerPage, sortConfig, searchTerm, roleFilter, statusFilter]);

  // ==========================================================
  // DEBOUNCED SEARCH
  // ==========================================================
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers();
    }, 500);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, fetchUsers]);

  // ==========================================================
  // EFFECTS
  // ==========================================================
  useEffect(() => {
    fetchUsers();
  }, [currentPage, itemsPerPage, sortConfig, roleFilter, statusFilter, fetchUsers]);

  // ==========================================================
  // SORT
  // ==========================================================
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // ==========================================================
  // VIEW USER
  // ==========================================================
  const handleView = (user) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  // ==========================================================
  // EDIT USER
  // ==========================================================
  const handleEdit = (userId) => {
    navigate(`/dashboard/admin/users/edit/${userId}`);
  };

  // ==========================================================
  // DELETE USER
  // ==========================================================
  const handleDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    const userId = userToDelete.userId || userToDelete.id;

    try {
      await api.delete(`/api/v1/admin/users/${userId}`);
      
      setUsers(users.filter(u => (u.userId || u.id) !== userId));
      setTotalElements(prev => prev - 1);
      setTotalPages(Math.ceil((totalElements - 1) / itemsPerPage));
      
      showToast("✅ User deleted successfully", 'success');
      setShowDeleteDialog(false);
      setUserToDelete(null);
      
      // Refresh if current page becomes empty
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      
    } catch (err) {
      console.error("Failed to delete user:", err);
      showToast(err.response?.data?.message || "❌ Failed to delete user", 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ==========================================================
  // TOGGLE STATUS
  // ==========================================================
  const handleToggleStatus = async (userId, currentStatus) => {
    const action = currentStatus ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    setIsToggling(true);
    setActionLoading(prev => ({ ...prev, [userId]: true }));

    try {
      await api.patch(`/api/v1/admin/users/${userId}/status`);
      
      // Update local state
      setUsers(users.map(u => {
        if ((u.userId || u.id) === userId) {
          return { ...u, enabled: !currentStatus };
        }
        return u;
      }));
      
      showToast(`✅ User ${currentStatus ? 'disabled' : 'enabled'} successfully`, 'success');
    } catch (err) {
      console.error("Failed to toggle user status:", err);
      showToast(err.response?.data?.message || "❌ Failed to update user status", 'error');
    } finally {
      setIsToggling(false);
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // ==========================================================
  // REFRESH
  // ==========================================================
  const handleRefresh = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
    fetchUsers();
  };

  // ==========================================================
  // ITEMS PER PAGE CHANGE
  // ==========================================================
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // ==========================================================
  // PAGINATION
  // ==========================================================
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <FaChevronLeft size={14} />
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => setCurrentPage(1)}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              1
            </button>
            {startPage > 2 && <span className="text-gray-400">...</span>}
          </>
        )}
        
        {pages.map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-3 py-1 rounded-lg ${
              currentPage === page
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
            <button
              onClick={() => setCurrentPage(totalPages)}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {totalPages}
            </button>
          </>
        )}
        
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <FaChevronRight size={14} />
        </button>
      </div>
    );
  };

  // ==========================================================
  // ACCESS CONTROL
  // ==========================================================
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaShieldAlt className="text-6xl text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FaUserCog className="text-blue-600" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage all users, providers, and admins on the platform
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => navigate('/dashboard/admin/users/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FaPlus /> Add User
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FaSync className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Providers</p>
            <p className="text-2xl font-bold text-blue-600">{stats.providers}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Customers</p>
            <p className="text-2xl font-bold text-green-600">{stats.customers}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Admins</p>
            <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="CUSTOMER">Customers</option>
              <option value="PROVIDER">Providers</option>
              <option value="ADMIN">Admins</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Items Per Page */}
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt} per page</option>
              ))}
            </select>
          </div>
          
          {hasFilters && (
            <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
              <FaFilter className="text-gray-400" />
              Showing {users.length} of {totalElements} users
              <button
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                }}
                className="text-blue-600 hover:underline ml-2"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : users.length === 0 ? (
            <EmptyState onRefresh={handleRefresh} hasFilters={hasFilters} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('userId')}>
                        ID {sortConfig.key === 'userId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('name')}>
                        Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('role')}>
                        Role {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('enabled')}>
                        Status {sortConfig.key === 'enabled' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bookings</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((u) => {
                      const userId = u.userId || u.id;
                      const isLoading = actionLoading[userId];
                      
                      return (
                        <tr key={userId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                            #{userId}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-600">
                                  {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{u.name || u.fullName || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {u.phone && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                  <FaPhone className="text-gray-400 text-xs" />
                                  {u.phone}
                                </p>
                              )}
                              {u.email && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                  <FaEnvelope className="text-gray-400 text-xs" />
                                  {u.email}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'PROVIDER' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {u.role || 'CUSTOMER'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              u.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {u.enabled ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {u.bookingCount || 0}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleView(u)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <FaEye size={16} />
                              </button>
                              
                              <button
                                onClick={() => handleEdit(userId)}
                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <FaEdit size={16} />
                              </button>
                              
                              <button
                                onClick={() => handleToggleStatus(userId, u.enabled)}
                                disabled={isLoading || isToggling}
                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                  u.enabled 
                                    ? 'text-orange-600 hover:bg-orange-50' 
                                    : 'text-green-600 hover:bg-green-50'
                                }`}
                                title={u.enabled ? 'Disable User' : 'Enable User'}
                              >
                                {isLoading ? 
                                  <FaSpinner className="animate-spin" size={16} /> :
                                  u.enabled ? <FaUserTimes size={16} /> : <FaUserCheck size={16} />
                                }
                              </button>
                              
                              <button
                                onClick={() => {
                                  setUserToDelete(u);
                                  setShowDeleteDialog(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <FaTrash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalElements)} to{' '}
                  {Math.min(currentPage * itemsPerPage, totalElements)} of {totalElements} users
                </p>
                {renderPagination()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <UserDetailsModal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        userName={userToDelete?.name || userToDelete?.fullName || userToDelete?.email || 'this user'}
      />
    </div>
  );
};

export default UserList;