// src/pages/Admin/BookingsPage.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { adminService } from "../../api/api";
import api from "../../api/api";
import Pagination from "../../components/Pagination";
import { motion, AnimatePresence } from "framer-motion";
import { format, isValid, parseISO } from "date-fns";
import toast, { Toaster } from "react-hot-toast";

import {
  FaClipboardList,
  FaSearch,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaFileExport,
  FaSync,
  FaInfoCircle,
  FaUser,
  FaTools,
  FaTimes,
  FaCheckCircle,
  FaBan,
  FaSpinner,
  FaBug,
  FaExclamationTriangle
} from "react-icons/fa";

// ==========================================================
// CONSTANTS
// ==========================================================

const getStatusColor = (status) => {
  const styles = {
    COMPLETED: "text-green-400 bg-green-900/30 border-green-800",
    CANCELLED: "text-red-400 bg-red-900/30 border-red-800",
    REJECTED: "text-red-400 bg-red-900/30 border-red-800",
    ASSIGNED: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
    ACCEPTED: "text-blue-400 bg-blue-900/30 border-blue-800",
    PROVIDER_STARTED: "text-purple-400 bg-purple-900/30 border-purple-800",
    STARTED: "text-purple-400 bg-purple-900/30 border-purple-800",
    COMPLETED_BY_PROVIDER: "text-green-400 bg-green-900/30 border-green-800",
    PENDING: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
    REQUESTED: "text-blue-400 bg-blue-900/30 border-blue-800",
    PAYMENT_PENDING: "text-orange-400 bg-orange-900/30 border-orange-800",
    EXPIRED: "text-gray-400 bg-gray-900/30 border-gray-800",
  };
  return styles[status] || styles.PENDING;
};

const STATUS_DISPLAY = {
  REQUESTED: "Requested",
  PENDING: "Pending",
  PAYMENT_PENDING: "Payment Pending",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  PROVIDER_STARTED: "In Progress",
  STARTED: "Started",
  COMPLETED_BY_PROVIDER: "Completed by Provider",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  EXPIRED: "Expired"
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "REQUESTED", label: "Requested" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "PROVIDER_STARTED", label: "In Progress" },
  { value: "COMPLETED_BY_PROVIDER", label: "Completed by Provider" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" }
];

const SERVICE_TYPES = [
  "Plumbing", "Electrical", "Cleaning", "Carpentry", 
  "Painting", "AC Repair", "Appliance Repair", "Pest Control"
];

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatDate = (dateString) => {
  if (!dateString) return "Not scheduled";
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (!isValid(date)) return "Invalid date";
    return format(date, "dd MMM yyyy, hh:mm a");
  } catch {
    return "Invalid date";
  }
};

const formatShortDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    if (!isValid(date)) return "Invalid";
    return format(date, "dd MMM, hh:mm a");
  } catch {
    return "N/A";
  }
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const getDisplayStatus = (status) => {
  return STATUS_DISPLAY[status] || status || "Unknown";
};

// ==========================================================
// STATS CARD COMPONENT
// ==========================================================
const StatsCard = ({ label, value, color }) => {
  const colorClasses = {
    white: "text-white",
    amber: "text-amber-400",
    blue: "text-blue-400",
    orange: "text-orange-400",
    emerald: "text-emerald-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400"
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3">
      <p className="text-[10px] text-slate-500 uppercase">{label}</p>
      <p className={`text-xl font-bold ${colorClasses[color] || colorClasses.white}`}>
        {value}
      </p>
    </div>
  );
};

// ==========================================================
// DEBUG PANEL
// ==========================================================
const DebugPanel = ({ responseData, error, loading, endpoint }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!responseData && !error) return null;
  
  return (
    <div className="mb-4 bg-yellow-900/20 border border-yellow-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-yellow-900/30 hover:bg-yellow-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FaBug className="text-yellow-500" />
          <span className="text-sm font-medium text-yellow-400">Debug Information</span>
          {loading && <FaSpinner className="animate-spin text-yellow-400" size={12} />}
          {error && <span className="text-xs text-red-400">Error: {error}</span>}
        </div>
        <span className="text-yellow-400">{expanded ? "▼" : "▶"}</span>
      </button>
      
      {expanded && (
        <div className="p-4 border-t border-yellow-700/50">
          <div className="space-y-2 text-xs font-mono">
            <div>
              <span className="text-yellow-500">API Endpoint:</span>
              <span className="text-gray-400 ml-2">{endpoint || '/api/v1/bookings?page=0&size=10'}</span>
            </div>
            <div>
              <span className="text-yellow-500">Response Status:</span>
              <span className="text-gray-400 ml-2">{error ? "Error" : "Success"}</span>
            </div>
            <div>
              <span className="text-yellow-500">Total Bookings:</span>
              <span className="text-gray-400 ml-2">{responseData?.totalElements || responseData?.content?.length || 0}</span>
            </div>
            <div>
              <span className="text-yellow-500">Response Structure:</span>
              <pre className="mt-2 p-2 bg-black/50 rounded overflow-auto max-h-60 text-gray-400">
                {JSON.stringify(responseData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================================
// BOOKING DETAILS MODAL
// ==========================================================
const BookingDetailsModal = ({ booking, onClose, onStatusUpdate, updating }) => {
  const [selectedStatus, setSelectedStatus] = useState(booking?.status || "");
  const [isUpdating, setIsUpdating] = useState(false);

  if (!booking) return null;

  const handleStatusUpdate = async () => {
    if (selectedStatus === booking.status) {
      toast.error("Please select a different status");
      return;
    }
    setIsUpdating(true);
    await onStatusUpdate(booking.bookingId, selectedStatus);
    setIsUpdating(false);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} 
        animate={{ scale: 1, y: 0 }} 
        className="bg-[#0f172a] border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-gray-900/50 flex justify-between items-center border-b border-gray-800">
          <div>
            <h3 className="font-black text-xl text-white">Booking Details</h3>
            <p className="text-[10px] text-blue-400 font-mono">ID: #{booking.bookingId?.slice(-8).toUpperCase()}</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-xs mb-2 flex items-center gap-2">
              <FaInfoCircle /> Update Status
            </p>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                disabled={isUpdating}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {selectedStatus !== booking.status && (
                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 rounded-xl text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? <FaSpinner className="animate-spin" /> : "Apply"}
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-xs mb-2">Service Details</p>
            <p className="font-bold text-white">{booking.serviceType || "N/A"}</p>
            {booking.description && (
              <p className="text-sm text-gray-400 mt-2">{booking.description}</p>
            )}
          </div>
          
          <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-xs mb-2">Schedule</p>
            <p className="font-bold text-white flex items-center gap-2">
              <FaCalendarAlt className="text-blue-500"/> 
              {formatDate(booking.scheduledAt)}
            </p>
          </div>
          
          <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-xs mb-2">Total Amount</p>
            <p className="font-bold text-green-400 flex items-center gap-2 text-xl">
              <FaMoneyBillWave/> {formatCurrency(booking.totalAmount || 0)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-800">
              <p className="text-gray-400 text-[10px] mb-1">Customer</p>
              <p className="text-sm font-medium text-white">{booking.customerName || "N/A"}</p>
            </div>
            <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-800">
              <p className="text-gray-400 text-[10px] mb-1">Provider</p>
              <p className="text-sm font-medium text-white">{booking.providerName || "Unassigned"}</p>
            </div>
          </div>
          
          <div className="pt-2 flex gap-3">
            <button 
              onClick={() => onStatusUpdate(booking.bookingId, "COMPLETED")} 
              className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-black text-[11px] transition-colors flex items-center justify-center gap-2"
              disabled={booking.status === "COMPLETED"}
            >
              <FaCheckCircle size={12} /> COMPLETE
            </button>
            <button 
              onClick={() => onStatusUpdate(booking.bookingId, "CANCELLED")} 
              className="flex-1 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white py-3 rounded-xl font-black text-[11px] transition-colors flex items-center justify-center gap-2"
              disabled={booking.status === "CANCELLED" || booking.status === "COMPLETED"}
            >
              <FaBan size={12} /> CANCEL
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function BookingsPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [filter, setFilter] = useState({ status: "", serviceType: "", keyword: "" });
  
  const [bookingsPage, setBookingsPage] = useState({
    content: [],
    totalPages: 0,
    number: 0,
    totalElements: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // ✅ Use refs to prevent infinite loops
  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);

  // ✅ Separate function for fetching data
  const fetchBookings = useCallback(async (currentPage, currentFilter, currentSize) => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("📡 Fetching bookings:", { currentPage, currentFilter, currentSize });
      
      const response = await adminService.getAllBookings(
        currentFilter.status || null,
        currentFilter.serviceType || null,
        null,
        null,
        currentPage,
        currentSize
      );
      
      if (!isMountedRef.current) return;
      
      console.log("✅ API Response:", response);
      setApiResponse(response);
      
      let content = [];
      let totalPages = 0;
      let totalElements = 0;
      
      if (response?.content && Array.isArray(response.content)) {
        content = response.content;
        totalPages = response.totalPages || 0;
        totalElements = response.totalElements || content.length;
      } else if (Array.isArray(response)) {
        content = response;
        totalElements = response.length;
        totalPages = Math.ceil(totalElements / currentSize);
      } else if (response?.data && Array.isArray(response.data)) {
        content = response.data;
        totalElements = response.total || content.length;
        totalPages = Math.ceil(totalElements / currentSize);
      }
      
      console.log(`📊 Loaded ${content.length} bookings, Total: ${totalElements}`);
      
      setBookingsPage({
        content: content,
        totalPages,
        number: currentPage,
        totalElements,
      });
      
    } catch (err) {
      console.error("❌ Fetch error:", err);
      if (isMountedRef.current) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to load bookings";
        setError(errorMessage);
        if (initialLoadDoneRef.current) {
          toast.error(errorMessage);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ✅ Effect for initial load and when dependencies change
  useEffect(() => {
    isMountedRef.current = true;
    
    // Load data on mount and when dependencies change
    fetchBookings(page, filter, size);
    
    return () => {
      isMountedRef.current = false;
    };
  }, [page, size, filter.status, filter.serviceType, filter.keyword, fetchBookings]);

  // ✅ Mark initial load as done after first successful load
  useEffect(() => {
    if (bookingsPage.totalElements > 0 || error) {
      initialLoadDoneRef.current = true;
    }
  }, [bookingsPage.totalElements, error]);

  // Search handlers with debouncing
  const debouncedSearchRef = useRef(null);
  
  const handleSearchChange = (value) => {
    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current);
    }
    debouncedSearchRef.current = setTimeout(() => {
      setPage(0);
      setFilter((prev) => ({ ...prev, keyword: value }));
    }, 500);
  };

  const handleStatusFilter = (value) => {
    setPage(0);
    setFilter(prev => ({ ...prev, status: value }));
  };

  const handleServiceTypeFilter = (value) => {
    setPage(0);
    setFilter(prev => ({ ...prev, serviceType: value }));
  };

  const clearFilters = () => {
    setFilter({ status: "", serviceType: "", keyword: "" });
    setPage(0);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const safeContent = bookingsPage?.content ?? []; 
    return {
      total: safeContent.length,
      totalAmount: safeContent.reduce((sum, b) => sum + (Number(b?.totalAmount) || 0), 0),
      pendingCount: safeContent.filter((b) => b?.status === "PENDING" || b?.status === "REQUESTED" || b?.status === "PAYMENT_PENDING").length,
      confirmedCount: safeContent.filter((b) => b?.status === "ASSIGNED" || b?.status === "ACCEPTED").length,
      inProgressCount: safeContent.filter((b) => b?.status === "PROVIDER_STARTED" || b?.status === "STARTED").length,
      completedCount: safeContent.filter((b) => b?.status === "COMPLETED" || b?.status === "COMPLETED_BY_PROVIDER").length,
      cancelledCount: safeContent.filter((b) => b?.status === "CANCELLED" || b?.status === "REJECTED").length,
    };
  }, [bookingsPage.content]);

  // ✅ Update status
  const updateStatus = async (bookingId, status) => {
    setUpdating(true);
    try {
      await api.put(`/api/v1/bookings/${bookingId}/status`, { newStatus: status });
      toast.success(`Booking ${status === "COMPLETED" ? "completed" : status === "CANCELLED" ? "cancelled" : "updated"} successfully`);
      // Refresh data
      await fetchBookings(page, filter, size);
      setSelectedBooking(null);
    } catch (err) {
      console.error("Status update error:", err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Status update failed";
      toast.error(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const exportToCSV = () => {
    const safeContent = bookingsPage?.content || [];
    if (safeContent.length === 0) {
      toast.error("No data available to export");
      return;
    }
    
    const headers = "Booking ID,Service,Customer,Provider,Status,Date,Amount\n";
    const rows = safeContent.map(b => 
      `${b.bookingId},"${b.serviceType || 'N/A'}","${b.customerName || 'N/A'}","${b.providerName || 'Unassigned'}","${getDisplayStatus(b.status)}",${formatShortDate(b.scheduledAt)},${b.totalAmount || 0}`
    ).join("\n");
    
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Bookings_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Export completed");
  };

  const hasActiveFilters = filter.status || filter.serviceType || filter.keyword;

  const handleRefresh = () => {
    fetchBookings(page, filter, size);
  };

  return (
    <div className="min-h-screen bg-[#060a1f] p-4 md:p-8 text-white font-sans selection:bg-blue-500/30">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <FaClipboardList className="text-blue-500" />
            Booking Ledger
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            <span className="text-blue-400 font-bold">{bookingsPage.totalElements.toLocaleString()}</span> total bookings in system
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <StatsCard title="Total" value={stats.total} color="white" />
          <StatsCard title="Pending" value={stats.pendingCount} color="yellow" />
          <StatsCard title="Confirmed" value={stats.confirmedCount} color="blue" />
          <StatsCard title="In Progress" value={stats.inProgressCount} color="purple" />
          <StatsCard title="Completed" value={stats.completedCount} color="green" />
          <StatsCard title="Revenue" value={formatCurrency(stats.totalAmount)} color="emerald" />
          
          <div className="flex gap-2 ml-2">
            <button 
              onClick={() => setShowDebug(!showDebug)} 
              className={`p-3 rounded-xl transition-all ${showDebug ? 'bg-yellow-600' : 'bg-gray-800 hover:bg-gray-700'}`}
              title="Toggle Debug"
            >
              <FaBug />
            </button>
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition-all disabled:opacity-50"
              title="Refresh"
            >
              <FaSync className={loading ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={exportToCSV} 
              className="flex items-center gap-2 bg-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
            >
              <FaFileExport /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <DebugPanel 
          responseData={apiResponse} 
          error={error} 
          loading={loading}
          endpoint={`/api/v1/bookings?page=${page}&size=${size}`}
        />
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-xl">
          <div className="flex items-center gap-2 text-red-400">
            <FaExclamationTriangle />
            <span className="text-sm">{error}</span>
          </div>
          <button 
            onClick={handleRefresh}
            className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="relative group">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
          <input
            placeholder="Search by ID or Customer Name..."
            className="w-full bg-[#0f172a] border border-gray-800 px-10 py-3 rounded-xl focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <select
          className="bg-[#0f172a] border border-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          onChange={(e) => handleStatusFilter(e.target.value)}
          value={filter.status}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          className="bg-[#0f172a] border border-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          onChange={(e) => handleServiceTypeFilter(e.target.value)}
          value={filter.serviceType}
        >
          <option value="">All Services</option>
          {SERVICE_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        
        <div className="flex gap-2">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center px-4 py-2 gap-3 flex-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs text-blue-200 font-medium">Real-time: Active</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-800 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Clear filters"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#0f172a] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900/50 text-gray-400 text-[10px] uppercase tracking-widest font-black">
              <tr>
                <th className="p-5">Booking ID</th>
                <th className="p-5">Service</th>
                <th className="p-5">Customer</th>
                <th className="p-5">Provider</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5">Schedule</th>
                <th className="p-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading && bookingsPage.content.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <FaSpinner className="animate-spin text-blue-500 text-4xl" />
                      <span className="text-gray-500 font-medium">Loading bookings...</span>
                    </div>
                  </td>
                </tr>
              ) : error && bookingsPage.content.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <FaExclamationTriangle className="text-red-500 text-4xl" />
                      <span className="text-gray-500 font-medium">Failed to load bookings</span>
                      <button 
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-500 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : bookingsPage.content.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <FaClipboardList className="text-gray-700 text-4xl" />
                      <span className="text-gray-500 font-medium">No bookings found</span>
                      <p className="text-gray-600 text-sm">Try adjusting your filters or create some bookings</p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookingsPage.content.map((booking) => (
                  <motion.tr
                    key={booking.bookingId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedBooking(booking)}
                    className="group cursor-pointer transition-colors hover:bg-gray-800/40"
                  >
                    <td className="p-5 font-mono text-sm text-blue-400 font-bold">
                      #{booking.bookingId?.slice(-8).toUpperCase()}
                    </td>
                    <td className="p-5">
                      <span className="bg-gray-800 px-2 py-1 rounded text-xs font-semibold">
                        {booking.serviceType || "N/A"}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <FaUser size={12} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-200">
                          {booking.customerName || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <FaTools size={12} className="text-gray-500" />
                        <span className="text-sm text-gray-400">
                          {booking.providerName || "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter border ${getStatusColor(booking.status)}`}>
                        {getDisplayStatus(booking.status)}
                      </span>
                    </td>
                    <td className="p-5 text-xs text-gray-400">
                      {formatShortDate(booking.scheduledAt)}
                    </td>
                    <td className="p-5 font-bold text-right text-green-400">
                      {formatCurrency(booking.totalAmount || 0)}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {bookingsPage.totalPages > 0 && (
        <div className="mt-6">
          <Pagination
            page={bookingsPage.number}
            totalPages={bookingsPage.totalPages}
            totalElements={bookingsPage.totalElements}
            size={size}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        </div>
      )}

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onStatusUpdate={updateStatus}
            updating={updating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}