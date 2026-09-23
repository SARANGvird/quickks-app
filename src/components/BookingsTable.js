// src/components/BookingsTable.jsx
import React, { useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaTools,
  FaMapMarkerAlt,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
  FaEdit,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFilter,
  FaDownload,
  FaPrint
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Enhanced BookingsTable Component
 * 
 * Features:
 * - Handles both array and paged data
 * - Advanced filtering and sorting
 * - Pagination support
 * - Responsive design
 * - Export functionality (CSV/Print)
 * - Status badges with icons
 * - Loading skeletons
 * - Empty states
 * - Accessibility compliant
 * - Performance optimized with memoization
 */

// Status configuration with colors, icons, and actions
const STATUS_CONFIG = {
  PENDING: {
    bg: "#fef3c7",
    color: "#92400e",
    icon: FaClock,
    label: "Pending",
    actions: ["cancel", "reschedule"]
  },
  CONFIRMED: {
    bg: "#d1fae5",
    color: "#064e3b",
    icon: FaCheckCircle,
    label: "Confirmed",
    actions: ["cancel", "reschedule"]
  },
  IN_PROGRESS: {
    bg: "#bfdbfe",
    color: "#1e40af",
    icon: FaTools,
    label: "In Progress",
    actions: ["view"]
  },
  COMPLETED: {
    bg: "#d1fae5",
    color: "#065f46",
    icon: FaCheckCircle,
    label: "Completed",
    actions: ["view", "review"]
  },
  CANCELLED: {
    bg: "#fee2e2",
    color: "#991b1b",
    icon: FaTimesCircle,
    label: "Cancelled",
    actions: ["view", "rebook"]
  },
  REJECTED: {
    bg: "#fee2e2",
    color: "#991b1b",
    icon: FaTimesCircle,
    label: "Rejected",
    actions: ["view", "rebook"]
  },
  DEFAULT: {
    bg: "#f3f4f6",
    color: "#374151",
    icon: FaClock,
    label: "Unknown",
    actions: ["view"]
  }
};

// Sort options
const SORT_OPTIONS = {
  DATE_ASC: "date_asc",
  DATE_DESC: "date_desc",
  STATUS_ASC: "status_asc",
  STATUS_DESC: "status_desc",
  SERVICE_ASC: "service_asc",
  SERVICE_DESC: "service_desc"
};

// Format date and time helper
const formatDateTime = (iso, format = "full") => {
  if (!iso) return { date: "—", time: "—", full: "—" };
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: iso, time: "", full: iso };
    
    const options = {
      date: { year: "numeric", month: "short", day: "numeric" },
      time: { hour: "2-digit", minute: "2-digit" },
      full: { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    };
    
    return {
      date: d.toLocaleDateString("en-IN", options.date),
      time: d.toLocaleTimeString("en-IN", options.time),
      full: d.toLocaleString("en-IN", options.full)
    };
  } catch {
    return { date: iso, time: "", full: iso };
  }
};

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div style={styles.skeletonContainer}>
    {[1, 2, 3].map((i) => (
      <div key={i} style={styles.skeletonRow}>
        <div style={styles.skeletonCell} />
        <div style={styles.skeletonCell} />
        <div style={styles.skeletonCell} />
        <div style={styles.skeletonCell} />
        <div style={styles.skeletonCell} />
        <div style={styles.skeletonCell} />
      </div>
    ))}
  </div>
);

// Empty State Component
const EmptyState = ({ onReset }) => (
  <div style={styles.emptyState}>
    <FaSearch size={48} color="#cbd5e1" />
    <h3 style={styles.emptyStateTitle}>No Bookings Found</h3>
    <p style={styles.emptyStateText}>
      {onReset ? "Try adjusting your filters or create a new booking." : "Create your first booking to get started."}
    </p>
    {onReset && (
      <button onClick={onReset} style={styles.resetButton}>
        Clear Filters
      </button>
    )}
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status?.toUpperCase()] || STATUS_CONFIG.DEFAULT;
  const Icon = config.icon;
  
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "999px",
        background: config.bg,
        color: config.color,
        fontWeight: 600,
        fontSize: "13px",
        whiteSpace: "nowrap"
      }}
      aria-label={`Status: ${config.label}`}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
};

// Action Buttons Component
const ActionButtons = ({ booking, onCancel, onAction, onView, onEdit, onDelete }) => {
  const status = booking.status?.toUpperCase() || "DEFAULT";
  const config = STATUS_CONFIG[status];
  
  const handleAction = useCallback((action) => {
    switch(action) {
      case "cancel":
        onCancel?.(booking.id || booking.bookingId);
        break;
      case "view":
        onView?.(booking);
        break;
      case "edit":
        onEdit?.(booking);
        break;
      case "delete":
        onDelete?.(booking.id || booking.bookingId);
        break;
      default:
        onAction?.(booking.id || booking.bookingId, action);
    }
  }, [booking, onCancel, onAction, onView, onEdit, onDelete]);
  
  return (
    <div style={styles.actionButtons}>
      {config?.actions?.includes("view") && (
        <button
          onClick={() => handleAction("view")}
          style={styles.actionButton}
          aria-label={`View booking ${booking.bookingId}`}
          title="View Details"
        >
          <FaEye size={14} />
        </button>
      )}
      {config?.actions?.includes("cancel") && (
        <button
          onClick={() => handleAction("cancel")}
          style={{ ...styles.actionButton, ...styles.cancelButton }}
          aria-label={`Cancel booking ${booking.bookingId}`}
          title="Cancel Booking"
        >
          <FaTimesCircle size={14} />
        </button>
      )}
      {(status === "PENDING" || status === "CONFIRMED") && (
        <button
          onClick={() => handleAction("edit")}
          style={styles.actionButton}
          aria-label={`Edit booking ${booking.bookingId}`}
          title="Edit Booking"
        >
          <FaEdit size={14} />
        </button>
      )}
      {status === "COMPLETED" && (
        <button
          onClick={() => handleAction("review")}
          style={{ ...styles.actionButton, ...styles.reviewButton }}
          aria-label={`Review booking ${booking.bookingId}`}
          title="Write Review"
        >
          <FaCheckCircle size={14} />
        </button>
      )}
      {(status === "CANCELLED" || status === "REJECTED") && (
        <button
          onClick={() => handleAction("rebook")}
          style={{ ...styles.actionButton, ...styles.rebookButton }}
          aria-label={`Rebook ${booking.bookingId}`}
          title="Book Again"
        >
          <FaTools size={14} />
        </button>
      )}
    </div>
  );
};

// Filter Bar Component
const FilterBar = ({ filters, onFilterChange, onSortChange, currentSort }) => {
  const [showFilters, setShowFilters] = useState(false);
  
  return (
    <div style={styles.filterBar}>
      <div style={styles.filterBarLeft}>
        <div style={styles.searchBox}>
          <FaSearch size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by ID, service, or provider..."
            value={filters.search || ""}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            style={styles.searchInput}
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={styles.filterToggle}
        >
          <FaFilter size={14} />
          Filters
        </button>
      </div>
      
      <div style={styles.filterBarRight}>
        <select
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
          style={styles.sortSelect}
        >
          <option value={SORT_OPTIONS.DATE_DESC}>Latest First</option>
          <option value={SORT_OPTIONS.DATE_ASC}>Oldest First</option>
          <option value={SORT_OPTIONS.STATUS_ASC}>Status A-Z</option>
          <option value={SORT_OPTIONS.STATUS_DESC}>Status Z-A</option>
        </select>
        
        <button
          onClick={() => onFilterChange({})}
          style={styles.clearButton}
        >
          Clear All
        </button>
      </div>
      
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={styles.filterPanel}
          >
            <div style={styles.filterGroup}>
              <label>Status</label>
              <select
                value={filters.status || ""}
                onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
                style={styles.filterSelect}
              >
                <option value="">All Status</option>
                {Object.keys(STATUS_CONFIG).filter(k => k !== "DEFAULT").map(status => (
                  <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
                ))}
              </select>
            </div>
            
            <div style={styles.filterGroup}>
              <label>Date Range</label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                style={styles.filterInput}
              />
              <span>to</span>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                style={styles.filterInput}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Pagination Component
const Pagination = ({ page, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };
  
  if (totalPages <= 1) return null;
  
  return (
    <div style={styles.pagination}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        style={{ ...styles.pageButton, opacity: page === 1 ? 0.5 : 1 }}
      >
        Previous
      </button>
      
      {getPageNumbers().map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          style={{
            ...styles.pageButton,
            ...(p === page ? styles.pageButtonActive : {})
          }}
        >
          {p}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        style={{ ...styles.pageButton, opacity: page === totalPages ? 0.5 : 1 }}
      >
        Next
      </button>
    </div>
  );
};

// Main Component
const BookingsTable = ({
  bookings,
  loading = false,
  onRowClick,
  onCancel,
  onAction,
  onView,
  onEdit,
  onDelete,
  onExport,
  showFilters = true,
  showPagination = true,
  pageSize = 10,
  currentPage = 1,
  totalItems = 0,
  onPageChange,
  className = "",
  style = {}
}) => {
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.DATE_DESC);
  const [localPage, setLocalPage] = useState(1);
  
  // Normalize bookings data
  const { rows, totalPages, total } = useMemo(() => {
    let items = [];
    let totalElements = 0;
    let totalPagesCount = 1;
    
    if (!bookings) {
      return { rows: [], totalPages: 1, total: 0 };
    }
    
    if (Array.isArray(bookings)) {
      items = bookings;
      totalElements = bookings.length;
      totalPagesCount = Math.ceil(bookings.length / pageSize);
    } else if (bookings.items) {
      items = bookings.items;
      totalElements = bookings.totalElements || bookings.items.length;
      totalPagesCount = bookings.totalPages || Math.ceil(totalElements / pageSize);
    } else if (bookings.content) {
      items = bookings.content;
      totalElements = bookings.totalElements || bookings.content.length;
      totalPagesCount = bookings.totalPages || Math.ceil(totalElements / pageSize);
    }
    
    return {
      rows: items,
      totalPages: totalPagesCount,
      total: totalElements
    };
  }, [bookings, pageSize]);
  
  // Apply filters and sorting
  const filteredAndSortedRows = useMemo(() => {
    let filtered = [...rows];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(booking => 
        (booking.id?.toString().toLowerCase().includes(searchLower)) ||
        (booking.bookingId?.toString().toLowerCase().includes(searchLower)) ||
        (booking.serviceType?.toLowerCase().includes(searchLower)) ||
        (booking.providerName?.toLowerCase().includes(searchLower)) ||
        (booking.userName?.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(booking => 
        booking.status?.toUpperCase() === filters.status.toUpperCase()
      );
    }
    
    // Apply date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.scheduledAt || booking.date);
        return bookingDate >= fromDate;
      });
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59);
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.scheduledAt || booking.date);
        return bookingDate <= toDate;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.DATE_ASC:
          return new Date(a.scheduledAt || a.date) - new Date(b.scheduledAt || b.date);
        case SORT_OPTIONS.DATE_DESC:
          return new Date(b.scheduledAt || b.date) - new Date(a.scheduledAt || a.date);
        case SORT_OPTIONS.STATUS_ASC:
          return (a.status || "").localeCompare(b.status || "");
        case SORT_OPTIONS.STATUS_DESC:
          return (b.status || "").localeCompare(a.status || "");
        case SORT_OPTIONS.SERVICE_ASC:
          return (a.serviceType || "").localeCompare(b.serviceType || "");
        case SORT_OPTIONS.SERVICE_DESC:
          return (b.serviceType || "").localeCompare(a.serviceType || "");
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [rows, filters, sortBy]);
  
  // Pagination
  const paginatedRows = useMemo(() => {
    if (!showPagination) return filteredAndSortedRows;
    
    const page = onPageChange ? currentPage : localPage;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredAndSortedRows.slice(start, end);
  }, [filteredAndSortedRows, showPagination, pageSize, currentPage, localPage, onPageChange]);
  
  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setLocalPage(newPage);
    }
  }, [onPageChange]);
  
  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);
  
  // Export to CSV
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(filteredAndSortedRows);
    } else {
      // Default CSV export
      const headers = ["Booking ID", "Service", "Provider", "Date", "Time", "Status", "Amount"];
      const csvData = filteredAndSortedRows.map(booking => [
        booking.bookingId || booking.id,
        booking.serviceType,
        booking.providerName,
        formatDateTime(booking.scheduledAt || booking.date).date,
        formatDateTime(booking.scheduledAt || booking.date).time,
        booking.status,
        `₹${booking.amount || booking.serviceCharge || 0}`
      ]);
      
      const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [filteredAndSortedRows, onExport]);
  
  // Print table
  const handlePrint = useCallback(() => {
    window.print();
  }, []);
  
  if (loading) {
    return <LoadingSkeleton />;
  }
  
  if (filteredAndSortedRows.length === 0) {
    return <EmptyState onReset={filters.search || filters.status ? resetFilters : null} />;
  }
  
  return (
    <div className={`bookings-table-container ${className}`} style={{ ...styles.container, ...style }}>
      {/* Header with Export Options */}
      <div style={styles.tableHeader}>
        <h3 style={styles.tableTitle}>
          Bookings ({filteredAndSortedRows.length})
        </h3>
        <div style={styles.exportButtons}>
          <button onClick={handleExport} style={styles.exportButton} title="Export to CSV">
            <FaDownload size={14} /> Export
          </button>
          <button onClick={handlePrint} style={styles.exportButton} title="Print">
            <FaPrint size={14} /> Print
          </button>
        </div>
      </div>
      
      {/* Filter Bar */}
      {showFilters && (
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          onSortChange={setSortBy}
          currentSort={sortBy}
        />
      )}
      
      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table} role="table" aria-label="Bookings">
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeaderCell}>Booking Details</th>
              <th style={styles.tableHeaderCell}>Service Info</th>
              <th style={styles.tableHeaderCell}>Date & Time</th>
              <th style={styles.tableHeaderCell}>Location</th>
              <th style={styles.tableHeaderCell}>Status</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((booking) => {
              const id = booking.id || booking.bookingId;
              const dateTime = formatDateTime(booking.scheduledAt || booking.date);
              
              return (
                <tr
                  key={id}
                  style={styles.tableRow}
                  onClick={() => onRowClick?.(booking)}
                  className={onRowClick ? "clickable" : ""}
                >
                  <td style={styles.tableCell}>
                    <div style={styles.bookingId}>
                      <strong>#{booking.bookingId || id?.slice(-8)}</strong>
                    </div>
                    <div style={styles.customerName}>
                      <FaUser size={12} /> {booking.userName || "Customer"}
                    </div>
                  </td>
                  
                  <td style={styles.tableCell}>
                    <div style={styles.serviceType}>
                      <FaTools size={12} /> {booking.serviceType || "Service"}
                    </div>
                    <div style={styles.providerName}>
                      Provider: {booking.providerName || "To be assigned"}
                    </div>
                    {booking.amount && (
                      <div style={styles.amount}>₹{booking.amount}</div>
                    )}
                  </td>
                  
                  <td style={styles.tableCell}>
                    <div style={styles.date}>
                      <FaCalendarAlt size={12} /> {dateTime.date}
                    </div>
                    <div style={styles.time}>
                      <FaClock size={12} /> {dateTime.time}
                    </div>
                  </td>
                  
                  <td style={styles.tableCell}>
                    {booking.address && (
                      <div style={styles.address}>
                        <FaMapMarkerAlt size={12} /> {booking.address.length > 50 ? `${booking.address.slice(0, 50)}...` : booking.address}
                      </div>
                    )}
                    {booking.area && <div style={styles.area}>{booking.area}</div>}
                  </td>
                  
                  <td style={styles.tableCell}>
                    <StatusBadge status={booking.status} />
                  </td>
                  
                  <td style={styles.tableCell}>
                    <ActionButtons
                      booking={booking}
                      onCancel={onCancel}
                      onAction={onAction}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <Pagination
          page={onPageChange ? currentPage : localPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

// PropTypes
BookingsTable.propTypes = {
  bookings: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  loading: PropTypes.bool,
  onRowClick: PropTypes.func,
  onCancel: PropTypes.func,
  onAction: PropTypes.func,
  onView: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onExport: PropTypes.func,
  showFilters: PropTypes.bool,
  showPagination: PropTypes.bool,
  pageSize: PropTypes.number,
  currentPage: PropTypes.number,
  totalItems: PropTypes.number,
  onPageChange: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object
};

// Default Props
BookingsTable.defaultProps = {
  loading: false,
  showFilters: true,
  showPagination: true,
  pageSize: 10,
  currentPage: 1,
  totalItems: 0,
  className: "",
  style: {}
};

// Styles
const styles = {
  container: {
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    overflow: "hidden"
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0"
  },
  tableTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0
  },
  exportButtons: {
    display: "flex",
    gap: "8px"
  },
  exportButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    background: "#f3f4f6",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  filterBar: {
    padding: "16px 24px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f9fafb"
  },
  filterBarLeft: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap"
  },
  filterBarRight: {
    display: "flex",
    gap: "12px",
    alignItems: "center"
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "8px 12px",
    minWidth: "250px"
  },
  searchInput: {
    border: "none",
    outline: "none",
    fontSize: "14px",
    width: "100%"
  },
  filterToggle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer"
  },
  sortSelect: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "13px",
    background: "#fff",
    cursor: "pointer"
  },
  clearButton: {
    padding: "8px 12px",
    background: "none",
    border: "none",
    fontSize: "13px",
    color: "#ef4444",
    cursor: "pointer"
  },
  filterPanel: {
    marginTop: "16px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    gap: "24px",
    flexWrap: "wrap"
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap"
  },
  filterSelect: {
    padding: "6px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "13px"
  },
  filterInput: {
    padding: "6px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "13px"
  },
  tableWrapper: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  tableHeaderRow: {
    background: "#f9fafb",
    borderBottom: "1px solid #e2e8f0"
  },
  tableHeaderCell: {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "600",
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  tableRow: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.2s",
    cursor: "pointer"
  },
  tableCell: {
    padding: "16px",
    verticalAlign: "top",
    fontSize: "14px",
    color: "#1f2937"
  },
  bookingId: {
    fontWeight: "600",
    color: "#4f46e5",
    marginBottom: "4px"
  },
  customerName: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#6b7280"
  },
  serviceType: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "500",
    marginBottom: "4px"
  },
  providerName: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "4px"
  },
  amount: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#10b981"
  },
  date: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "4px"
  },
  time: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#6b7280"
  },
  address: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "4px"
  },
  area: {
    fontSize: "12px",
    color: "#94a3b8"
  },
  actionButtons: {
    display: "flex",
    gap: "8px"
  },
  actionButton: {
    padding: "6px",
    background: "none",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#6b7280",
    transition: "all 0.2s"
  },
  cancelButton: {
    color: "#ef4444"
  },
  reviewButton: {
    color: "#10b981"
  },
  rebookButton: {
    color: "#8b5cf6"
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    padding: "20px 24px",
    borderTop: "1px solid #e2e8f0"
  },
  pageButton: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    background: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s"
  },
  pageButtonActive: {
    background: "#4f46e5",
    color: "#fff",
    borderColor: "#4f46e5"
  },
  skeletonContainer: {
    padding: "20px"
  },
  skeletonRow: {
    display: "flex",
    gap: "16px",
    marginBottom: "12px"
  },
  skeletonCell: {
    height: "40px",
    background: "#f1f5f9",
    borderRadius: "8px",
    flex: 1,
    animation: "pulse 1.5s ease-in-out infinite"
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#94a3b8"
  },
  emptyStateTitle: {
    fontSize: "18px",
    fontWeight: "600",
    marginTop: "16px",
    marginBottom: "8px",
    color: "#64748b"
  },
  emptyStateText: {
    fontSize: "14px",
    marginBottom: "20px"
  },
  resetButton: {
    padding: "8px 16px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px"
  }
};

// Add animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @media print {
    .bookings-table-container {
      box-shadow: none;
    }
    .bookings-table-container button {
      display: none;
    }
  }
`;
document.head.appendChild(styleSheet);

export default React.memo(BookingsTable);