// src/hooks/useAdminSocket.js
// ✅ COMPLETE FIXED VERSION
// Fixes applied:
//  1. wsUrl no longer reads REACT_APP_WS_URL directly (was producing ws:// for SockJS) —
//     now reuses apiService.ws.getWsUrl(), the single source of truth (http/https + CONTEXT_PATH aware)
//  2. getAccessToken / getRefreshToken now delegate to TokenManager (checks localStorage,
//     sessionStorage, and legacy 'authToken' key) instead of a narrower localStorage-only check
//  3. reconnectCount now actually increments on reconnects (was always +0)
//  4. mountedRef lifecycle moved into its own effect with empty deps, so it can't be
//     permanently flipped to false by an unrelated effect re-run

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import api, { apiService } from "../api/api";
import { toast } from "react-toastify";

// ==========================================================
// CONSTANTS & ENUMS
// ==========================================================
export const SOCKET_EVENTS = {
  STATS: "/topic/admin/stats",
  PROVIDER_STATUS: "/topic/admin/provider-status",
  BOOKING_EVENT: "/topic/admin/booking-event",
  ALERTS: "/topic/admin/alerts",
  REVENUE: "/topic/admin/revenue",
  SYSTEM_HEALTH: "/topic/admin/system-health",
  USER_ACTIVITY: "/topic/admin/user-activity"
};

export const SOCKET_STATES = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
  FAILED: "failed"
};

const RECONNECT_CONFIG = {
  MAX_ATTEMPTS: 10,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000,
  JITTER: 0.1,
  BACKOFF_MULTIPLIER: 2
};

const HEARTBEAT_CONFIG = {
  INCOMING: 10000,
  OUTGOING: 10000
};

const CONNECTION_CONFIG = {
  TIMEOUT: 10000,
  RETRY_DELAY: 2000
};

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================
const generateConnectionId = () => {
  return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const calculateReconnectDelay = (attempt) => {
  const exponentialDelay = RECONNECT_CONFIG.BASE_DELAY *
    Math.pow(RECONNECT_CONFIG.BACKOFF_MULTIPLIER, attempt);
  const cappedDelay = Math.min(exponentialDelay, RECONNECT_CONFIG.MAX_DELAY);
  const jitter = cappedDelay * RECONNECT_CONFIG.JITTER * Math.random();
  return Math.floor(cappedDelay + jitter);
};

// ==========================================================
// MAIN HOOK
// ==========================================================
export const useAdminSocket = ({
  // Callbacks
  onStats,
  onProviderStatus,
  onBookingEvent,
  onAlert,
  onRevenue,
  onSystemHealth,
  onUserActivity,
  onConnectionChange,
  onError,

  // Configuration
  autoConnect = true,
  enableHeartbeat = true,
  enableReconnection = true,
  enableLogging = process.env.NODE_ENV === "development",
  maxReconnectAttempts = RECONNECT_CONFIG.MAX_ATTEMPTS,
  reconnectDelay = CONNECTION_CONFIG.RETRY_DELAY,
  // ✅ FIXED: use the single shared http(s) WS URL builder from api.js instead of
  // reading REACT_APP_WS_URL directly (that var is ws://, which SockJS rejects)
  wsUrl = apiService.ws.getWsUrl(),
  subscriptions = null, // Custom subscriptions array
  tokenRefreshEndpoint = "/auth/refresh"
}) => {
  // ==========================================================
  // STATE
  // ==========================================================
  const [connectionState, setConnectionState] = useState(SOCKET_STATES.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionId] = useState(generateConnectionId());
  const [connectionStats, setConnectionStats] = useState({
    connectedAt: null,
    disconnectedAt: null,
    messagesReceived: 0,
    reconnectCount: 0,
    lastHeartbeat: null
  });

  // ==========================================================
  // REFS
  // ==========================================================
  const clientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const subscriptionsRef = useRef(new Map());
  const messageQueueRef = useRef([]);
  const heartbeatIntervalRef = useRef(null);
  const connectionTimeoutRef = useRef(null);

  // Callbacks refs to avoid re-subscriptions
  const callbacksRef = useRef({
    onStats,
    onProviderStatus,
    onBookingEvent,
    onAlert,
    onRevenue,
    onSystemHealth,
    onUserActivity,
    onConnectionChange,
    onError
  });

  // ==========================================================
  // LOGGING UTILITY
  // ==========================================================
  const log = useCallback((level, message, data = null) => {
    if (!enableLogging) return;

    const prefix = `[AdminSocket:${connectionId}]`;
    const timestamp = new Date().toISOString();

    switch (level) {
      case "error":
        console.error(`${prefix} ${message}`, data || "");
        break;
      case "warn":
        console.warn(`${prefix} ${message}`, data || "");
        break;
      case "info":
        console.log(`${prefix} ${message}`, data || "");
        break;
      case "debug":
        console.debug(`${prefix} ${message}`, data || "");
        break;
      default:
        console.log(`${prefix} ${message}`, data || "");
    }

    // Call error callback if provided
    if (level === "error" && callbacksRef.current.onError) {
      callbacksRef.current.onError({ message, data, timestamp });
    }
  }, [enableLogging, connectionId]);

  // ==========================================================
  // TOKEN MANAGEMENT
  // ✅ FIXED: delegate to TokenManager (checks localStorage, sessionStorage,
  // and the legacy 'authToken' key) instead of a narrower localStorage-only lookup
  // ==========================================================
  const getAccessToken = useCallback(() => {
    return apiService.tokenManager.getAccessToken();
  }, []);

  const getRefreshToken = useCallback(() => {
    return apiService.tokenManager.getRefreshToken();
  }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token found");
      }

      log("info", "Refreshing access token...");

      const response = await api.post(tokenRefreshEndpoint, {
        refreshToken
      });

      const newToken = response.data?.auth?.token || response.data?.token;

      if (!newToken) {
        throw new Error("No token in refresh response");
      }

      localStorage.setItem("accessToken", newToken);
      log("info", "Token refreshed successfully");

      return newToken;
    } catch (err) {
      log("error", "Token refresh failed", err);

      // Redirect to login if refresh fails
      if (err.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }

      return null;
    }
  }, [getRefreshToken, tokenRefreshEndpoint, log]);

  // ==========================================================
  // MESSAGE HANDLERS
  // ==========================================================
  const handleStats = useCallback((message) => {
    try {
      const data = JSON.parse(message.body);
      setConnectionStats(prev => ({
        ...prev,
        messagesReceived: prev.messagesReceived + 1,
        lastHeartbeat: Date.now()
      }));
      callbacksRef.current.onStats?.(data);
    } catch (err) {
      log("error", "Failed to parse stats message", err);
    }
  }, [log]);

  const handleProviderStatus = useCallback((message) => {
    try {
      const data = JSON.parse(message.body);
      callbacksRef.current.onProviderStatus?.(data);
    } catch (err) {
      log("error", "Failed to parse provider status message", err);
    }
  }, [log]);

  const handleBookingEvent = useCallback((message) => {
    try {
      const data = JSON.parse(message.body);
      callbacksRef.current.onBookingEvent?.(data);

      // Show toast for critical booking events
      if (data.type === "NEW_BOOKING") {
        toast.info(`New booking received: #${data.bookingId}`);
      } else if (data.type === "BOOKING_CANCELLED") {
        toast.warning(`Booking cancelled: #${data.bookingId}`);
      } else if (data.type === "BOOKING_COMPLETED") {
        toast.success(`Booking completed: #${data.bookingId}`);
      }
    } catch (err) {
      log("error", "Failed to parse booking event", err);
    }
  }, [log]);

  const handleAlert = useCallback((message) => {
    try {
      const data = JSON.parse(message.body);
      callbacksRef.current.onAlert?.(data);

      // Show toast for alerts
      if (data.severity === "error") {
        toast.error(data.message);
      } else if (data.severity === "warning") {
        toast.warning(data.message);
      } else if (data.severity === "info") {
        toast.info(data.message);
      }
    } catch (err) {
      log("error", "Failed to parse alert message", err);
    }
  }, [log]);

  const handleRevenue = useCallback((message) => {
    try {
      const data = JSON.parse(message.body);
      callbacksRef.current.onRevenue?.(data);
    } catch (err) {
      log("error", "Failed to parse revenue message", err);
    }
  }, [log]);

  const handleSystemHealth = useCallback((message) => {
    try {
      const data = JSON.parse(message.body);
      callbacksRef.current.onSystemHealth?.(data);
    } catch (err) {
      log("error", "Failed to parse system health message", err);
    }
  }, [log]);

  const handleUserActivity = useCallback((message) => {
    try {
      const data = JSON.parse(message.body);
      callbacksRef.current.onUserActivity?.(data);
    } catch (err) {
      log("error", "Failed to parse user activity message", err);
    }
  }, [log]);

  // ==========================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================
  const subscribeToTopics = useCallback((client) => {
    if (!client || !client.connected) return;

    log("info", "Subscribing to topics...");

    // Default subscriptions
    const defaultSubscriptions = [
      { topic: SOCKET_EVENTS.STATS, handler: handleStats },
      { topic: SOCKET_EVENTS.PROVIDER_STATUS, handler: handleProviderStatus },
      { topic: SOCKET_EVENTS.BOOKING_EVENT, handler: handleBookingEvent },
      { topic: SOCKET_EVENTS.ALERTS, handler: handleAlert },
      { topic: SOCKET_EVENTS.REVENUE, handler: handleRevenue },
      { topic: SOCKET_EVENTS.SYSTEM_HEALTH, handler: handleSystemHealth },
      { topic: SOCKET_EVENTS.USER_ACTIVITY, handler: handleUserActivity }
    ];

    // Use custom subscriptions if provided, otherwise use defaults
    const topicsToSubscribe = subscriptions || defaultSubscriptions;

    topicsToSubscribe.forEach(({ topic, handler }) => {
      if (!subscriptionsRef.current.has(topic)) {
        const subscription = client.subscribe(topic, handler);
        subscriptionsRef.current.set(topic, subscription);
        log("debug", `Subscribed to: ${topic}`);
      }
    });
  }, [subscriptions, handleStats, handleProviderStatus, handleBookingEvent,
      handleAlert, handleRevenue, handleSystemHealth, handleUserActivity, log]);

  const unsubscribeFromTopics = useCallback(() => {
    subscriptionsRef.current.forEach((subscription, topic) => {
      try {
        subscription.unsubscribe();
        log("debug", `Unsubscribed from: ${topic}`);
      } catch (err) {
        log("error", `Failed to unsubscribe from: ${topic}`, err);
      }
    });
    subscriptionsRef.current.clear();
  }, [log]);

  // ==========================================================
  // HEARTBEAT MANAGEMENT
  // ==========================================================
  const startHeartbeat = useCallback(() => {
    if (!enableHeartbeat) return;

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (clientRef.current?.connected && mountedRef.current) {
        try {
          clientRef.current.publish({
            destination: "/app/heartbeat",
            body: JSON.stringify({
              timestamp: Date.now(),
              connectionId
            })
          });
          log("debug", "Heartbeat sent");
        } catch (err) {
          log("error", "Failed to send heartbeat", err);
        }
      }
    }, HEARTBEAT_CONFIG.OUTGOING);
  }, [enableHeartbeat, connectionId, log]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ==========================================================
  // CONNECTION MANAGEMENT
  // ==========================================================
  const disconnect = useCallback(() => {
    log("info", "Disconnecting...");

    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Stop heartbeat
    stopHeartbeat();

    // Unsubscribe from topics
    unsubscribeFromTopics();

    // Deactivate client
    if (clientRef.current) {
      try {
        clientRef.current.deactivate();
      } catch (err) {
        log("error", "Error during deactivation", err);
      }
      clientRef.current = null;
    }

    // Update state
    setIsConnected(false);
    setConnectionState(SOCKET_STATES.DISCONNECTED);
    setConnectionStats(prev => ({
      ...prev,
      disconnectedAt: Date.now()
    }));

    log("info", "Disconnected");
  }, [stopHeartbeat, unsubscribeFromTopics, log]);

  const connectSocket = useCallback(async () => {
    if (!mountedRef.current) return;

    // Check for token
    const token = getAccessToken();
    if (!token) {
      log("warn", "No access token found, cannot connect");
      setConnectionState(SOCKET_STATES.FAILED);
      setError("No access token available");
      return;
    }

    // Don't reconnect if max attempts reached
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      log("error", "Max reconnection attempts reached");
      setConnectionState(SOCKET_STATES.FAILED);
      setError("Max reconnection attempts reached");
      return;
    }

    // Clean up existing connection
    if (clientRef.current) {
      await disconnect();
    }

    setConnectionState(SOCKET_STATES.CONNECTING);
    setError(null);

    log("info", "Connecting to WebSocket...", { url: wsUrl });

    // Create STOMP client
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),

      connectHeaders: {
        Authorization: `Bearer ${token}`,
        "X-Client-Id": connectionId,
        "X-Client-Type": "admin-panel",
        "X-Client-Version": process.env.REACT_APP_VERSION || "1.0.0"
      },

      reconnectDelay: 0, // Manual reconnect for better control

      heartbeatIncoming: HEARTBEAT_CONFIG.INCOMING,
      heartbeatOutgoing: HEARTBEAT_CONFIG.OUTGOING,

      debug: (str) => {
        if (enableLogging && process.env.NODE_ENV === "development") {
          log("debug", str);
        }
      },

      onConnect: () => {
        if (!mountedRef.current) return;

        clearTimeout(connectionTimeoutRef.current);
        log("info", "WebSocket connected successfully");

        setIsConnected(true);
        setConnectionState(SOCKET_STATES.CONNECTED);
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;
        setConnectionStats(prev => ({
          ...prev,
          connectedAt: Date.now(),
          // ✅ FIXED: now actually increments — a reconnect is any connection
          // that happens after a prior connectedAt was already recorded
          reconnectCount: prev.reconnectCount + (prev.connectedAt ? 1 : 0)
        }));

        // Subscribe to topics
        subscribeToTopics(client);

        // Start heartbeat
        startHeartbeat();

        // Call connection change callback
        callbacksRef.current.onConnectionChange?.({
          connected: true,
          connectionId,
          timestamp: Date.now()
        });

        // Flush message queue
        if (messageQueueRef.current.length > 0) {
          messageQueueRef.current.forEach(msg => {
            try {
              client.publish(msg);
            } catch (err) {
              log("error", "Failed to send queued message", err);
            }
          });
          messageQueueRef.current = [];
        }
      },

      onDisconnect: () => {
        if (!mountedRef.current) return;

        log("warn", "WebSocket disconnected");
        setIsConnected(false);
        setConnectionState(SOCKET_STATES.DISCONNECTED);

        // Call connection change callback
        callbacksRef.current.onConnectionChange?.({
          connected: false,
          connectionId,
          timestamp: Date.now()
        });

        // Attempt reconnection if enabled
        if (enableReconnection && mountedRef.current) {
          handleReconnection();
        }
      },

      onStompError: async (frame) => {
        log("error", "STOMP error", frame.headers);

        const errorMessage = frame.headers?.message || "Unknown STOMP error";

        // Handle token expiration
        if (errorMessage.includes("TOKEN_EXPIRED") || errorMessage.includes("Unauthorized")) {
          log("info", "Token expired, refreshing...");

          const freshToken = await refreshAccessToken();
          if (freshToken) {
            log("info", "Token refreshed, reconnecting...");
            disconnect();
            setTimeout(() => connectSocket(), CONNECTION_CONFIG.RETRY_DELAY);
          } else {
            setError("Authentication failed");
            setConnectionState(SOCKET_STATES.FAILED);
          }
        } else {
          setError(errorMessage);
          callbacksRef.current.onError?.({ message: errorMessage, frame });
        }
      },

      onWebSocketError: (event) => {
        log("error", "WebSocket error", event);
        setError("WebSocket connection error");
        setConnectionState(SOCKET_STATES.ERROR);
      },

      onWebSocketClose: () => {
        log("info", "WebSocket closed");
        setIsConnected(false);
        setConnectionState(SOCKET_STATES.DISCONNECTED);
      }
    });

    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (!client.connected && mountedRef.current) {
        log("error", "Connection timeout");
        setError("Connection timeout");
        setConnectionState(SOCKET_STATES.ERROR);
        client.deactivate();

        if (enableReconnection) {
          handleReconnection();
        }
      }
    }, CONNECTION_CONFIG.TIMEOUT);

    client.activate();
    clientRef.current = client;
  }, [
    getAccessToken, wsUrl, connectionId, enableLogging, maxReconnectAttempts,
    disconnect, subscribeToTopics, startHeartbeat, enableReconnection,
    refreshAccessToken, log
  ]);

  // ==========================================================
  // RECONNECTION HANDLING
  // ==========================================================
  const handleReconnection = useCallback(() => {
    if (!enableReconnection || !mountedRef.current) return;

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      log("error", "Max reconnection attempts reached");
      setConnectionState(SOCKET_STATES.FAILED);
      return;
    }

    const delay = calculateReconnectDelay(reconnectAttemptsRef.current);
    setConnectionState(SOCKET_STATES.RECONNECTING);

    log("info", `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;

      // Try to refresh token before reconnecting
      const freshToken = await refreshAccessToken();
      if (freshToken || getAccessToken()) {
        reconnectAttemptsRef.current++;
        setReconnectAttempts(reconnectAttemptsRef.current);
        connectSocket();
      } else {
        log("error", "No valid token available for reconnection");
        setConnectionState(SOCKET_STATES.FAILED);
      }
    }, delay);
  }, [enableReconnection, maxReconnectAttempts, refreshAccessToken, getAccessToken, connectSocket, log]);

  // ==========================================================
  // MANUAL RECONNECT
  // ==========================================================
  const reconnect = useCallback(() => {
    log("info", "Manual reconnect requested");
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    disconnect();
    setTimeout(() => connectSocket(), 500);
  }, [disconnect, connectSocket, log]);

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================
  const sendMessage = useCallback((destination, body, options = {}) => {
    const { queue = true, retry = 3 } = options;

    const message = {
      destination,
      body: JSON.stringify({
        ...body,
        timestamp: Date.now(),
        connectionId
      }),
      headers: {
        "X-Client-Id": connectionId,
        "X-Message-Id": `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };

    if (clientRef.current?.connected) {
      try {
        clientRef.current.publish(message);
        log("debug", "Message sent", { destination });
        return true;
      } catch (err) {
        log("error", "Failed to send message", err);
        if (queue && retry > 0) {
          messageQueueRef.current.push({ ...message, retry });
        }
        return false;
      }
    } else if (queue) {
      messageQueueRef.current.push(message);
      log("debug", "Message queued", { destination });
      return false;
    }

    return false;
  }, [connectionId, log]);

  // ==========================================================
  // GET CONNECTION INFO
  // ==========================================================
  const getConnectionInfo = useCallback(() => {
    return {
      id: connectionId,
      state: connectionState,
      isConnected,
      reconnectAttempts: reconnectAttemptsRef.current,
      maxReconnectAttempts,
      stats: connectionStats,
      error,
      wsUrl
    };
  }, [connectionId, connectionState, isConnected, maxReconnectAttempts, connectionStats, error, wsUrl]);

  // ==========================================================
  // UPDATE CALLBACKS REF
  // ==========================================================
  useEffect(() => {
    callbacksRef.current = {
      onStats,
      onProviderStatus,
      onBookingEvent,
      onAlert,
      onRevenue,
      onSystemHealth,
      onUserActivity,
      onConnectionChange,
      onError
    };
  }, [
    onStats, onProviderStatus, onBookingEvent, onAlert,
    onRevenue, onSystemHealth, onUserActivity, onConnectionChange, onError
  ]);

  // ==========================================================
  // ✅ FIXED: MOUNT TRACKING — isolated in its own effect with empty deps,
  // so it is set true on mount and false ONLY on true unmount. Previously
  // this lived inside the auto-connect effect below and could be permanently
  // flipped to false by any re-run of that effect (e.g. if connectSocket or
  // disconnect's identity changed), silently breaking all mountedRef guards
  // for the rest of the component's life.
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ==========================================================
  // AUTO-CONNECT
  // ==========================================================
  useEffect(() => {
    if (autoConnect) {
      connectSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      disconnect();
    };
  }, [autoConnect, connectSocket, disconnect]);

  // ==========================================================
  // NETWORK STATUS HANDLING
  // ==========================================================
  useEffect(() => {
    const handleOnline = () => {
      log("info", "Network online, reconnecting...");
      if (!isConnected) {
        reconnect();
      }
    };

    const handleOffline = () => {
      log("info", "Network offline");
      setConnectionState(SOCKET_STATES.DISCONNECTED);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isConnected, reconnect, log]);

  // ==========================================================
  // RETURN VALUES
  // ==========================================================
  return useMemo(() => ({
    // Connection state
    isConnected,
    connectionState,
    connectionStats,
    connectionId,
    error,
    reconnectAttempts,

    // Methods
    connect: connectSocket,
    disconnect,
    reconnect,
    sendMessage,
    getConnectionInfo,

    // Helpers
    refreshToken: refreshAccessToken,

    // Constants
    SOCKET_EVENTS,
    SOCKET_STATES
  }), [
    isConnected, connectionState, connectionStats, connectionId,
    error, reconnectAttempts, connectSocket, disconnect, reconnect,
    sendMessage, getConnectionInfo, refreshAccessToken
  ]);
};

// ==========================================================
// CUSTOM HOOK FOR SPECIFIC TOPICS
// ==========================================================

export const useAdminStats = () => {
  const [stats, setStats] = useState(null);
  const { isConnected, sendMessage } = useAdminSocket({
    onStats: setStats
  });

  const requestStats = useCallback(() => {
    if (isConnected) {
      sendMessage("/app/admin/stats/request", {});
    }
  }, [isConnected, sendMessage]);

  return { stats, isConnected, requestStats };
};

export const useAdminProviderStatus = () => {
  const [providerStatus, setProviderStatus] = useState(null);
  const { isConnected, sendMessage } = useAdminSocket({
    onProviderStatus: setProviderStatus
  });

  const requestProviderStatus = useCallback(() => {
    if (isConnected) {
      sendMessage("/app/admin/provider-status/request", {});
    }
  }, [isConnected, sendMessage]);

  return { providerStatus, isConnected, requestProviderStatus };
};

export const useAdminBookings = () => {
  const [bookingEvent, setBookingEvent] = useState(null);
  const { isConnected, sendMessage } = useAdminSocket({
    onBookingEvent: setBookingEvent
  });

  const requestBookings = useCallback(() => {
    if (isConnected) {
      sendMessage("/app/admin/bookings/request", {});
    }
  }, [isConnected, sendMessage]);

  return { bookingEvent, isConnected, requestBookings };
};

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default useAdminSocket;