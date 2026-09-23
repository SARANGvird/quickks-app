// src/pages/Provider/ProviderDashboard.jsx
// COMPLETE PRODUCTION-READY - ALL IMPORTS FIXED

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api/api";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

import {
  Box,
  Typography,
  Paper,
  Grid, // ✅ Use Grid (not Grid2) - it's exported as Grid
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  Snackbar,
  Stack,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  Button,
  Avatar,
  Divider,
  Tooltip,
  Badge,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme as useMuiTheme,
  Container,
  TablePagination,
  Fade,
  Grow,
} from "@mui/material";

import {
  FaMapMarkerAlt,
  FaUser,
  FaCheckCircle,
  FaStar,
  FaPlay,
  FaComments,
  FaExternalLinkAlt,
  FaCalendarDay,
  FaSignOutAlt,
  FaHistory,
  FaClock,
  FaPhone,
  FaEnvelope,
  FaTools,
  FaRupeeSign,
  FaInfoCircle,
  FaBell,
  FaFilter,
  FaSort,
  FaEllipsisV,
  FaEye,
  FaExclamationTriangle,
  FaPlusCircle,
  FaSync,
} from "react-icons/fa";

import ChatDrawer from "../../components/chat/ChatDrawer";
import SLATimer from "../../components/common/SLATimer";

/* ================= THEME ================= */
const themeColors = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  dark: "#1e293b",
  bg: "#f8fafc",
  lightGray: "#e2e8f0",
};

/* ================= CARD STYLE ================= */
const cardStyle = (statusColor) => ({
  p: 0,
  mb: 3,
  borderRadius: "20px",
  overflow: "hidden",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 15px 30px rgba(0,0,0,0.08)",
  },
  border: "1px solid #e2e8f0",
  borderLeft: `10px solid ${statusColor}`,
  position: "relative",
});

/* ================= MAIN COMPONENT ================= */
const ProviderDashboard = () => {
  const { user, isAuthenticated, logout, token, refreshToken } = useAuth();
  const navigate = useNavigate();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  
  const stompClient = useRef(null);
  const audioRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const initialLoadDone = useRef(false);
  const refreshInProgress = useRef(false);

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [sortBy, setSortBy] = useState("scheduledAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedBookingForChat, setSelectedBookingForChat] = useState(null);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [completionData, setCompletionData] = useState({
    notes: "",
    finalAmount: 0,
    bookingId: null,
  });
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingBookingId, setRejectingBookingId] = useState(null);
  const [roleCheckDone, setRoleCheckDone] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ==========================================================
  // ✅ ROLE VALIDATION
  // ==========================================================
  useEffect(() => {
    console.log("🔐 Dashboard - Checking authentication and role...");
    console.log("👤 User:", user);
    console.log("🎭 User Role:", user?.role);
    console.log("🔑 Token present:", !!token);

    if (!isAuthenticated || !token) {
      console.log("❌ Not authenticated or missing token, redirecting to login...");
      navigate('/login', { 
        state: { from: '/dashboard/provider', role: 'provider' } 
      });
      return;
    }

    const userRole = user?.role?.toUpperCase() || '';
    const allowedRoles = ['PROVIDER', 'SERVICE_PROVIDER', 'ROLE_PROVIDER', 'ROLE_SERVICE_PROVIDER'];
    const hasValidRole = allowedRoles.some(role => userRole.includes(role) || userRole === role);

    console.log("🔍 Role Check:", { userRole, allowedRoles, hasValidRole });

    if (!hasValidRole) {
      console.log("❌ Invalid role for provider dashboard:", userRole);
      setIsAuthorized(false);
      setSnackbar({
        open: true,
        message: `Access Denied: You are logged in as ${user?.role || 'Unknown'}. Provider access required.`,
        severity: "error",
      });
      setTimeout(() => {
        navigate('/', { 
          state: { 
            error: `Access Denied: You are logged in as ${user?.role || 'Unknown'}. Provider access required.` 
          } 
        });
      }, 3000);
      return;
    }

    setIsAuthorized(true);
    setRoleCheckDone(true);
  }, [isAuthenticated, user, navigate, token]);

  // ==========================================================
  // ✅ AUDIO - Fixed media playback error
  // ==========================================================
  useEffect(() => {
    const audio = new Audio();
    audio.src = '/notification.mp3';
    audio.preload = 'auto';
    audioRef.current = audio;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
    } catch (error) {
      // Silently fail - user might not have interacted with page yet
      console.debug('Notification sound play failed:', error.message);
    }
  }, []);

  // ==========================================================
  // STATS
  // ==========================================================
  const stats = useMemo(() => {
    const completed = bookings.filter((b) =>
      ["COMPLETED", "COMPLETED_BY_PROVIDER"].includes(b.status?.toUpperCase())
    );

    const today = new Date().toDateString();
    const todayEarnings = completed
      .filter(b => new Date(b.completedAt || b.updatedAt || b.createdAt).toDateString() === today)
      .reduce((acc, b) => acc + (b.totalAmount || 0), 0);

    const pendingAmount = bookings
      .filter(b => b.status?.toUpperCase() === "COMPLETED_BY_PROVIDER")
      .reduce((acc, b) => acc + (b.totalAmount || 0), 0);

    const averageRating = completed.length > 0
      ? completed.reduce((acc, b) => acc + (b.customerRating || 0), 0) / completed.length
      : profile?.rating || 0;

    return {
      totalEarnings: completed.reduce((acc, b) => acc + (b.totalAmount || 0), 0),
      todayEarnings,
      pendingAmount,
      jobsFinished: completed.length,
      activeJobs: bookings.filter(
        (b) => ["ACCEPTED", "PROVIDER_STARTED", "STARTED"].includes(b.status?.toUpperCase())
      ).length,
      rating: profile?.rating || averageRating.toFixed(1) || "5.0",
      completionRate: bookings.length ? 
        ((completed.length / bookings.length) * 100).toFixed(1) : 0,
      totalBookings: bookings.length,
    };
  }, [bookings, profile]);

  // ==========================================================
  // STATUS META
  // ==========================================================
  const getStatusMeta = (status) => {
    const s = status?.toUpperCase();

    const meta = {
      REQUESTED: { 
        color: themeColors.warning, 
        label: "New Request",
        icon: "🆕",
        action: "Accept/Reject",
        progress: 10
      },
      PENDING: { 
        color: themeColors.warning, 
        label: "Pending",
        icon: "⏳",
        action: "Accept/Reject",
        progress: 10
      },
      ASSIGNED: {
        color: themeColors.primary,
        label: "Assigned",
        icon: "📋",
        action: "Accept/Reject",
        progress: 20
      },
      ACCEPTED: { 
        color: themeColors.primary, 
        label: "Accepted",
        icon: "✅",
        action: "Start Job",
        progress: 30
      },
      PROVIDER_STARTED: {
        color: "#8b5cf6",
        label: "Traveling",
        icon: "🚗",
        action: "On the way",
        progress: 40
      },
      STARTED: { 
        color: "#8b5cf6", 
        label: "In Progress",
        icon: "🔧",
        action: "Complete Job",
        progress: 60
      },
      COMPLETED_BY_PROVIDER: {
        color: themeColors.success,
        label: "Completed (Waiting)",
        icon: "⏰",
        action: "Awaiting Confirmation",
        progress: 90
      },
      COMPLETED: { 
        color: themeColors.success, 
        label: "Verified",
        icon: "✨",
        action: "Done",
        progress: 100
      },
      CANCELLED: { 
        color: themeColors.danger, 
        label: "Cancelled",
        icon: "❌",
        action: "Cancelled",
        progress: 0
      },
      REJECTED: { 
        color: themeColors.danger, 
        label: "Rejected",
        icon: "🚫",
        action: "Rejected",
        progress: 0
      },
    };

    return meta[s] || { color: "#64748b", label: s || "Unknown", icon: "📌", action: "", progress: 0 };
  };

  // ==========================================================
  // FILTER AND SORT BOOKINGS
  // ==========================================================
  useEffect(() => {
    if (!bookings.length) {
      setFilteredBookings([]);
      return;
    }
    
    let filtered = [...bookings];

    filtered = filtered.filter((b) => {
      const s = b.status?.toUpperCase();

      if (tabValue === 0) return ["REQUESTED", "PENDING", "ASSIGNED"].includes(s);
      if (tabValue === 1)
        return ["ACCEPTED", "PROVIDER_STARTED", "STARTED", "COMPLETED_BY_PROVIDER"].includes(s);
      return ["COMPLETED", "CANCELLED", "REJECTED"].includes(s);
    });

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.customerName?.toLowerCase().includes(query) ||
        b.address?.toLowerCase().includes(query) ||
        b.serviceType?.toLowerCase().includes(query) ||
        b.bookingId?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch(sortBy) {
        case "scheduledAt":
          aVal = new Date(a.scheduledAt || a.createdAt).getTime();
          bVal = new Date(b.scheduledAt || b.createdAt).getTime();
          break;
        case "customerName":
          aVal = a.customerName || "";
          bVal = b.customerName || "";
          break;
        case "totalAmount":
          aVal = a.totalAmount || 0;
          bVal = b.totalAmount || 0;
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        default:
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredBookings(filtered);
  }, [bookings, tabValue, searchQuery, sortBy, sortDirection]);

  // ==========================================================
  // WEBSOCKET
  // ==========================================================
  const connectWebSocket = useCallback((providerId) => {
    if (stompClient.current?.active) {
      console.log("WebSocket already connected");
      return;
    }

    reconnectAttempts.current = 0;

    const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:8081";
    const socketUrl = `${baseUrl}/quickks/ws`;

    const authToken = token;

    stompClient.current = new Client({
      webSocketFactory: () => {
        const sock = new SockJS(`${socketUrl}?token=${authToken || ''}`);
        return sock;
      },
      connectHeaders: authToken ? {
        Authorization: `Bearer ${authToken}`
      } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log("✅ WebSocket Connected:", providerId);
        reconnectAttempts.current = 0;

        stompClient.current.subscribe(
          `/topic/provider/${providerId}/updates`,
          (message) => {
            try {
              const updatedBooking = JSON.parse(message.body);
              playNotificationSound();

              setBookings((prev) => {
                const exists = prev.find(
                  (b) => b.bookingId === updatedBooking.bookingId || b.id === updatedBooking.id
                );

                const newBookings = exists
                  ? prev.map((b) =>
                      (b.bookingId === updatedBooking.bookingId || b.id === updatedBooking.id)
                        ? { ...b, ...updatedBooking }
                        : b
                    )
                  : [updatedBooking, ...prev];

                return newBookings;
              });

              setSnackbar({
                open: true,
                message: `🔔 Live Update: Booking ${updatedBooking.bookingId || updatedBooking.id}`,
                severity: "info",
              });
            } catch (e) {
              console.error("Error processing WebSocket message:", e);
            }
          }
        );
      },

      onStompError: (frame) => {
        console.error("❌ WebSocket STOMP Error:", frame);
        handleReconnect(providerId);
      },

      onWebSocketClose: () => {
        console.warn("⚠️ WebSocket closed");
        handleReconnect(providerId);
      },

      onWebSocketError: (error) => {
        console.error("❌ WebSocket Error:", error);
        handleReconnect(providerId);
      },
    });

    stompClient.current.activate();
  }, [token, playNotificationSound]);

  const handleReconnect = useCallback((providerId) => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current += 1;
      console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
      setTimeout(() => {
        connectWebSocket(providerId);
      }, 5000 * reconnectAttempts.current);
    } else {
      console.error("❌ Max reconnect attempts reached");
      setSnackbar({
        open: true,
        message: "Unable to connect to real-time updates. Please refresh the page.",
        severity: "warning",
      });
    }
  }, [connectWebSocket]);

  // ==========================================================
  // ✅ LOAD DASHBOARD
  // ==========================================================
  const loadDashboard = useCallback(async (showRefreshIndicator = false) => {
    if (refreshInProgress.current) {
      console.log('Refresh already in progress, skipping...');
      return;
    }

    try {
      refreshInProgress.current = true;
      
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!token) {
        console.error("❌ No token available");
        setSnackbar({
          open: true,
          message: "Session expired. Please login again.",
          severity: "error",
        });
        setTimeout(() => {
          logout();
          navigate("/login");
        }, 2000);
        return;
      }

      console.log("📥 Fetching provider profile...");
      
      try {
        const profileRes = await api.get("/api/v1/providers/me");
        const profileData = profileRes.data?.data || profileRes.data || profileRes;
        
        if (profileData) {
          console.log("✅ Profile found:", profileData);
          setProfile(profileData);
        }
      } catch (profileErr) {
        if (profileErr.response?.status === 404) {
          console.log("ℹ️ No provider profile found. Redirecting to create profile...");
          setSnackbar({
            open: true,
            message: "You haven't created a provider profile yet. Please complete your profile.",
            severity: "warning",
          });
          setTimeout(() => navigate('/provider/create-profile'), 2000);
          setLoading(false);
          return;
        }
        if (profileErr.response?.status === 401) {
          console.log("🔄 Token expired, attempting refresh...");
          const refreshResult = await refreshToken();
          if (refreshResult?.success) {
            return loadDashboard(showRefreshIndicator);
          } else {
            console.error("❌ Refresh failed, redirecting to login...");
            setSnackbar({
              open: true,
              message: "Session expired. Please login again.",
              severity: "error",
            });
            setTimeout(() => {
              logout();
              navigate("/login");
            }, 2000);
            setLoading(false);
            return;
          }
        }
        throw profileErr;
      }

      if (profile) {
        try {
          console.log("📥 Fetching bookings...");
          const bookingRes = await api.get("/api/v1/bookings/provider/bookings");
          const bookingData = bookingRes.data?.data || bookingRes.data || bookingRes;
          const list = Array.isArray(bookingData)
            ? bookingData
            : bookingData?.content || [];
          setBookings(list);
          console.log("✅ Bookings loaded:", list.length);
        } catch (bookingErr) {
          console.warn("Could not load bookings:", bookingErr);
          setBookings([]);
          if (bookingErr.response?.status !== 404) {
            setSnackbar({
              open: true,
              message: "Could not load bookings. Please refresh.",
              severity: "warning",
            });
          }
        }

        const providerId = profile?.id || profile?.providerId || profile?.userId;
        if (providerId) {
          connectWebSocket(providerId);
        }
      }

    } catch (err) {
      console.error("❌ Dashboard Load Error:", err);
      console.error("❌ Response status:", err.response?.status);
      console.error("❌ Response data:", err.response?.data);

      if (err.response?.status === 401) {
        setSnackbar({
          open: true,
          message: "Session expired. Please login again.",
          severity: "error",
        });
        setTimeout(() => {
          logout();
          navigate("/login");
        }, 2000);
      } else if (err.response?.status === 500) {
        setSnackbar({
          open: true,
          message: "Server error. Please try again later.",
          severity: "error",
        });
      } else {
        setSnackbar({
          open: true,
          message: err.response?.data?.message || err.response?.data?.error || "Dashboard load failed",
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      refreshInProgress.current = false;
    }
  }, [profile, connectWebSocket, navigate, logout, token, refreshToken]);

  useEffect(() => {
    if (isAuthorized && roleCheckDone && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadDashboard();
    }

    return () => {
      if (stompClient.current) {
        stompClient.current.deactivate();
      }
    };
  }, [loadDashboard, isAuthorized, roleCheckDone]);

  // ==========================================================
  // ACTION HANDLERS
  // ==========================================================
  const handleAccept = async (bookingId) => {
    try {
      await api.patch(`/api/v1/bookings/provider/${bookingId}/accept`);
      setSnackbar({
        open: true,
        message: "✅ Booking Accepted Successfully",
        severity: "success",
      });
      await loadDashboard(true);
    } catch (err) {
      console.error("❌ Accept Error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to accept booking",
        severity: "error",
      });
    }
  };

  const handleReject = async () => {
    if (!rejectingBookingId || !rejectionReason.trim()) {
      setSnackbar({
        open: true,
        message: "Please provide a reason for rejection",
        severity: "warning",
      });
      return;
    }

    try {
      await api.patch(`/api/v1/bookings/provider/${rejectingBookingId}/reject`, {
        reason: rejectionReason
      });
      setSnackbar({
        open: true,
        message: "✅ Booking Rejected",
        severity: "success",
      });
      setRejectionDialogOpen(false);
      setRejectionReason("");
      setRejectingBookingId(null);
      await loadDashboard(true);
    } catch (err) {
      console.error("❌ Reject Error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to reject booking",
        severity: "error",
      });
    }
  };

  const handleStart = async (bookingId) => {
    try {
      await api.patch(`/api/v1/bookings/provider/${bookingId}/start-service`);
      setSnackbar({
        open: true,
        message: "✅ Job Started Successfully",
        severity: "success",
      });
      await loadDashboard(true);
    } catch (err) {
      console.error("❌ Start Error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to start job",
        severity: "error",
      });
    }
  };

  const handleStartTravel = async (bookingId) => {
    try {
      await api.patch(`/api/v1/bookings/provider/${bookingId}/start-travel`);
      setSnackbar({
        open: true,
        message: "🚗 On the way to location",
        severity: "info",
      });
      await loadDashboard(true);
    } catch (err) {
      console.error("❌ Travel Start Error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to update travel status",
        severity: "error",
      });
    }
  };

  const openCompletionDialog = (bookingId, estimatedAmount) => {
    setCompletionData({
      notes: "",
      finalAmount: estimatedAmount || 0,
      bookingId,
    });
    setCompletionDialogOpen(true);
  };

  const handleComplete = async () => {
    if (!completionData.bookingId) {
      setSnackbar({
        open: true,
        message: "No booking selected",
        severity: "error",
      });
      return;
    }
    
    if (completionData.finalAmount <= 0) {
      setSnackbar({
        open: true,
        message: "Please enter a valid final amount greater than 0",
        severity: "warning",
      });
      return;
    }

    try {
      await api.patch(`/api/v1/bookings/provider/${completionData.bookingId}/complete`, {
        notes: completionData.notes,
        finalAmount: completionData.finalAmount
      });
      setSnackbar({
        open: true,
        message: "✅ Job Completed! Waiting for customer confirmation",
        severity: "success",
      });
      setCompletionDialogOpen(false);
      setCompletionData({ notes: "", finalAmount: 0, bookingId: null });
      await loadDashboard(true);
    } catch (err) {
      console.error("❌ Complete Error:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to complete job",
        severity: "error",
      });
    }
  };

  const handleOpenChat = (booking) => {
    setSelectedBookingForChat(booking);
    setIsChatOpen(true);
  };

  const handleViewDetails = (booking) => {
    setSelectedBookingForDetails(booking);
    setDetailsModalOpen(true);
  };

  const handleLogout = useCallback(() => {
    localStorage.clear();
    if (stompClient.current) {
      stompClient.current.deactivate();
    }
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleGetDirections = (address) => {
    if (!address) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      "_blank"
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Not scheduled";
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getTimeRemaining = (scheduledAt) => {
    if (!scheduledAt) return "";
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffMs = scheduled - now;
    
    if (diffMs < 0) return "Overdue";
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 24) {
      const days = Math.floor(diffHrs / 24);
      return `${days} day${days > 1 ? 's' : ''} left`;
    } else if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins}m left`;
    } else {
      return `${diffMins}m left`;
    }
  };

  // ==========================================================
  // ACCESS DENIED RENDER
  // ==========================================================
  if (!isAuthorized && roleCheckDone) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", p: 3 }}>
        <Paper sx={{ maxWidth: 500, width: "100%", p: 4, borderRadius: 4, textAlign: "center" }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: "#fee2e2", mx: "auto", mb: 2 }}>
            <FaExclamationTriangle size={40} color="#dc2626" />
          </Avatar>
          <Typography variant="h5" fontWeight={700} color="#1e293b" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You don't have permission to access this page.
          </Typography>
          <Alert severity="error" sx={{ mb: 3, textAlign: "left", borderRadius: 2 }}>
            <AlertTitle component="div">Role Mismatch</AlertTitle>
            <Typography variant="body2" component="div">
              <strong>Your Role:</strong> {user?.role || 'Unknown'}
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Required Role:</strong> Service Provider
            </Typography>
          </Alert>
          <Stack spacing={2}>
            <Button fullWidth variant="contained" onClick={() => navigate('/')} sx={{ bgcolor: "#6366f1" }}>
              Go to Home
            </Button>
            <Button fullWidth variant="outlined" onClick={handleLogout}>
              Logout & Switch Account
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // ==========================================================
  // LOADING STATE
  // ==========================================================
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: themeColors.bg,
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: themeColors.primary, size: 60 }} />
        <Typography color="text.secondary">Loading your dashboard...</Typography>
        <LinearProgress sx={{ width: 200, height: 6, borderRadius: 3 }} />
      </Box>
    );
  }

  // ==========================================================
  // NO PROFILE STATE
  // ==========================================================
  if (!profile && !loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", p: 3 }}>
        <Container maxWidth="md">
          <Paper sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: "#6366f1", mx: "auto", mb: 2 }}>
              <FaTools size={40} color="white" />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 2 }}>
              No Provider Profile Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You haven't created your provider profile yet. Complete your profile to start accepting jobs.
            </Typography>
            <Alert severity="info" sx={{ mb: 3, textAlign: "left", borderRadius: 2 }}>
              <AlertTitle component="div">What's Next?</AlertTitle>
              <Typography variant="body2" component="div">
                Create your provider profile with:
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>Your professional information</li>
                  <li>Service offerings and pricing</li>
                  <li>Location and service area</li>
                </ul>
              </Typography>
            </Alert>
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                onClick={() => navigate('/provider/create-profile')}
                startIcon={<FaPlusCircle />}
                sx={{
                  bgcolor: "#6366f1",
                  "&:hover": { bgcolor: "#4f46e5" },
                  textTransform: "none",
                  borderRadius: 2,
                  py: 1.5,
                  px: 4,
                }}
              >
                Create Provider Profile
              </Button>
              <Button
                variant="outlined"
                onClick={handleLogout}
                startIcon={<FaSignOutAlt />}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  py: 1.5,
                  px: 4,
                }}
              >
                Logout
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ==========================================================
  // MAIN UI - Using standard Grid (not Grid2)
  // ==========================================================
  return (
    <Box p={{ xs: 2, md: 4 }} bgcolor={themeColors.bg} minHeight="100vh">
      {/* HEADER */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          borderRadius: "20px",
          background: `linear-gradient(135deg, ${themeColors.dark} 0%, ${themeColors.primary} 100%)`,
          color: "white",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar 
              sx={{ 
                width: 60, 
                height: 60, 
                bgcolor: "rgba(255,255,255,0.2)", 
                border: "2px solid white",
                fontSize: 24,
              }}
            >
              {profile?.fullName?.charAt(0) || <FaUser />}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="900">
                Welcome, {profile?.fullName || "Provider"}!
              </Typography>
              <Typography sx={{ opacity: 0.9 }}>
                {profile?.serviceType || profile?.specialization || "Service Provider"} • ⭐ {stats.rating} Rating • {stats.totalBookings} Bookings
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              sx={{ bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
              startIcon={refreshing ? <CircularProgress size={20} color="inherit" /> : <FaSync />}
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>

            <Button
              variant="contained"
              sx={{ bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
              startIcon={<FaUser />}
              onClick={() => navigate("/provider/profile")}
            >
              Profile
            </Button>

            <IconButton
              sx={{ color: "white", bgcolor: "rgba(255,255,255,0.2)" }}
              onClick={handleLogout}
            >
              <FaSignOutAlt />
            </IconButton>
          </Stack>
        </Box>

        {/* ✅ Quick Stats Row - Using standard Grid with xs prop */}
        <Grid container spacing={3} mt={2}>
          <Grid item xs={6} md={3}>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Today's Earnings</Typography>
              <Typography variant="h6" fontWeight="800">₹{stats.todayEarnings.toFixed(2)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Active Jobs</Typography>
              <Typography variant="h6" fontWeight="800">{stats.activeJobs}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Completion Rate</Typography>
              <Typography variant="h6" fontWeight="800">{stats.completionRate}%</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Pending Amount</Typography>
              <Typography variant="h6" fontWeight="800">₹{stats.pendingAmount.toFixed(2)}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* FILTERS AND TABS */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: "16px" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab 
              label={
                <Badge 
                  badgeContent={bookings.filter(b => 
                    ["REQUESTED", "PENDING", "ASSIGNED"].includes(b.status?.toUpperCase())
                  ).length} 
                  color="warning"
                >
                  New Requests
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge 
                  badgeContent={bookings.filter(b => 
                    ["ACCEPTED", "PROVIDER_STARTED", "STARTED", "COMPLETED_BY_PROVIDER"].includes(b.status?.toUpperCase())
                  ).length} 
                  color="primary"
                >
                  Active Jobs
                </Badge>
              } 
            />
            <Tab label="History" />
          </Tabs>

          <Box display="flex" gap={1}>
            <TextField
              size="small"
              placeholder="Search customer, address, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <FaFilter />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* FILTER MENU */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem disabled><ListItemIcon><FaSort /></ListItemIcon><ListItemText primary="Sort By" /></MenuItem>
        <MenuItem onClick={() => { setSortBy("scheduledAt"); setAnchorEl(null); }}>
          <ListItemIcon><FaCalendarDay /></ListItemIcon><ListItemText primary="Date & Time" />
        </MenuItem>
        <MenuItem onClick={() => { setSortBy("customerName"); setAnchorEl(null); }}>
          <ListItemIcon><FaUser /></ListItemIcon><ListItemText primary="Customer Name" />
        </MenuItem>
        <MenuItem onClick={() => { setSortBy("totalAmount"); setAnchorEl(null); }}>
          <ListItemIcon><FaRupeeSign /></ListItemIcon><ListItemText primary="Amount" />
        </MenuItem>
        <MenuItem onClick={() => { setSortBy("status"); setAnchorEl(null); }}>
          <ListItemIcon><FaInfoCircle /></ListItemIcon><ListItemText primary="Status" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setSortDirection(sortDirection === "asc" ? "desc" : "asc"); setAnchorEl(null); }}>
          <ListItemIcon>{sortDirection === "asc" ? "↑" : "↓"}</ListItemIcon>
          <ListItemText primary={sortDirection === "asc" ? "Ascending" : "Descending"} />
        </MenuItem>
      </Menu>

      {/* BOOKINGS LIST */}
      {filteredBookings.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: "20px" }}>
          <Box fontSize={48} mb={2}>📭</Box>
          <Typography variant="h6" mt={2} color="text.secondary">No bookings found</Typography>
          <Typography color="text.secondary">
            {tabValue === 0 ? "No new booking requests" : tabValue === 1 ? "No active jobs" : "No booking history"}
          </Typography>
        </Paper>
      ) : (
        <Fade in>
          <Box>
            {filteredBookings
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((booking) => {
                const meta = getStatusMeta(booking.status);
                const status = booking.status?.toUpperCase();
                const timeRemaining = getTimeRemaining(booking.scheduledAt);
                const bookingId = booking.bookingId || booking.id;

                return (
                  <Grow in key={bookingId}>
                    <Card sx={cardStyle(meta.color)}>
                      <LinearProgress
                        variant="determinate"
                        value={meta.progress}
                        sx={{ height: 4, bgcolor: themeColors.lightGray, "& .MuiLinearProgress-bar": { bgcolor: meta.color } }}
                      />

                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: meta.color, color: "white" }}>{meta.icon}</Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight="900">{booking.customerName || "Customer"}</Typography>
                              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                <Chip size="small" label={meta.label} sx={{ bgcolor: meta.color, color: "white", fontWeight: 600 }} />
                                <Typography variant="caption" color="text.secondary">ID: {bookingId?.substring(0, 8)}...</Typography>
                              </Box>
                            </Box>
                          </Box>
                          <IconButton onClick={() => handleViewDetails(booking)}><FaEllipsisV /></IconButton>
                        </Box>

                        <Grid container spacing={2} mb={2}>
                          <Grid item xs={12} sm={6}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <FaTools color={themeColors.primary} />
                              <Typography variant="body2">
                                <strong>Service:</strong> {booking.serviceType || "Not specified"}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <FaClock color={themeColors.warning} />
                              <Typography variant="body2">
                                <strong>Scheduled:</strong> {formatDateTime(booking.scheduledAt || booking.createdAt)}
                              </Typography>
                              {timeRemaining && status !== "COMPLETED" && status !== "CANCELLED" && (
                                <Chip size="small" label={timeRemaining} color={timeRemaining === "Overdue" ? "error" : "default"} variant="outlined" />
                              )}
                            </Box>
                          </Grid>
                        </Grid>

                        {booking.scheduledAt && status !== "COMPLETED" && status !== "CANCELLED" && (
                          <Box mb={2}><SLATimer scheduledAt={booking.scheduledAt} /></Box>
                        )}

                        {booking.address && (
                          <Box display="flex" alignItems="center" gap={1} mb={2} p={1.5} bgcolor={themeColors.lightGray} borderRadius="12px">
                            <FaMapMarkerAlt color={themeColors.danger} />
                            <Typography variant="body2" flex={1}>{booking.address}</Typography>
                            <Tooltip title="Get Directions">
                              <IconButton size="small" onClick={() => handleGetDirections(booking.address)}>
                                <FaExternalLinkAlt size={12} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}

                        {(booking.customerPhone || booking.customerEmail) && (
                          <Box display="flex" gap={2} mb={2} flexWrap="wrap">
                            {booking.customerPhone && (
                              <Chip 
                                icon={<FaPhone />} 
                                label={booking.customerPhone} 
                                variant="outlined" 
                                size="small"
                                onClick={() => window.open(`tel:${booking.customerPhone}`)} 
                                clickable 
                              />
                            )}
                            {booking.customerEmail && (
                              <Chip 
                                icon={<FaEnvelope />} 
                                label={booking.customerEmail} 
                                variant="outlined" 
                                size="small"
                                onClick={() => window.open(`mailto:${booking.customerEmail}`)} 
                                clickable 
                              />
                            )}
                          </Box>
                        )}

                        {booking.totalAmount > 0 && (
                          <Box display="flex" justifyContent="flex-end" mb={1}>
                            <Chip 
                              icon={<FaRupeeSign />} 
                              label={`₹${booking.totalAmount}`} 
                              color="success" 
                              variant="filled" 
                            />
                          </Box>
                        )}

                        <Box display="flex" gap={2} flexWrap="wrap" mt={2}>
                          {["REQUESTED", "PENDING", "ASSIGNED"].includes(status) && (
                            <>
                              <Button 
                                variant="contained" 
                                color="success" 
                                onClick={() => handleAccept(bookingId)} 
                                startIcon={<FaCheckCircle />}
                              >
                                Accept
                              </Button>
                              <Button 
                                variant="outlined" 
                                color="error" 
                                onClick={() => { 
                                  setRejectingBookingId(bookingId); 
                                  setRejectionDialogOpen(true); 
                                }} 
                                startIcon={<FaEye />}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {status === "ACCEPTED" && (
                            <>
                              <Button 
                                variant="contained" 
                                color="primary" 
                                onClick={() => handleStartTravel(bookingId)} 
                                startIcon={<FaMapMarkerAlt />}
                              >
                                Start Travel
                              </Button>
                              <Button 
                                variant="contained" 
                                color="success" 
                                onClick={() => handleStart(bookingId)} 
                                startIcon={<FaPlay />}
                              >
                                Start Job
                              </Button>
                            </>
                          )}

                          {status === "PROVIDER_STARTED" && (
                            <Button 
                              variant="contained" 
                              color="success" 
                              onClick={() => handleStart(bookingId)} 
                              startIcon={<FaPlay />}
                            >
                              Start Job
                            </Button>
                          )}

                          {status === "STARTED" && (
                            <Button 
                              variant="contained" 
                              color="success" 
                              onClick={() => openCompletionDialog(
                                bookingId, 
                                booking.totalAmount || booking.serviceCharge
                              )} 
                              startIcon={<FaCheckCircle />}
                            >
                              Complete Job
                            </Button>
                          )}

                          {status === "COMPLETED_BY_PROVIDER" && (
                            <Chip 
                              icon={<FaClock />} 
                              label="Awaiting Customer Confirmation" 
                              color="warning" 
                              sx={{ height: 36 }} 
                            />
                          )}

                          <Button 
                            variant="outlined" 
                            onClick={() => handleOpenChat(booking)} 
                            startIcon={<FaComments />}
                          >
                            Chat
                          </Button>
                          <Button 
                            variant="outlined" 
                            onClick={() => handleViewDetails(booking)} 
                            startIcon={<FaInfoCircle />}
                          >
                            Details
                          </Button>
                        </Box>

                        {booking.providerNotes && (
                          <Box mt={2} p={1.5} bgcolor={themeColors.lightGray} borderRadius="8px">
                            <Typography variant="caption" color="text.secondary">Your notes:</Typography>
                            <Typography variant="body2">{booking.providerNotes}</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grow>
                );
              })}
          </Box>
        </Fade>
      )}

      {/* Pagination */}
      {filteredBookings.length > rowsPerPage && (
        <TablePagination
          component="div"
          count={filteredBookings.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      )}

      {/* COMPLETION DIALOG */}
      <Dialog open={completionDialogOpen} onClose={() => setCompletionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Job</DialogTitle>
        <DialogContent>
          <Stack spacing={3} mt={2}>
            <TextField
              label="Final Amount (₹)" 
              type="number" 
              fullWidth
              value={completionData.finalAmount}
              onChange={(e) => setCompletionData({ ...completionData, finalAmount: parseFloat(e.target.value) || 0 })}
              InputProps={{ startAdornment: <FaRupeeSign style={{ marginRight: 8, color: themeColors.lightGray }} /> }}
              helperText="Enter the final amount for this job"
            />
            <TextField
              label="Work Notes (Optional)" 
              multiline 
              rows={3} 
              fullWidth
              value={completionData.notes}
              onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
              placeholder="Describe the work done, parts used, etc."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompletionDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleComplete} 
            disabled={completionData.finalAmount <= 0}
          >
            Complete Job
          </Button>
        </DialogActions>
      </Dialog>

      {/* REJECTION DIALOG */}
      <Dialog open={rejectionDialogOpen} onClose={() => setRejectionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Booking</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason for Rejection" 
            multiline 
            rows={3} 
            fullWidth
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason..." 
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleReject} 
            disabled={!rejectionReason.trim()}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* DETAILS MODAL */}
      <Dialog open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent dividers>
          {selectedBookingForDetails && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
                <Typography variant="body1" gutterBottom>{selectedBookingForDetails.customerName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Service</Typography>
                <Typography variant="body1" gutterBottom>{selectedBookingForDetails.serviceType}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Scheduled Time</Typography>
                <Typography variant="body1" gutterBottom>{formatDateTime(selectedBookingForDetails.scheduledAt)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip 
                  size="small" 
                  label={getStatusMeta(selectedBookingForDetails.status).label} 
                  sx={{ bgcolor: getStatusMeta(selectedBookingForDetails.status).color, color: 'white' }} 
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                <Typography variant="body1" gutterBottom>{selectedBookingForDetails.address || "Not specified"}</Typography>
                {selectedBookingForDetails.address && (
                  <Button size="small" startIcon={<FaExternalLinkAlt />} onClick={() => handleGetDirections(selectedBookingForDetails.address)}>
                    Get Directions
                  </Button>
                )}
              </Grid>
              {selectedBookingForDetails.customerPhone && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1" gutterBottom>{selectedBookingForDetails.customerPhone}</Typography>
                </Grid>
              )}
              {selectedBookingForDetails.customerEmail && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography variant="body1" gutterBottom>{selectedBookingForDetails.customerEmail}</Typography>
                </Grid>
              )}
              {selectedBookingForDetails.totalAmount > 0 && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="body1" gutterBottom>₹{selectedBookingForDetails.totalAmount}</Typography>
                </Grid>
              )}
              {selectedBookingForDetails.providerNotes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Your Notes</Typography>
                  <Typography variant="body1" gutterBottom>{selectedBookingForDetails.providerNotes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsModalOpen(false)}>Close</Button>
          {selectedBookingForDetails && (
            <Button onClick={() => handleOpenChat(selectedBookingForDetails)} startIcon={<FaComments />}>
              Chat
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* CHAT DRAWER */}
      {selectedBookingForChat && (
        <ChatDrawer
          open={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          bookingId={selectedBookingForChat.bookingId || selectedBookingForChat.id}
          currentUser={{ id: profile?.id, fullName: profile?.fullName, role: 'provider' }}
          recipientName={selectedBookingForChat.customerName}
        />
      )}

      {/* SNACKBAR */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled" 
          sx={{ width: "100%" }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProviderDashboard;