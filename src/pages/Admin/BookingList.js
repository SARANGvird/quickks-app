// src/pages/BookingList.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  Avatar,
  Rating,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Badge,
  LinearProgress
} from "@mui/material";
import {
  Search,
  FilterList,
  Refresh,
  MoreVert,
  CheckCircle,
  Cancel,
  Pending,
  Visibility,
  Edit,
  Delete,
  Download,
  Print,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Person,
  Business,
  AttachMoney,
  Star,
  Warning,
  Info,
  ArrowUpward,
  ArrowDownward
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import api from "../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const BOOKING_STATUS = {
  PENDING: { label: "Pending", color: "warning", icon: Pending },
  CONFIRMED: { label: "Confirmed", color: "info", icon: Info },
  IN_PROGRESS: { label: "In Progress", color: "primary", icon: Pending },
  COMPLETED: { label: "Completed", color: "success", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "error", icon: Cancel },
  REJECTED: { label: "Rejected", color: "error", icon: Cancel }
};

const STATUS_ACTIONS = {
  ADMIN: ["CONFIRMED", "CANCELLED", "COMPLETED"],
  PROVIDER: ["CONFIRMED", "CANCELLED", "COMPLETED"],
  CUSTOMER: ["CANCELLED"]
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatDate = (date) => {
  if (!date) return "N/A";
  return format(new Date(date), "MMM dd, yyyy 'at' h:mm a");
};

const getStatusChip = (status) => {
  const config = BOOKING_STATUS[status] || BOOKING_STATUS.PENDING;
  const Icon = config.icon;
  return (
    <Chip
      icon={<Icon />}
      label={config.label}
      color={config.color}
      size="small"
      sx={{ fontWeight: 500 }}
    />
  );
};

// ==========================================================
// BOOKING DETAILS MODAL
// ==========================================================
const BookingDetailsModal = ({ open, booking, onClose }) => {
  if (!booking) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Booking Details</Typography>
          <IconButton onClick={onClose}>
            <Cancel />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Booking Information
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Info fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Booking ID:</strong> {booking.bookingId}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Created:</strong> {formatDate(booking.createdAt)}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarToday fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Scheduled:</strong> {formatDate(booking.scheduledAt)}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <AttachMoney fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Amount:</strong> ₹{booking.amount?.toLocaleString() || "N/A"}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Star fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Status:</strong> {getStatusChip(booking.status)}
                </Typography>
              </Box>
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Customer Information
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Person fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Name:</strong> {booking.customerName || "N/A"}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Email fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Email:</strong> {booking.customerEmail || "N/A"}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Phone fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Phone:</strong> {booking.customerPhone || "N/A"}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <LocationOn fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Address:</strong> {booking.address || "N/A"}
                </Typography>
              </Box>
            </Stack>
          </Grid>
          
          {booking.providerName && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Provider Information
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Business fontSize="small" color="action" />
                  <Typography variant="body2">
                    <strong>Provider:</strong> {booking.providerName}
                  </Typography>
                </Box>
                {booking.providerPhone && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Phone fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Contact:</strong> {booking.providerPhone}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          )}
          
          {booking.notes && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Additional Notes
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2">{booking.notes}</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => window.print()}
          startIcon={<Print />}
        >
          Print Details
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const BookingList = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // ==========================================================
  // FETCH BOOKINGS
  // ==========================================================
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    
    try {
      const params = {
        page,
        size: rowsPerPage,
        sortBy: "createdAt",
        direction: "DESC"
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      
      const response = await api.get("/bookings", { params });
      
      // Handle both array and paginated responses
      const data = response.data;
      if (data.content) {
        setBookings(data.content);
        setTotalElements(data.totalElements);
      } else if (Array.isArray(data)) {
        setBookings(data);
        setTotalElements(data.length);
      } else {
        setBookings([]);
        setTotalElements(0);
      }
      
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setError("Failed to load bookings. Please try again.");
      addNotification({
        type: "error",
        title: "Loading Failed",
        message: "Failed to load bookings. Please refresh the page."
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, fetchBookings]);

  // ==========================================================
  // STATUS UPDATE HANDLER
  // ==========================================================
  const handleStatusUpdate = async (bookingId, newStatus) => {
    setUpdating(true);
    try {
      const response = await api.put(`/bookings/${bookingId}/status`, { status: newStatus });
      
      setBookings(prev =>
        prev.map(b => (b.bookingId === bookingId ? response.data : b))
      );
      
      addNotification({
        type: "success",
        title: "Status Updated",
        message: `Booking ${bookingId} has been ${newStatus.toLowerCase()} successfully.`
      });
      
    } catch (err) {
      console.error("Failed to update status:", err);
      addNotification({
        type: "error",
        title: "Update Failed",
        message: err.response?.data?.message || "Failed to update booking status"
      });
    } finally {
      setUpdating(false);
      setActionMenuAnchor(null);
      setConfirmDialogOpen(false);
      setPendingAction(null);
    }
  };

  // ==========================================================
  // DELETE BOOKING
  // ==========================================================
  const handleDeleteBooking = async (bookingId) => {
    setUpdating(true);
    try {
      await api.delete(`/bookings/${bookingId}`);
      
      setBookings(prev => prev.filter(b => b.bookingId !== bookingId));
      setTotalElements(prev => prev - 1);
      
      addNotification({
        type: "success",
        title: "Booking Deleted",
        message: `Booking ${bookingId} has been deleted successfully.`
      });
      
    } catch (err) {
      console.error("Failed to delete booking:", err);
      addNotification({
        type: "error",
        title: "Delete Failed",
        message: err.response?.data?.message || "Failed to delete booking"
      });
    } finally {
      setUpdating(false);
      setActionMenuAnchor(null);
    }
  };

  // ==========================================================
  // EXPORT HANDLERS
  // ==========================================================
  const handleExport = async (format) => {
    try {
      const response = await api.get("/bookings/export", {
        params: { format, status: statusFilter !== "ALL" ? statusFilter : undefined },
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `bookings_${format(new Date(), "yyyy-MM-dd")}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      addNotification({
        type: "success",
        title: "Export Successful",
        message: `Bookings exported as ${format.toUpperCase()}`
      });
      
    } catch (err) {
      console.error("Export failed:", err);
      addNotification({
        type: "error",
        title: "Export Failed",
        message: "Failed to export bookings"
      });
    }
  };

  // ==========================================================
  // STATS CALCULATION
  // ==========================================================
  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === "PENDING").length;
    const confirmed = bookings.filter(b => b.status === "CONFIRMED").length;
    const completed = bookings.filter(b => b.status === "COMPLETED").length;
    const cancelled = bookings.filter(b => b.status === "CANCELLED").length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    
    return { total, pending, confirmed, completed, cancelled, totalRevenue };
  }, [bookings]);

  // ==========================================================
  // RENDER
  // ==========================================================
  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert severity="error" variant="filled">
          Access denied. Please login to continue.
        </Alert>
      </Box>
    );
  }

  const allowedActions = STATUS_ACTIONS[user.role] || [];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Booking Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track all bookings from one place
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchBookings}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport("csv")}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Bookings</Typography>
              <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: `3px solid ${BOOKING_STATUS.PENDING.color}` }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Pending</Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderTop: `3px solid ${BOOKING_STATUS.COMPLETED.color}` }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Completed</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">{stats.completed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Revenue</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                ₹{stats.totalRevenue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <TextField
            placeholder="Search by ID, customer, provider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="ALL">All Status</MenuItem>
              {Object.entries(BOOKING_STATUS).map(([key, config]) => (
                <MenuItem key={key} value={key}>{config.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Bookings Table */}
      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box p={4}>
            <LinearProgress />
            <Typography align="center" sx={{ mt: 2 }}>Loading bookings...</Typography>
          </Box>
        ) : error ? (
          <Box p={4}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : bookings.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No bookings found</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>Booking ID</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bookings.map((booking, index) => (
                    <TableRow key={booking.bookingId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {booking.bookingId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                            {booking.customerName?.charAt(0) || "U"}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{booking.customerName || "N/A"}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {booking.customerEmail || "No email"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{booking.providerName || "N/A"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{booking.serviceType || "N/A"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(booking.scheduledAt || booking.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          ₹{booking.amount?.toLocaleString() || "0"}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(booking.status)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setDetailsModalOpen(true);
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        
                        {allowedActions.length > 0 && (
                          <>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setSelectedBookingId(booking.bookingId);
                                setActionMenuAnchor(e.currentTarget);
                              }}
                            >
                              <MoreVert />
                            </IconButton>
                            <Menu
                              anchorEl={actionMenuAnchor}
                              open={actionMenuAnchor && selectedBookingId === booking.bookingId}
                              onClose={() => setActionMenuAnchor(null)}
                            >
                              {allowedActions.map((action) => (
                                <MenuItem
                                  key={action}
                                  onClick={() => {
                                    setPendingAction(action);
                                    setConfirmDialogOpen(true);
                                  }}
                                >
                                  {action === "CONFIRMED" && <CheckCircle fontSize="small" sx={{ mr: 1 }} />}
                                  {action === "CANCELLED" && <Cancel fontSize="small" sx={{ mr: 1 }} />}
                                  {action === "COMPLETED" && <CheckCircle fontSize="small" sx={{ mr: 1 }} />}
                                  {action} Booking
                                </MenuItem>
                              ))}
                              {user.role === "ADMIN" && (
                                <MenuItem onClick={() => handleDeleteBooking(booking.bookingId)} sx={{ color: "error.main" }}>
                                  <Delete fontSize="small" sx={{ mr: 1 }} />
                                  Delete Booking
                                </MenuItem>
                              )}
                            </Menu>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={totalElements}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            />
          </>
        )}
      </Paper>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        open={detailsModalOpen}
        booking={selectedBooking}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedBooking(null);
        }}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Status Change</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark this booking as {pendingAction?.toLowerCase()}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={pendingAction === "CANCELLED" ? "error" : "primary"}
            onClick={() => handleStatusUpdate(selectedBookingId, pendingAction)}
            disabled={updating}
          >
            {updating ? <CircularProgress size={24} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingList;