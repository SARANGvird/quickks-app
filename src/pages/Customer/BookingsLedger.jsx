import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../api/api';

// ==========================================================
// DIRECT COLOR VALUES
// ==========================================================
const COLORS = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  success: '#10b981',
  successLight: '#d1fae5',
  successDark: '#065f46',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  warningDark: '#92400e',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  dangerDark: '#991b1b',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  infoDark: '#1e40af',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  white: '#ffffff',
  black: '#000000',
  border: '#e5e7eb',
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    muted: '#6b7280'
  }
};

// ==========================================================
// SAFE ALPHA FUNCTION
// ==========================================================
const alpha = (color, opacity) => {
  if (!color) {
    console.warn('Alpha function received undefined color, using default');
    return `rgba(0, 0, 0, ${opacity})`;
  }

  if (color.startsWith('rgba')) {
    return color.replace(/rgba\(([^,]+),([^,]+),([^,)]+),[^)]+\)/, `rgba($1,$2,$3,${opacity})`);
  }

  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
  }

  try {
    let hex = color.replace('#', '');
    
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      console.warn('Invalid hex color format:', color);
      return `rgba(0, 0, 0, ${opacity})`;
    }
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } catch (error) {
    console.error('Error parsing color:', color, error);
    return `rgba(0, 0, 0, ${opacity})`;
  }
};

// ==========================================================
// STATUS CHIP COMPONENT
// ==========================================================
const StatusChip = ({ status }) => {
  const getStatusStyle = () => {
    const statusLower = status?.toLowerCase() || '';
    
    if (['completed', 'paid', 'success'].includes(statusLower)) {
      return {
        backgroundColor: COLORS.successLight,
        color: COLORS.successDark,
        border: `1px solid ${COLORS.success}`,
        icon: '✓'
      };
    }
    if (['pending', 'processing'].includes(statusLower)) {
      return {
        backgroundColor: COLORS.warningLight,
        color: COLORS.warningDark,
        border: `1px solid ${COLORS.warning}`,
        icon: '⏳'
      };
    }
    if (['failed', 'cancelled', 'refunded'].includes(statusLower)) {
      return {
        backgroundColor: COLORS.dangerLight,
        color: COLORS.dangerDark,
        border: `1px solid ${COLORS.danger}`,
        icon: '✗'
      };
    }
    return {
      backgroundColor: COLORS.gray100,
      color: COLORS.gray700,
      border: `1px solid ${COLORS.gray400}`,
      icon: '•'
    };
  };

  const style = getStatusStyle();

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '16px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: style.backgroundColor,
      color: style.color,
      border: style.border
    }}>
      <span>{style.icon}</span>
      <span>{status}</span>
    </span>
  );
};

// ==========================================================
// STAT CARD COMPONENT
// ==========================================================
const StatCard = ({ title, value, icon, color }) => {
  const formattedValue = title.toLowerCase().includes('revenue') 
    ? `₹${value.toLocaleString('en-IN')}`
    : value.toLocaleString('en-IN');

  return (
    <div style={{
      backgroundColor: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: COLORS.text.muted, marginBottom: '4px' }}>
            {title}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.text.primary }}>
            {formattedValue}
          </div>
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: alpha(color, 0.1),
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ==========================================================
// FILTER SECTION COMPONENT
// ==========================================================
const FilterSection = ({ 
  searchQuery, 
  onSearchChange,
  statusFilter,
  onStatusChange,
  paymentFilter,
  onPaymentChange,
  dateRange,
  onDateChange 
}) => {
  return (
    <div style={{
      backgroundColor: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <input
          type="text"
          placeholder="Search by ID, customer, service..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            padding: '8px 12px',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          style={{
            padding: '8px 12px',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: COLORS.white,
            outline: 'none'
          }}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => onPaymentChange(e.target.value)}
          style={{
            padding: '8px 12px',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: COLORS.white,
            outline: 'none'
          }}
        >
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        <input
          type="date"
          value={format(dateRange.start, 'yyyy-MM-dd')}
          onChange={(e) => onDateChange('start', new Date(e.target.value))}
          style={{
            padding: '8px 12px',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none'
          }}
        />

        <input
          type="date"
          value={format(dateRange.end, 'yyyy-MM-dd')}
          onChange={(e) => onDateChange('end', new Date(e.target.value))}
          style={{
            padding: '8px 12px',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const BookingsLedger = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date()
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [stats, setStats] = useState({
    totalRevenue: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    averageBookingValue: 0
  });
  const [error, setError] = useState(null);

  // Fetch bookings data
  useEffect(() => {
    fetchBookings();
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
    calculateStats();
  }, [bookings, searchQuery, statusFilter, paymentFilter, dateRange]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to fetch from API
      const response = await api.get('/admin/bookings/recent?limit=100');
      const data = response.data?.data || response.data || [];
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to fetch bookings. Please check your connection.');
      toast.error('Failed to fetch bookings');
      
      // Fallback to mock data if API fails
      const mockBookings = Array.from({ length: 50 }, (_, i) => ({
        id: `BK${String(i + 1).padStart(4, '0')}`,
        customerName: ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Neha Singh', 'Vikram Mehta'][i % 5],
        customerEmail: `customer${i + 1}@example.com`,
        service: ['Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Carpentry'][i % 5],
        providerName: ['Raj Services', 'QuickFix', 'Expert Solutions', 'Pro Services', 'Master Crafts'][i % 5],
        amount: Math.floor(Math.random() * 5000) + 500,
        status: ['completed', 'pending', 'processing', 'cancelled'][i % 4],
        paymentStatus: ['paid', 'pending', 'failed', 'refunded'][i % 4],
        paymentMethod: ['Credit Card', 'UPI', 'Net Banking', 'Cash'][i % 4],
        createdAt: subDays(new Date(), Math.floor(Math.random() * 30)),
        completedAt: i % 3 === 0 ? subDays(new Date(), Math.floor(Math.random() * 15)) : null,
        address: `${Math.floor(Math.random() * 100)} Main Street, City`
      }));
      setBookings(mockBookings);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  const applyFilters = useCallback(() => {
    let filtered = [...bookings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.id?.toLowerCase().includes(query) ||
        booking.customerName?.toLowerCase().includes(query) ||
        booking.service?.toLowerCase().includes(query) ||
        booking.providerName?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(booking => booking.paymentStatus === paymentFilter);
    }

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= dateRange.start && bookingDate <= dateRange.end;
      });
    }

    setFilteredBookings(filtered);
  }, [bookings, searchQuery, statusFilter, paymentFilter, dateRange]);

  const calculateStats = useCallback(() => {
    const total = filteredBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
    const completed = filteredBookings.filter(b => b.paymentStatus === 'paid').length;
    const pending = filteredBookings.filter(b => b.paymentStatus === 'pending').length;
    const failed = filteredBookings.filter(b => ['failed', 'refunded'].includes(b.paymentStatus)).length;
    const avg = filteredBookings.length > 0 ? total / filteredBookings.length : 0;

    setStats({
      totalRevenue: total,
      completedPayments: completed,
      pendingPayments: pending,
      failedPayments: failed,
      averageBookingValue: avg
    });
  }, [filteredBookings]);

  const handleExport = (format) => {
    try {
      const exportData = filteredBookings.map(booking => ({
        'Booking ID': booking.id,
        'Customer': booking.customerName,
        'Service': booking.service,
        'Provider': booking.providerName,
        'Amount': `₹${booking.amount}`,
        'Status': booking.status,
        'Payment': booking.paymentStatus,
        'Date': booking.createdAt ? format(new Date(booking.createdAt), 'dd/MM/yyyy') : 'N/A'
      }));

      if (format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
        XLSX.writeFile(wb, `bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      } else if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
        XLSX.writeFile(wb, `bookings_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      } else if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text('Bookings Ledger Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on ${format(new Date(), 'PPP')}`, 14, 22);

        const tableColumn = Object.keys(exportData[0]);
        const tableRows = exportData.map(item => Object.values(item));

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 30,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [99, 102, 241] }
        });

        doc.save(`bookings_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      }

      setSnackbar({
        open: true,
        message: `Exported successfully as ${format.toUpperCase()}`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Export failed',
        severity: 'error'
      });
    }
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
  };

  const handleMenuOpen = (event, booking) => {
    setAnchorEl(event.currentTarget);
    setSelectedBooking(booking);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePrintReceipt = () => {
    if (!selectedBooking) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Booking Receipt - ${selectedBooking.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .receipt { max-width: 600px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>Booking Receipt</h2>
              <p>${format(new Date(), 'PPP')}</p>
            </div>
            <div class="details">
              <div class="row"><span>Booking ID:</span><span>${selectedBooking.id}</span></div>
              <div class="row"><span>Customer:</span><span>${selectedBooking.customerName}</span></div>
              <div class="row"><span>Service:</span><span>${selectedBooking.service}</span></div>
              <div class="row"><span>Provider:</span><span>${selectedBooking.providerName}</span></div>
              <div class="row"><span>Amount:</span><span>₹${selectedBooking.amount}</span></div>
              <div class="row"><span>Status:</span><span>${selectedBooking.status}</span></div>
              <div class="row"><span>Payment:</span><span>${selectedBooking.paymentStatus}</span></div>
              <div class="row"><span>Date:</span><span>${selectedBooking.createdAt ? format(new Date(selectedBooking.createdAt), 'PPP') : 'N/A'}</span></div>
            </div>
            <div class="total">
              <div class="row"><span>Total Amount:</span><span>₹${selectedBooking.amount}</span></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    handleMenuClose();
  };

  const paginatedBookings = filteredBookings.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ 
          height: '4px', 
          width: '100%', 
          backgroundColor: COLORS.gray200,
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: '30%',
            backgroundColor: COLORS.primary,
            animation: 'loading 1s ease-in-out infinite'
          }} />
        </div>
        <p style={{ marginTop: '16px', color: COLORS.text.muted }}>Loading bookings...</p>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center',
        backgroundColor: COLORS.dangerLight,
        border: `1px solid ${COLORS.danger}`,
        borderRadius: '8px',
        color: COLORS.dangerDark
      }}>
        <p>{error}</p>
        <button 
          onClick={fetchBookings}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: COLORS.danger,
            color: COLORS.white,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          color: COLORS.text.primary,
          margin: 0
        }}>
          Bookings Ledger
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '8px 16px',
              backgroundColor: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              color: COLORS.text.secondary,
              opacity: refreshing ? 0.5 : 1
            }}
          >
            {refreshing ? '⟳ Refreshing...' : '↻ Refresh'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            style={{
              padding: '8px 16px',
              backgroundColor: COLORS.primary,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: COLORS.white
            }}
          >
            📊 Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard title="Total Revenue" value={stats.totalRevenue} icon="₹" color={COLORS.primary} />
        <StatCard title="Completed" value={stats.completedPayments} icon="✓" color={COLORS.success} />
        <StatCard title="Pending" value={stats.pendingPayments} icon="⏳" color={COLORS.warning} />
        <StatCard title="Failed/Refunded" value={stats.failedPayments} icon="⚠" color={COLORS.danger} />
      </div>

      {/* Filters */}
      <FilterSection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        paymentFilter={paymentFilter}
        onPaymentChange={setPaymentFilter}
        dateRange={dateRange}
        onDateChange={(type, value) => 
          setDateRange(prev => ({ ...prev, [type]: value }))
        }
      />

      {/* Bookings Table */}
      <div style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        overflow: 'auto',
        backgroundColor: COLORS.white
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{ backgroundColor: alpha(COLORS.primary, 0.05) }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: COLORS.text.primary }}>Booking ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: COLORS.text.primary }}>Customer</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: COLORS.text.primary }}>Service</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: COLORS.text.primary }}>Provider</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: COLORS.text.primary }}>Amount</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: COLORS.text.primary }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: COLORS.text.primary }}>Payment</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: COLORS.text.primary }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: COLORS.text.primary }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBookings.length > 0 ? (
              paginatedBookings.map((booking) => (
                <tr 
                  key={booking.id}
                  style={{ cursor: 'pointer', borderBottom: `1px solid ${COLORS.border}` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = alpha(COLORS.primary, 0.02);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 16px', color: COLORS.text.primary, fontWeight: 500 }}>
                    {booking.id}
                  </td>
                  <td style={{ padding: '12px 16px', color: COLORS.text.secondary }}>
                    <div>
                      <div style={{ fontWeight: 500, color: COLORS.text.primary }}>
                        {booking.customerName}
                      </div>
                      <div style={{ fontSize: '12px', color: COLORS.text.muted }}>
                        {booking.customerEmail}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: COLORS.text.secondary }}>{booking.service}</td>
                  <td style={{ padding: '12px 16px', color: COLORS.text.secondary }}>{booking.providerName}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: COLORS.primary }}>
                    ₹{booking.amount?.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusChip status={booking.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusChip status={booking.paymentStatus} />
                  </td>
                  <td style={{ padding: '12px 16px', color: COLORS.text.muted }}>
                    {booking.createdAt ? format(new Date(booking.createdAt), 'dd MMM yyyy') : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleViewDetails(booking)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: COLORS.primary,
                        fontSize: '16px',
                        marginRight: '8px'
                      }}
                    >
                      👁️
                    </button>
                    <button
                      onClick={(e) => handleMenuOpen(e, booking)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: COLORS.text.muted,
                        fontSize: '16px'
                      }}
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: COLORS.text.muted }}>
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ color: COLORS.text.muted }}>
            Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredBookings.length)} of {filteredBookings.length} entries
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '6px 12px',
                backgroundColor: COLORS.white,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                opacity: page === 0 ? 0.5 : 1,
                color: COLORS.text.primary
              }}
            >
              Previous
            </button>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
              style={{
                padding: '6px 12px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                backgroundColor: COLORS.white,
                color: COLORS.text.primary,
                outline: 'none'
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * rowsPerPage >= filteredBookings.length}
              style={{
                padding: '6px 12px',
                backgroundColor: COLORS.white,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                cursor: (page + 1) * rowsPerPage >= filteredBookings.length ? 'not-allowed' : 'pointer',
                opacity: (page + 1) * rowsPerPage >= filteredBookings.length ? 0.5 : 1,
                color: COLORS.text.primary
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Action Menu */}
      {anchorEl && (
        <div style={{
          position: 'absolute',
          backgroundColor: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '4px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          <button
            onClick={handlePrintReceipt}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              color: COLORS.text.primary
            }}
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={() => {
              handleExport('pdf');
              handleMenuClose();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              color: COLORS.text.primary
            }}
          >
            📄 Download PDF
          </button>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: COLORS.white,
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              color: COLORS.text.primary,
              borderBottom: `1px solid ${COLORS.border}`,
              paddingBottom: '12px'
            }}>
              Booking Details
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Booking ID</div>
                <div style={{ fontWeight: 600, color: COLORS.text.primary }}>{selectedBooking.id}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Date</div>
                <div style={{ color: COLORS.text.secondary }}>
                  {selectedBooking.createdAt ? format(new Date(selectedBooking.createdAt), 'PPP') : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Customer</div>
                <div style={{ fontWeight: 500, color: COLORS.text.primary }}>{selectedBooking.customerName}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Email</div>
                <div style={{ color: COLORS.text.secondary }}>{selectedBooking.customerEmail}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Service</div>
                <div style={{ color: COLORS.text.secondary }}>{selectedBooking.service}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Provider</div>
                <div style={{ color: COLORS.text.secondary }}>{selectedBooking.providerName}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Amount</div>
                <div style={{ fontWeight: 700, color: COLORS.primary }}>
                  ₹{selectedBooking.amount?.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Payment Method</div>
                <div style={{ color: COLORS.text.secondary }}>{selectedBooking.paymentMethod}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Status</div>
                <div><StatusChip status={selectedBooking.status} /></div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Payment Status</div>
                <div><StatusChip status={selectedBooking.paymentStatus} /></div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: COLORS.text.muted }}>Address</div>
                <div style={{ color: COLORS.text.secondary }}>{selectedBooking.address}</div>
              </div>
            </div>

            <div style={{
              marginTop: '24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: `1px solid ${COLORS.border}`,
              paddingTop: '16px'
            }}>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: COLORS.text.primary
                }}
              >
                Close
              </button>
              <button
                onClick={handlePrintReceipt}
                style={{
                  padding: '8px 16px',
                  backgroundColor: COLORS.primary,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: COLORS.white
                }}
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsLedger;