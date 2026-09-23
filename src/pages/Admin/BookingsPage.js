// src/pages/Admin/BookingsPage.jsx
// COMPLETE PRODUCTION-LEVEL BOOKINGS PAGE WITH ELECTRICAL THEMED BACKGROUND

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "../../api/api";
import Pagination from "../../components/common/Pagination";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isTomorrow, parseISO, isValid, differenceInDays } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import {
  FaClipboardList,
  FaSearch,
  FaTimes,
  FaCalendarDay,
  FaSync,
  FaEye,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUser,
  FaBuilding,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPrint,
  FaFileExport,
  FaFilter as FaFilterIcon,
  FaSpinner,
  FaChartPie,
  FaWallet,
  FaPhone,
  FaEnvelope,
  FaArrowUp,
  FaArrowDown,
  FaRegClock,
  FaTag,
  FaUserCheck,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckDouble,
  FaBolt,
  FaLightbulb,
  FaPlug,
  FaMicrochip,
  FaServer,
  FaDatabase,
  FaNetworkWired,
  FaWifi
} from "react-icons/fa";
import { useDashboardSocket } from "../../hooks/useDashboardSocket";
import { useNotifications } from "../../contexts/NotificationContext";

// ==========================================================
// 📁 CONSTANTS & CONFIGURATION
// ==========================================================

// Status Configuration
const STATUS_CONFIG = {
  REQUESTED: { 
    label: "Requested", 
    color: "warning", 
    bgColor: "bg-amber-500/10", 
    textColor: "text-amber-400", 
    borderColor: "border-amber-500/20", 
    icon: FaRegClock, 
    priority: 1,
    progress: 10,
    action: "Awaiting Approval"
  },
  PENDING: { 
    label: "Pending", 
    color: "warning", 
    bgColor: "bg-amber-500/10", 
    textColor: "text-amber-400", 
    borderColor: "border-amber-500/20", 
    icon: FaClock, 
    priority: 1,
    progress: 10,
    action: "Awaiting Review"
  },
  PAYMENT_PENDING: { 
    label: "Payment Pending", 
    color: "warning", 
    bgColor: "bg-amber-500/10", 
    textColor: "text-amber-400", 
    borderColor: "border-amber-500/20", 
    icon: FaMoneyBillWave, 
    priority: 2,
    progress: 15,
    action: "Awaiting Payment"
  },
  ASSIGNED: { 
    label: "Assigned", 
    color: "primary", 
    bgColor: "bg-indigo-500/10", 
    textColor: "text-indigo-400", 
    borderColor: "border-indigo-500/20", 
    icon: FaUserCheck, 
    priority: 3,
    progress: 30,
    action: "Provider Assigned"
  },
  ACCEPTED: { 
    label: "Accepted", 
    color: "success", 
    bgColor: "bg-emerald-500/10", 
    textColor: "text-emerald-400", 
    borderColor: "border-emerald-500/20", 
    icon: FaCheckCircle, 
    priority: 4,
    progress: 45,
    action: "Provider Accepted"
  },
  STARTED: { 
    label: "In Progress", 
    color: "info", 
    bgColor: "bg-blue-500/10", 
    textColor: "text-blue-400", 
    borderColor: "border-blue-500/20", 
    icon: FaSpinner, 
    priority: 5,
    progress: 60,
    action: "Service Started"
  },
  PROVIDER_STARTED: { 
    label: "Provider Started", 
    color: "info", 
    bgColor: "bg-blue-500/10", 
    textColor: "text-blue-400", 
    borderColor: "border-blue-500/20", 
    icon: FaShieldAlt, 
    priority: 5,
    progress: 65,
    action: "Provider En Route"
  },
  COMPLETED_BY_PROVIDER: { 
    label: "Completed by Provider", 
    color: "success", 
    bgColor: "bg-emerald-500/10", 
    textColor: "text-emerald-400", 
    borderColor: "border-emerald-500/20", 
    icon: FaCheckCircle, 
    priority: 6,
    progress: 90,
    action: "Awaiting Confirmation"
  },
  COMPLETED: { 
    label: "Completed", 
    color: "success", 
    bgColor: "bg-emerald-500/10", 
    textColor: "text-emerald-400", 
    borderColor: "border-emerald-500/20", 
    icon: FaCheckDouble, 
    priority: 7,
    progress: 100,
    action: "Done"
  },
  CANCELLED: { 
    label: "Cancelled", 
    color: "error", 
    bgColor: "bg-rose-500/10", 
    textColor: "text-rose-400", 
    borderColor: "border-rose-500/20", 
    icon: FaTimesCircle, 
    priority: 0,
    progress: 0,
    action: "Cancelled"
  },
  REJECTED: { 
    label: "Rejected", 
    color: "error", 
    bgColor: "bg-red-500/10", 
    textColor: "text-red-400", 
    borderColor: "border-red-500/20", 
    icon: FaTimesCircle, 
    priority: 0,
    progress: 0,
    action: "Rejected"
  },
  EXPIRED: { 
    label: "Expired", 
    color: "error", 
    bgColor: "bg-gray-500/10", 
    textColor: "text-gray-400", 
    borderColor: "border-gray-500/20", 
    icon: FaTimesCircle, 
    priority: 0,
    progress: 0,
    action: "Expired"
  }
};

// Options
const STATUS_OPTIONS = Object.keys(STATUS_CONFIG);
const SERVICE_TYPES = ["All", "Plumbing", "Electrical", "Cleaning", "Carpentry", "Painting", "AC Repair", "Appliance Repair", "Pest Control"];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEBOUNCE_DELAY = 500;
const REFRESH_INTERVAL = 30000;
const MAX_RETRY_ATTEMPTS = 3;

const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "Newest First", icon: FaArrowDown },
  { value: "createdAt,asc", label: "Oldest First", icon: FaArrowUp },
  { value: "totalAmount,desc", label: "Highest Amount", icon: FaMoneyBillWave },
  { value: "totalAmount,asc", label: "Lowest Amount", icon: FaMoneyBillWave },
  { value: "scheduledAt,asc", label: "Earliest Schedule", icon: FaCalendarDay },
  { value: "scheduledAt,desc", label: "Latest Schedule", icon: FaCalendarDay }
];

// ==========================================================
// 📁 UTILITY FUNCTIONS
// ==========================================================

const formatDate = (dateString) => {
  if (!dateString) return "TBD";
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return "Invalid Date";
    return format(date, "MMM dd, yyyy");
  } catch { return "Invalid Date"; }
};

const formatDateTime = (dateString) => {
  if (!dateString) return "TBD";
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return "Invalid Date";
    return format(date, "MMM dd, yyyy • hh:mm a");
  } catch { return "Invalid Date"; }
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

const getDateGroupLabel = (dateString) => {
  if (!dateString || dateString === "Unscheduled") return "Unscheduled";
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return "Unscheduled";
    if (isToday(date)) return "Today's Agenda";
    if (isTomorrow(date)) return "Tomorrow's Agenda";
    const daysDiff = differenceInDays(date, new Date());
    if (daysDiff < 7 && daysDiff > 0) return format(date, "EEEE, MMM dd");
    if (daysDiff < 0 && daysDiff > -7) return `Last ${format(date, "EEEE, MMM dd")}`;
    return format(date, "MMMM dd, yyyy");
  } catch { return "Unscheduled"; }
};

// ==========================================================
// 📁 COMPONENTS
// ==========================================================

// ==========================================================
// 🎯 StatCard Component
// ==========================================================
const StatCard = ({ title, value, icon: Icon, color = "white", subtitle, trend, trendLabel, onClick }) => {
  const colors = {
    white: "text-white",
    amber: "text-amber-400",
    blue: "text-blue-400",
    orange: "text-orange-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    purple: "text-purple-400",
    cyan: "text-cyan-400",
    pink: "text-pink-400"
  };

  const bgColors = {
    white: "bg-white/5",
    amber: "bg-amber-500/10",
    blue: "bg-blue-500/10",
    orange: "bg-orange-500/10",
    emerald: "bg-emerald-500/10",
    rose: "bg-rose-500/10",
    purple: "bg-purple-500/10",
    cyan: "bg-cyan-500/10",
    pink: "bg-pink-500/10"
  };

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`${bgColors[color] || bgColors.white} border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700 cursor-pointer backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{title}</p>
        {Icon && <Icon className={`${colors[color] || colors.white} opacity-60`} size={18} />}
      </div>
      <p className={`text-2xl font-bold mt-1 ${colors[color] || colors.white}`}>{value}</p>
      {subtitle && <p className="text-[9px] text-slate-500 mt-1">{subtitle}</p>}
      {trend !== undefined && (
        <div className={`text-[9px] font-medium mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel || 'vs last period'}
        </div>
      )}
    </motion.div>
  );
};

// ==========================================================
// 🎯 Status Badge Component
// ==========================================================
const StatusBadge = ({ status, showIcon = true }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.textColor} ${config.borderColor} backdrop-blur-sm`}>
      {showIcon && <Icon size={10} />}
      {config.label}
    </span>
  );
};

// ==========================================================
// 🎯 Filter Bar Component
// ==========================================================
const FilterBar = ({ 
  searchTerm, 
  setSearchTerm, 
  filter, 
  setFilter, 
  sortBy, 
  setSortBy, 
  clearFilters,
  onApplyFilters
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActiveFilters = filter.status || filter.serviceType || filter.date || filter.minAmount || filter.maxAmount;

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            placeholder="Search by ID, customer, provider, service type..."
            className="w-full bg-[#0f172a]/80 border border-slate-800 rounded-xl py-3 pl-11 pr-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm text-white placeholder:text-slate-500 backdrop-blur-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-4 py-3 rounded-xl border transition-all text-sm font-medium flex items-center gap-2 whitespace-nowrap backdrop-blur-sm ${
              isExpanded || hasActiveFilters
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' 
                : 'bg-[#0f172a]/80 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <FaFilterIcon size={14} />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
          </button>

          <button
            onClick={clearFilters}
            className="px-4 py-3 rounded-xl border border-slate-800 bg-[#0f172a]/80 text-slate-400 hover:border-slate-700 transition-all text-sm font-medium whitespace-nowrap backdrop-blur-sm"
          >
            Clear
          </button>

          <button
            onClick={() => onApplyFilters?.()}
            className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white whitespace-nowrap shadow-lg shadow-blue-500/20"
          >
            Apply
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800 overflow-hidden"
          >
            <select
              className="bg-[#0f172a]/80 border border-slate-800 rounded-xl py-3 px-4 focus:border-blue-500 outline-none transition-all text-sm text-white cursor-pointer backdrop-blur-sm"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </select>

            <select
              className="bg-[#0f172a]/80 border border-slate-800 rounded-xl py-3 px-4 focus:border-blue-500 outline-none transition-all text-sm text-white cursor-pointer backdrop-blur-sm"
              value={filter.serviceType}
              onChange={(e) => setFilter({ ...filter, serviceType: e.target.value })}
            >
              {SERVICE_TYPES.map(s => (
                <option key={s} value={s === 'All' ? '' : s}>{s}</option>
              ))}
            </select>

            <input
              type="date"
              className="bg-[#0f172a]/80 border border-slate-800 rounded-xl py-3 px-4 focus:border-blue-500 outline-none transition-all text-sm text-white backdrop-blur-sm"
              value={filter.date}
              onChange={(e) => setFilter({ ...filter, date: e.target.value })}
            />

            <select
              className="bg-[#0f172a]/80 border border-slate-800 rounded-xl py-3 px-4 focus:border-blue-500 outline-none transition-all text-sm text-white cursor-pointer backdrop-blur-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================================
// 🎯 Booking Details Modal
// ==========================================================
const BookingDetailsModal = ({ booking, onClose, onStatusUpdate, onDelete, onEdit }) => {
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(booking?.status || "PENDING");

  if (!booking) return null;

  const handleStatusUpdate = async () => {
    if (selectedStatus === booking.status) {
      toast.error("Please select a different status");
      return;
    }
    setUpdating(true);
    try {
      await onStatusUpdate(booking.bookingId, selectedStatus);
      toast.success(`Booking status updated to ${STATUS_CONFIG[selectedStatus]?.label}`);
      onClose();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
  const progress = config.progress || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#060b18]/90 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-[#0f172a]/95 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl backdrop-blur-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0f172a]/95 border-b border-slate-800 p-6 flex justify-between items-center z-10 backdrop-blur-xl">
          <div>
            <h2 className="text-xl font-black text-white">Booking Details</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 font-mono">#{booking.bookingId?.slice(-8).toUpperCase()}</span>
              <StatusBadge status={booking.status} />
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
            <FaTimes />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : progress >= 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Status Update */}
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">Update Status</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none cursor-pointer"
                disabled={updating}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                ))}
              </select>
              {selectedStatus !== booking.status && (
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all disabled:opacity-50 whitespace-nowrap shadow-lg shadow-blue-500/20"
                >
                  {updating ? <FaSpinner className="animate-spin" /> : "Apply"}
                </button>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Amount</p>
              <p className="text-2xl font-black text-emerald-400">{formatCurrency(booking.totalAmount || booking.amount || 0)}</p>
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <FaTag className="text-slate-500" size={14} />
              <p className="text-[10px] text-slate-500 uppercase font-bold">Service Information</p>
            </div>
            <p className="text-white font-bold mb-1">{booking.serviceType || "N/A"}</p>
            {booking.description && <p className="text-xs text-slate-400 mt-2">{booking.description}</p>}
            <div className="flex flex-wrap gap-4 mt-3">
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <FaCalendarDay size={12} /> {formatDateTime(booking.scheduledAt)}
              </p>
              {booking.area && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <FaMapMarkerAlt size={12} /> {booking.area}
                </p>
              )}
            </div>
            {booking.address && (
              <p className="text-xs text-slate-400 flex items-start gap-2 mt-2">
                <FaMapMarkerAlt size={12} className="mt-0.5" /> {booking.address}
              </p>
            )}
          </div>

          {/* Customer Details */}
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <FaUser className="text-slate-500" size={14} />
              <p className="text-[10px] text-slate-500 uppercase font-bold">Customer Details</p>
            </div>
            <p className="text-white font-medium">{booking.customerName || "N/A"}</p>
            {booking.customerEmail && (
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                <FaEnvelope size={12} /> {booking.customerEmail}
              </p>
            )}
            {booking.customerPhone && (
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <FaPhone size={12} /> {booking.customerPhone}
              </p>
            )}
          </div>

          {/* Provider Details */}
          {booking.providerName && (
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <FaBuilding className="text-slate-500" size={14} />
                <p className="text-[10px] text-slate-500 uppercase font-bold">Provider Details</p>
              </div>
              <p className="text-white font-medium">{booking.providerName}</p>
              {booking.providerPhone && (
                <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                  <FaPhone size={12} /> {booking.providerPhone}
                </p>
              )}
              {booking.providerEmail && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <FaEnvelope size={12} /> {booking.providerEmail}
                </p>
              )}
            </div>
          )}

          {/* Additional Info */}
          {(booking.notes || booking.createdAt) && (
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-3">Additional Information</p>
              {booking.notes && <p className="text-xs text-slate-400 mb-2">{booking.notes}</p>}
              <div className="grid grid-cols-2 gap-2">
                <p className="text-[10px] text-slate-500">Created: {formatDateTime(booking.createdAt)}</p>
                {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
                  <p className="text-[10px] text-slate-500">Updated: {formatDateTime(booking.updatedAt)}</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => onEdit?.(booking)}
              className="flex-1 py-3 rounded-xl border border-blue-500/20 text-blue-500 text-xs font-bold hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <FaEdit size={12} /> Edit
            </button>
            <button
              onClick={() => onDelete(booking.bookingId)}
              className="flex-1 py-3 rounded-xl border border-rose-500/20 text-rose-500 text-xs font-bold hover:bg-rose-500/5 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <FaTrash size={12} /> Delete
            </button>
            <button
              onClick={() => {
                onStatusUpdate(booking.bookingId, "COMPLETED");
                onClose();
              }}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <FaCheckDouble size={12} /> Complete
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==========================================================
// 🎯 Bulk Actions Bar
// ==========================================================
const BulkActionsBar = ({ selectedCount, onClear, onBulkStatusUpdate, onBulkDelete }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedCount === 0) return null;

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1e293b]/95 border border-slate-700 rounded-2xl shadow-2xl p-3 flex items-center gap-3 backdrop-blur-xl"
    >
      <span className="text-sm text-white font-medium">{selectedCount} selected</span>
      
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className="px-4 py-2 bg-blue-600 rounded-xl text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
        >
          Update Status
        </button>
        {showStatusMenu && (
          <div className="absolute bottom-full mb-2 left-0 bg-[#0f172a]/95 border border-slate-700 rounded-xl overflow-hidden shadow-xl min-w-[160px] max-h-60 overflow-y-auto backdrop-blur-xl">
            {STATUS_OPTIONS.map(status => (
              <button
                key={status}
                onClick={() => { onBulkStatusUpdate(status); setShowStatusMenu(false); }}
                className="block w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {STATUS_CONFIG[status]?.label || status}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <button
        onClick={onBulkDelete}
        className="px-4 py-2 bg-rose-600 rounded-xl text-white text-xs font-bold hover:bg-rose-500 transition-colors shadow-lg shadow-rose-500/20"
      >
        Delete Selected
      </button>
      
      <button
        onClick={onClear}
        className="px-4 py-2 bg-slate-700 rounded-xl text-white text-xs font-bold hover:bg-slate-600 transition-colors"
      >
        Clear
      </button>
    </motion.div>
  );
};

// ==========================================================
// 🎯 Booking Table Row
// ==========================================================
const BookingTableRow = ({ 
  booking, 
  isSelected, 
  onSelect, 
  onView, 
  onDelete, 
  onStatusUpdate 
}) => {
  const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ backgroundColor: "rgba(30, 41, 59, 0.3)" }}
      className="group cursor-pointer transition-colors"
      onClick={() => onView(booking)}
    >
      <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(booking.bookingId)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 focus:ring-blue-500 focus:ring-offset-0"
        />
      </td>
      <td className="p-4">
        <span className="text-xs font-mono text-blue-400 bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10">
          #{booking.bookingId?.slice(-8).toUpperCase()}
        </span>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
            <Icon className={`text-sm ${config.textColor}`} />
          </div>
          <div>
            <div className="font-medium text-white text-sm">{booking.serviceType}</div>
            <div className="text-[10px] text-slate-500">{booking.area || "Standard"}</div>
          </div>
        </div>
      </td>
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        <select
          value={booking.status}
          onChange={(e) => onStatusUpdate(booking.bookingId, e.target.value)}
          className={`text-[9px] font-bold px-3 py-1.5 rounded-lg border outline-none transition-all cursor-pointer ${config.bgColor} ${config.textColor} ${config.borderColor} backdrop-blur-sm`}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s} className="bg-[#0f172a] text-white">
              {STATUS_CONFIG[s]?.label || s}
            </option>
          ))}
        </select>
      </td>
      <td className="p-4">
        <div className="text-white text-sm">{booking.customerName || "N/A"}</div>
        <div className="text-[10px] text-slate-500">{booking.customerEmail || ""}</div>
      </td>
      <td className="p-4">
        <div className="text-white text-sm">{booking.providerName || "Unassigned"}</div>
      </td>
      <td className="p-4 text-right">
        <div className="text-sm font-semibold text-emerald-400">{formatCurrency(booking.totalAmount || booking.amount || 0)}</div>
        <div className="text-[9px] text-slate-500">{formatDate(booking.scheduledAt)}</div>
      </td>
      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onView(booking); }}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
            title="View Details"
          >
            <FaEye size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(booking.bookingId); }}
            className="p-1.5 hover:bg-rose-500/20 rounded-lg transition-colors text-rose-400"
            title="Delete"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

// ==========================================================
// 📁 MAIN COMPONENT
// ==========================================================
export default function BookingsPage() {
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // 📊 State Management
  // ==========================================================
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt,desc");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const [filter, setFilter] = useState({
    status: "",
    serviceType: "",
    date: "",
    minAmount: "",
    maxAmount: ""
  });

  const [bookingsPage, setBookingsPage] = useState({
    content: [],
    totalPages: 0,
    totalElements: 0,
    number: 0,
    size: 10
  });

  // ==========================================================
  // 🔌 Hooks & Refs
  // ==========================================================
  const { newBooking } = useDashboardSocket({
    onBookingUpdate: (data) => {
      if (data?.bookingId) {
        setBookingsPage(prev => {
          const exists = prev.content.find(b => b.bookingId === data.bookingId);
          if (exists) {
            return { 
              ...prev, 
              content: prev.content.map(b => 
                b.bookingId === data.bookingId ? { ...b, ...data } : b
              ) 
            };
          }
          return { 
            ...prev, 
            content: [data, ...prev.content], 
            totalElements: prev.totalElements + 1 
          };
        });
        toast.success(`Booking ${data.bookingId?.slice(-8)} updated`);
        addNotification?.({ 
          type: "info", 
          title: "Booking Updated", 
          message: `Booking ${data.bookingId?.slice(-8)} status changed to ${STATUS_CONFIG[data.status]?.label || data.status}`,
          duration: 3000
        });
      }
    }
  });

  const searchTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const mountedRef = useRef(true);

  // ==========================================================
  // 🔄 Lifecycle
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    refreshIntervalRef.current = setInterval(() => {
      if (mountedRef.current && !loading) loadBookings(true);
    }, REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [loading]);

  // ==========================================================
  // 🔍 Debounced Search
  // ==========================================================
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0);
    }, DEBOUNCE_DELAY);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchTerm]);

  // ==========================================================
  // 📥 Load Bookings
  // ==========================================================
  const loadBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('size', size);
      params.append('sort', sortBy);
      if (filter.status) params.append('status', filter.status);
      if (filter.serviceType) params.append('serviceType', filter.serviceType);
      if (filter.date) params.append('date', filter.date);
      if (filter.minAmount) params.append('minAmount', filter.minAmount);
      if (filter.maxAmount) params.append('maxAmount', filter.maxAmount);
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);

      const response = await api.get(`/api/v1/bookings?${params.toString()}`);
      const data = response.data?.data || response.data;
      
      setBookingsPage({
        content: Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []),
        totalPages: data?.totalPages || 0,
        totalElements: data?.totalElements || 0,
        number: data?.number || 0,
        size: data?.size || size
      });
      setLastUpdated(new Date());
      setRetryCount(0);
      
    } catch (error) {
      console.error("Failed to load bookings:", error);
      const errorMsg = error.response?.data?.message || "Failed to load bookings";
      setError(errorMsg);
      
      if (!silent) {
        addNotification?.({ 
          type: "error", 
          title: "Loading Failed", 
          message: errorMsg 
        });
        toast.error(errorMsg);
      }
      
      // Auto retry
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadBookings(silent), 2000 * (retryCount + 1));
      }
      
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, size, filter, debouncedSearchTerm, sortBy, addNotification, retryCount]);

  // ==========================================================
  // 🚀 Initial Load
  // ==========================================================
  useEffect(() => { loadBookings(); }, [loadBookings]);

  // ==========================================================
  // 🔔 New Booking Notification
  // ==========================================================
  useEffect(() => {
    if (newBooking?.bookingId) {
      addNotification?.({ 
        type: "info", 
        title: "New Booking", 
        message: `New ${newBooking.serviceType} booking received`,
        duration: 5000 
      });
      toast.success(`New booking received: ${newBooking.serviceType}`);
      loadBookings(true);
    }
  }, [newBooking, loadBookings, addNotification]);

  // ==========================================================
  // 🛠️ CRUD Operations
  // ==========================================================
  const updateBookingStatus = async (bookingId, status) => {
    try {
      await api.patch(`/api/v1/bookings/${bookingId}/status`, { status });
      addNotification?.({ 
        type: "success", 
        title: "Status Updated", 
        message: `Booking ${bookingId?.slice(-8)} updated to ${STATUS_CONFIG[status]?.label}` 
      });
      toast.success(`Booking status updated to ${STATUS_CONFIG[status]?.label}`);
      loadBookings(true);
      setSelectedBooking(null);
      setSelectedBookings(new Set());
      return true;
    } catch (error) {
      console.error("Status update failed:", error);
      const errorMsg = error.response?.data?.message || "Failed to update booking status";
      addNotification?.({ type: "error", title: "Update Failed", message: errorMsg });
      toast.error(errorMsg);
      return false;
    }
  };

  const deleteBooking = async (bookingId) => {
    if (!window.confirm("Delete this booking? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/v1/bookings/${bookingId}`);
      addNotification?.({ 
        type: "success", 
        title: "Booking Deleted", 
        message: `Booking ${bookingId?.slice(-8)} deleted` 
      });
      toast.success("Booking deleted successfully");
      loadBookings(true);
      setSelectedBooking(null);
      setSelectedBookings(new Set());
    } catch (error) {
      console.error("Delete failed:", error);
      const errorMsg = error.response?.data?.message || "Failed to delete booking";
      addNotification?.({ type: "error", title: "Delete Failed", message: errorMsg });
      toast.error(errorMsg);
    }
  };

  const bulkUpdateStatus = async (status) => {
    const bookingIds = Array.from(selectedBookings);
    if (bookingIds.length === 0) return;
    if (!window.confirm(`Update ${bookingIds.length} booking(s) to ${STATUS_CONFIG[status]?.label}?`)) return;
    
    try {
      await api.patch('/api/v1/bookings/bulk/status', { bookingIds, status });
      toast.success(`${bookingIds.length} booking(s) updated`);
      loadBookings(true);
      setSelectedBookings(new Set());
    } catch (error) {
      console.error("Bulk update failed:", error);
      toast.error("Failed to update bookings");
    }
  };

  const bulkDelete = async () => {
    const bookingIds = Array.from(selectedBookings);
    if (bookingIds.length === 0) return;
    if (!window.confirm(`Delete ${bookingIds.length} booking(s)? This cannot be undone.`)) return;
    
    try {
      await api.delete('/api/v1/bookings/bulk', { data: { bookingIds } });
      toast.success(`${bookingIds.length} booking(s) deleted`);
      loadBookings(true);
      setSelectedBookings(new Set());
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete bookings");
    }
  };

  // ==========================================================
  // 🎯 Selection
  // ==========================================================
  const toggleSelection = (bookingId) => {
    const newSelection = new Set(selectedBookings);
    if (newSelection.has(bookingId)) newSelection.delete(bookingId);
    else newSelection.add(bookingId);
    setSelectedBookings(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedBookings.size === bookingsPage.content.length && bookingsPage.content.length > 0) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(bookingsPage.content.map(b => b.bookingId)));
    }
  };

  // ==========================================================
  // 📤 Export
  // ==========================================================
  const handleExportCSV = async () => {
    const content = bookingsPage?.content || [];
    if (!content.length) { toast.error("No data to export"); return; }

    setExporting(true);
    try {
      const headers = ["Booking ID", "Service", "Customer", "Provider", "Status", "Amount", "Scheduled", "Created"];
      const rows = content.map(b => [
        b.bookingId, 
        b.serviceType || "N/A", 
        b.customerName || "N/A", 
        b.providerName || "Unassigned",
        b.status, 
        b.totalAmount || 0, 
        formatDateTime(b.scheduledAt), 
        formatDateTime(b.createdAt)
      ]);
      const csvContent = [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ).join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Bookings_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${content.length} bookings exported`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export bookings");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => window.print();

  // ==========================================================
  // 🧹 Filters
  // ==========================================================
  const clearFilters = () => {
    setFilter({ status: "", serviceType: "", date: "", minAmount: "", maxAmount: "" });
    setSearchTerm("");
    setPage(0);
    setSortBy("createdAt,desc");
    loadBookings(false);
  };

  // ==========================================================
  // 📊 Derived Data
  // ==========================================================
  const groupedBookings = useMemo(() => {
    const groups = {};
    (bookingsPage?.content || []).forEach(booking => {
      let key = "Unscheduled";
      if (booking.scheduledAt) {
        try {
          const date = parseISO(booking.scheduledAt);
          if (isValid(date)) key = format(date, "yyyy-MM-dd");
        } catch { key = "Unscheduled"; }
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(booking);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === "Unscheduled") return 1;
      if (b[0] === "Unscheduled") return -1;
      return new Date(b[0]) - new Date(a[0]);
    });
  }, [bookingsPage?.content]);

  const stats = useMemo(() => {
    const content = bookingsPage?.content || [];
    const total = content.length;
    const pending = content.filter(b => b.status === "PENDING" || b.status === "REQUESTED" || b.status === "PAYMENT_PENDING").length;
    const inProgress = content.filter(b => b.status === "STARTED" || b.status === "PROVIDER_STARTED" || b.status === "ASSIGNED" || b.status === "ACCEPTED").length;
    const completed = content.filter(b => b.status === "COMPLETED" || b.status === "COMPLETED_BY_PROVIDER").length;
    const cancelled = content.filter(b => b.status === "CANCELLED" || b.status === "REJECTED" || b.status === "EXPIRED").length;
    const totalRevenue = content.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    return { total, pending, inProgress, completed, cancelled, totalRevenue };
  }, [bookingsPage?.content]);

  // ==========================================================
  // 🎨 Render with Electrical Themed Background
  // ==========================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060b18] via-[#0a1628] to-[#0f1f3a] p-4 md:p-8 text-slate-300 font-sans relative overflow-hidden">
      {/* ==========================================================
          🔌 ELECTRICAL THEMED BACKGROUND EFFECTS
          ========================================================== */}
      
      {/* Background Image Overlay - Circuit Board Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Circuit Board Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWUxYjM1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />
        
        {/* Circuit Traces - Horizontal */}
        <div className="absolute top-1/4 left-0 w-1/3 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="absolute top-1/2 right-0 w-1/4 h-px bg-gradient-to-l from-transparent via-cyan-500/30 to-transparent" />
        <div className="absolute bottom-1/3 left-0 w-1/2 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        
        {/* Circuit Traces - Vertical */}
        <div className="absolute top-0 left-1/4 w-px h-1/3 bg-gradient-to-b from-transparent via-blue-500/30 to-transparent" />
        <div className="absolute bottom-0 right-1/3 w-px h-1/2 bg-gradient-to-t from-transparent via-cyan-500/30 to-transparent" />
        <div className="absolute top-1/3 right-1/4 w-px h-1/4 bg-gradient-to-b from-transparent via-purple-500/30 to-transparent" />

        {/* Circuit Nodes */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-blue-500/40 shadow-lg shadow-blue-500/20 animate-pulse" />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-cyan-500/40 shadow-lg shadow-cyan-500/20 animate-pulse delay-500" />
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 rounded-full bg-purple-500/40 shadow-lg shadow-purple-500/20 animate-pulse delay-1000" />
        <div className="absolute top-1/3 right-1/2 w-2 h-2 rounded-full bg-blue-400/40 shadow-lg shadow-blue-400/20 animate-pulse delay-750" />
        <div className="absolute bottom-1/4 left-1/4 w-2 h-2 rounded-full bg-cyan-400/40 shadow-lg shadow-cyan-400/20 animate-pulse delay-1250" />
        
        {/* Animated Electrical Particles */}
        <div className="absolute top-1/3 left-1/4 w-1 h-1 rounded-full bg-blue-400 animate-ping-slow" />
        <div className="absolute top-2/3 right-1/3 w-1 h-1 rounded-full bg-cyan-400 animate-ping-slow delay-700" />
        <div className="absolute bottom-1/4 right-1/4 w-1 h-1 rounded-full bg-purple-400 animate-ping-slow delay-1400" />
        
        {/* Glowing Orbs - Electrical Theme */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl animate-pulse-slow delay-2000" />
        
        {/* Lightning/Energy Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <path d="M 50,0 L 80,120 L 120,60 L 150,180 L 200,130" stroke="#3b82f6" strokeWidth="1.5" fill="none" className="animate-dash" />
          <path d="M 0,50 L 60,80 L 20,120 L 80,200" stroke="#22d3ee" strokeWidth="1.5" fill="none" className="animate-dash delay-500" />
          <path d="M 250,30 L 200,90 L 220,150 L 150,200" stroke="#8b5cf6" strokeWidth="1.5" fill="none" className="animate-dash delay-1000" />
        </svg>
        
        {/* Glowing Lines */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="absolute left-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-purple-500/30 to-transparent" />
        <div className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-blue-500/30 to-transparent" />
      </div>

      {/* ==========================================================
          🎯 MAIN CONTENT
          ========================================================== */}
      
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#0f172a/95',
          color: '#f1f5f9',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          backdropFilter: 'blur(12px)',
        }
      }} />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with Electrical Icon */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-600/30 to-cyan-500/10 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/10 backdrop-blur-sm relative">
              <FaBolt className="text-blue-500 text-2xl animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400 animate-ping-slow" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Power Grid • Bookings
              </h1>
              <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {stats.total} bookings • {formatCurrency(stats.totalRevenue)} revenue
                {lastUpdated && <span className="text-[10px] text-slate-600 ml-2">⚡ Updated {format(lastUpdated, 'hh:mm a')}</span>}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => loadBookings(false)}
              disabled={loading}
              className="p-3 bg-[#0f172a]/80 rounded-xl hover:bg-[#1a2744] transition-all border border-slate-800 disabled:opacity-50 backdrop-blur-sm hover:border-blue-500/30 group relative"
              title="Refresh"
            >
              <FaSync className={`${loading ? "animate-spin" : ""} group-hover:text-blue-400 transition-colors`} />
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-blue-500/50" />
            </button>
            <button
              onClick={handlePrint}
              className="p-3 bg-[#0f172a]/80 rounded-xl hover:bg-[#1a2744] transition-all border border-slate-800 no-print backdrop-blur-sm hover:border-blue-500/30 group"
              title="Print"
            >
              <FaPrint className="group-hover:text-blue-400 transition-colors" />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="bg-[#0f172a]/80 px-6 py-3 rounded-xl text-sm font-bold flex gap-2 items-center hover:bg-[#1a2744] transition-all border border-slate-800 disabled:opacity-50 backdrop-blur-sm hover:border-blue-500/30 group relative"
            >
              <FaFileExport className="text-blue-400 group-hover:text-blue-300 transition-colors" /> 
              {exporting ? "Exporting..." : "Export CSV"}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 backdrop-blur-sm"
          >
            <FaExclamationTriangle className="animate-pulse" />
            <span className="text-sm">{error}</span>
            <button onClick={() => loadBookings(false)} className="ml-auto text-sm font-bold hover:text-rose-300 transition-colors">
              Retry
            </button>
          </motion.div>
        )}

        {/* Stats with Electrical Theme */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard title="Total" value={stats.total} icon={FaBolt} color="white" />
          <StatCard title="Pending" value={stats.pending} icon={FaClock} color="amber" />
          <StatCard title="In Progress" value={stats.inProgress} icon={FaMicrochip} color="cyan" />
          <StatCard title="Completed" value={stats.completed} icon={FaCheckDouble} color="emerald" />
          <StatCard title="Revenue" value={formatCurrency(stats.totalRevenue)} icon={FaWallet} color="emerald" />
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filter={filter}
          setFilter={setFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          clearFilters={clearFilters}
          onApplyFilters={() => loadBookings(false)}
        />

        {/* Bookings Table */}
        <div className="bg-[#0f172a]/80 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl mt-6 backdrop-blur-sm relative">
          {/* Table Glow Effect */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl" />
          
          <div className="overflow-x-auto relative">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-800">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedBookings.size === bookingsPage.content.length && bookingsPage.content.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </th>
                  <th className="p-4 text-left">Booking ID</th>
                  <th className="p-4 text-left">Service</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Customer</th>
                  <th className="p-4 text-left">Provider</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-32 text-center">
                      <div className="relative w-10 h-10 mx-auto">
                        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <div className="absolute inset-2 border-4 border-cyan-500 border-b-transparent rounded-full animate-spin-reverse" />
                      </div>
                      <span className="text-xs text-slate-500 mt-2 block">Loading bookings...</span>
                    </td>
                  </tr>
                ) : groupedBookings.length > 0 ? (
                  groupedBookings.map(([date, list]) => (
                    <React.Fragment key={date}>
                      <tr className="bg-slate-900/80">
                        <td colSpan="8" className="px-4 py-2 text-[10px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
                          <span>📅</span> {getDateGroupLabel(date)}
                          <span className="w-2 h-2 rounded-full bg-blue-400/50 animate-pulse" />
                        </td>
                      </tr>
                      {list.map((booking) => (
                        <BookingTableRow
                          key={booking.bookingId}
                          booking={booking}
                          isSelected={selectedBookings.has(booking.bookingId)}
                          onSelect={toggleSelection}
                          onView={setSelectedBooking}
                          onDelete={deleteBooking}
                          onStatusUpdate={updateBookingStatus}
                        />
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-40 text-center">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <FaBolt className="text-4xl text-slate-800 mx-auto animate-pulse-slow" />
                        <div className="absolute -top-2 -right-2 w-2 h-2 rounded-full bg-blue-500/30 animate-ping" />
                      </div>
                      <p className="text-slate-500 font-medium">No bookings found</p>
                      <button
                        onClick={clearFilters}
                        className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Clear filters to see all bookings
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {bookingsPage.totalPages > 0 && (
          <div className="mt-8">
            <Pagination
              page={bookingsPage.number}
              totalPages={bookingsPage.totalPages}
              totalElements={bookingsPage.totalElements}
              size={size}
              onPageChange={setPage}
              onSizeChange={setSize}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            />
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedBookings.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedBookings.size}
            onClear={() => setSelectedBookings(new Set())}
            onBulkStatusUpdate={bulkUpdateStatus}
            onBulkDelete={bulkDelete}
          />
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onStatusUpdate={updateBookingStatus}
            onDelete={deleteBooking}
            onEdit={(booking) => { 
              console.log("Edit booking:", booking);
              toast.info("Edit functionality coming soon");
            }}
          />
        )}
      </AnimatePresence>

      {/* ==========================================================
          🔌 CUSTOM ANIMATIONS
          ========================================================== */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        
        @keyframes ping-slow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(2); opacity: 0; }
        }
        
        @keyframes spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        
        @keyframes dash {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-ping-slow {
          animation: ping-slow 3s ease-in-out infinite;
        }
        
        .animate-spin-reverse {
          animation: spin-reverse 1.2s linear infinite;
        }
        
        .animate-dash {
          stroke-dasharray: 100;
          animation: dash 3s linear infinite;
        }
        
        .delay-500 { animation-delay: 500ms; }
        .delay-700 { animation-delay: 700ms; }
        .delay-750 { animation-delay: 750ms; }
        .delay-1000 { animation-delay: 1000ms; }
        .delay-1250 { animation-delay: 1250ms; }
        .delay-1400 { animation-delay: 1400ms; }
        .delay-2000 { animation-delay: 2000ms; }

        @media print {
          body { background: white !important; padding: 20px; }
          .no-print { display: none !important; }
          .bg-gradient-to-br, .bg-[#060b18], .bg-[#0f172a] { background: white !important; }
          .text-white, .text-slate-200, .text-slate-300 { color: black !important; }
          button { display: none !important; }
          select { border: 1px solid #ccc !important; background: white !important; color: black !important; }
          .border-slate-800 { border-color: #ccc !important; }
          .absolute, .pointer-events-none { display: none !important; }
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #0f172a;
        }
        ::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}