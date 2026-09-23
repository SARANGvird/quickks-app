// src/pages/Provider/ProviderMyBookings.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "../../api/api";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Avatar,
  Stack,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  Skeleton  // ✅ Added missing Skeleton import
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayArrowIcon,
  DoneAll as DoneAllIcon,
  Visibility as VisibilityIcon,
  Chat as ChatIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  MoreVert as MoreVertIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon
} from "@mui/icons-material";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from "date-fns";
import { useNavigate } from "react-router-dom";
import ChatDrawer from "../../components/chat/ChatDrawer";

// ==========================================================
// CONSTANTS
// ==========================================================
const BOOKING_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  RESCHEDULED: "RESCHEDULED"
};

const STATUS_CONFIG = {
  [BOOKING_STATUS.PENDING]: { label: "Pending", color: "warning", icon: "⏳" },
  [BOOKING_STATUS.ACCEPTED]: { label: "Accepted", color: "info", icon: "✅" },
  [BOOKING_STATUS.REJECTED]: { label: "Rejected", color: "error", icon: "❌" },
  [BOOKING_STATUS.IN_PROGRESS]: { label: "In Progress", color: "primary", icon: "🔧" },
  [BOOKING_STATUS.COMPLETED]: { label: "Completed", color: "success", icon: "✨" },
  [BOOKING_STATUS.CANCELLED]: { label: "Cancelled", color: "error", icon: "🚫" },
  [BOOKING_STATUS.RESCHEDULED]: { label: "Rescheduled", color: "warning", icon: "📅" }
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const DEBOUNCE_DELAY = 500;

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatDateTime = (dateString) => {
  if (!dateString) return "Not scheduled";
  try {
    const date = new Date(dateString);
    if (isToday(date)) return `Today at ${format(date, "h:mm a")}`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, "h:mm a")}`;
    return format(date, "MMM dd, yyyy • h:mm a");
  } catch {
    return dateString;
  }
};

const getTimeRemaining = (scheduledAt) => {
  if (!scheduledAt) return null;
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  const diffMs = scheduled - now;
  
  if (diffMs < 0) return "Overdue";
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)} minutes`;
  if (diffMs < 86400000) return `${Math.round(diffMs / 3600000)} hours`;
  return `${Math.round(diffMs / 86400000)} days`;
};

// ==========================================================
// LOADING SKELETON
// ==========================================================
const TableSkeleton = () => (
  <Box>
    {[1, 2, 3, 4, 5].map((i) => (
      <Paper key={i} sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Skeleton variant="text" width={200} height={30} />
            <Skeleton variant="text" width={150} height={20} />
          </Box>
          <Skeleton variant="circular" width={40} height={40} />
        </Stack>
      </Paper>
    ))}
  </Box>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const ProviderMyBookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tabValue, setTabValue] = useState(0);
  
  // UI states
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatBooking, setChatBooking] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);
  
  // Refs
  const stompClientRef = useRef(null);
  const mountedRef = useRef(true);
  const audioRef = useRef(null);

  // ==========================================================
  // WEBSOCKET CONNECTION
  // ==========================================================
  const connectWebSocket = useCallback(() => {
    if (stompClientRef.current?.active) return;
    
    const token = localStorage.getItem("token");
    const socketUrl = process.env.REACT_APP_WS_URL || "http://localhost:8081/quickks/ws";
    
    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${token}` },
      
      onConnect: () => {
        console.log("✅ WebSocket Connected for Provider Bookings");
        
        client.subscribe("/topic/provider/updates", (message) => {
          const updatedBooking = JSON.parse(message.body);
          
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed:", e));
          }
          
          setBookings(prev => {
            const exists = prev.find(b => b.id === updatedBooking.id);
            const newBookings = exists
              ? prev.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b)
              : [updatedBooking, ...prev];
            return newBookings;
          });
          
          addNotification({
            type: "info",
            title: "Booking Update",
            message: `Booking #${updatedBooking.id?.slice(-8)} status updated to ${updatedBooking.status}`
          });
        });
      },
      
      onStompError: (frame) => console.error("❌ STOMP Error:", frame)
    });
    
    client.activate();
    stompClientRef.current = client;
  }, [addNotification]);

  // ==========================================================
  // LOAD BOOKINGS
  // ==========================================================
  const loadBookings = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get("/provider/bookings", {
        params: {
          page,
          size: rowsPerPage,
          search: debouncedSearchTerm || undefined,
          status: statusFilter || undefined
        }
      });
      
      const data = response.data?.data || response.data;
      const content = data?.content || data || [];
      const total = data?.totalElements || content.length;
      
      setBookings(content);
      setFilteredBookings(content);
      setTotalElements(total);
      
    } catch (err) {
      console.error("Failed to load bookings:", err);
      const errorMessage = err.response?.data?.message || "Failed to load bookings";
      setError(errorMessage);
      addNotification({
        type: "error",
        title: "Loading Failed",
        message: errorMessage,
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearchTerm, statusFilter, addNotification]);

  // ==========================================================
  // FILTER BOOKINGS BY TAB
  // ==========================================================
  useEffect(() => {
    let filtered = [...bookings];
    
    if (tabValue === 0) {
      filtered = filtered.filter(b => 
        [BOOKING_STATUS.PENDING].includes(b.status?.toUpperCase())
      );
    } else if (tabValue === 1) {
      filtered = filtered.filter(b => 
        [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.IN_PROGRESS].includes(b.status?.toUpperCase())
      );
    } else if (tabValue === 2) {
      filtered = filtered.filter(b => 
        [BOOKING_STATUS.COMPLETED].includes(b.status?.toUpperCase())
      );
    } else if (tabValue === 3) {
      filtered = filtered.filter(b => 
        [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(b.status?.toUpperCase())
      );
    }
    
    setFilteredBookings(filtered);
    setPage(0);
  }, [bookings, tabValue]);

  // ==========================================================
  // DEBOUNCED SEARCH
  // ==========================================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    audioRef.current = new Audio("/notification.mp3");
    loadBookings();
    connectWebSocket();
    
    return () => {
      mountedRef.current = false;
      if (stompClientRef.current) stompClientRef.current.deactivate();
      if (audioRef.current) audioRef.current = null;
    };
  }, [loadBookings, connectWebSocket]);

  // ==========================================================
  // ACTION HANDLERS
  // ==========================================================
  const handleAccept = async (bookingId) => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/accept`);
      addNotification({
        type: "success",
        title: "Booking Accepted",
        message: "Booking accepted successfully",
        duration: 3000
      });
      loadBookings();
    } catch (err) {
      addNotification({
        type: "error",
        title: "Action Failed",
        message: err.response?.data?.message || "Failed to accept booking",
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (bookingId) => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/reject`);
      addNotification({
        type: "info",
        title: "Booking Rejected",
        message: "Booking rejected",
        duration: 3000
      });
      loadBookings();
    } catch (err) {
      addNotification({
        type: "error",
        title: "Action Failed",
        message: err.response?.data?.message || "Failed to reject booking",
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartJob = async (bookingId) => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/start`);
      addNotification({
        type: "success",
        title: "Job Started",
        message: "Job started successfully",
        duration: 3000
      });
      loadBookings();
    } catch (err) {
      addNotification({
        type: "error",
        title: "Action Failed",
        message: err.response?.data?.message || "Failed to start job",
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async (bookingId) => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/complete`);
      addNotification({
        type: "success",
        title: "Job Completed",
        message: "Job completed successfully. Waiting for customer confirmation.",
        duration: 3000
      });
      loadBookings();
    } catch (err) {
      addNotification({
        type: "error",
        title: "Action Failed",
        message: err.response?.data?.message || "Failed to complete job",
        duration: 5000
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setDetailsModalOpen(true);
  };

  const handleOpenChat = (booking) => {
    setChatBooking(booking);
    setChatOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setTabValue(0);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ==========================================================
  // STATISTICS
  // ==========================================================
  const stats = useMemo(() => {
    const pending = bookings.filter(b => b.status === BOOKING_STATUS.PENDING).length;
    const active = bookings.filter(b => 
      [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.IN_PROGRESS].includes(b.status)
    ).length;
    const completed = bookings.filter(b => b.status === BOOKING_STATUS.COMPLETED).length;
    const cancelled = bookings.filter(b => 
      [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(b.status)
    ).length;
    
    return { pending, active, completed, cancelled };
  }, [bookings]);

  // ==========================================================
  // RENDER
  // ==========================================================
  if (loading && bookings.length === 0) return <TableSkeleton />;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        My Bookings
      </Typography>
      
      // ... rest of the component remains the same
    </Box>
  );
};

export default ProviderMyBookings;