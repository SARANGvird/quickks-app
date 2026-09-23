// src/hooks/useProviderSocket.js
import { useEffect, useRef, useState, useCallback } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

// ==========================================================
// CONSTANTS
// ==========================================================
export const SOCKET_STATES = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTING: "disconnecting",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  ERROR: "error"
};

export const EVENT_TYPES = {
  BOOKING_REQUEST: "BOOKING_REQUEST",
  BOOKING_ACCEPTED: "BOOKING_ACCEPTED",
  BOOKING_REJECTED: "BOOKING_REJECTED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_COMPLETED: "BOOKING_COMPLETED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
  MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
  SCHEDULE_CHANGE: "SCHEDULE_CHANGE",
  SYSTEM_ALERT: "SYSTEM_ALERT"
};

const DEFAULT_RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 4000;
const CONNECTION_TIMEOUT = 10000;

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const getEventIcon = (eventType) => {
  const icons = {
    [EVENT_TYPES.BOOKING_REQUEST]: "📅",
    [EVENT_TYPES.BOOKING_ACCEPTED]: "✅",
    [EVENT_TYPES.BOOKING_REJECTED]: "❌",
    [EVENT_TYPES.BOOKING_CANCELLED]: "🚫",
    [EVENT_TYPES.BOOKING_COMPLETED]: "🎉",
    [EVENT_TYPES.PAYMENT_RECEIVED]: "💰",
    [EVENT_TYPES.REVIEW_RECEIVED]: "⭐",
    [EVENT_TYPES.MESSAGE_RECEIVED]: "💬",
    [EVENT_TYPES.SCHEDULE_CHANGE]: "📆",
    [EVENT_TYPES.SYSTEM_ALERT]: "⚠️"
  };
  return icons[eventType] || "🔔";
};

const getEventColor = (eventType) => {
  const colors = {
    [EVENT_TYPES.BOOKING_REQUEST]: "#f59e0b",
    [EVENT_TYPES.BOOKING_ACCEPTED]: "#10b981",
    [EVENT_TYPES.BOOKING_REJECTED]: "#ef4444",
    [EVENT_TYPES.BOOKING_CANCELLED]: "#ef4444",
    [EVENT_TYPES.BOOKING_COMPLETED]: "#10b981",
    [EVENT_TYPES.PAYMENT_RECEIVED]: "#10b981",
    [EVENT_TYPES.REVIEW_RECEIVED]: "#fbbf24",
    [EVENT_TYPES.MESSAGE_RECEIVED]: "#3b82f6",
    [EVENT_TYPES.SCHEDULE_CHANGE]: "#8b5cf6",
    [EVENT_TYPES.SYSTEM_ALERT]: "#ef4444"
  };
  return colors[eventType] || "#6b7280";
};

// ==========================================================
// CUSTOM HOOK
// ==========================================================
export const useProviderSocket = (providerId, onEvent, options = {}) => {
  const {
    autoConnect = true,
    enableHeartbeat = true,
    enableNotifications = true,
    onConnectionChange,
    onError,
    reconnectDelay = DEFAULT_RECONNECT_DELAY,
    maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS
  } = options;

  const { user, token, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();

  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [connectionState, setConnectionState] = useState(SOCKET_STATES.DISCONNECTED);
  const [lastEvent, setLastEvent] = useState(null);
  const [eventHistory, setEventHistory] = useState([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState(null);
  
  // Refs
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const onEventRef = useRef(onEvent);

  // ==========================================================
  // UPDATE CALLBACK REF
  // ==========================================================
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // ==========================================================
  // HELPER FUNCTIONS
  // ==========================================================
  const updateConnectionState = useCallback((state, errorObj = null) => {
    if (!mountedRef.current) return;
    
    setConnectionState(state);
    if (errorObj) {
      setError(errorObj);
      if (onError) onError(errorObj);
    }
    
    if (onConnectionChange) {
      onConnectionChange(state === SOCKET_STATES.CONNECTED);
    }
  }, [onConnectionChange, onError]);

  const startHeartbeat = useCallback(() => {
    if (!enableHeartbeat || !clientRef.current?.connected) return;
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (clientRef.current?.connected && mountedRef.current) {
        clientRef.current.publish({
          destination: "/app/provider/heartbeat",
          body: JSON.stringify({
            providerId,
            userId: user?.id,
            timestamp: new Date().toISOString()
          })
        });
      }
    }, HEARTBEAT_INTERVAL);
  }, [enableHeartbeat, providerId, user?.id]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const handleEvent = useCallback((event) => {
    if (!mountedRef.current) return;
    
    console.log(`📡 Provider event received:`, event);
    
    // Update state
    setLastEvent(event);
    setEventHistory(prev => [event, ...prev].slice(0, 50));
    
    // Show notification for important events
    if (enableNotifications) {
      const shouldNotify = [
        EVENT_TYPES.BOOKING_REQUEST,
        EVENT_TYPES.PAYMENT_RECEIVED,
        EVENT_TYPES.REVIEW_RECEIVED,
        EVENT_TYPES.SYSTEM_ALERT
      ].includes(event.type);
      
      if (shouldNotify) {
        addNotification({
          type: event.type === EVENT_TYPES.SYSTEM_ALERT ? "warning" : "info",
          title: event.title || getEventIcon(event.type),
          message: event.message,
          duration: event.type === EVENT_TYPES.BOOKING_REQUEST ? 10000 : 5000,
          icon: getEventIcon(event.type),
          data: event
        });
      }
    }
    
    // Call the callback
    if (onEventRef.current) {
      onEventRef.current(event);
    }
  }, [enableNotifications, addNotification]);

  const subscribeToTopics = useCallback((client) => {
    if (!client || !client.connected) return;
    
    const topic = `/topic/provider/${providerId}`;
    console.log(`📡 Subscribing to provider topic: ${topic}`);
    
    subscriptionRef.current = client.subscribe(topic, (message) => {
      try {
        const event = JSON.parse(message.body);
        handleEvent(event);
      } catch (err) {
        console.error("Failed to parse event message:", err);
      }
    });
    
    return true;
  }, [providerId, handleEvent]);

  const unsubscribeFromTopics = useCallback(() => {
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
        console.log("📡 Unsubscribed from provider topic");
      } catch (err) {
        console.error("Error unsubscribing:", err);
      }
      subscriptionRef.current = null;
    }
  }, []);

  // ==========================================================
  // RECONNECTION LOGIC
  // ==========================================================
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${maxReconnectAttempts}) reached`);
      updateConnectionState(SOCKET_STATES.ERROR, {
        message: "Unable to establish real-time connection. Please refresh the page.",
        maxAttemptsReached: true
      });
      return;
    }
    
    const delay = Math.min(reconnectDelay * Math.pow(1.5, reconnectAttempts), 30000);
    console.log(`🔄 Scheduling provider socket reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
    
    updateConnectionState(SOCKET_STATES.RECONNECTING);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }
    }, delay);
  }, [reconnectAttempts, maxReconnectAttempts, reconnectDelay, updateConnectionState]);

  // ==========================================================
  // CONNECTION MANAGEMENT
  // ==========================================================
  const connect = useCallback(() => {
    const effectiveProviderId = providerId || user?.id;
    
    if (!effectiveProviderId || !token) {
      console.log("⚠️ Cannot connect: Missing provider ID or token");
      updateConnectionState(SOCKET_STATES.DISCONNECTED);
      return;
    }
    
    if (connectingRef.current) {
      console.log("⚠️ Already connecting, skipping...");
      return;
    }
    
    if (clientRef.current?.connected) {
      console.log("⚠️ Already connected");
      return;
    }
    
    connectingRef.current = true;
    updateConnectionState(SOCKET_STATES.CONNECTING);
    
    const wsUrl = process.env.REACT_APP_WS_URL || "http://localhost:8081/quickks/ws";
    console.log(`🔌 Connecting provider WebSocket: ${wsUrl}`);
    
    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (connectingRef.current && mountedRef.current) {
        console.error("Connection timeout");
        connectingRef.current = false;
        updateConnectionState(SOCKET_STATES.ERROR, { message: "Connection timeout" });
        scheduleReconnect();
      }
    }, CONNECTION_TIMEOUT);
    
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        providerId: String(effectiveProviderId),
        userId: String(user?.id),
        userRole: user?.role || "PROVIDER"
      },
      reconnectDelay: reconnectDelay,
      heartbeatIncoming: HEARTBEAT_INTERVAL,
      heartbeatOutgoing: HEARTBEAT_INTERVAL,
      debug: (msg) => {
        if (process.env.NODE_ENV === "development") {
          if (!msg.includes("PING") && !msg.includes("PONG") && !msg.includes("heartbeat")) {
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
      
      // Clear timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      connectingRef.current = false;
      setReconnectAttempts(0);
      updateConnectionState(SOCKET_STATES.CONNECTED);
      setError(null);
      
      console.log(`✅ Provider WebSocket connected for ID: ${effectiveProviderId}`);
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Subscribe to topics
      subscribeToTopics(client);
      
      // Start heartbeat
      startHeartbeat();
    };
    
    client.onStompError = (frame) => {
      connectingRef.current = false;
      console.error("❌ STOMP Error:", frame.headers?.message);
      updateConnectionState(SOCKET_STATES.ERROR, { message: frame.headers?.message || "STOMP protocol error" });
      scheduleReconnect();
    };
    
    client.onWebSocketError = (event) => {
      console.error("❌ WebSocket Error:", event);
      updateConnectionState(SOCKET_STATES.ERROR, { message: "WebSocket connection error" });
      scheduleReconnect();
    };
    
    client.onWebSocketClose = (event) => {
      connectingRef.current = false;
      console.log(`🔌 WebSocket Closed - Code: ${event.code}, Reason: ${event.reason || "No reason"}`);
      updateConnectionState(SOCKET_STATES.DISCONNECTED);
      stopHeartbeat();
      
      if (event.code !== 1000) {
        scheduleReconnect();
      }
    };
    
    client.onDisconnect = () => {
      console.log("🔌 Provider WebSocket disconnected");
      updateConnectionState(SOCKET_STATES.DISCONNECTED);
      stopHeartbeat();
    };
    
    client.activate();
    clientRef.current = client;
  }, [providerId, user?.id, user?.role, token, reconnectDelay, updateConnectionState, 
      subscribeToTopics, startHeartbeat, stopHeartbeat, scheduleReconnect]);

  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting provider WebSocket");
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    unsubscribeFromTopics();
    stopHeartbeat();
    
    if (clientRef.current) {
      try {
        clientRef.current.deactivate();
      } catch (err) {
        console.error("Error deactivating client:", err);
      }
      clientRef.current = null;
    }
    
    connectingRef.current = false;
    updateConnectionState(SOCKET_STATES.DISCONNECTED);
  }, [unsubscribeFromTopics, stopHeartbeat, updateConnectionState]);

  const reconnect = useCallback(() => {
    console.log("🔄 Manual reconnect requested");
    setReconnectAttempts(0);
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);

  // ==========================================================
  // SEND MESSAGE FUNCTION
  // ==========================================================
  const sendMessage = useCallback((destination, payload) => {
    if (!clientRef.current?.connected) {
      console.warn("⚠️ Cannot send message: WebSocket not connected");
      return false;
    }
    
    try {
      clientRef.current.publish({
        destination,
        body: JSON.stringify({
          ...payload,
          providerId,
          timestamp: new Date().toISOString()
        })
      });
      return true;
    } catch (err) {
      console.error("Failed to send message:", err);
      return false;
    }
  }, [providerId]);

  const acceptBooking = useCallback((bookingId) => {
    return sendMessage("/app/booking/accept", { bookingId });
  }, [sendMessage]);

  const rejectBooking = useCallback((bookingId, reason) => {
    return sendMessage("/app/booking/reject", { bookingId, reason });
  }, [sendMessage]);

  const updateStatus = useCallback((bookingId, status) => {
    return sendMessage("/app/booking/status", { bookingId, status });
  }, [sendMessage]);

  const sendLocation = useCallback((bookingId, latitude, longitude) => {
    return sendMessage("/app/booking/location", { bookingId, latitude, longitude });
  }, [sendMessage]);

  // ==========================================================
  // AUTO-CONNECT ON MOUNT
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    
    if (autoConnect && providerId && isAuthenticated && token) {
      connect();
    }
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [autoConnect, providerId, isAuthenticated, token, connect, disconnect]);

  // ==========================================================
  // CLEANUP ON PROVIDER ID CHANGE
  // ==========================================================
  useEffect(() => {
    if (providerId && autoConnect) {
      disconnect();
      connect();
    }
  }, [providerId, autoConnect, disconnect, connect]);

  // ==========================================================
  // RETURN VALUE
  // ==========================================================
  const isConnected = connectionState === SOCKET_STATES.CONNECTED;
  const isConnecting = connectionState === SOCKET_STATES.CONNECTING || 
                       connectionState === SOCKET_STATES.RECONNECTING;

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionState,
    reconnectAttempts,
    error,
    
    // Event data
    lastEvent,
    eventHistory,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    sendMessage,
    acceptBooking,
    rejectBooking,
    updateStatus,
    sendLocation,
    
    // Utility
    isSocketReady: isConnected,
    clearHistory: () => setEventHistory([]),
    
    // Constants
    STATES: SOCKET_STATES,
    EVENT_TYPES,
    getEventIcon,
    getEventColor
  };
};

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default useProviderSocket;

// ==========================================================
// ADDITIONAL EXPORTS
// ==========================================================
export { SOCKET_STATES, EVENT_TYPES, getEventIcon, getEventColor };