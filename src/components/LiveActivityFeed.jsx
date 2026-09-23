// src/components/Admin/LiveActivityFeed.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserPlus,
  FaUserSlash,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaShieldAlt,
  FaUserCheck,
  FaMoneyBillWave,
  FaStar,
  FaComment,
  FaBell,
  FaCog,
  FaServer,
  FaDatabase,
  FaGlobe,
  FaMobileAlt,
  FaClock,
  FaFilter,
  FaSearch,
  FaDownload,
  FaPause,
  FaPlay,
  FaTrash,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";
import { formatDistanceToNow, format } from "date-fns";
import io from "socket.io-client";

// Event Types Configuration
const EVENT_TYPES = {
  USER_CREATED: {
    icon: FaUserPlus,
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    severity: "success",
    label: "New User"
  },
  USER_SUSPENDED: {
    icon: FaUserSlash,
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    severity: "danger",
    label: "User Suspended"
  },
  USER_ACTIVATED: {
    icon: FaUserCheck,
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    severity: "success",
    label: "User Activated"
  },
  BOOKING_COMPLETED: {
    icon: FaClipboardCheck,
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    severity: "info",
    label: "Booking Completed"
  },
  PROVIDER_STRIKE: {
    icon: FaExclamationTriangle,
    color: "#facc15",
    bgColor: "rgba(250, 204, 21, 0.1)",
    severity: "warning",
    label: "Provider Strike"
  },
  PROVIDER_SUSPENDED: {
    icon: FaShieldAlt,
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    severity: "danger",
    label: "Provider Suspended"
  },
  PROVIDER_VERIFIED: {
    icon: FaShieldAlt,
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    severity: "success",
    label: "Provider Verified"
  },
  PAYMENT_RECEIVED: {
    icon: FaMoneyBillWave,
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    severity: "success",
    label: "Payment Received"
  },
  REVIEW_SUBMITTED: {
    icon: FaStar,
    color: "#fbbf24",
    bgColor: "rgba(251, 191, 36, 0.1)",
    severity: "info",
    label: "New Review"
  },
  COMMENT_ADDED: {
    icon: FaComment,
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    severity: "info",
    label: "New Comment"
  },
  SYSTEM_ALERT: {
    icon: FaBell,
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    severity: "danger",
    label: "System Alert"
  },
  SYSTEM_UPDATE: {
    icon: FaCog,
    color: "#6b7280",
    bgColor: "rgba(107, 114, 128, 0.1)",
    severity: "info",
    label: "System Update"
  },
  SERVER_STATUS: {
    icon: FaServer,
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    severity: "info",
    label: "Server Status"
  },
  DATABASE_BACKUP: {
    icon: FaDatabase,
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    severity: "success",
    label: "Database Backup"
  }
};

// Filter options
const FILTER_OPTIONS = {
  ALL: "all",
  USERS: "users",
  PROVIDERS: "providers",
  BOOKINGS: "bookings",
  PAYMENTS: "payments",
  SYSTEM: "system",
  ALERTS: "alerts"
};

const SEVERITY_OPTIONS = {
  ALL: "all",
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  DANGER: "danger"
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
};

const LiveActivityFeed = ({ 
  events = [], 
  onEventClick,
  title = "Live Activity Feed",
  maxHeight = 500,
  showFilters = true,
  enableRealtime = true,
  socketUrl = process.env.REACT_APP_SOCKET_URL || "http://localhost:3001",
  autoScroll = true,
  showTimestamp = true,
  compact = false,
  theme = "dark",
  onExport,
  enableSound = false,
  enableNotifications = false,
  refreshInterval = 30000
}) => {
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filterType, setFilterType] = useState(FILTER_OPTIONS.ALL);
  const [filterSeverity, setFilterSeverity] = useState(SEVERITY_OPTIONS.ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showReadEvents, setShowReadEvents] = useState(true);
  const [eventStats, setEventStats] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const socketRef = useRef(null);
  const eventsEndRef = useRef(null);
  const audioRef = useRef(null);

  // Calculate event statistics
  const calculateStats = useCallback((eventsList) => {
    const stats = {
      total: eventsList.length,
      byType: {},
      bySeverity: {
        info: 0,
        success: 0,
        warning: 0,
        danger: 0
      },
      lastHour: 0,
      last24Hours: 0
    };

    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    eventsList.forEach(event => {
      // Count by type
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
      
      // Count by severity
      const severity = EVENT_TYPES[event.type]?.severity || "info";
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
      
      // Count by time
      const eventDate = new Date(event.timestamp);
      if (eventDate >= oneHourAgo) stats.lastHour++;
      if (eventDate >= oneDayAgo) stats.last24Hours++;
    });

    return stats;
  }, []);

  // Filter events based on criteria
  const filterEvents = useCallback(() => {
    let filtered = [...events];

    // Filter by type
    if (filterType !== FILTER_OPTIONS.ALL) {
      filtered = filtered.filter(event => {
        switch (filterType) {
          case FILTER_OPTIONS.USERS:
            return event.type.includes("USER");
          case FILTER_OPTIONS.PROVIDERS:
            return event.type.includes("PROVIDER");
          case FILTER_OPTIONS.BOOKINGS:
            return event.type.includes("BOOKING");
          case FILTER_OPTIONS.PAYMENTS:
            return event.type.includes("PAYMENT");
          case FILTER_OPTIONS.SYSTEM:
            return event.type.includes("SYSTEM") || event.type.includes("SERVER") || event.type.includes("DATABASE");
          case FILTER_OPTIONS.ALERTS:
            return event.severity === "danger" || event.severity === "warning";
          default:
            return true;
        }
      });
    }

    // Filter by severity
    if (filterSeverity !== SEVERITY_OPTIONS.ALL) {
      filtered = filtered.filter(event => {
        const severity = EVENT_TYPES[event.type]?.severity || "info";
        return severity === filterSeverity;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.message?.toLowerCase().includes(term) ||
        event.user?.toLowerCase().includes(term) ||
        event.type?.toLowerCase().includes(term)
      );
    }

    // Filter read/unread events
    if (!showReadEvents) {
      filtered = filtered.filter(event => !event.read);
    }

    setFilteredEvents(filtered);
    setEventStats(calculateStats(filtered));
  }, [events, filterType, filterSeverity, searchTerm, showReadEvents, calculateStats]);

  // Update filtered events when dependencies change
  useEffect(() => {
    filterEvents();
  }, [filterEvents]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && !isPaused && eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredEvents, autoScroll, isPaused]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!enableSound) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio("/notification.mp3");
    }
    audioRef.current.play().catch(error => console.warn("Sound play failed:", error));
  }, [enableSound]);

  // Show browser notification
  const showBrowserNotification = useCallback((event) => {
    if (!enableNotifications) return;
    if (Notification.permission === "granted") {
      new Notification("Quickks Live Activity", {
        body: event.message,
        icon: "/logo192.png",
        silent: true
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, [enableNotifications]);

  // Handle new event
  const handleNewEvent = useCallback((event) => {
    if (isPaused) return;
    
    setUnreadCount(prev => prev + 1);
    playNotificationSound();
    showBrowserNotification(event);
    
    // Mark as unread
    const newEvent = { ...event, read: false, timestamp: new Date().toISOString() };
    
    // Add to events list (this should be handled by parent component)
    if (onEventClick) {
      onEventClick(newEvent);
    }
  }, [isPaused, playNotificationSound, showBrowserNotification, onEventClick]);

  // Socket.IO connection for real-time events
  useEffect(() => {
    if (!enableRealtime) return;

    const connectSocket = () => {
      socketRef.current = io(socketUrl, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socketRef.current.on("connect", () => {
        console.log("✅ Live activity feed connected");
        setIsConnected(true);
        setConnectionStatus("connected");
      });

      socketRef.current.on("disconnect", () => {
        console.log("❌ Live activity feed disconnected");
        setIsConnected(false);
        setConnectionStatus("disconnected");
      });

      socketRef.current.on("new_event", (event) => {
        handleNewEvent(event);
      });

      socketRef.current.on("bulk_events", (bulkEvents) => {
        bulkEvents.forEach(event => handleNewEvent(event));
      });
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [enableRealtime, socketUrl, handleNewEvent]);

  // Auto-refresh events
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      if (!isPaused && isConnected) {
        // Trigger refresh (implement based on your API)
        fetchEvents();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, isPaused, isConnected]);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/events/latest");
      const data = await response.json();
      if (data.events) {
        // Handle event update (implement based on your state management)
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }, []);

  // Export events as JSON or CSV
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(filteredEvents);
    } else {
      const dataStr = JSON.stringify(filteredEvents, null, 2);
      const dataUri = "data:application/json;charset=utf-8,"+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `activity_events_${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
      
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    }
  }, [filteredEvents, onExport]);

  // Clear all events
  const handleClearEvents = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all events?")) {
      setFilteredEvents([]);
    }
  }, []);

  // Mark all as read
  const handleMarkAllRead = useCallback(() => {
    const updatedEvents = filteredEvents.map(event => ({ ...event, read: true }));
    setFilteredEvents(updatedEvents);
    setUnreadCount(0);
  }, [filteredEvents]);

  // Get event configuration
  const getEventConfig = useCallback((type) => {
    return EVENT_TYPES[type] || {
      icon: FaBell,
      color: "#6b7280",
      bgColor: "rgba(107, 114, 128, 0.1)",
      severity: "info",
      label: "Event"
    };
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp, format = "relative") => {
    const date = new Date(timestamp);
    if (format === "relative") {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, "PPP 'at' p");
  }, []);

  // Render header
  const renderHeader = () => (
    <div className="activity-feed-header">
      <div className="header-left">
        <div className="live-indicator">
          <span className={`live-dot ${isConnected ? "active" : "inactive"}`} />
          <span className="live-text">LIVE</span>
        </div>
        <h3 className="feed-title">{title}</h3>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount} new</span>
        )}
      </div>
      
      <div className="header-right">
        <button
          className="control-btn"
          onClick={() => setIsPaused(!isPaused)}
          title={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? <FaPlay size={12} /> : <FaPause size={12} />}
        </button>
        
        <button
          className="control-btn"
          onClick={handleMarkAllRead}
          title="Mark all as read"
        >
          <FaEye size={12} />
        </button>
        
        <button
          className="control-btn"
          onClick={() => setShowReadEvents(!showReadEvents)}
          title={showReadEvents ? "Hide read" : "Show read"}
        >
          {showReadEvents ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
        </button>
        
        <button
          className="control-btn"
          onClick={handleExport}
          title="Export events"
        >
          <FaDownload size={12} />
        </button>
        
        <button
          className="control-btn"
          onClick={handleClearEvents}
          title="Clear all"
        >
          <FaTrash size={12} />
        </button>
      </div>
    </div>
  );

  // Render filters
  const renderFilters = () => {
    if (!showFilters) return null;
    
    return (
      <div className="activity-feed-filters">
        <div className="filter-group">
          <FaFilter className="filter-icon" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value={FILTER_OPTIONS.ALL}>All Events</option>
            <option value={FILTER_OPTIONS.USERS}>Users</option>
            <option value={FILTER_OPTIONS.PROVIDERS}>Providers</option>
            <option value={FILTER_OPTIONS.BOOKINGS}>Bookings</option>
            <option value={FILTER_OPTIONS.PAYMENTS}>Payments</option>
            <option value={FILTER_OPTIONS.SYSTEM}>System</option>
            <option value={FILTER_OPTIONS.ALERTS}>Alerts</option>
          </select>
        </div>
        
        <div className="filter-group">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="filter-select"
          >
            <option value={SEVERITY_OPTIONS.ALL}>All Severity</option>
            <option value={SEVERITY_OPTIONS.INFO}>Info</option>
            <option value={SEVERITY_OPTIONS.SUCCESS}>Success</option>
            <option value={SEVERITY_OPTIONS.WARNING}>Warning</option>
            <option value={SEVERITY_OPTIONS.DANGER}>Danger</option>
          </select>
        </div>
        
        <div className="filter-group search-group">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
    );
  };

  // Render statistics
  const renderStats = () => (
    <div className="activity-feed-stats">
      <div className="stat-item">
        <span className="stat-label">Total Events:</span>
        <span className="stat-value">{eventStats.total}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Last Hour:</span>
        <span className="stat-value">{eventStats.lastHour}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Last 24h:</span>
        <span className="stat-value">{eventStats.last24Hours}</span>
      </div>
      <div className="stat-item severity-stats">
        <span className="severity-dot info" />
        <span className="stat-value">{eventStats.bySeverity.info}</span>
        <span className="severity-dot success" />
        <span className="stat-value">{eventStats.bySeverity.success}</span>
        <span className="severity-dot warning" />
        <span className="stat-value">{eventStats.bySeverity.warning}</span>
        <span className="severity-dot danger" />
        <span className="stat-value">{eventStats.bySeverity.danger}</span>
      </div>
    </div>
  );

  // Render event item
  const renderEventItem = (event, index) => {
    const config = getEventConfig(event.type);
    const Icon = config.icon;
    const isUnread = !event.read;
    
    return (
      <motion.div
        key={event.id || index}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
        className={`event-item ${isUnread ? "unread" : ""} ${compact ? "compact" : ""}`}
        onClick={() => onEventClick?.(event)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: compact ? 8 : 12,
          padding: compact ? 8 : 12,
          borderRadius: 12,
          background: config.bgColor,
          borderLeft: `3px solid ${config.color}`,
          cursor: onEventClick ? "pointer" : "default",
          transition: "all 0.2s ease"
        }}
      >
        <div
          className="event-icon"
          style={{
            minWidth: compact ? 28 : 36,
            height: compact ? 28 : 36,
            borderRadius: "50%",
            background: config.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff"
          }}
        >
          <Icon size={compact ? 12 : 16} />
        </div>
        
        <div style={{ flex: 1 }}>
          <div className="event-header">
            <span className="event-type">{config.label}</span>
            {isUnread && <span className="new-badge">New</span>}
          </div>
          
          <p className="event-message" style={{ 
            color: theme === "dark" ? "#fff" : "#1f2937",
            fontSize: compact ? 13 : 14,
            marginBottom: 4
          }}>
            {event.message}
          </p>
          
          {event.user && (
            <div className="event-user">
              <FaUserPlus size={10} />
              <span>{event.user}</span>
            </div>
          )}
          
          {showTimestamp && (
            <div className="event-time">
              <FaClock size={10} />
              <span>{formatTimestamp(event.timestamp)}</span>
              {event.ip && <span className="event-ip">• {event.ip}</span>}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">📭</div>
      <p className="empty-title">No events to display</p>
      <p className="empty-message">
        {searchTerm || filterType !== FILTER_OPTIONS.ALL || filterSeverity !== SEVERITY_OPTIONS.ALL
          ? "Try adjusting your filters to see more events"
          : "System is stable. Events will appear here when they occur"}
      </p>
    </div>
  );

  return (
    <div 
      className={`live-activity-feed ${theme}`}
      style={{
        background: theme === "dark" ? "rgba(20, 27, 52, 0.95)" : "rgba(255, 255, 255, 0.95)",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      }}
    >
      {renderHeader()}
      {renderFilters()}
      {renderStats()}
      
      <div 
        className="events-container"
        style={{
          maxHeight,
          overflowY: "auto",
          marginTop: 16,
          paddingRight: 4
        }}
      >
        <AnimatePresence mode="wait">
          {filteredEvents.length === 0 ? (
            renderEmptyState()
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="events-list"
              style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 12 }}
            >
              {filteredEvents.map((event, index) => renderEventItem(event, index))}
              <div ref={eventsEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <style jsx>{`
        .live-activity-feed {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        .activity-feed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
        }
        
        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .live-dot.active {
          background: #ef4444;
        }
        
        .live-dot.inactive {
          background: #6b7280;
          animation: none;
        }
        
        .live-text {
          font-size: 11px;
          font-weight: 600;
          color: #ef4444;
          letter-spacing: 1px;
        }
        
        .feed-title {
          color: ${theme === "dark" ? "#fff" : "#1f2937"};
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        
        .unread-badge {
          background: #ef4444;
          color: white;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        }
        
        .header-right {
          display: flex;
          gap: 8px;
        }
        
        .control-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: ${theme === "dark" ? "#cbd5e1" : "#6b7280"};
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .control-btn:hover {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }
        
        .activity-feed-filters {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 12px;
          border-radius: 8px;
        }
        
        .filter-icon, .search-icon {
          color: #94a3b8;
          font-size: 12px;
        }
        
        .filter-select {
          background: transparent;
          border: none;
          color: ${theme === "dark" ? "#cbd5e1" : "#4b5563"};
          font-size: 13px;
          cursor: pointer;
          outline: none;
        }
        
        .search-group {
          flex: 1;
        }
        
        .search-input {
          background: transparent;
          border: none;
          color: ${theme === "dark" ? "#fff" : "#1f2937"};
          font-size: 13px;
          outline: none;
          width: 100%;
        }
        
        .search-input::placeholder {
          color: #64748b;
        }
        
        .activity-feed-stats {
          display: flex;
          gap: 20px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 12px;
        }
        
        .stat-item {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        
        .stat-label {
          color: #94a3b8;
        }
        
        .stat-value {
          color: ${theme === "dark" ? "#fbbf24" : "#f59e0b"};
          font-weight: 600;
        }
        
        .severity-stats {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .severity-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .severity-dot.info {
          background: #3b82f6;
        }
        
        .severity-dot.success {
          background: #22c55e;
        }
        
        .severity-dot.warning {
          background: #facc15;
        }
        
        .severity-dot.danger {
          background: #ef4444;
        }
        
        .events-container {
          scrollbar-width: thin;
        }
        
        .events-container::-webkit-scrollbar {
          width: 4px;
        }
        
        .events-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }
        
        .events-container::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.3);
          border-radius: 2px;
        }
        
        .event-item {
          transition: transform 0.2s, opacity 0.2s;
        }
        
        .event-item:hover {
          transform: translateX(4px);
        }
        
        .event-item.unread {
          background: rgba(251, 191, 36, 0.15) !important;
        }
        
        .event-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .event-type {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #94a3b8;
        }
        
        .new-badge {
          background: #ef4444;
          color: white;
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 8px;
          font-weight: 500;
        }
        
        .event-user, .event-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #94a3b8;
          margin-top: 4px;
        }
        
        .event-ip {
          margin-left: 4px;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }
        
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        
        .empty-title {
          color: ${theme === "dark" ? "#cbd5e1" : "#6b7280"};
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        }
        
        .empty-message {
          color: #94a3b8;
          font-size: 12px;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

// PropTypes for type checking
LiveActivityFeed.propTypes = {
  events: PropTypes.array,
  onEventClick: PropTypes.func,
  title: PropTypes.string,
  maxHeight: PropTypes.number,
  showFilters: PropTypes.bool,
  enableRealtime: PropTypes.bool,
  socketUrl: PropTypes.string,
  autoScroll: PropTypes.bool,
  showTimestamp: PropTypes.bool,
  compact: PropTypes.bool,
  theme: PropTypes.oneOf(["light", "dark"]),
  onExport: PropTypes.func,
  enableSound: PropTypes.bool,
  enableNotifications: PropTypes.bool,
  refreshInterval: PropTypes.number
};

// Default props
LiveActivityFeed.defaultProps = {
  events: [],
  onEventClick: null,
  title: "Live Activity Feed",
  maxHeight: 500,
  showFilters: true,
  enableRealtime: true,
  socketUrl: process.env.REACT_APP_SOCKET_URL || "http://localhost:3001",
  autoScroll: true,
  showTimestamp: true,
  compact: false,
  theme: "dark",
  onExport: null,
  enableSound: false,
  enableNotifications: false,
  refreshInterval: 30000
};

export default React.memo(LiveActivityFeed);