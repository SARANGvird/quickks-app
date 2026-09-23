import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBell,
  FaUserPlus,
  FaClipboardList,
  FaShieldAlt,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaFilter,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaRefresh,
  FaChevronDown,
  FaChevronUp,
  FaSearch,
  FaPlay,
  FaPause,
  FaCog
} from "react-icons/fa";
import { formatDistanceToNow, format } from "date-fns";

// ==========================================================
// EVENT TYPES & CONFIGURATION
// ==========================================================
const EVENT_TYPES = {
  USER_REGISTERED: {
    icon: FaUserPlus,
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    label: "New User"
  },
  BOOKING_CREATED: {
    icon: FaClipboardList,
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    label: "New Booking"
  },
  PROVIDER_APPROVED: {
    icon: FaShieldAlt,
    color: "#6366f1",
    bgColor: "rgba(99, 102, 241, 0.1)",
    borderColor: "rgba(99, 102, 241, 0.3)",
    label: "Provider Approved"
  },
  PAYMENT_RECEIVED: {
    icon: FaMoneyBillWave,
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    label: "Payment"
  },
  COMPLAINT_RAISED: {
    icon: FaExclamationTriangle,
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    label: "Complaint"
  },
  REVIEW_SUBMITTED: {
    icon: FaCheckCircle,
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    label: "New Review"
  },
  BOOKING_CANCELLED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    label: "Cancellation"
  }
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const LiveActivityFeed = ({ 
  events = [],
  title = "Live Activity Feed",
  maxHeight = 400,
  autoScroll = true,
  onEventClick = null,
  onFilterChange = null,
  enableFiltering = true,
  enableSearch = true,
  enableAutoRefresh = true,
  refreshInterval = 30000,
  onRefresh = null,
  theme = "dark", // 'dark' or 'light'
  compact = false,
  showTimestamps = true,
  showIcons = true,
  animation = true,
  className = "",
  style = {}
}) => {
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(autoScroll);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(enableAutoRefresh);
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  const feedRef = useRef(null);
  const intervalRef = useRef(null);

  // ==========================================================
  // EVENT FILTERING
  // ==========================================================
  const eventTypes = useMemo(() => Object.keys(EVENT_TYPES), []);
  
  const getEventType = (event) => {
    if (event.type && EVENT_TYPES[event.type]) return event.type;
    if (event.eventType && EVENT_TYPES[event.eventType]) return event.eventType;
    
    // Auto-detect based on message
    const message = event.message || event.title || "";
    if (message.includes("user") || message.includes("registered")) return "USER_REGISTERED";
    if (message.includes("booking") || message.includes("booked")) return "BOOKING_CREATED";
    if (message.includes("provider") || message.includes("approved")) return "PROVIDER_APPROVED";
    if (message.includes("payment") || message.includes("paid")) return "PAYMENT_RECEIVED";
    if (message.includes("complaint") || message.includes("issue")) return "COMPLAINT_RAISED";
    if (message.includes("review") || message.includes("rating")) return "REVIEW_SUBMITTED";
    if (message.includes("cancel")) return "BOOKING_CANCELLED";
    
    return "USER_REGISTERED";
  };

  const getEventIcon = (event) => {
    const type = getEventType(event);
    return EVENT_TYPES[type]?.icon || FaBell;
  };

  const getEventColor = (event) => {
    const type = getEventType(event);
    return EVENT_TYPES[type]?.color || "#6366f1";
  };

  const getEventBgColor = (event) => {
    const type = getEventType(event);
    return EVENT_TYPES[type]?.bgColor || "rgba(99, 102, 241, 0.1)";
  };

  const getEventBorderColor = (event) => {
    const type = getEventType(event);
    return EVENT_TYPES[type]?.borderColor || "rgba(99, 102, 241, 0.3)";
  };

  const getEventLabel = (event) => {
    const type = getEventType(event);
    return EVENT_TYPES[type]?.label || "Event";
  };

  // Filter events
  useEffect(() => {
    let filtered = [...events];
    
    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(event => getEventType(event) === filterType);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(event => {
        const message = (event.message || event.title || "").toLowerCase();
        const details = (event.details || "").toLowerCase();
        return message.includes(term) || details.includes(term);
      });
    }
    
    setFilteredEvents(filtered);
  }, [events, filterType, searchTerm]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScrollEnabled && feedRef.current && filteredEvents.length > 0) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [filteredEvents, autoScrollEnabled]);

  // Auto-refresh
  useEffect(() => {
    if (isAutoRefreshing && onRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        onRefresh();
        setLastUpdated(new Date());
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isAutoRefreshing, onRefresh, refreshInterval]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return {
        relative: formatDistanceToNow(date, { addSuffix: true }),
        absolute: format(date, "HH:mm:ss • MMM dd, yyyy")
      };
    } catch {
      return { relative: "Unknown", absolute: "Unknown" };
    }
  };

  // Clear all events
  const clearEvents = () => {
    setFilteredEvents([]);
    if (onRefresh) onRefresh();
  };

  // Toggle auto-scroll
  const toggleAutoScroll = () => {
    setAutoScrollEnabled(!autoScrollEnabled);
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setIsAutoRefreshing(!isAutoRefreshing);
  };

  // Handle event click
  const handleEventClick = (event) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  // Theme styles
  const getThemeStyles = () => {
    if (theme === "light") {
      return {
        container: {
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        },
        title: { color: "#0f172a" },
        feed: { background: "#fafbfc" },
        item: {
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          hoverBg: "#f8fafc"
        },
        message: { color: "#1e293b" },
        time: { color: "#64748b" },
        empty: { color: "#94a3b8" },
        filterButton: {
          background: "#f1f5f9",
          color: "#475569",
          hoverBg: "#e2e8f0"
        },
        filterActive: {
          background: "#6366f1",
          color: "#ffffff"
        }
      };
    }
    return {
      container: {
        background: "rgba(20, 27, 52, 0.6)",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
      },
      title: { color: "#ffffff" },
      feed: { background: "rgba(0,0,0,0.2)" },
      item: {
        background: "transparent",
        borderBottom: "1px solid rgba(255,255,255,0.02)",
        hoverBg: "rgba(255,255,255,0.05)"
      },
      message: { color: "#e2e8f0" },
      time: { color: "#64748b" },
      empty: { color: "#64748b" },
      filterButton: {
        background: "rgba(255,255,255,0.05)",
        color: "#94a3b8",
        hoverBg: "rgba(255,255,255,0.1)"
      },
      filterActive: {
        background: "#6366f1",
        color: "#ffffff"
      }
    };
  };

  const themeStyles = getThemeStyles();

  // Styles
  const containerStyle = {
    background: themeStyles.container.background,
    backdropFilter: "blur(10px)",
    borderRadius: "16px",
    border: themeStyles.container.border,
    boxShadow: themeStyles.container.boxShadow,
    overflow: "hidden",
    transition: "all 0.3s ease",
    ...style
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: themeStyles.container.border,
    flexWrap: "wrap",
    gap: "12px"
  };

  const titleStyle = {
    ...themeStyles.title,
    fontSize: "18px",
    fontWeight: 600,
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px"
  };

  const controlsStyle = {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap"
  };

  const controlButtonStyle = (isActive = false) => ({
    background: isActive ? themeStyles.filterActive.background : themeStyles.filterButton.background,
    color: isActive ? themeStyles.filterActive.color : themeStyles.filterButton.color,
    border: "none",
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
    fontWeight: 500
  });

  const searchStyle = {
    background: themeStyles.filterButton.background,
    border: "none",
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    color: themeStyles.message.color,
    width: "180px",
    outline: "none"
  };

  const feedStyle = {
    height: expanded ? "auto" : maxHeight,
    maxHeight: expanded ? "none" : maxHeight,
    overflowY: "auto",
    padding: "12px",
    background: themeStyles.feed.background,
    transition: "all 0.3s ease"
  };

  const itemStyle = (event) => ({
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    padding: compact ? "8px 12px" : "12px 16px",
    borderRadius: "12px",
    marginBottom: "8px",
    background: themeStyles.item.background,
    borderBottom: themeStyles.item.borderBottom,
    cursor: onEventClick ? "pointer" : "default",
    transition: "all 0.2s ease",
    position: "relative",
    "&:hover": {
      background: themeStyles.item.hoverBg,
      transform: "translateX(4px)"
    }
  });

  const iconWrapperStyle = (event) => ({
    width: compact ? "28px" : "32px",
    height: compact ? "28px" : "32px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: getEventBgColor(event),
    border: `1px solid ${getEventBorderColor(event)}`,
    flexShrink: 0
  });

  const contentStyle = {
    flex: 1,
    minWidth: 0
  };

  const messageStyle = {
    ...themeStyles.message,
    fontSize: compact ? "13px" : "14px",
    margin: 0,
    lineHeight: 1.4
  };

  const metaStyle = {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginTop: "4px",
    flexWrap: "wrap"
  };

  const timeStyle = {
    ...themeStyles.time,
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  };

  const badgeStyle = (event) => ({
    background: getEventBgColor(event),
    color: getEventColor(event),
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "12px",
    fontWeight: 500
  });

  const emptyStyle = {
    ...themeStyles.empty,
    textAlign: "center",
    padding: "40px 20px",
    fontSize: "14px"
  };

  const footerStyle = {
    padding: "12px 16px",
    borderTop: themeStyles.container.border,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
    color: themeStyles.time.color
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          <FaBell size={16} />
          {title}
          {filteredEvents.length > 0 && (
            <span style={{
              background: themeStyles.filterActive.background,
              color: themeStyles.filterActive.color,
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "12px",
              marginLeft: "8px"
            }}>
              {filteredEvents.length}
            </span>
          )}
        </div>
        
        <div style={controlsStyle}>
          {enableSearch && (
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchStyle}
            />
          )}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={controlButtonStyle(showFilters)}
          >
            <FaFilter size={12} />
            Filter
          </button>
          
          {enableAutoRefresh && (
            <button
              onClick={toggleAutoRefresh}
              style={controlButtonStyle(isAutoRefreshing)}
              title={isAutoRefreshing ? "Auto-refresh on" : "Auto-refresh off"}
            >
              {isAutoRefreshing ? <FaPause size={12} /> : <FaPlay size={12} />}
            </button>
          )}
          
          <button
            onClick={toggleAutoScroll}
            style={controlButtonStyle(autoScrollEnabled)}
            title={autoScrollEnabled ? "Auto-scroll on" : "Auto-scroll off"}
          >
            {autoScrollEnabled ? <FaChevronDown size={12} /> : <FaEyeSlash size={12} />}
          </button>
          
          <button
            onClick={() => setExpanded(!expanded)}
            style={controlButtonStyle(expanded)}
          >
            {expanded ? <FaChevronUp size={12} /> : <FaEye size={12} />}
          </button>
          
          <button
            onClick={clearEvents}
            style={controlButtonStyle()}
            title="Clear all"
          >
            <FaTrash size={12} />
          </button>
          
          {onRefresh && (
            <button
              onClick={() => { onRefresh(); setLastUpdated(new Date()); }}
              style={controlButtonStyle()}
              title="Refresh"
            >
              <FaRefresh size={12} />
            </button>
          )}
        </div>
      </div>
      
      {showFilters && enableFiltering && (
        <div style={{
          padding: "12px 20px",
          borderBottom: themeStyles.container.border,
          display: "flex",
          gap: "8px",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => setFilterType("all")}
            style={controlButtonStyle(filterType === "all")}
          >
            All
          </button>
          {eventTypes.map(type => {
            const Icon = EVENT_TYPES[type].icon;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={controlButtonStyle(filterType === type)}
              >
                <Icon size={12} />
                {EVENT_TYPES[type].label}
              </button>
            );
          })}
        </div>
      )}
      
      <div ref={feedRef} style={feedStyle}>
        <AnimatePresence initial={false}>
          {filteredEvents.length === 0 ? (
            <div style={emptyStyle}>
              {searchTerm || filterType !== "all" 
                ? "No matching events" 
                : "Waiting for events..."}
            </div>
          ) : (
            filteredEvents.map((event, index) => {
              const EventIcon = getEventIcon(event);
              const eventType = getEventType(event);
              const eventLabel = getEventLabel(event);
              const timestamp = formatTimestamp(event.timestamp || event.createdAt);
              const message = event.message || event.title || `${eventLabel} occurred`;
              const details = event.details || "";
              
              return (
                <motion.div
                  key={event.id || index}
                  initial={animation ? { opacity: 0, x: -20 } : false}
                  animate={animation ? { opacity: 1, x: 0 } : false}
                  exit={animation ? { opacity: 0, x: 20 } : false}
                  transition={{ duration: 0.2 }}
                  style={itemStyle(event)}
                  onClick={() => handleEventClick(event)}
                >
                  {showIcons && (
                    <div style={iconWrapperStyle(event)}>
                      <EventIcon size={compact ? 14 : 16} color={getEventColor(event)} />
                    </div>
                  )}
                  
                  <div style={contentStyle}>
                    <p style={messageStyle}>
                      {message}
                      {details && <span style={{ ...themeStyles.time, fontSize: "12px", marginLeft: "8px" }}>{details}</span>}
                    </p>
                    
                    <div style={metaStyle}>
                      <span style={badgeStyle(event)}>{eventLabel}</span>
                      {showTimestamps && (
                        <span style={timeStyle}>
                          <FaClock size={10} />
                          <span title={timestamp.absolute}>{timestamp.relative}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
      
      <div style={footerStyle}>
        <span>Last updated: {format(lastUpdated, "HH:mm:ss")}</span>
        <span>{filteredEvents.length} events</span>
      </div>
    </div>
  );
};

// ==========================================================
// HELPER COMPONENTS
// ==========================================================

export const CompactActivityFeed = (props) => (
  <LiveActivityFeed {...props} compact={true} showTimestamps={false} maxHeight={300} />
);

export const LightActivityFeed = (props) => (
  <LiveActivityFeed {...props} theme="light" />
);

export const MiniActivityFeed = (props) => (
  <LiveActivityFeed {...props} compact={true} showIcons={false} maxHeight={200} enableFiltering={false} enableSearch={false} />
);

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default LiveActivityFeed;