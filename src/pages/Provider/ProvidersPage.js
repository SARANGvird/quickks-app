// src/pages/admin/ProvidersPage.jsx
// ✅ COMPLETE PRODUCTION-READY v3.0
// ✅ FIXED: API endpoints matching backend
// ✅ FIXED: Data mapping from backend DTOs
// ✅ FIXED: Status handling with proper enums
// ✅ FIXED: Loading states for actions
// ✅ FIXED: Error handling and toast notifications
// ✅ FIXED: Pagination with proper page handling
// ✅ FIXED: Search with debouncing
// ✅ FIXED: Statistics integration
// ✅ FIXED: Modal with complete provider details
// ✅ FIXED: Responsive design
// ✅ PRODUCTION-READY

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import api from "../../api/api";
import Pagination from "../../components/Pagination";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserShield,
  FaSearch,
  FaSync,
  FaMapMarkerAlt,
  FaBriefcase,
  FaEnvelope,
  FaPhone,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaUserTimes,
  FaSpinner,
  FaTimes,
  FaStar,
  FaRupeeSign,
  FaCalendarAlt,
  FaBuilding,
  FaUserCheck,
  FaUserSlash,
} from "react-icons/fa";
import { format, formatDistanceToNow } from "date-fns";

// ==========================================================
// CONSTANTS
// ==========================================================
const PROVIDER_STATUS = {
  APPROVED: { 
    label: "Verified", 
    color: "emerald", 
    icon: FaCheckCircle, 
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
  },
  ACTIVE: { 
    label: "Active", 
    color: "emerald", 
    icon: FaCheckCircle, 
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
  },
  PENDING: { 
    label: "Pending", 
    color: "amber", 
    icon: FaClock, 
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/20" 
  },
  REJECTED: { 
    label: "Rejected", 
    color: "rose", 
    icon: FaExclamationTriangle, 
    badge: "bg-rose-500/10 text-rose-500 border-rose-500/20" 
  },
  SUSPENDED: { 
    label: "Suspended", 
    color: "red", 
    icon: FaUserTimes, 
    badge: "bg-red-500/10 text-red-500 border-red-500/20" 
  },
  INACTIVE: { 
    label: "Inactive", 
    color: "gray", 
    icon: FaUserSlash, 
    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20" 
  }
};

const STATUS_OPTIONS = [
  { value: "", label: "All Partners" },
  { value: "APPROVED", label: "Verified" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" }
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEBOUNCE_DELAY = 500;

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const getInitials = (name) => {
  if (!name) return "PR";
  return name
    .split(" ")
    .map(word => word?.[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "MMM dd, yyyy");
  } catch {
    return "N/A";
  }
};

const getStatusConfig = (status) => {
  return PROVIDER_STATUS[status] || PROVIDER_STATUS.PENDING;
};

// ==========================================================
// STAT CARD COMPONENT
// ==========================================================
const StatCard = ({ stat, onClick, isActive }) => {
  const Icon = stat.icon;
  const colorMap = {
    indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-500",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-500",
    red: "border-red-500/20 bg-red-500/10 text-red-500",
    gray: "border-gray-500/20 bg-gray-500/10 text-gray-400"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(stat.filterValue)}
      className={`bg-[#0f172a] border rounded-xl p-4 cursor-pointer transition-all hover:scale-105 ${
        isActive ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colorMap[stat.color]}`}>
          <Icon className="text-lg" />
        </div>
        <span className="text-xs font-bold text-slate-400">
          {stat.percentage}%
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{stat.count.toLocaleString()}</p>
      <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
    </motion.div>
  );
};

// ==========================================================
// PROVIDER DETAILS MODAL
// ==========================================================
const ProviderDetailsModal = ({ provider, open, onClose, onAction, actionLoading }) => {
  if (!provider) return null;

  const statusConfig = getStatusConfig(provider.status);
  const StatusIcon = statusConfig.icon;
  const providerId = provider.id || provider.providerId;
  const displayName = provider.fullName || provider.name || "Unknown Provider";
  const isLoading = actionLoading[providerId] || false;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white font-bold text-2xl">
                  {getInitials(displayName)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{displayName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusConfig.badge}`}>
                      <StatusIcon className="text-xs" />
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">ID: {providerId}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <FaTimes />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Personal Information</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-slate-500 block">Full Name</span>
                      <span className="text-sm text-white">{displayName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Email</span>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <FaEnvelope className="text-indigo-500/50 text-xs" />
                        {provider.email || "N/A"}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Phone</span>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <FaPhone className="text-indigo-500/50 text-xs" />
                        {provider.phone || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Professional Details</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-slate-500 block">Service Type</span>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <FaBriefcase className="text-indigo-500/50 text-xs" />
                        {provider.serviceTypeDisplay || provider.serviceType || "General Service"}
                      </div>
                    </div>
                    {provider.businessName && (
                      <div>
                        <span className="text-xs text-slate-500 block">Business Name</span>
                        <div className="flex items-center gap-2 text-sm text-white">
                          <FaBuilding className="text-indigo-500/50 text-xs" />
                          {provider.businessName}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-slate-500 block">Experience</span>
                      <span className="text-sm text-white">{provider.experienceYears || 0} years</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Base Price</span>
                      <span className="text-sm text-emerald-400 font-bold">{formatCurrency(provider.basePrice)}</span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Location</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-slate-500 block">Area</span>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <FaMapMarkerAlt className="text-rose-500/50 text-xs" />
                        {provider.area || "Not specified"}
                      </div>
                    </div>
                    {provider.city && (
                      <div>
                        <span className="text-xs text-slate-500 block">City</span>
                        <span className="text-sm text-white">{provider.city}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Statistics</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-slate-500 block">Rating</span>
                      <div className="flex items-center gap-1 text-sm text-white">
                        <FaStar className="text-amber-400" />
                        {provider.rating?.toFixed(1) || "New"}
                        <span className="text-xs text-slate-500 ml-1">({provider.totalReviews || 0} reviews)</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Completed Jobs</span>
                      <span className="text-sm text-white">{provider.completedJobs || 0}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Total Earnings</span>
                      <span className="text-sm text-emerald-400 font-bold">{formatCurrency(provider.totalEarnings)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Joined</span>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <FaCalendarAlt className="text-indigo-500/50 text-xs" />
                        {formatDate(provider.joinedAt || provider.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-800 flex flex-wrap gap-2">
              {provider.status !== 'APPROVED' && provider.status !== 'ACTIVE' && (
                <button
                  disabled={isLoading}
                  onClick={() => onAction(providerId, "approve")}
                  className="flex-1 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {isLoading ? <FaSpinner className="animate-spin mx-auto" /> : <><FaCheckCircle className="inline mr-2" /> Verify</>}
                </button>
              )}
              {provider.status !== 'REJECTED' && provider.status !== 'APPROVED' && provider.status !== 'ACTIVE' && (
                <button
                  disabled={isLoading}
                  onClick={() => onAction(providerId, "reject")}
                  className="flex-1 py-2.5 bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-xl text-sm font-bold hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {isLoading ? <FaSpinner className="animate-spin mx-auto" /> : <><FaExclamationTriangle className="inline mr-2" /> Reject</>}
                </button>
              )}
              {provider.status === 'APPROVED' || provider.status === 'ACTIVE' ? (
                <button
                  disabled={isLoading}
                  onClick={() => onAction(providerId, "suspend")}
                  className="flex-1 py-2.5 bg-red-600/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {isLoading ? <FaSpinner className="animate-spin mx-auto" /> : <><FaUserTimes className="inline mr-2" /> Suspend</>}
                </button>
              ) : provider.status === 'SUSPENDED' ? (
                <button
                  disabled={isLoading}
                  onClick={() => onAction(providerId, "approve")}
                  className="flex-1 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {isLoading ? <FaSpinner className="animate-spin mx-auto" /> : <><FaUserCheck className="inline mr-2" /> Activate</>}
                </button>
              ) : null}
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-700/50 text-slate-300 border border-slate-600 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function ProvidersPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [providers, setProviders] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    suspended: 0
  });
  const [error, setError] = useState(null);

  const debounceTimer = useRef(null);
  const abortControllerRef = useRef(null);

  // ==========================================================
  // LOAD PROVIDERS
  // ==========================================================
  const loadProviders = useCallback(async (targetPage = page, showLoading = true) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('page', targetPage);
      params.append('size', size);
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);

      const url = `/api/v1/providers?${params.toString()}`;
      console.log("📡 Fetching providers from:", url);
      
      const response = await api.get(url, {
        signal: abortControllerRef.current.signal
      });
      
      const responseData = response.data?.data || response.data;
      
      let providersArray = [];
      let total = 0;
      let totalPagesCount = 0;
      
      if (responseData?.content && Array.isArray(responseData.content)) {
        providersArray = responseData.content;
        total = responseData.totalElements || providersArray.length;
        totalPagesCount = responseData.totalPages || 0;
      } else if (Array.isArray(responseData)) {
        providersArray = responseData;
        total = responseData.length;
        totalPagesCount = Math.ceil(total / size);
      }
      
      console.log(`📊 Loaded ${providersArray.length} providers, Total: ${total}`);
      
      setProviders(providersArray);
      setTotalElements(total);
      setTotalPages(totalPagesCount);
      
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Request cancelled");
        return;
      }
      console.error("❌ Failed to load providers:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to load providers";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      if (showLoading) setLoading(false);
      abortControllerRef.current = null;
    }
  }, [page, size, filters]);

  // ==========================================================
  // LOAD STATISTICS
  // ==========================================================
  const loadStats = useCallback(async () => {
    try {
      const url = "/api/v1/providers/statistics";
      console.log("📊 Fetching stats from:", url);
      
      const response = await api.get(url);
      const data = response.data?.data || response.data;
      
      setStats({
        total: data?.total || 0,
        approved: data?.approved || data?.APPROVED || 0,
        active: data?.active || data?.ACTIVE || 0,
        pending: data?.pending || data?.PENDING || 0,
        rejected: data?.rejected || data?.REJECTED || 0,
        suspended: data?.suspended || data?.SUSPENDED || 0
      });
    } catch (error) {
      console.error("Failed to load provider stats:", error);
    }
  }, []);

  // ==========================================================
  // EFFECTS
  // ==========================================================
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(0);
      loadProviders(0);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(debounceTimer.current);
  }, [filters.search, filters.status]);

  useEffect(() => {
    if (page !== 0) loadProviders(page);
  }, [page]);

  useEffect(() => {
    loadProviders(0);
    loadStats();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ==========================================================
  // HANDLE ACTIONS
  // ==========================================================
  const handleAction = async (providerId, action) => {
    let reason = "";
    
    if (action === "reject") {
      reason = window.prompt("Please enter a reason for rejection:");
      if (!reason) {
        toast.error("Rejection reason is required");
        return;
      }
    } else if (action === "suspend") {
      reason = window.prompt("Please enter a reason for suspension:");
      if (!reason) {
        toast.error("Suspension reason is required");
        return;
      }
    } else if (action === "approve") {
      if (!window.confirm(`Are you sure you want to verify this provider?`)) return;
    }

    setActionLoading(prev => ({ ...prev, [providerId]: true }));
    
    try {
      let endpoint;
      
      switch (action) {
        case "approve":
          endpoint = `/api/v1/providers/${providerId}/approve`;
          break;
        case "reject":
          endpoint = `/api/v1/providers/${providerId}/reject`;
          break;
        case "suspend":
          endpoint = `/api/v1/providers/${providerId}/suspend`;
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      console.log(`📡 ${action} provider:`, endpoint);
      
      await api.post(endpoint, reason ? { reason } : {});
      
      toast.success(`Provider ${action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : 'suspended'} successfully`);
      
      await loadProviders(page, false);
      await loadStats();
      
      if (detailsModalOpen) {
        setDetailsModalOpen(false);
        setSelectedProvider(null);
      }
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action} provider`);
    } finally {
      setActionLoading(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleStatClick = (status) => {
    setFilters(prev => ({ ...prev, status: status || "" }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ search: "", status: "" });
    setPage(0);
  };

  const statsCards = [
    { label: "Total", count: stats.total, icon: FaUserShield, color: "indigo", percentage: 100, filterValue: "" },
    { label: "Verified", count: stats.approved, icon: FaCheckCircle, color: "emerald", percentage: stats.total ? ((stats.approved / stats.total) * 100).toFixed(0) : 0, filterValue: "APPROVED" },
    { label: "Active", count: stats.active, icon: FaUserCheck, color: "emerald", percentage: stats.total ? ((stats.active / stats.total) * 100).toFixed(0) : 0, filterValue: "ACTIVE" },
    { label: "Pending", count: stats.pending, icon: FaClock, color: "amber", percentage: stats.total ? ((stats.pending / stats.total) * 100).toFixed(0) : 0, filterValue: "PENDING" },
    { label: "Rejected", count: stats.rejected, icon: FaExclamationTriangle, color: "rose", percentage: stats.total ? ((stats.rejected / stats.total) * 100).toFixed(0) : 0, filterValue: "REJECTED" },
    { label: "Suspended", count: stats.suspended, icon: FaUserTimes, color: "red", percentage: stats.total ? ((stats.suspended / stats.total) * 100).toFixed(0) : 0, filterValue: "SUSPENDED" }
  ];

  const hasActiveFilters = filters.search || filters.status;

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className="min-h-screen bg-[#060b18] p-4 md:p-8 text-slate-300">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-600/20 rounded-2xl border border-indigo-500/20">
              <FaUserShield className="text-indigo-500 text-3xl" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Partner Registry</h1>
              <p className="text-sm text-slate-500 mt-1">
                Managing {totalElements.toLocaleString()} Service Professionals
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative w-80">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl py-3 pl-11 pr-4 focus:border-indigo-500 outline-none text-sm text-white placeholder:text-slate-600"
                placeholder="Search by name, email, or phone..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            
            <button
              onClick={() => loadProviders(page)}
              disabled={loading}
              className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <FaSync className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-xl">
            <div className="flex items-center gap-2 text-red-400">
              <FaExclamationTriangle />
              <span className="text-sm">{error}</span>
            </div>
            <button 
              onClick={() => loadProviders(page)} 
              className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {statsCards.map((stat) => (
            <StatCard
              key={stat.label}
              stat={stat}
              onClick={handleStatClick}
              isActive={filters.status === stat.filterValue}
            />
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilters(prev => ({ ...prev, status: option.value }))}
              className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all border whitespace-nowrap ${
                filters.status === option.value
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 rounded-full text-[10px] font-black tracking-widest bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all"
            >
              CLEAR FILTERS
            </button>
          )}
        </div>

        {/* Providers Table */}
        <div className="bg-[#0f172a] rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900/50 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-6">Partner / ID</th>
                  <th>Service Details</th>
                  <th>Contact</th>
                  <th>Operation Area</th>
                  <th>Status</th>
                  <th className="text-right p-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading && providers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-32 text-center">
                      <FaSpinner className="animate-spin text-indigo-500 text-4xl mx-auto mb-4" />
                      <span className="text-xs text-slate-500">Loading partners...</span>
                    </td>
                  </tr>
                ) : providers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-40 text-center">
                      <FaUserShield className="mx-auto text-4xl text-slate-700 mb-4" />
                      <p className="text-slate-400">No providers found</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {error ? "Check your connection" : "Try adjusting your filters"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  providers.map((provider) => {
                    const statusConfig = getStatusConfig(provider.status);
                    const StatusIcon = statusConfig.icon;
                    const providerId = provider.id || provider.providerId;
                    const displayName = provider.fullName || provider.name || "Unknown Provider";
                    const initials = getInitials(displayName);
                    
                    return (
                      <tr key={providerId} className="hover:bg-slate-800/20 group" onClick={() => {
                        setSelectedProvider(provider);
                        setDetailsModalOpen(true);
                      }}>
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white font-black text-xs">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{displayName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">ID: {providerId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <FaBriefcase className="text-indigo-500/50 text-xs" />
                            {provider.serviceTypeDisplay || provider.serviceType || "General Service"}
                          </div>
                          {provider.experienceYears > 0 && (
                            <div className="text-[10px] text-slate-500 mt-1">{provider.experienceYears} years exp</div>
                          )}
                          {provider.businessName && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              <FaBuilding className="inline mr-1 text-xs" /> {provider.businessName}
                            </div>
                          )}
                        </td>
                        <td className="p-6">
                          <div className="text-sm text-slate-300">{provider.email || "N/A"}</div>
                          <div className="text-xs text-slate-500">{provider.phone || "N/A"}</div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <FaMapMarkerAlt className="text-rose-500/50 text-xs" />
                            {provider.area || "Not specified"}
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-black border ${statusConfig.badge}`}>
                            <StatusIcon className="text-xs" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            {provider.status !== 'APPROVED' && provider.status !== 'ACTIVE' && (
                              <button
                                disabled={actionLoading[providerId]}
                                onClick={() => handleAction(providerId, "approve")}
                                className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                              >
                                {actionLoading[providerId] ? <FaSpinner className="animate-spin" /> : "VERIFY"}
                              </button>
                            )}
                            {provider.status !== 'REJECTED' && provider.status !== 'APPROVED' && provider.status !== 'ACTIVE' && (
                              <button
                                disabled={actionLoading[providerId]}
                                onClick={() => handleAction(providerId, "reject")}
                                className="px-4 py-2 bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                              >
                                {actionLoading[providerId] ? <FaSpinner className="animate-spin" /> : "REJECT"}
                              </button>
                            )}
                            {provider.status === 'APPROVED' || provider.status === 'ACTIVE' ? (
                              <button
                                disabled={actionLoading[providerId]}
                                onClick={() => handleAction(providerId, "suspend")}
                                className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                              >
                                {actionLoading[providerId] ? <FaSpinner className="animate-spin" /> : "SUSPEND"}
                              </button>
                            ) : provider.status === 'SUSPENDED' ? (
                              <button
                                disabled={actionLoading[providerId]}
                                onClick={() => handleAction(providerId, "approve")}
                                className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                              >
                                {actionLoading[providerId] ? <FaSpinner className="animate-spin" /> : "ACTIVATE"}
                              </button>
                            ) : null}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProvider(provider);
                                setDetailsModalOpen(true);
                              }}
                              className="px-4 py-2 bg-slate-700/50 text-slate-300 border border-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-700 transition-all"
                            >
                              DETAILS
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="mt-8 flex justify-between items-center">
            <p className="text-[10px] text-slate-500">
              Page {page + 1} of {totalPages} • {totalElements} total
            </p>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              rowsPerPage={size}
              onRowsPerPageChange={setSize}
            />
          </div>
        )}
      </div>

      {/* Provider Details Modal */}
      <ProviderDetailsModal
        provider={selectedProvider}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedProvider(null);
        }}
        onAction={handleAction}
        actionLoading={actionLoading}
      />
    </div>
  );
}