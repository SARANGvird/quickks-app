// src/components/Admin/LiveActivityFeed.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  Badge,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  ToggleButton,
  ToggleButtonGroup
} from "@mui/material";
import {
  Refresh,
  FilterList,
  Clear,
  Download,
  Print,
  Visibility,
  VisibilityOff,
  NotificationsActive,
  NotificationsNone,
  DeleteSweep,
  Settings,
  Search,
  EventNote,
  Warning,
  CheckCircle,
  Info,
  Error,
  Person,
  Business,
  Star,
  Comment,
  Report,
  AdminPanelSettings,
  Schedule,
  Close
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";

// ==========================================================
// CONSTANTS
// ==========================================================
const SOCKET_URL = process.env.REACT_APP_WS_URL || "http://localhost:8081/quickks/ws";
const TOPIC = "/topic/admin/live-activity";

const EVENT_TYPES = {
  PROVIDER_SUSPENDED: { label: "Provider Suspended", icon: Warning, color: "error", severity: "high" },
  PROVIDER_ACTIVATED: { label: "Provider Activated", icon: CheckCircle, color: "success", severity: "low" },
  STRIKE_ISSUED: { label: "Strike Issued", icon: Report, color: "warning", severity: "medium" },
  COMPLAINT_RESOLVED: { label: "Complaint Resolved", icon: CheckCircle, color: "info", severity: "low" },
  REVIEW_DELETED: { label: "Review Deleted", icon: Star, color: "secondary", severity: "low" },
  USER_SUSPENDED: { label: "User Suspended", icon: Person, color: "error", severity: "high" },
  USER_ACTIVATED: { label: "User Activated", icon: CheckCircle, color: "success", severity: "low" },
  BOOKING_CANCELLED: { label: "Booking Cancelled", icon: EventNote, color: "warning", severity: "medium" },
  PAYMENT_REFUNDED: { label: "Payment Refunded", icon: Info, color: "info", severity: "medium" },
  ADMIN_LOGIN: { label: "Admin Login", icon: AdminPanelSettings, color: "primary", severity: "low" },
  SYSTEM_ALERT: { label: "System Alert", icon: Warning, color: "error", severity: "high" }
};

const CONNECTION_STATES = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  ERROR: "error"
};

const MAX_EVENTS = 100;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 4000;

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatEventTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);
  
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
  return format(date, "MMM dd, h:mm a");
};

const getEventIcon = (type) => {
  const config = EVENT_TYPES[type] || { icon: Info };
  const Icon = config.icon;
  return <Icon fontSize="small" />;
};

const getEventColor = (type) => {
  return EVENT_TYPES[type]?.color || "default";
};

// ==========================================================
// EVENT ITEM COMPONENT
// ==========================================================
const EventItem = ({ event, index, onMarkRead }) => {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_TYPES[event.type] || { label: event.type, color: "default" };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <ListItem
        divider
        alignItems="flex-start"
        sx={{
          py: 1.5,
          px: 2,
          bgcolor: event.read ? "transparent" : "action.hover",
          transition: "background 0.2s",
          '&:hover': { bgcolor: "action.hover" }
        }}
      >
        <Box sx={{ mr: 1.5, mt: 0.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: `${getEventColor(event.type)}.light` }}>
            {getEventIcon(event.type)}
          </Avatar>
        </Box>
        
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Chip
                size="small"
                label={config.label}
                color={getEventColor(event.type)}
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
              {event.severity === "high" && (
                <Chip size="small" label="High Priority" color="error" size="small" />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                {event.message}
              </Typography>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                  <Schedule fontSize="inherit" />
                  {formatEventTime(event.timestamp)}
                </Typography>
                {event.adminName && (
                  <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                    <AdminPanelSettings fontSize="inherit" />
                    By: {event.adminName}
                  </Typography>
                )}
                {event.details && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setExpanded(!expanded)}
                    sx={{ textTransform: "none", fontSize: "11px" }}
                  >
                    {expanded ? "Show less" : "View details"}
                  </Button>
                )}
              </Box>
              {expanded && event.details && (
                <Box sx={{ mt: 1, p: 1, bgcolor: "grey.100", borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {event.details}
                  </Typography>
                </Box>
              )}
            </Box>
          }
        />
        
        {!event.read && (
          <Tooltip title="Mark as read">
            <IconButton size="small" onClick={() => onMarkRead(event.id)}>
              <VisibilityOff fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </ListItem>
    </motion.div>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const LiveActivityFeed = ({ maxHeight = 500, showFilters = true, enableSound = false }) => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showReadEvents, setShowReadEvents] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Refs
  const stompClientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const eventsEndRef = useRef(null);
  const audioRef = useRef(null);

  // ==========================================================
  // STATISTICS
  // ==========================================================
  const stats = useMemo(() => {
    const total = events.length;
    const unread = events.filter(e => !e.read).length;
    const highPriority = events.filter(e => e.severity === "high").length;
    const byType = events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});
    
    return { total, unread, highPriority, byType };
  }, [events]);

  // ==========================================================
  // FILTER EVENTS
  // ==========================================================
  useEffect(() => {
    let filtered = [...events];
    
    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(e => e.type === filterType);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.message?.toLowerCase().includes(term) ||
        e.adminName?.toLowerCase().includes(term) ||
        e.type?.toLowerCase().includes(term)
      );
    }
    
    // Filter read/unread
    if (!showReadEvents) {
      filtered = filtered.filter(e => !e.read);
    }
    
    setFilteredEvents(filtered);
  }, [events, filterType, searchTerm, showReadEvents]);

  // ==========================================================
  // AUTO-SCROLL TO BOTTOM
  // ==========================================================
  useEffect(() => {
    if (autoScroll && eventsEndRef.current && filteredEvents.length > 0) {
      eventsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredEvents, autoScroll]);

  // ==========================================================
  // PLAY SOUND FOR NEW EVENT
  // ==========================================================
  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio("/notification.mp3");
    }
    audioRef.current.play().catch(e => console.warn("Sound play failed:", e));
  }, [soundEnabled]);

  // ==========================================================
  // HANDLE NEW EVENT
  // ==========================================================
  const handleNewEvent = useCallback((event) => {
    const newEvent = {
      ...event,
      id: event.id || `event_${Date.now()}_${Math.random()}`,
      timestamp: event.timestamp || new Date().toISOString(),
      read: false
    };
    
    setEvents(prev => [newEvent, ...prev].slice(0, MAX_EVENTS));
    
    // Play sound for high priority events
    if (newEvent.severity === "high") {
      playSound();
      
      // Show browser notification
      if (Notification.permission === "granted") {
        new Notification("Quickks Admin Alert", {
          body: newEvent.message,
          icon: "/logo192.png",
          silent: true
        });
      }
    }
    
    // Add toast notification for important events
    if (newEvent.severity === "high" || newEvent.type === "SYSTEM_ALERT") {
      addNotification({
        type: "warning",
        title: EVENT_TYPES[newEvent.type]?.label || "Alert",
        message: newEvent.message,
        duration: 8000
      });
    }
  }, [playSound, addNotification]);

  // ==========================================================
  // MARK EVENT AS READ
  // ==========================================================
  const markAsRead = useCallback((eventId) => {
    setEvents(prev => prev.map(e => 
      e.id === eventId ? { ...e, read: true } : e
    ));
  }, []);

  const markAllAsRead = useCallback(() => {
    setEvents(prev => prev.map(e => ({ ...e, read: true })));
    addNotification({
      type: "success",
      title: "Marked as Read",
      message: "All events marked as read"
    });
  }, [addNotification]);

  const clearAllEvents = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all events?")) {
      setEvents([]);
      addNotification({
        type: "info",
        title: "Events Cleared",
        message: "All events have been cleared"
      });
    }
  }, [addNotification]);

  // ==========================================================
  // EXPORT EVENTS
  // ==========================================================
  const handleExport = useCallback(() => {
    const exportData = filteredEvents.map(e => ({
      type: e.type,
      message: e.message,
      adminName: e.adminName,
      timestamp: e.timestamp,
      severity: e.severity,
      details: e.details
    }));
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileName = `activity_events_${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
    
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", exportFileName);
    link.click();
    
    addNotification({
      type: "success",
      title: "Export Successful",
      message: `${filteredEvents.length} events exported`
    });
  }, [filteredEvents, addNotification]);

  // ==========================================================
  // WEBSOCKET CONNECTION
  // ==========================================================
  const connectWebSocket = useCallback(() => {
    if (!mountedRef.current) return;
    
    setConnectionState(CONNECTION_STATES.CONNECTING);
    
    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        userId: user?.id || ""
      },
      reconnectDelay: RECONNECT_DELAY,
      heartbeatIncoming: HEARTBEAT_INTERVAL,
      heartbeatOutgoing: HEARTBEAT_INTERVAL,
      debug: (msg) => {
        if (process.env.NODE_ENV === "development") {
          if (!msg.includes("PING") && !msg.includes("PONG")) {
            console.debug("STOMP:", msg);
          }
        }
      }
    });
    
    client.onConnect = () => {
      if (!mountedRef.current) {
        client.deactivate();
        return;
      }
      
      setConnectionState(CONNECTION_STATES.CONNECTED);
      setReconnectAttempts(0);
      setError(null);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      console.log("✅ Live Activity Feed connected");
      
      subscriptionRef.current = client.subscribe(TOPIC, (message) => {
        try {
          const event = JSON.parse(message.body);
          handleNewEvent(event);
        } catch (err) {
          console.error("Failed to parse event:", err);
        }
      });
    };
    
    client.onStompError = (frame) => {
      console.error("STOMP Error:", frame.headers?.message);
      setConnectionState(CONNECTION_STATES.ERROR);
      setError(frame.headers?.message || "STOMP protocol error");
    };
    
    client.onWebSocketError = (event) => {
      console.error("WebSocket Error:", event);
      setConnectionState(CONNECTION_STATES.ERROR);
      setError("WebSocket connection error");
    };
    
    client.onWebSocketClose = (event) => {
      console.log(`WebSocket Closed - Code: ${event.code}`);
      setConnectionState(CONNECTION_STATES.DISCONNECTED);
      
      if (event.code !== 1000 && mountedRef.current) {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts), 30000);
          setConnectionState(CONNECTION_STATES.RECONNECTING);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        } else {
          setError("Max reconnection attempts reached. Please refresh the page.");
        }
      }
    };
    
    client.activate();
    stompClientRef.current = client;
  }, [user?.id, reconnectAttempts, handleNewEvent]);

  // ==========================================================
  // INITIAL CONNECTION
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    connectWebSocket();
    
    // Request notification permission
    if (Notification && Notification.permission === "default") {
      Notification.requestPermission();
    }
    
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [connectWebSocket]);

  // ==========================================================
  // RENDER
  // ==========================================================
  const isConnected = connectionState === CONNECTION_STATES.CONNECTED;
  const isConnecting = connectionState === CONNECTION_STATES.CONNECTING || 
                       connectionState === CONNECTION_STATES.RECONNECTING;

  return (
    <Paper elevation={3} sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight="bold">
            Live Activity Feed
          </Typography>
          <Chip
            size="small"
            label={isConnected ? "LIVE" : isConnecting ? "Connecting..." : "Offline"}
            color={isConnected ? "success" : isConnecting ? "warning" : "error"}
            sx={{ fontWeight: 600 }}
          />
          {stats.unread > 0 && (
            <Badge badgeContent={stats.unread} color="error" sx={{ ml: 1 }} />
          )}
        </Box>
        
        <Box display="flex" gap={0.5}>
          <Tooltip title="Export Events">
            <IconButton size="small" onClick={handleExport}>
              <Download fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={soundEnabled ? "Disable Sound" : "Enable Sound"}>
            <IconButton size="small" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <NotificationsActive fontSize="small" /> : <NotificationsNone fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={autoScroll ? "Disable Auto-scroll" : "Enable Auto-scroll"}>
            <IconButton size="small" onClick={() => setAutoScroll(!autoScroll)}>
              {autoScroll ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear All">
            <IconButton size="small" onClick={clearAllEvents}>
              <DeleteSweep fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Settings fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      {showFilters && (
        <Box sx={{ mb: 2 }}>
          <Box display="flex" gap={1} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm("")}>
                      <Close fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Event Type"
              >
                <MenuItem value="all">All Events</MenuItem>
                {Object.entries(EVENT_TYPES).map(([key, config]) => (
                  <MenuItem key={key} value={key}>{config.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <ToggleButtonGroup
              size="small"
              value={showReadEvents ? "show" : "hide"}
              exclusive
              onChange={(e, value) => setShowReadEvents(value === "show")}
            >
              <ToggleButton value="show">Show Read</ToggleButton>
              <ToggleButton value="hide">Hide Read</ToggleButton>
            </ToggleButtonGroup>
            
            <Button
              size="small"
              onClick={markAllAsRead}
              disabled={stats.unread === 0}
            >
              Mark All Read
            </Button>
          </Box>
        </Box>
      )}

      {/* Events List */}
      <Box sx={{ flex: 1, overflowY: "auto", maxHeight }}>
        {isConnecting && events.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={8}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Connecting to activity feed...
            </Typography>
          </Box>
        ) : filteredEvents.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={8}>
            <EventNote sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No activity events
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {searchTerm || filterType !== "all" 
                ? "Try adjusting your filters" 
                : "Waiting for system activity..."}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredEvents.map((event, index) => (
              <EventItem
                key={event.id}
                event={event}
                index={index}
                onMarkRead={markAsRead}
              />
            ))}
            <div ref={eventsEndRef} />
          </List>
        )}
      </Box>

      {/* Footer Stats */}
      {filteredEvents.length > 0 && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} pt={1} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="text.secondary">
            Showing {filteredEvents.length} of {events.length} events
          </Typography>
          <Box display="flex" gap={2}>
            {Object.entries(EVENT_TYPES).map(([key, config]) => {
              const count = stats.byType[key] || 0;
              if (count === 0) return null;
              return (
                <Chip
                  key={key}
                  size="small"
                  label={`${config.label}: ${count}`}
                  color={config.color}
                  variant="outlined"
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Settings Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { setAutoScroll(!autoScroll); setAnchorEl(null); }}>
          {autoScroll ? "Disable" : "Enable"} Auto-scroll
        </MenuItem>
        <MenuItem onClick={() => { setSoundEnabled(!soundEnabled); setAnchorEl(null); }}>
          {soundEnabled ? "Disable" : "Enable"} Sound Alerts
        </MenuItem>
        <MenuItem onClick={() => { setShowReadEvents(!showReadEvents); setAnchorEl(null); }}>
          {showReadEvents ? "Hide" : "Show"} Read Events
        </MenuItem>
        <Divider />
        <MenuItem onClick={clearAllEvents}>
          Clear All Events
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default LiveActivityFeed;