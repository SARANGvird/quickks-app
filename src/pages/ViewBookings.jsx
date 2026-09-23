// src/pages/Customer/ViewBookings.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  FaClock,
  FaMapMarkerAlt,
  FaUser,
  FaSpinner,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaTools,
  FaSync,
  FaFilter,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaPhone,
  FaEnvelope,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaCreditCard,
  FaBuilding,
  FaComment,
  FaShare,
  FaPrint,
  FaDownload
} from "react-icons/fa";
import api from "../../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { format, isValid, isPast, isFuture, formatDistanceToNow } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

// ==========================================================
// CONSTANTS
// ==========================================================
const STATUS_CONFIG = {
  REQUESTED: { label: "Requested", color: "#facc15", icon: "⏳", bgColor: "#fef3c7", textColor: "#92400e" },
  PENDING: { label: "Pending", color: "#facc15", icon: "⏳", bgColor: "#fef3c7", textColor: "#92400e" },
  PAYMENT_PENDING: { label: "Payment Pending", color: "#f59e0b", icon: "💰", bgColor: "#fed7aa", textColor: "#9a3412" },
  ASSIGNED: { label: "Assigned", color: "#38bdf8", icon: "👤", bgColor: "#dbeafe", textColor: "#1e40af" },
  ACCEPTED: { label: "Accepted", color: "#6366f1", icon: "✅", bgColor: "#e0e7ff", textColor: "#3730a3" },
  PROVIDER_STARTED: { label: "In Progress", color: "#8b5cf6", icon: "⚙️", bgColor: "#ede9fe", textColor: "#5b21b6" },
  STARTED: { label: "Started", color: "#8b5cf6", icon: "🔧", bgColor: "#ede9fe", textColor: "#5b21b6" },
  COMPLETED_BY_PROVIDER: { label: "Completed", color: "#10b981", icon: "🎉", bgColor: "#d1fae5", textColor: "#065f46" },
  COMPLETED: { label: "Completed", color: "#10b981", icon: "✨", bgColor: "#d1fae5", textColor: "#065f46" },
  CANCELLED: { label: "Cancelled", color: "#ef4444", icon: "❌", bgColor: "#fee2e2", textColor: "#991b1b" },
  REJECTED: { label: "Rejected", color: "#ef4444", icon: "🚫", bgColor: "#fee2e2", textColor: "#991b1b" },
  EXPIRED: { label: "Expired", color: "#6b7280", icon: "⌛", bgColor: "#f3f4f6", textColor: "#374151" }
};

const PAGE_SIZE = 10;
const AUTO_REFRESH_INTERVAL = 30000;

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatDate = (dateString) => {
  if (!dateString) return "Not scheduled";
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return dateString;
    return format(date, "dd MMM yyyy, hh:mm a");
  } catch {
    return dateString;
  }
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return null;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return null;
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

const getStatusConfig = (status) => {
  return STATUS_CONFIG[status] || { label: status || "Unknown", color: "#6b7280", icon: "📋", bgColor: "#f3f4f6", textColor: "#374151" };
};

// ==========================================================
// LOADING SKELETON
// ==========================================================
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-pulse">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between">
          <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="p-4 space-y-3">
          <div className="h-5 w-40 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

// ==========================================================
// STAT CARD COMPONENT
// ==========================================================
const StatCard = ({ icon, value, label, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3">
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  </div>
);

// ==========================================================
// RATING STARS COMPONENT
// ==========================================================
const RatingStars = ({ rating, onRate }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  if (onRate) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => onRate(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            {(hoverRating || rating) >= star ? (
              <FaStar className="text-yellow-400" size={20} />
            ) : (
              <FaRegStar className="text-gray-300" size={20} />
            )}
          </button>
        ))}
      </div>
    );
  }
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>
          {rating >= star ? (
            <FaStar className="text-yellow-400" size={16} />
          ) : rating >= star - 0.5 ? (
            <FaStarHalfAlt className="text-yellow-400" size={16} />
          ) : (
            <FaRegStar className="text-gray-300" size={16} />
          )}
        </span>
      ))}
    </div>
  );
};

// ==========================================================
// BOOKING CARD COMPONENT
// ==========================================================
const BookingCard = ({ booking, onClick }) => {
  const statusConfig = getStatusConfig(booking.status);
  const isOverdue = booking.scheduledAt && isPast(new Date(booking.scheduledAt)) && 
                    !["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"].includes(booking.status);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all"
      onClick={() => onClick(booking)}
    >
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusConfig.icon}</span>
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.textColor }}>
            {statusConfig.label}
          </span>
          {isOverdue && (
            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Overdue</span>
          )}
        </div>
        <span className="text-xs text-gray-500 font-mono">#{booking.bookingId?.slice(-8).toUpperCase()}</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FaTools className="text-gray-400" size={14} />
          <span className="font-semibold text-gray-800">{booking.serviceType || "Service Booking"}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FaCalendarAlt className="text-gray-400" size={12} />
          <span>{formatDate(booking.scheduledAt || booking.createdAt)}</span>
        </div>

        {booking.providerName && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FaUser className="text-gray-400" size={12} />
            <span>Provider: <span className="font-medium text-gray-800">{booking.providerName}</span></span>
          </div>
        )}

        {booking.area && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FaMapMarkerAlt className="text-gray-400" size={12} />
            <span>{booking.area}</span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm text-gray-500">Total Amount</span>
          <span className="text-lg font-bold text-green-600">{formatCurrency(booking.totalAmount || booking.amount || 0)}</span>
        </div>
        
        {booking.rating && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Your Rating</span>
            <RatingStars rating={booking.rating} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ==========================================================
// REVIEW MODAL COMPONENT
// ==========================================================
const ReviewModal = ({ booking, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmitting(true);
    await onSubmit(booking.bookingId || booking.id, rating, comment);
    setSubmitting(false);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <h3 className="text-xl font-bold">Rate Your Experience</h3>
          <p className="text-sm opacity-90 mt-1">{booking.serviceType} with {booking.providerName || "Service Provider"}</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">How was your service?</p>
            <RatingStars rating={rating} onRate={setRating} />
          </div>
          
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            rows={4}
            placeholder="Share your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==========================================================
// BOOKING DETAILS MODAL COMPONENT
// ==========================================================
const BookingDetailsModal = ({ booking, onClose, onCancel, onRate, onRebook, onDownloadInvoice, onContactProvider }) => {
  const [cancelling, setCancelling] = useState(false);
  
  if (!booking) return null;
  
  const statusConfig = getStatusConfig(booking.status);
  const canCancel = ["REQUESTED", "PENDING", "ASSIGNED", "PAYMENT_PENDING"].includes(booking.status);
  const canRate = booking.status === "COMPLETED" && !booking.reviewed;
  const canRebook = ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"].includes(booking.status);
  const canDownloadInvoice = booking.status === "COMPLETED";
  const hasProvider = booking.providerName;
  
  const handleCancel = async () => {
    if (window.confirm("Are you sure you want to cancel this booking? This action may not be reversible.")) {
      setCancelling(true);
      await onCancel(booking.bookingId || booking.id);
      setCancelling(false);
    }
  };
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Booking Invoice - ${booking.bookingId}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px;">
          <h1>Booking Details</h1>
          <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          <p><strong>Service:</strong> ${booking.serviceType}</p>
          <p><strong>Amount:</strong> ${formatCurrency(booking.totalAmount)}</p>
          <p><strong>Status:</strong> ${statusConfig.label}</p>
          <p><strong>Scheduled:</strong> ${formatDate(booking.scheduledAt)}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Booking Details</h3>
            <p className="text-xs text-gray-500 font-mono">#{booking.bookingId?.slice(-8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-2xl">
            ×
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: statusConfig.bgColor }}>
            <span className="text-2xl">{statusConfig.icon}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: statusConfig.textColor }}>{statusConfig.label}</p>
              {booking.scheduledAt && isFuture(new Date(booking.scheduledAt)) && (
                <p className="text-xs" style={{ color: statusConfig.textColor }}>Scheduled for {formatRelativeTime(booking.scheduledAt)}</p>
              )}
            </div>
          </div>
          
          {/* Service Details */}
          <div className="border-b border-gray-100 pb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Service Details</p>
            <p className="font-semibold text-gray-800">{booking.serviceType || "N/A"}</p>
            {booking.description && (
              <p className="text-sm text-gray-600 mt-2">{booking.description}</p>
            )}
          </div>
          
          {/* Schedule */}
          <div className="border-b border-gray-100 pb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Schedule</p>
            <p className="text-gray-700">📅 {formatDate(booking.scheduledAt || booking.createdAt)}</p>
            {booking.scheduledAt && (
              <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(booking.scheduledAt)}</p>
            )}
          </div>
          
          {/* Provider Info */}
          {hasProvider && (
            <div className="border-b border-gray-100 pb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Service Provider</p>
              <p className="text-gray-700">👤 {booking.providerName}</p>
              {booking.providerPhone && <p className="text-sm text-gray-500 mt-1">📞 {booking.providerPhone}</p>}
              {booking.providerEmail && <p className="text-sm text-gray-500">📧 {booking.providerEmail}</p>}
            </div>
          )}
          
          {/* Location */}
          {booking.address && (
            <div className="border-b border-gray-100 pb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Location</p>
              <p className="text-gray-700">📍 {booking.address}</p>
              {booking.area && <p className="text-sm text-gray-500 mt-1">Area: {booking.area}</p>}
            </div>
          )}
          
          {/* Payment Details */}
          <div className="border-b border-gray-100 pb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment</p>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Amount:</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(booking.totalAmount || booking.amount || 0)}</span>
            </div>
            {booking.paymentMethod && <p className="text-sm text-gray-500 mt-2">💳 {booking.paymentMethod}</p>}
            {booking.paymentId && (
              <p className="text-xs text-gray-400 mt-1 font-mono">Transaction ID: {booking.paymentId}</p>
            )}
          </div>
          
          {/* Notes */}
          {booking.notes && (
            <div className="border-b border-gray-100 pb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Additional Notes</p>
              <p className="text-sm text-gray-600">{booking.notes}</p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel Booking"}
              </button>
            )}
            
            {canRate && (
              <button
                onClick={() => onRate(booking)}
                className="w-full py-3 bg-yellow-50 text-yellow-700 rounded-xl font-semibold hover:bg-yellow-100 transition-colors flex items-center justify-center gap-2"
              >
                <FaStar /> Rate This Service
              </button>
            )}
            
            {canRebook && (
              <button
                onClick={() => onRebook(booking)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Book Again
              </button>
            )}
            
            {canDownloadInvoice && (
              <button
                onClick={() => onDownloadInvoice(booking)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <FaDownload /> Download Invoice
              </button>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <FaPrint size={14} /> Print
              </button>
              {hasProvider && (
                <button
                  onClick={() => onContactProvider(booking)}
                  className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <FaComment size={14} /> Message
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==========================================================
// BOOKING SERVICE FUNCTIONS
// ==========================================================
const bookingAPI = {
  getMyBookings: async (page, size) => {
    // ✅ FIXED: Use correct endpoint without /admin prefix
    const response = await api.get(`/bookings/my-bookings?page=${page}&size=${size}`);
    return response.data;
  },
  
  cancelBooking: async (bookingId, reason) => {
    const response = await api.put(`/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },
  
  submitReview: async (bookingId, rating, comment) => {
    const response = await api.post(`/bookings/${bookingId}/review`, { rating, comment });
    return response.data;
  },
  
  downloadInvoice: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}/invoice`, {
      responseType: 'blob'
    });
    return response;
  }
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function ViewBookings() {
  const { user } = useAuth();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const filterRef = useRef(null);
  const autoRefreshRef = useRef(null);

  // Fetch bookings
  const fetchBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setLoading(true);
    setError(null);
    
    try {
      // ✅ FIXED: Use bookingAPI with correct endpoint
      const response = await bookingAPI.getMyBookings(page, PAGE_SIZE);
      const data = response?.data || response;
      const bookingsList = data?.content || data || [];
      const totalPagesCount = data?.totalPages || 0;
      const totalElementsCount = data?.totalElements || bookingsList.length;
      
      setBookings(Array.isArray(bookingsList) ? bookingsList : []);
      setTotalPages(totalPagesCount);
      setTotalElements(totalElementsCount);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      const errorMessage = err.response?.data?.message || "Failed to load your bookings. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchBookings(true);
      }, AUTO_REFRESH_INTERVAL);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, fetchBookings]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    if (!filterStatus) return bookings;
    return bookings.filter(booking => booking.status === filterStatus);
  }, [bookings, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter(b => b.status === "COMPLETED" || b.status === "COMPLETED_BY_PROVIDER").length;
    const cancelled = bookings.filter(b => b.status === "CANCELLED" || b.status === "REJECTED").length;
    const pending = bookings.filter(b => ["REQUESTED", "PENDING", "ASSIGNED", "PAYMENT_PENDING", "ACCEPTED"].includes(b.status)).length;
    const inProgress = bookings.filter(b => ["PROVIDER_STARTED", "STARTED"].includes(b.status)).length;
    const totalAmount = bookings.reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0);
    
    return { total, completed, cancelled, pending, inProgress, totalAmount };
  }, [bookings]);

  const handleRetry = () => fetchBookings();
  const handleRefresh = () => fetchBookings(true);
  const handlePrevPage = () => setPage(p => Math.max(0, p - 1));
  const handleNextPage = () => setPage(p => Math.min(totalPages - 1, p + 1));
  const clearFilters = () => setFilterStatus("");

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await bookingAPI.cancelBooking(bookingId, "Cancelled by customer");
      toast.success("Booking cancelled successfully");
      fetchBookings();
      setSelectedBooking(null);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to cancel booking";
      toast.error(errorMsg);
    }
  };

  const handleSubmitReview = async (bookingId, rating, comment) => {
    try {
      await bookingAPI.submitReview(bookingId, rating, comment);
      toast.success("Thank you for your review!");
      fetchBookings();
      setReviewBooking(null);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to submit review";
      toast.error(errorMsg);
    }
  };

  const handleRebook = (booking) => {
    window.location.href = `/services?rebook=${booking.serviceType}&provider=${booking.providerId}`;
  };

  const handleDownloadInvoice = async (booking) => {
    try {
      const response = await bookingAPI.downloadInvoice(booking.bookingId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${booking.bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully");
    } catch (err) {
      toast.error("Failed to download invoice");
    }
  };

  const handleContactProvider = (booking) => {
    window.location.href = `/chat?providerId=${booking.providerId}&bookingId=${booking.bookingId}`;
  };

  // Loading state
  if (loading && !refreshing && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin mx-auto text-indigo-600 text-4xl" />
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <FaExclamationTriangle className="text-red-500 text-5xl mb-4" />
        <p className="text-gray-700 text-center max-w-md mb-4">{error}</p>
        <button onClick={handleRetry} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Toaster position="bottom-right" />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              My Bookings
            </h1>
            <p className="text-gray-500 mt-1">Track and manage all your service bookings</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FaSync className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard icon="📊" value={stats.total} label="Total Bookings" color="#6366f1" />
          <StatCard icon="✅" value={stats.completed} label="Completed" color="#10b981" />
          <StatCard icon="⏳" value={stats.pending} label="Pending" color="#f59e0b" />
          <StatCard icon="⚙️" value={stats.inProgress} label="In Progress" color="#8b5cf6" />
          <StatCard icon="💰" value={formatCurrency(stats.totalAmount)} label="Total Spent" color="#10b981" />
        </div>

        {/* Filter Bar */}
        <div className="relative mb-6" ref={filterRef}>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                showFilters ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaFilter /> Filters
              {filterStatus && <span className="ml-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">1</span>}
            </button>
            
            {filterStatus && (
              <button onClick={clearFilters} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-colors">
                <FaTimes /> Clear Filter
              </button>
            )}
          </div>
          
          {showFilters && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-[240px] z-10">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Filter by Status</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setFilterStatus(filterStatus === key ? "" : key);
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                      filterStatus === key ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-sm">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Info */}
        {filteredBookings.length > 0 && (
          <p className="text-sm text-gray-500 mb-4">Showing {filteredBookings.length} of {stats.total} bookings</p>
        )}

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 mb-4">
              {filterStatus ? `No ${STATUS_CONFIG[filterStatus]?.label?.toLowerCase() || filterStatus} bookings found` : "You don't have any bookings yet"}
            </p>
            {!filterStatus && (
              <button
                onClick={() => window.location.href = "/services"}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Book a Service
              </button>
            )}
            {filterStatus && (
              <button onClick={clearFilters} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {refreshing ? (
              <LoadingSkeleton />
            ) : (
              filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.bookingId || booking.id}
                  booking={booking}
                  onClick={handleBookingClick}
                />
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={handlePrevPage}
              disabled={page === 0}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <FaChevronLeft /> Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              Next <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onCancel={handleCancelBooking}
            onRate={() => {
              setSelectedBooking(null);
              setReviewBooking(selectedBooking);
            }}
            onRebook={handleRebook}
            onDownloadInvoice={handleDownloadInvoice}
            onContactProvider={handleContactProvider}
          />
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewBooking && (
          <ReviewModal
            booking={reviewBooking}
            onClose={() => setReviewBooking(null)}
            onSubmit={handleSubmitReview}
          />
        )}
      </AnimatePresence>
    </div>
  );
}